export interface Enemy {
    readonly hp: number;
    readonly maxHp: number;
    readonly armor: number;
    readonly trace: number;
    readonly maxTrace: number;
    readonly intent: readonly Intent[];
    readonly intentIndex: number;
}

export type Intent =
    | { readonly type: "ATTACK"; readonly damage: number }
    | { readonly type: "ARMOR"; readonly armor: number };


