import { test, expect, describe } from "vitest";
import { resolve, type ResolveResult } from "./engine";
import { mulberry32 } from "./rng";
import { initialCombatState, type CombatState, type Program } from "./state";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const BUFFER_OVERFLOW = 0;
const PING = 1;
const SCRUB = 2;
const FORK_BOMB = 3;
const ROOTKIT = 4;
const KILL_SWITCH = 5;

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

const play = (state: CombatState, programIndex: number) =>
    resolve(state, { type: "PLAY_PROGRAM", programIndex });

const select = (state: CombatState, programIndex: number) =>
    resolve(state, { type: "SELECT_PENDING", programIndex });

const endTurn = (state: CombatState) => resolve(state, { type: "TURN_END" });

/** The timeline carries {event, state} frames; most assertions only want the events. */
const eventsOf = (result: ResolveResult) => result.frames.map((f) => f.event);

const damages = (state: CombatState) => state.programs.map((p) => p.damage);

/**
 * A seed whose next `steps` patch rolls all land above 3. No program in this
 * file reaches a patchChance of 3, so a run started here never patches by
 * chance and these tests only see the patches they ask for.
 */
const calmSeed = (steps: number): number => {
    for (let seed = 1; seed < 100_000; seed++) {
        let cursor = seed;
        let calm = true;
        for (let i = 0; i < steps; i++) {
            const roll = mulberry32(cursor);
            if (5 * roll.float <= 3) {
                calm = false;
                break;
            }
            cursor = roll.nextSeed;
        }
        if (calm) return seed;
    }
    throw new Error("no calm seed found");
};

/** initialCombatState seeds itself randomly, so every test starts from here. */
const calm: CombatState = { ...initialCombatState, seed: calmSeed(6) };

/** Enough cycles that the cost gate never interferes with a multi-step test. */
const roomy: CombatState = { ...calm, cycles: 20 };

// ---------------------------------------------------------------------------
// pending handshake
// ---------------------------------------------------------------------------

describe("pending handshake", () => {
    test("a program with a targeting attribute opens a selection instead of resolving", () => {
        const result = play(calm, SCRUB);

        expect(result.state.pending).not.toBeNull();
        expect(result.state.pending.sourceIndex).toBe(SCRUB);

        // the source program has not run yet
        expect(result.state.cycles).toBe(3);
        expect(result.state.enemy.trace).toBe(0);
        expect(result.state.programs[SCRUB].patchChance).toBe(1.5);
        expect(result.state.enemy.hp).toBe(120);
    });

    test("opening a selection emits no events", () => {
        const result = play(calm, SCRUB);

        expect(eventsOf(result)).toEqual([]);
    });

    test("the queue only holds attributes whose conditional passes", () => {
        // nothing is patched, so PATCH_BUMP is filtered out
        const result = play(calm, SCRUB);

        expect(result.state.pending.attributeQueue).toEqual(["AMPLIFY"]);
    });

    test("the queue includes PATCH_BUMP once some program is patched", () => {
        const start = withProgram(calm, PING, { patched: true });

        const result = play(start, SCRUB);

        expect(result.state.pending.attributeQueue).toEqual([
            "PATCH_BUMP",
            "AMPLIFY",
        ]);
    });

    test("a program whose attributes all fail their conditional plays immediately", () => {
        // PATCH_BUMP alone, with nothing patched -> no selection needed
        const start = withProgram(calm, BUFFER_OVERFLOW, {
            attributes: ["PATCH_BUMP"] as const,
        });

        const result = play(start, BUFFER_OVERFLOW);

        expect(result.state.pending).toBeNull();
        expect(result.state.enemy.hp).toBe(108);
        expect(result.state.enemy.trace).toBe(10);
        expect(result.state.cycles).toBe(1);
        // playing rolls for a patch and bumps the chance for next time
        expect(result.state.programs[BUFFER_OVERFLOW].patchChance).toBe(2.1);
    });

    test("resolving the last attribute clears pending and plays the source program", () => {
        const start: CombatState = {
            ...calm,
            enemy: { ...calm.enemy, trace: 20 },
        };

        const pending = play(start, SCRUB);
        const result = select(pending.state, PING);

        expect(result.state.pending).toBeNull();
        // Scrub actually resolved: -18 trace, 1 cycle, one patch roll
        expect(result.state.enemy.trace).toBe(2);
        expect(result.state.cycles).toBe(2);
        expect(result.state.programs[SCRUB].patchChance).toBe(2.5);
    });

    test("a two-attribute queue needs two selections before the source resolves", () => {
        const start = withProgram(calm, PING, { patched: true });

        const pending = play(start, SCRUB);
        const first = select(pending.state, PING);

        // still mid-selection, source untouched
        expect(first.state.pending).not.toBeNull();
        expect(first.state.pending.attributeQueue).toEqual(["AMPLIFY"]);
        expect(first.state.cycles).toBe(3);
        expect(first.state.programs[SCRUB].patchChance).toBe(1.5);

        const second = select(first.state, ROOTKIT);

        expect(second.state.pending).toBeNull();
        expect(second.state.cycles).toBe(2);
        expect(second.state.programs[SCRUB].patchChance).toBe(2.5);
    });

    test("sourceIndex survives every step of the queue", () => {
        const start = withProgram(calm, PING, { patched: true });

        const pending = play(start, SCRUB);
        const first = select(pending.state, PING);

        expect(pending.state.pending.sourceIndex).toBe(SCRUB);
        expect(first.state.pending.sourceIndex).toBe(SCRUB);
    });

    test("the attribute hits the selected program, the source is what resolves", () => {
        const pending = play(calm, SCRUB);
        const result = select(pending.state, PING);

        // Ping was amplified but never played
        expect(result.state.programs[PING].damage).toBe(6);
        expect(result.state.programs[PING].patchChance).toBe(0.5);
        // Scrub is the program that ran
        expect(result.state.programs[SCRUB].patchChance).toBe(2.5);
        expect(result.state.enemy.hp).toBe(120);
    });

    // Behaviour is a design call: ignore the click, cancel the selection,
    // or treat it as the target? Decide, then assert it here.
    test.todo("PLAY_PROGRAM dispatched while a selection is pending");
});

