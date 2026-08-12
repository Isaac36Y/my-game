import { describe, expect, test } from "vitest";
import { resolve, type ResolveResult } from "./engine";
import { getsPatched, mulberry32 } from "./rng";
import { initialCombatState, type CombatState, type Program } from "./state";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const BUFFER_OVERFLOW = 0;
const PING = 1;
const SCRUB = 2;
const ROOTKIT = 4;

/** Patch a single program in a state without touching the rest. */
const withProgram = (
    state: CombatState,
    index: number,
    patch: Partial<Program>,
): CombatState => ({
    ...state,
    programs: state.programs.map((program, i) =>
        i === index ? { ...program, ...patch } : program,
    ),
});

/** initialCombatState seeds itself randomly, so every test pins its own. */
const withSeed = (state: CombatState, seed: number): CombatState => ({
    ...state,
    seed,
});

const play = (state: CombatState, programIndex: number) =>
    resolve(state, { type: "PLAY_PROGRAM", programIndex });

const select = (state: CombatState, programIndex: number) =>
    resolve(state, { type: "SELECT_PENDING", programIndex });

/** The timeline carries {event, state} frames; most assertions only want the events. */
const eventsOf = (result: ResolveResult) => result.frames.map((f) => f.event);

const types = (events: { type: string }[]) => events.map((e) => e.type);

/** The 0–5 roll a seed produces. A program patches when patchChance beats it. */
const rollFor = (seed: number) => 5 * mulberry32(seed).float;

/** Lowest seed whose first roll satisfies `want`, so tests carry no magic numbers. */
const seedRolling = (want: (roll: number) => boolean) => {
    for (let seed = 1; seed < 100_000; seed++) {
        if (want(rollFor(seed))) return seed;
    }
    throw new Error("no seed produced the wanted roll");
};

/** Rolls ~0.06 — beaten by any patchChance the game hands out. */
const LOW_ROLL = seedRolling((roll) => roll < 0.1);

/** Rolls ~4.78 — beaten by nothing short of a maxed patchChance. */
const HIGH_ROLL = seedRolling((roll) => roll > 4.5);

// ---------------------------------------------------------------------------
// getsPatched
// ---------------------------------------------------------------------------

describe("getsPatched", () => {
    test.each([
        // [roll float, patchChance, patched?]
        [0.0, 1.1, true],
        [0.2, 1.1, true], // 1.1 beats a roll of 1.0
        [0.3, 1.1, false], // 1.1 loses to a roll of 1.5
        [0.99, 5, true],
        [0.1, 0.4, false], // 0.4 loses to a roll of 0.5
        [0.05, 0.4, true], // 0.4 beats a roll of 0.25
    ])("a roll of %f against patchChance %f patches: %s", (float, chance, expected) => {
        expect(getsPatched(float, chance)).toBe(expected);
    });

    test("a roll exactly equal to patchChance does not patch", () => {
        expect(5 * 0.2).toBe(1); // the comparison really is 1 > 1
        expect(getsPatched(0.2, 1)).toBe(false);
    });

    test("patchChance 0 never patches and 5 always does", () => {
        let seed = 1;
        const never: boolean[] = [];
        const always: boolean[] = [];

        for (let i = 0; i < 1000; i++) {
            const roll = mulberry32(seed);
            never.push(getsPatched(roll.float, 0));
            always.push(getsPatched(roll.float, 5));
            seed = roll.nextSeed;
        }

        expect(never.some(Boolean)).toBe(false);
        expect(always.every(Boolean)).toBe(true);
    });

    test.each([
        [0.5, 0.1],
        [1, 0.2],
        [2.5, 0.5],
        [4, 0.8],
    ])("patchChance %f patches about %f of the time", (chance, rate) => {
        let seed = 12345;
        let hits = 0;
        const rolls = 20_000;

        for (let i = 0; i < rolls; i++) {
            const roll = mulberry32(seed);
            if (getsPatched(roll.float, chance)) hits++;
            seed = roll.nextSeed;
        }

        expect(hits / rolls).toBeCloseTo(rate, 1);
    });
});

// ---------------------------------------------------------------------------
// the roll inside playProgram
// ---------------------------------------------------------------------------

