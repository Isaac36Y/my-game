export function mulberry32(seed: number): {float: number, nextSeed: number} {
    let a = seed;
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    const float = ((t ^ t >>> 14) >>> 0) / 4294967296;
    return {float, nextSeed: a }
}

export function rollRange(seed: number, min: number, max: number) {
    const raw = min + (max - min) * seed
    return Math.round(raw)
}