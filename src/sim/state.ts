import type { Enemy } from './enemies';
import type { AttributeId } from './attributes';

export interface Player {
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
}

export type Attributes = 
    | readonly []
    | readonly [AttributeId]
    | readonly [AttributeId, AttributeId]
    | readonly [AttributeId, AttributeId, AttributeId];

export type ProgramType = 
    | "Exploit" | "Script"

export interface Program {
    readonly name: string;
    readonly type: ProgramType;
    readonly damage: number;
    readonly cyclePoints: number;
    readonly trace: number;
    readonly block: number;
    readonly combatUses: number;
    readonly patched: boolean;
    readonly endTurnQueue: object;
    readonly attributes: Attributes;
}

export interface PendingSelection {
    readonly attributeQueue: Array<AttributeId>;
    readonly sourceIndex: number;   // the program you clicked first
}

export type Winner = 'PLAYER' | 'ENEMY' | 'NULL';

// Combat
export interface CombatState {
    readonly player: Player;
    readonly enemy: Enemy;
    readonly turn: number;
    readonly cycles: number;
    readonly programs: readonly Program[];
    readonly pending: PendingSelection | null;
    readonly winner: Winner;
}

export const initialCombatState: CombatState = {
    player: {
        hp: 55,
        maxHp: 80,
        block: 0,
    },
    enemy: {
        hp: 120,
        maxHp: 120,
        armor: 0,
        trace: 0,
        maxTrace: 60,
        intent: [
            { type: 'ATTACK', amount: 10 },
            { type: 'ARMOR', amount: 10 },
            { type: 'ATTACK', amount: 7 },
        ],
        intentIndex: 0,
    },
    turn: 1,
    cycles: 3,
    programs: [
        {
            name: 'Buffer Overflow',
            type: "Exploit",
            damage: 12,
            cyclePoints: 2,
            trace: 10,
            block: 0,
            combatUses: 0,
            patched: false,
            endTurnQueue: {},
            attributes: [

            ]
        }, // armor answer
        {
            name: 'Ping',
            type: "Script",
            damage: 4,
            cyclePoints: 1,
            trace: 2,
            block: 4,
            combatUses: 0,
            patched: false,
            endTurnQueue: {},
            attributes: [

            ]
        }, // silent-but-weak
        {
            name: 'Scrub',
            type: "Script",
            damage: 0,
            cyclePoints: 1,
            trace: -18,
            block: 0,
            combatUses: 0,
            patched: false,
            endTurnQueue: {},
            attributes: [
                "PATCH_BUMP", "AMPLIFY"
            ]
        }, // trace reducer
        {
            name: 'Fork Bomb',
            type: "Exploit",
            damage: 9,
            cyclePoints: 2,
            trace: 8,
            block: 4,
            combatUses: 0,
            patched: false,
            endTurnQueue: {},
            attributes: [

            ]
        }, // repeatable damage
        {
            name: 'Rootkit',
            type: "Exploit",
            damage: 6,
            cyclePoints: 1,
            trace: 5,
            block: 0,
            combatUses: 0,
            patched: false,
            endTurnQueue: {},
            attributes: [

            ]
        }, // utility / pressure
        {
            name: 'Kill Switch',
            type: "Exploit",
            damage: 22,
            cyclePoints: 3,
            trace: 15,
            block: 0,
            combatUses: 0,
            patched: false,
            endTurnQueue: {},
            attributes: [

            ]
        }, // patch interrupt
    ],
    winner: 'NULL',
    pending: null,
};