// ---------------------------------------------------------------------------
// PATCH_BUMP
// ---------------------------------------------------------------------------

describe("PATCH_BUMP", () => {
    test("a patched program is stuck until a bump clears it", () => {
        const start = withProgram(roomy, PING, { patched: true });

        const blocked = play(start, PING);
        expect(blocked.state).toEqual(start);

        const pending = play(start, SCRUB);
        const bumped = select(pending.state, PING); // PATCH_BUMP -> Ping
        const amplified = select(bumped.state, ROOTKIT); // AMPLIFY -> elsewhere

        const replay = play(amplified.state, PING);

        expect(replay.state.enemy.hp).toBe(116); // 120 - 4
    });

    test("a bump clears patched and maxes out patchChance", () => {
        const start = withProgram(calm, PING, { patched: true });

        const pending = play(start, SCRUB);
        const result = select(pending.state, PING);

        expect(result.state.programs[PING].patched).toBe(false);
        expect(result.state.programs[PING].patchChance).toBe(5);
    });

    test("a bump leaves every other program alone", () => {
        const start = withProgram(calm, PING, { patched: true });

        const pending = play(start, SCRUB);
        const result = select(pending.state, PING);

        expect(result.state.programs[FORK_BOMB]).toEqual(
            initialCombatState.programs[FORK_BOMB],
        );
        expect(result.state.programs[KILL_SWITCH]).toEqual(
            initialCombatState.programs[KILL_SWITCH],
        );
    });

    test("a bump buys exactly one more use before the system patches it again", () => {
        const start = withProgram(roomy, PING, { patched: true });

        const pending = play(start, SCRUB);
        const bumped = select(pending.state, PING);
        const amplified = select(bumped.state, ROOTKIT);

        const replay = play(amplified.state, PING);

        // the bump left patchChance at 5, so that use is a guaranteed re-patch
        expect(replay.state.enemy.hp).toBe(116);
        expect(replay.state.programs[PING].patched).toBe(true);

        const blocked = play(replay.state, PING);
        expect(blocked.state.enemy.hp).toBe(116);
    });

    test("bumping a program that is not patched re-prompts instead of advancing", () => {
        const start = withProgram(calm, PING, { patched: true });

        const pending = play(start, SCRUB);
        const result = select(pending.state, FORK_BOMB); // not patched

        expect(result.state).toEqual(pending.state);
        expect(result.state.pending.attributeQueue).toEqual([
            "PATCH_BUMP",
            "AMPLIFY",
        ]);
        expect(result.state.pending.sourceIndex).toBe(SCRUB);
        expect(result.state.programs[SCRUB].patchChance).toBe(1.5);
    });
});

