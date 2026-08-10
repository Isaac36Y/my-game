
import type { CombatState } from "./state";

export type AttributeId = | "PATCH_BUMP" | "AMPLIFY"

export interface AttributeDef {
    readonly id: AttributeId;
    readonly name: string;
    readonly description: string;
    readonly icon: string;
    readonly alt: string;
    readonly needsProgram: boolean;
    readonly conditional: (state: CombatState) => boolean;
    readonly effect: (state: CombatState, programIndex: number) => CombatState;
}

export const ATTRIBUTES: Record<AttributeId, AttributeDef> = {
    PATCH_BUMP: {
        id: "PATCH_BUMP",
        name: "Patch Bump",
        description: "Choose one patched program to version bump, allowing you to use that program once before the system patches it again",
        icon: 'public/images/patch-bump-icon.jpg',
        alt: "System version upgrade",
        needsProgram: true,
        conditional: (state) => {
            return state.programs.filter(program => program.patched).length === 0 ? false : true
        },
        effect: (state: CombatState, programIndex: number ) => {
            if (!state.programs[programIndex].patched) return state

            const nextState: CombatState = {
                ...state,
                programs: state.programs.map((program, index) => 
                    index === programIndex
                    ? {...program, permaPatched: "QUEUED", patchChance: 5, patched: false} 
                    : program 
                ),
                pending: {...state.pending, attributeQueue: state.pending.attributeQueue.slice(1) }
            }
            return nextState
        }
    },
    AMPLIFY: {
        id: "AMPLIFY",
        name: "Amplify",
        description: "Choose a program. For the rest of the turn, it deals 50% more damage",
        icon: 'public/images/amplify.jpeg',
        alt: "",
        needsProgram: true,
        conditional: () => true,
        effect: (state: CombatState, programIndex: number) => {

            const nextState: CombatState = {
                ...state,
                programs: state.programs.map((program, index) => 
                    index === programIndex
                // instead of a function, manual set the new stats, then have some kind of storage for the old values and on turn end it rolls back to the old values
                    ? {...program, damage: Math.ceil(program.damage * 1.5), endTurnQueue: {...program.endTurnQueue, damage: program.damage, }} 
                    : program 
                ),
                pending: {...state.pending, attributeQueue: state.pending.attributeQueue.slice(1) }
            }
            return nextState
        }
    }
}

