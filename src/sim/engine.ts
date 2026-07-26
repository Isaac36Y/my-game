import type { CombatState } from "./state";

export type Action = 
    | { readonly type: "PLAY_PROGRAM"; readonly programIndex: number }
    | { readonly type: "TURN_END" };

export type GameEvent =
    | { readonly type: "PROGRAM_USED"; readonly name: string }
    | { readonly type: "DAMAGE_DEALT"; readonly amount: number }
    | { readonly type: "BLOCK_GAINED"; readonly amount: number }
    | { readonly type: "BLOCK_HIT"; readonly amount: number }
    | { readonly type: "BLOCK_BROKE" }
    | { readonly type: "ARMOR_GAINED"; readonly amount: number }
    | { readonly type: "ARMOR_HIT"; readonly amount: number }
    | { readonly type: "ARMOR_BROKE" }
    | { readonly type: "TRACE_GAINED"; readonly amount: number }
    | { readonly type: "CYCLE_SPENT"; readonly amount: number}
    | { readonly type: "CYCLE_INCREASE"; readonly amount: number}
    | { readonly type: "TAKE_DAMAGE"; readonly amount: number}
    | { readonly type: "BUMP_TURN"};

export type ResolveResult = { state: CombatState; events: GameEvent[] }

export function resolve(
    state: CombatState,
    action: Action,
): ResolveResult {
    
    const events: GameEvent[] = [];

    switch (action.type) {
        case "PLAY_PROGRAM": {
            const program = state.programs[action.programIndex];

            if (program.cyclePoints > state.cycles) {
                return { state, events };
            }
            
            let dmg = program.damage
            let armor = state.enemy.armor

            if (armor > 0) {
                if (dmg >= armor) {
                    dmg = dmg - armor
                    events.push({ type: "ARMOR_BROKE" });
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
            events.push({ type: "DAMAGE_DEALT", amount: dmg });
            events.push({ type: "TRACE_GAINED", amount: newTrace - oldTrace});
            events.push({ type: "CYCLE_SPENT", amount: program.cyclePoints});
            
            const nextState: CombatState = {
                ...state,
                cycles: state.cycles - program.cyclePoints,
                enemy: {
                    ...state.enemy,
                    hp: Math.max(0, state.enemy.hp - dmg),
                    trace: newTrace,
                    armor
                },
            };

            return { state: nextState, events };
        }
        case "TURN_END": {
            const cyclesToThree = 3 - state.cycles
            let playerHp = state.player.hp;
            let enemyArmor = state.enemy.armor;
            const intentIndex = state.enemy.intentIndex
            const intent = state.enemy.intent[intentIndex]
            switch (intent.type) {
                case "ATTACK": {
                    const dmg = intent.damage;
                    playerHp = Math.max(0, playerHp - dmg);
                    events.push({ type: "TAKE_DAMAGE", amount: dmg });
                    break
                }
                case "ARMOR": {
                    enemyArmor = intent.armor
                    events.push({ type: "ARMOR_GAINED", amount: enemyArmor });
                }
            }
            
            events.push({ type: "BUMP_TURN" })
            events.push({ type: "CYCLE_INCREASE", amount: cyclesToThree })

            const nextState: CombatState = {
                ...state,
                player: {
                    ...state.player,
                    hp: playerHp
                },
                enemy: {
                    ...state.enemy,
                    intentIndex: (intentIndex + 1) % state.enemy.intent.length,
                    armor: enemyArmor
                },
                cycles: 3,
                turn: state.turn + 1
            }

            return { state: nextState, events}
        }
    }
}
