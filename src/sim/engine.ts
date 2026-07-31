import { initialCombatState, type CombatState, type Winner } from "./state";

export type Action = 
    | { readonly type: "PLAY_PROGRAM"; readonly programIndex: number }
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
    | { readonly type: "CYCLE_SPENT"; readonly amount: number}
    | { readonly type: "CYCLE_INCREASE"; readonly amount: number}
    | { readonly type: "TAKE_DAMAGE"; readonly amount: number}
    | { readonly type: "BUMP_TURN"}
    | { readonly type: "PLAYER_DIED"}
    | {readonly type: "TRACE_MAX"}
    | { readonly type: "ENEMY_DIED"};

export type ResolveResult = { state: CombatState; events: GameEvent[] }

export function resolve(
    state: CombatState,
    action: Action,
): ResolveResult {
    
    const events: GameEvent[] = [];

    switch (action.type) {
        case "PLAY_PROGRAM": {
            const program = state.programs[action.programIndex];
            let winner: Winner = state.winner
            if (program.cyclePoints > state.cycles) {
                return { state, events };
            }
            
            let dmg = program.damage
            let armor = state.enemy.armor

            if (armor > 0) {
                if (dmg >= armor) {
                    dmg = dmg - armor
                    events.push({ type: "ARMOR_BROKE", amount: armor });
                    armor = 0
                }else if (dmg < armor) {
                    armor = armor - dmg
                    events.push({ type: "ARMOR_HIT", amount: dmg})
                    dmg = 0
                }
            }
            const oldTrace = state.enemy.trace
            const newTrace = Math.max(0, oldTrace + program.trace)

            events.push({ type: "PROGRAM_USED", name: program.name });
            if (dmg > 0) events.push({ type: "DAMAGE_DEALT", amount: dmg });
            if (program.trace !== 0) events.push({ type: "TRACE_GAINED", amount: newTrace - oldTrace});
            if (program.cyclePoints !== 0) events.push({ type: "CYCLE_SPENT", amount: program.cyclePoints});
            if (program.block > 0) events.push({ type: "BLOCK_GAINED", amount: program.block })
            if (state.enemy.hp - dmg <= 0) {
                events.push({ type: "ENEMY_DIED" })
                winner = "PLAYER"
            }
            if (newTrace >= state.enemy.maxTrace) {
                events.push({ type: "TRACE_MAX" })
                winner = "ENEMY"
            }
            
            const nextState: CombatState = {
                ...state,
                cycles: state.cycles - program.cyclePoints,
                player: {
                    ...state.player,
                    block: state.player.block + program.block
                },
                enemy: {
                    ...state.enemy,
                    hp: Math.max(0, state.enemy.hp - dmg),
                    trace: newTrace,
                    armor
                },
                winner
            };

            return { state: nextState, events };
        }
        case "TURN_END": {
            const cyclesToThree = 3 - state.cycles
            let playerHp = state.player.hp;
            let block = state.player.block
            let enemyArmor = state.enemy.armor;
            let winner: Winner = state.winner
            const intentIndex = state.enemy.intentIndex
            const intent = state.enemy.intent[intentIndex]

            switch (intent.type) {
                case "ATTACK": {
                    let dmg = intent.amount;
                
                    if (block > 0) {
                        if (dmg >= block) {
                            dmg = dmg - block
                            events.push({ type: "BLOCK_BROKE", amount: block });
                            block = 0
                        }else if (dmg < block) {
                            block = block - dmg
                            events.push({ type: "BLOCK_HIT", amount: dmg})
                            dmg = 0
                        }
                    }
                    playerHp = Math.max(0, playerHp - dmg);
                    events.push({ type: "TAKE_DAMAGE", amount: dmg });
                    events.push({ type: "PLAYER_DIED" })
                    break
                }
                case "ARMOR": {
                    enemyArmor = intent.amount
                    events.push({ type: "ARMOR_GAINED", amount: enemyArmor });
                }
            }
            if (playerHp <= 0) {
                events.push({ type: "PLAYER_DIED" })
                winner = "ENEMY"
            }
            events.push({ type: "BUMP_TURN" })
            events.push({ type: "CYCLE_INCREASE", amount: cyclesToThree })


            const nextState: CombatState = {
                ...state,
                player: {
                    ...state.player,
                    hp: playerHp,
                    block
                },
                enemy: {
                    ...state.enemy,
                    intentIndex: (intentIndex + 1) % state.enemy.intent.length,
                    armor: enemyArmor
                },
                cycles: 3,
                turn: state.turn + 1,
                winner
            }

            return { state: nextState, events}
        }
        case "RESET_GAME": {
            return { state: initialCombatState, events }
        }
    }
}