describe("patch roll on play", () => {
    test("playing a program advances the seed one step", () => {
        const start = withSeed(initialCombatState, 4242);

        const result = play(start, PING);

        expect(result.state.seed).toBe(mulberry32(4242).nextSeed);
    });

    test("the same seed gives the same patch outcome", () => {
        const start = withSeed(initialCombatState, 99);

        const first = play(start, BUFFER_OVERFLOW);
        const second = play(start, BUFFER_OVERFLOW);

        expect(second.state).toEqual(first.state);
        expect(eventsOf(second)).toEqual(eventsOf(first));
    });

    test("a losing roll patches the program and emits PATCHED_PROGRAM", () => {
        const start = withSeed(initialCombatState, LOW_ROLL);

        const result = play(start, PING);

        expect(result.state.programs[PING].patched).toBe(true);
        expect(types(eventsOf(result))).toContain("PATCHED_PROGRAM");
    });

    test("a surviving roll leaves the program clean and silent", () => {
        const start = withSeed(initialCombatState, HIGH_ROLL);

        const result = play(start, PING);

        expect(result.state.programs[PING].patched).toBe(false);
        expect(types(eventsOf(result))).not.toContain("PATCHED_PROGRAM");
    });

    test("the roll uses the patchChance the program had before this play", () => {
        // 0 can never beat a roll, even though the play raises it to 1
        const start = withProgram(withSeed(initialCombatState, LOW_ROLL), PING, {
            patchChance: 0,
        });

        const result = play(start, PING);

        expect(result.state.programs[PING].patched).toBe(false);
        expect(result.state.programs[PING].patchChance).toBe(1);
    });

    test("a maxed patchChance patches no matter what the roll is", () => {
        const start = withProgram(withSeed(initialCombatState, HIGH_ROLL), PING, {
            patchChance: 5,
        });

        const result = play(start, PING);

        expect(result.state.programs[PING].patched).toBe(true);
    });

    test("only the played program is touched by the roll", () => {
        const start = withSeed(initialCombatState, LOW_ROLL);

        const result = play(start, PING);

        expect(result.state.programs[PING].patched).toBe(true);
        expect(
            result.state.programs.filter((p) => p.patched).length,
        ).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// patchChance climbing
// ---------------------------------------------------------------------------

describe("patchChance growth", () => {
    test("each play raises the program's patchChance by 1", () => {
        const start = withSeed(initialCombatState, HIGH_ROLL);
        expect(start.programs[PING].patchChance).toBe(0.5);

        const result = play(start, PING);

        expect(result.state.programs[PING].patchChance).toBe(1.5);
    });

    test("patchChance never climbs past 5", () => {
        const start = withProgram(withSeed(initialCombatState, HIGH_ROLL), ROOTKIT, {
            patchChance: 4.6,
        });

        const once = play(start, ROOTKIT);
        expect(once.state.programs[ROOTKIT].patchChance).toBe(5);

        // already maxed: replay from a cleared state and it stays put
        const cleared = withProgram(once.state, ROOTKIT, { patched: false });
        const twice = play(cleared, ROOTKIT);

        expect(twice.state.programs[ROOTKIT].patchChance).toBe(5);
    });

    test("other programs keep their patchChance", () => {
        const start = withSeed(initialCombatState, HIGH_ROLL);

        const result = play(start, PING);

        expect(result.state.programs.map((p) => p.patchChance)).toEqual([
            1.1, 1.5, 1.5, 0.8, 0.4, 2,
        ]);
    });

    test("repeated use makes a patch inevitable", () => {
        // clear the patch after every play so the program keeps being playable
        let state = withSeed(initialCombatState, HIGH_ROLL);
        const chances: number[] = [];

        for (let i = 0; i < 5; i++) {
            const result = play({ ...state, cycles: 20 }, PING);
            chances.push(result.state.programs[PING].patchChance);
            state = withProgram(result.state, PING, { patched: false });
        }

        expect(chances).toEqual([1.5, 2.5, 3.5, 4.5, 5]);
        // a sixth play is a guaranteed patch at patchChance 5
        const sixth = play({ ...state, cycles: 20 }, PING);
        expect(sixth.state.programs[PING].patched).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// what a patched program can and can't do
// ---------------------------------------------------------------------------

describe("a patched program", () => {
    test("refuses to play, leaving the board and the seed alone", () => {
        const start = withProgram(withSeed(initialCombatState, LOW_ROLL), PING, {
            patched: true,
        });

        const result = play(start, PING);

        expect(result.state).toEqual(start);
        expect(result.state.seed).toBe(LOW_ROLL);
        expect(eventsOf(result)).toEqual([]);
    });

    test("an unaffordable program does not burn a roll either", () => {
        const start = { ...withSeed(initialCombatState, LOW_ROLL), cycles: 0 };

        const result = play(start, BUFFER_OVERFLOW);

        expect(result.state.seed).toBe(LOW_ROLL);
        expect(result.state.programs[BUFFER_OVERFLOW].patched).toBe(false);
    });

    test("a bumped program is guaranteed to patch again on its next play", () => {
        const start = withProgram(withSeed(initialCombatState, HIGH_ROLL), PING, {
            patched: true,
        });

        const pending = play(start, SCRUB);
        const bumped = select(pending.state, PING); // PATCH_BUMP -> Ping
        const amplified = select(bumped.state, ROOTKIT); // AMPLIFY -> elsewhere

        const replay = play({ ...amplified.state, cycles: 20 }, PING);

        expect(replay.state.programs[PING].patched).toBe(true);
        expect(types(eventsOf(replay))).toContain("PATCHED_PROGRAM");
    });
});

// ---------------------------------------------------------------------------
// the roll and the pending handshake
// ---------------------------------------------------------------------------

describe("rolling through a pending selection", () => {
    test("opening a selection does not roll", () => {
        const start = withSeed(initialCombatState, LOW_ROLL);

        const pending = play(start, SCRUB);

        expect(pending.state.seed).toBe(LOW_ROLL);
        expect(pending.state.programs[SCRUB].patched).toBe(false);
        expect(pending.state.programs[SCRUB].patchChance).toBe(1.5);
    });

    test("the roll happens once, when the source program finally resolves", () => {
        const start = withSeed(initialCombatState, LOW_ROLL);

        const pending = play(start, SCRUB);
        const result = select(pending.state, PING);

        expect(result.state.seed).toBe(mulberry32(LOW_ROLL).nextSeed);
        expect(result.state.programs[SCRUB].patched).toBe(true);
        expect(result.state.programs[SCRUB].patchChance).toBe(2.5);
    });
});
