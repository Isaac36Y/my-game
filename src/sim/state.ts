import type { Enemy } from "./enemies";

export interface Player {
    readonly hp: number;
    readonly maxHp: number;
}

export interface Program {
    readonly name: string;
    readonly damage: number;
    readonly cyclePoints: number;
    readonly trace: number;
    readonly block: number;
}

// Combat
export interface CombatState {
    readonly player: Player;
    readonly enemy: Enemy;
    readonly turn: number;
    readonly cycles: number;
    readonly programs: readonly Program[];
}

export const initialCombatState: CombatState = {
    player: { 
        hp: 55, 
        maxHp: 80 
    },
    enemy: { 
        hp: 120, 
        maxHp: 120, 
        armor: 0, 
        trace: 0, 
        intent: [
            { type: "ATTACK", damage: 10},
            { type: "ARMOR", armor: 10},
            { type: "ATTACK", damage: 7 }
        ],
        intentIndex: 0
    },
    turn: 1,
    cycles: 3,
    programs: [
        { name: "Buffer Overflow", damage: 18, cyclePoints: 3, trace: 20, block: 0 }, // armor answer
        { name: "Ping",            damage: 4,  cyclePoints: 1, trace: 2, block: 4  }, // silent-but-weak
        { name: "Scrub",           damage: 0,  cyclePoints: 1, trace: -15, block: 8 }, // trace reducer
        { name: "Fork Bomb",       damage: 9,  cyclePoints: 2, trace: 12, block: 0 }, // repeatable damage
        { name: "Rootkit",         damage: 6,  cyclePoints: 2, trace: 8, block: 0  }, // utility / pressure
        { name: "Kill -9",         damage: 0,  cyclePoints: 2, trace: 5, block: 0  }, // patch interrupt
    ],
};
