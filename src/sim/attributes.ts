
import type { CombatState } from "./state";

export type AttributeId = | "PATCH_BUMP" | "AMPLIFY"

export interface AttributeDef {
    readonly id: AttributeId;
    readonly name: string;
    readonly description: string;
    readonly icon: string;
    readonly alt: string;
    readonly needsProgram: boolean;
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
        effect: (state: CombatState, programIndex: number ) => {
            if (!state.programs[programIndex].patched) return state

            const nextState: CombatState = {
                ...state,
                programs: state.programs.map((program, index) => 
                    index === programIndex
                    ? {...program, combatUses: program.combatUses - 1, patched: false} 
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
        description: "Choose a program. The next time you play that program this turn, it deals 50% more damage",
        icon: 'public/images/amplify.jpeg',
        alt: "",
        needsProgram: true,
        effect: (state: CombatState, programIndex: number) => {
            if (!state.programs[programIndex].patched) return state

            const nextState: CombatState = {
                ...state,
                programs: state.programs.map((program, index) => 
                    index === programIndex
                    ? {...program, combatUses: program.combatUses - 1, patched: false} 
                    : program 
                ),
                pending: {...state.pending, attributeQueue: state.pending.attributeQueue.slice(1) }
            }
            return nextState
        }
    }
}

