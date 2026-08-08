import { initialCombatState, type Program } from "../sim/state";
import { resolve, type ResolveResult, type Action } from "../sim/engine";
import styles from "./combat.module.scss"
import { Zap, Cpu, AudioLines, Shield, ShieldCog, Waypoints } from "lucide-react";
import { useReducer } from "react";
import { ATTRIBUTES } from "../sim/attributes";


const adapter = (wrapper: ResolveResult, action: Action) => resolve(wrapper.state, action)
const toCamel = (str: string) => 
    str
    .toLowerCase()
    .split('_')
    .map((word, index) => index !== 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join('')

function AttributeRender(program: Program) {
    const attributeArr = []

    for (let i = 0; i <= 2; i++) {
        const attDef = ATTRIBUTES[program.attributes[i]]

        attDef
        ? attributeArr.push(
            <>
                <div className={styles.hint}>
                    <p className={styles.title}>{attDef.name}</p>
                    <p>{attDef.description}</p>
                </div>
                <img className={styles.img} src={attDef.icon} alt={`${attDef.alt}`} />
            </>
        )
        : attributeArr.push(
            <div className={styles.placeholder}></div>
        )

    }

    return attributeArr.map((att, key) => (
        <div className={`${styles.attribute}`} key={key}>
            {att}
        </div>
    ))
}


export function Combat() {
    const [combat, dispatch] = useReducer(adapter, { state: initialCombatState, events: []})
    const { state } = combat
    const endCombat = state.winner !== "NULL"
    let winnerDesc: {head: string, body: string} = { head: '', body: ''}

    if (endCombat) {
        winnerDesc = {
            head: state.winner === "PLAYER" ? "You Win!" : "You Lose...",
            body: ""
        }
    }

    return (
        <>
            <div className={styles.backdrop} style={endCombat ? {display: "flex"} : {display: 'none'}}></div>
            <div className={styles.endGameModule} style={endCombat ? {display: "flex"} : {display: 'none'}}>
                <h2>{winnerDesc.head}</h2>
                <p>{winnerDesc.body}</p>
                <button type="button" onClick={() => dispatch({ type: "RESET_GAME" })}>Start Over</button>
            </div>
            <div className={`${styles.header} title`}>
                <h1>Access Intrusion</h1>
            </div >
            <div className={`${styles.combatUI}`}>
                <div className={`${styles.enemy}`}>
                    <p className={`${styles.name}`}>Sentry-Class Enforcer</p>
                    <div className={styles.stats}>
                        <div className={styles.health}>
                            <p className={styles.text}><span><Cpu />HP:</span> {state.enemy.hp} / {state.enemy.maxHp}</p>
                            <progress className={styles.bar} max={ state.enemy.maxHp } value={ state.enemy.hp }></progress>
                        </div>
                        <p className={styles.armor}><span><ShieldCog />Armor:</span> {state.enemy.armor}</p>
                        <p><span><Waypoints />Intent:</span> {state.enemy.intent[state.enemy.intentIndex].type} {state.enemy.intent[state.enemy.intentIndex].amount}</p>
                        <div className={styles.trace}>
                            <p><span><AudioLines />Trace:</span> {state.enemy.trace} / {state.enemy.maxTrace}</p>
                            <progress className={styles.bar} max={ state.enemy.maxTrace } value={ state.enemy.trace }></progress>
                        </div>
                        
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
                            <div 
                            key={key} 
                            className={`${styles.programBtn} ${ATTRIBUTES[state.pending?.attributeQueue[0]] ? styles[toCamel(state.pending.attributeQueue[0])] : ''} ${program.patched ? styles.patched : ''}`}
                            onClick={state.pending 
                                ? () => dispatch({ type: "SELECT_PENDING", programIndex: key}) 
                                : () => dispatch({ type: "PLAY_PROGRAM", programIndex: key})
                            }>
                                <div className={styles.name}>{program.name}</div>
                                <div 
                                className={`${styles.damage}`}>
                                    <Cpu /> <span className={`${Object.keys(program.endTurnQueue).includes('damage') ? styles.damageIncrease : ''}`}>{program.damage}</span> <span className={styles.label}>damage</span>
                                </div>
                                <div className={styles.trace}><AudioLines /> {program.trace} </div>
                                <div className={styles.cyclePoints}><Zap />{program.cyclePoints}</div>
                                <div className={styles.block}><Shield /> {program.block} <span className={styles.label}>block</span></div>
                                <div className={styles.attributes}> 
                                    {AttributeRender(program)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
