import { test, expect } from "vitest"; 
import { resolve } from "./engine";
import { initialCombatState } from "./state";

test("playing Ping deals its damage to the enemy", () => {   // a name describing the claim
    // Arrange
    const start = initialCombatState;

    // Act
    const result = resolve(start, { type: "PLAY_PROGRAM", programIndex: 1 });

    // Assert
    expect(result.state.enemy.hp).toBe(120 - 4);   // Ping does 4 → expect 116
});

test("the can't afford bramch", () => {
    const state = initialCombatState
    const lowCycles = {...state, cycles: 1}
    
    const result = resolve(lowCycles, { type: "PLAY_PROGRAM", programIndex: 0})

    expect(result.state.enemy.hp).toBe(120)
})

test("ensuring trace direction and that it cant go under 0", () => {
    const start = initialCombatState

    const forkBomb = resolve(start, { type: "PLAY_PROGRAM", programIndex: 3 });
    const scrub = resolve(forkBomb.state, { type: "PLAY_PROGRAM", programIndex: 2 });

    expect(forkBomb.state.enemy.trace).toBe(12)
    expect(scrub.state.enemy.trace).toBe(0)
})

test("ending turn resets cycles and bumps turn", () => {
    const start = initialCombatState

    const reduceCycles = { ...start, cycles: 1 }
    const endTurn = resolve(reduceCycles, { type: "TURN_END" })

    expect(endTurn.state.cycles).toBe(3)
    expect(endTurn.state.turn).toBe(2)
})

test("player takes damage on attack intent", () => {
    const start = initialCombatState

    const result = resolve(start, { type: "TURN_END" })

    expect(result.state.player.hp).toBe(45)
})

test("intent index changing on end turn and it starts over after all intents", () => {
    const start = initialCombatState

    const result = resolve(start, { type: "TURN_END" })
    const resultTwo = resolve(result.state, { type: "TURN_END" })
    const resultThree = resolve(resultTwo.state, { type: "TURN_END" })

    expect(result.state.enemy.intentIndex).toBe(1)
    expect(resultThree.state.enemy.intentIndex).toBe(0)
})

test("player damage hits armor first and remaining damage on hp", () => {
    const start = initialCombatState

    const addArmor = { ...start, enemy: {...start.enemy, armor: 10}}
    const result = resolve(addArmor, { type: "PLAY_PROGRAM", programIndex: 0 });

    expect(result.state.enemy.armor).toBe(0)
    expect(result.state.enemy.hp).toBe(118)
})

test("armor remains and not hp is taken if damage is lower than", () => {
    const start = initialCombatState

    const addArmor = { ...start, enemy: {...start.enemy, armor: 10}}
    const result = resolve(addArmor, { type: "PLAY_PROGRAM", programIndex: 1 });

    expect(result.state.enemy.armor).toBe(6)
    expect(result.state.enemy.hp).toBe(120)
})

test("enemy gets armor from end round", () => {
    const start = initialCombatState

    const attack = resolve(start, { type: "TURN_END" })
    expect(attack.state.enemy.armor).toBe(0)
    
    const armor = resolve(attack.state, { type: "TURN_END" })
    expect(armor.state.enemy.armor).toBe(10)
})

test("winner switched to player", () => {
    const start = initialCombatState

    const lowHealth = { ...start, enemy: {...start.enemy, hp: 10}}
    const result = resolve(lowHealth, { type: "PLAY_PROGRAM", programIndex: 0})

    expect(result.state.winner).toBe("PLAYER")
})