import { initialCombatState } from "../sim/state";
import { resolve, type ResolveResult, type Action } from "../sim/engine";
import styles from "./combat.module.scss"
import { Zap, Cpu, AudioLines, Shield, ShieldCog, Waypoints } from "lucide-react";
import { useReducer } from "react";

const adapter = (wrapper: ResolveResult, action: Action) => resolve(wrapper.state, action)

export function Combat() {
    const [combat, dispatch] = useReducer(adapter, { state: initialCombatState, events: []})
    const { state } = combat
    const endCombat = state.winner !== "NULL"
    let winnerHead: string
    let roundEndReason: string
    if (endCombat) {
        winnerHead = state.winner === "PLAYER" || "NULL" ? "You Win!" : "Game Over..."
        
    }
    

    return (
        <>
            <div className={styles.backdrop} style={endCombat ? {display: "flex"} : {display: 'none'}}></div>
            <div className={styles.endGameModule} style={endCombat ? {display: "flex"} : {display: 'none'}}>
                <h2>{winnerHead}</h2>
                <p>{roundEndReason}</p>
                <button type="button" onClick={() => dispatch({ type: "RESET_GAME" })}>Start Over</button>
            </div>
            <div className={`${styles.header} title`}>
                <h1>Access Intrusion</h1>
            </div >
            <div className={`${styles.combatUI}`}>
                <div className={`${styles.enemy}`}>
                    <p className={`${styles.name}`}>Snetry-Class Enforcer</p>
                    <div className={styles.stats}>
                        <div className={styles.health}>
                            <p className={styles.text}><span><Cpu />HP:</span> {state.enemy.hp} / {state.enemy.maxHp}</p>
                            <progress className={styles.bar} max={ state.enemy.maxHp } value={ state.enemy.hp }></progress>
                        </div>
                        <p className={styles.armor}><span><ShieldCog />Armor:</span> {state.enemy.armor}</p>
                        <p><span><Waypoints />Intent:</span> {state.enemy.intent[state.enemy.intentIndex].type} {state.enemy.intent[state.enemy.intentIndex].amount}</p>
                        <p><span><AudioLines />Trace:</span> {state.enemy.trace} / {state.enemy.maxTrace} </p>
                    </div>
                </div>
                <div className={`${styles.player}`}>
                    <div className={styles.upperPlayer}>
                        <div className={styles.left}>
                            <div className={styles.health}>
                                <p className={styles.text}><span>Player HP:</span> {state.player.hp} / {state.player.maxHp}</p>
                                <progress className={styles.bar} max={ state.player.maxHp } value={ state.player.hp }></progress>
                            </div>
                            <div className={styles.stats}>
                                <p><span><Zap />Cycles:</span> {state.cycles}</p>
                                <p><span>Turn:</span> {state.turn} </p>
                                <p><span><Shield />Block:</span> {state.player.block}</p>
                            </div>
                        </div>
                        <div className={styles.right}>
                            <button className={styles.endTurnBtn} type="button" onClick={() => dispatch({ type: "TURN_END" })}>
                                End Turn
                            </button>
                        </div>
                    </div>
                    <div className={styles.programs}>
                        {state.programs.map((program, key) => (
                            <button key={key} className={styles.programBtn} onClick={() => dispatch({ type: "PLAY_PROGRAM", programIndex: key})}>
                                <span className={styles.name}>{program.name}</span>
                                <span className={styles.damage}><Cpu /> {program.damage} <span>damage</span> </span>
                                <span className={styles.trace}><AudioLines /> {program.trace} </span>
                                <span className={styles.cyclePoints}><Zap />{program.cyclePoints}</span>
                                <span className={styles.block}><Shield /> {program.block} <span>block</span></span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
