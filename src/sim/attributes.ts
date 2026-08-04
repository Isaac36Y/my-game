export type AttributeId = | "PATCH_BUMP"

export interface AttributeDef {
    readonly id: AttributeId;
    readonly name: string;
    readonly description: string;
    readonly icon: string;
    readonly alt: string;
}

export const ATTRIBUTES: Record<AttributeId, AttributeDef> = {
    PATCH_BUMP: {
        id: "PATCH_BUMP",
        name: "Patch Bump",
        description: "Choose one patched program to version bump, allowing you to use that program once before the system patches it again",
        icon: 'public/images/patch-bump-icon.jpg',
        alt: "System version upgrade"
    }
}

