import { ATTRIBUTES, type AttributeId } from "./attributes";
import { getsPatched, mulberry32 } from "./rng";
import { initialCombatState, type CombatState, type Winner } from "./state";

export type Action = 
    | { readonly type: "PLAY_PROGRAM"; readonly programIndex: number }
    | { readonly type: "SELECT_PENDING"; readonly programIndex: number}
    | { readonly type: "TURN_END" }
    | { readonly type: "RESET_GAME"};

export type GameEvent =
    | { readonly type: "PROGRAM_USED"; readonly name: string }
    | { readonly type: "DAMAGE_DEALT"; readonly amount: number }
    | { readonly type: "BLOCK_GAINED"; readonly amount: number }
    | { readonly type: "BLOCK_HIT"; readonly amount: number }
    | { readonly type: "BLOCK_BROKE"; readonly amount: number }
    | { readonly type: "ARMOR_GAINED"; readonly amount: number }
    | { readonly type: "ARMOR_HIT"; readonly amount: number }
    | { readonly type: "ARMOR_BROKE"; readonly amount: number }
    | { readonly type: "TRACE_GAINED"; readonly amount: number }
    | { readonly type: "CYCLE_SPENT"; readonly amount: number }
    | { readonly type: "CYCLE_INCREASE"; readonly amount: number }
    | { readonly type: "TAKE_DAMAGE"; readonly amount: number }
    | { readonly type: "PROGRAM_CHANCE_INCREASE" }
    | { readonly type: "BUMP_TURN" }
    | { readonly type: "PATCHED_PROGRAM" }
    | { readonly type: "PLAYER_DIED" }
    | { readonly type: "TRACE_MAX" }
    | { readonly type: "ENEMY_DIED" };


export type Frame = { event: GameEvent, state: CombatState }
export type ResolveResult = { state: CombatState; frames: Frame[] }

function playProgram(state: CombatState, programIndex: number): ResolveResult {
    const mulberry = mulberry32(state.seed)
    const timeline: Frame[] = [];
    const program = state.programs[programIndex];
    let winner: Winner = state.winner
    const gettingPatched = getsPatched(mulberry.float, program.patchChance)
    const permaPatching = program.permaPatched === 'QUEUED' || program.permaPatched === "PATCHED"

    let current: CombatState = {...state, seed: mulberry.nextSeed}

    timeline.push({event: { type: "PROGRAM_USED", name: program.name }, state: current});

    let dmg = program.damage
    let armor = state.enemy.armor

    if (armor > 0) {
        if (dmg >= armor) {
            dmg = dmg - armor
            current = {...current, enemy: {...current.enemy, armor: 0}}
            timeline.push({event: {type: "ARMOR_BROKE", amount: armor}, state: current }); 
            armor = 0
        }else if (dmg < armor) {
            armor = armor - dmg
            current = {...current, enemy: {...current.enemy, armor: armor}}
            timeline.push({ event: {type: "ARMOR_HIT", amount: dmg}, state: current })
            dmg = 0
        }
    }
    const oldTrace = state.enemy.trace
    const newTrace = Math.max(0, oldTrace + program.trace)
    
    if (dmg > 0) {
        current = {...current, enemy: {...current.enemy, hp: Math.max(0, current.enemy.hp - dmg)}}
        timeline.push({event: { type: "DAMAGE_DEALT", amount: dmg }, state: current});
    } 
    if (program.trace !== 0) {
        current = {...current, enemy: {...current.enemy, trace: newTrace}}
        timeline.push({event: { type: "TRACE_GAINED", amount: newTrace - oldTrace }, state: current});
    }
    if (program.cyclePoints !== 0) {
        current = {...current, cycles: current.cycles - program.cyclePoints}
        timeline.push({event: { type: "CYCLE_SPENT", amount: program.cyclePoints }, state: current});
    }
    if (program.block > 0) {
        current = {...current, player: {...current.player, block: current.player.block + program.block}}
        timeline.push({event: { type: "BLOCK_GAINED", amount: program.block }, state: current});
    }
    if (state.enemy.hp - dmg <= 0) {
        winner = "PLAYER"
        current = {...current, winner: winner}
        timeline.push({event: { type: "ENEMY_DIED" }, state: current});
    }
    if (newTrace >= state.enemy.maxTrace) {
        winner = "ENEMY"
        current = {...current, winner: winner}
        timeline.push({event: { type: "TRACE_MAX" }, state: current});
    }
    // TODO: only happens if no winner from this turn
    if (gettingPatched) {
        current = {...current, programs: current.programs.map((program, index) =>
            index === programIndex
            ? {...program, patched: permaPatching ? false : true }
            : program
        )}
        timeline.push({event: { type: "PATCHED_PROGRAM" }, state: current});
    }

    current = {...current, programs: current.programs.map((program, index) =>
        index === programIndex
        ? {...program, patchChance: Math.min(5, program.patchChance + 1)}
        : program
    )}
    timeline.push({event: { type: "PROGRAM_CHANCE_INCREASE" }, state: current});

    return { state: current, frames: timeline };
}