// ---------------------------------------------------------------------------
// AMPLIFY
// ---------------------------------------------------------------------------

describe("AMPLIFY", () => {
    test.each([
        ["Ping", PING, 4, 6],
        ["Fork Bomb", FORK_BOMB, 9, 14], // 13.5 rounds up
        ["Rootkit", ROOTKIT, 6, 9],
        ["Buffer Overflow", BUFFER_OVERFLOW, 12, 18],
        ["Kill Switch", KILL_SWITCH, 22, 33],
        ["Scrub", SCRUB, 0, 0],
    ])("amplifying %s takes %i damage to %i", (_name, index, base, amped) => {
        expect(calm.programs[index].damage).toBe(base);

        const pending = play(calm, SCRUB);
        const result = select(pending.state, index);

        expect(result.state.programs[index].damage).toBe(amped);
    });

    test("amplify stashes the original damage in endTurnQueue", () => {
        const pending = play(calm, SCRUB);
        const result = select(pending.state, PING);

        expect(result.state.programs[PING].endTurnQueue).toEqual({ damage: 4 });
    });

    test("amplify only touches the targeted program's damage", () => {
        const pending = play(calm, SCRUB);
        const result = select(pending.state, PING);

        expect(damages(result.state)).toEqual([12, 6, 0, 9, 6, 22]);
    });

    test("ending the turn restores the original damage and clears the queue", () => {
        const pending = play(calm, SCRUB);
        const amplified = select(pending.state, PING);
        expect(amplified.state.programs[PING].damage).toBe(6);

        const next = endTurn(amplified.state);

        expect(next.state.programs[PING].damage).toBe(4);
        expect(next.state.programs[PING].endTurnQueue).toEqual({});
        expect(damages(next.state)).toEqual([12, 4, 0, 9, 6, 22]);
    });

    test("ending a turn with nothing amplified leaves damage untouched", () => {
        const next = endTurn(calm);

        expect(damages(next.state)).toEqual([12, 4, 0, 9, 6, 22]);
        expect(
            next.state.programs.every(
                (p) => Object.keys(p.endTurnQueue).length === 0,
            ),
        ).toBe(true);
    });

    test("amplify can target the source program itself", () => {
        const start = withProgram(calm, BUFFER_OVERFLOW, {
            attributes: ["AMPLIFY"] as const,
        });

        const pending = play(start, BUFFER_OVERFLOW);
        const result = select(pending.state, BUFFER_OVERFLOW);

        // the boosted damage is what actually lands
        expect(result.state.programs[BUFFER_OVERFLOW].damage).toBe(18);
        expect(result.state.enemy.hp).toBe(102); // 120 - 18, not 120 - 12
        expect(result.state.programs[BUFFER_OVERFLOW].endTurnQueue).toEqual({
            damage: 12,
        });

        const next = endTurn(result.state);
        expect(next.state.programs[BUFFER_OVERFLOW].damage).toBe(12);
    });

    test("amplify is offered regardless of board state", () => {
        const drained: CombatState = {
            ...calm,
            enemy: { ...calm.enemy, hp: 1, trace: 55, armor: 30 },
        };

        const result = play(drained, SCRUB);

        expect(result.state.pending.attributeQueue).toContain("AMPLIFY");
    });

    // The description says "the next time you play that program this turn".
    // Decide whether that means one play or every play until end of turn,
    // then assert it here.
    test.todo("amplify applies to one play vs. every play in the turn");

    // Two amplifies on the same program in one turn: decide whether they
    // stack, and what the end-of-turn rollback should restore.
    test.todo("amplify applied twice to the same program in one turn");
});
