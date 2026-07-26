import { initialCombatState } from "../sim/state";
import styles from "./combat.module.scss"
import { Zap, Cpu, AudioLines, Shield, ShieldCog, Waypoints } from "lucide-react";

export function Combat() {
    // For now, just render the starting state so you can confirm it shows up.
    // Next step: replace this with useReducer so buttons can change it.
    const state = initialCombatState;

    return (
        <>
            <div className={`${styles.header} title`}>
                <h1>Access Intrusion</h1>
            </div >
            <div className={`${styles.combatUI}`}>
                <div className={`${styles.enemy}`}>
                    <p className={`${styles.name}`}>Snetry-Class Enforcer</p>
                    <div className={styles.stats}>
                        <p className={styles.health}><span><Cpu />HP:</span> {state.enemy.hp} / {state.enemy.maxHp}</p>
                        <p className={styles.armor}><span><ShieldCog />Armor:</span> {state.enemy.armor}</p>
                        <p><span><Waypoints />Intent:</span> {state.enemy.intent[state.enemy.intentIndex].type}</p>
                        <p><span><AudioLines />Trace:</span> {state.enemy.trace} / 60 </p>
                    </div>
                </div>
                <div className={`${styles.player}`}>
                    <p className={styles.health}><span>Player HP:</span> {state.player.hp} / {state.player.maxHp}</p>
                    <div className={styles.stats}>
                        <p><span><Zap />Cycles:</span> {state.cycles}</p>
                        <p><span>Turn:</span> {state.turn} </p>
                    </div>
                    <div className={styles.programs}>
                        {state.programs.map((program, key) => (
                            <button key={key} className={styles.programBtn}>
                                <span className={styles.name}>{program.name}</span>
                                <span className={styles.damage}><Cpu /> {program.damage} </span>
                                <span className={styles.trace}><AudioLines /> {program.trace} </span>
                                <span className={styles.cyclePoints}><Zap />{program.cyclePoints}</span>
                                <span className={styles.block}><Shield /> {program.block} </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
