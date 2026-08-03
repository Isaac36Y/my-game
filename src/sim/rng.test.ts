import { mulberry32, rollRange } from "./rng";
import { test, expect } from "vitest"; 

test("seed advances by constant", () => {
    const seed1 = mulberry32(69)
    const seed2 = mulberry32(seed1.nextSeed)

    expect((seed2.nextSeed - seed1.nextSeed) >>> 0).toBe(0x6D2B79F5)
})

test("consistent random output from seed", () => {
    const list1 = []
    const list2 = []
    let seed1 = mulberry32(12345)
    let seed2 = mulberry32(12345)

    for (let i = 0; i < 1000; i++) {
        list1.push(seed1.float)
        list2.push(seed2.float)
        seed1 = mulberry32(seed1.nextSeed)
        seed2 = mulberry32(seed2.nextSeed)
    }
    const noDouble = new Set(list1)

    expect(list1.length === noDouble.size).toBe(true)
    expect(list1.every((val: number, index: number) => val === list2[index])).toBe(true)
})

test("rollRange stays within range", () => {
    let seed = mulberry32(69)
    const list = []
    for (let i = 0; i < 1000; i++) {    
        list.push(rollRange(seed.float, 6, 10))
        seed = mulberry32(seed.nextSeed)
    }
    const noDouble = new Set(list)

    expect(list.every(roll => roll <= 10 || roll >= 6)).toBe(true)
    expect(noDouble.size).toBe(5)
})