export function resolve(
    state: CombatState,
    action: Action,
): ResolveResult {

    switch (action.type) {
        case "PLAY_PROGRAM": {
            if (state.pending) return

            let current: CombatState = state
            
            const program = state.programs[action.programIndex];
            if (program.cyclePoints > state.cycles) return { state, frames: [] };
            if (program.patched === true || program.permaPatched === "PATCHED") return { state, frames: [] }

            let needsTarget = program.attributes.filter((att: AttributeId) => ATTRIBUTES[att].needsProgram && ATTRIBUTES[att].conditional(state))

            if (needsTarget.length > 0) {
                current = {
                    ...current,
                    pending: {attributeQueue: needsTarget, sourceIndex: action.programIndex}
                }

                return {state: current, frames: []}
            }


            return playProgram(state, action.programIndex)
        }
        case "SELECT_PENDING": {
            // effects update state, remove that attributes from the queue, then return the new state
            let current = ATTRIBUTES[state.pending.attributeQueue[0]].effect(state, action.programIndex)

            if (current.pending.attributeQueue.length === 0) {
                current = {...current, pending: null}
                return playProgram(current, state.pending.sourceIndex)
            }else {
                return { state: current, frames: []}
            }
        }
        case "TURN_END": {
            const timeline: Frame[] = [];
            const cyclesToThree = 3 - state.cycles
            let playerHp = state.player.hp;
            let block = state.player.block
            let enemyArmor = state.enemy.armor;
            let winner: Winner = state.winner
            const intentIndex = state.enemy.intentIndex
            const intent = state.enemy.intent[intentIndex]

            let current: CombatState = state

            current = {...current, programs: current.programs.map(program => {
                return {...program, ...program.endTurnQueue, endTurnQueue: {}}
            })}

            switch (intent.type) {
                case "ATTACK": {
                    let dmg = intent.amount;

                    if (block > 0) {
                        if (dmg >= block) {
                            dmg = dmg - block
                            current = {...current, player: {...current.player, block: 0}}
                            timeline.push({event: { type: "BLOCK_BROKE", amount: block }, state: current});
                            block = 0
                        }else if (dmg < block) {
                            block = block - dmg
                            current = {...current, player: {...current.player, block: block}}
                            timeline.push({event: { type: "BLOCK_HIT", amount: dmg }, state: current});
                            dmg = 0
                        }
                    }
                    playerHp = Math.max(0, playerHp - dmg);
                    current = {...current, player: {...current.player, hp: playerHp}}
                    timeline.push({event: { type: "TAKE_DAMAGE", amount: dmg }, state: current});
                    timeline.push({event: { type: "PLAYER_DIED" }, state: current});
                    break
                }
                case "ARMOR": {
                    enemyArmor = intent.amount
                    current = {...current, enemy: {...current.enemy, armor: enemyArmor}}
                    timeline.push({event: { type: "ARMOR_GAINED", amount: enemyArmor }, state: current});
                }
            }
            if (playerHp <= 0) {
                winner = "ENEMY"
                current = {...current, winner: winner}
                timeline.push({event: { type: "PLAYER_DIED" }, state: current});
            }
            current = {...current, turn: current.turn + 1, enemy: {...current.enemy, intentIndex: (intentIndex + 1) % state.enemy.intent.length}}
            timeline.push({event: { type: "BUMP_TURN" }, state: current});

            current = {...current, cycles: 3}
            timeline.push({event: { type: "CYCLE_INCREASE", amount: cyclesToThree }, state: current});

            return { state: current, frames: timeline}
        }
        case "RESET_GAME": {
            return { state: initialCombatState, frames: [] }
        }
    }
}
