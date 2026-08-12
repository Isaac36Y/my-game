import { initialCombatState, type Program } from "../sim/state";
import { resolve, type ResolveResult, type Action } from "../sim/engine";
import styles from "./combat.module.scss"
import { Zap, Cpu, AudioLines, Shield, ShieldCog, Waypoints } from "lucide-react";
import { useReducer, useRef } from "react";
import { ATTRIBUTES } from "../sim/attributes";


const adapter = (wrapper: ResolveResult, action: Action) => resolve(wrapper.state, action)
const toCamel = (str: string) => 
    str
    .toLowerCase()
    .split('_')
    .map((word, index) => index !== 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join('')

function AttributeRender(program: Program, type: string) {
    const attributeArr = []
    const amount = type === "Script" ? 2 : 0

    for (let i = 0; i <= amount; i++) {
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
    const [combat, dispatch] = useReducer(adapter, { state: initialCombatState, frames: []})
    const damageDealt = useRef<HTMLParagraphElement>(null)
    const { state, frames } = combat
    const endCombat = state.winner !== "NULL"
    let winnerDesc: {head: string, body: string} = { head: '', body: ''}

    console.log(frames)

    if (endCombat) {
        winnerDesc = {
            head: state.winner === "PLAYER" ? "You Win!" : "You Lose...",
            body: ""
        }
    }


    const typeClass = state.programs.map(program => program.type.toLowerCase())
    const intentIndex = state.enemy.intentIndex

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
                    <p className={`${styles.name}`} style={state.enemy.intent[intentIndex].type === "ATTACK" ? {boxShadow: '0 0 80px 20px red'} : {boxShadow: '0 0 80px 20px var(--color-block)'}}>Sentry-Class Enforcer</p>
                    <div className={styles.stats}>
                        <p><span><Waypoints />Intent:</span> {state.enemy.intent[intentIndex].type} {state.enemy.intent[intentIndex].amount}</p>
                    </div>
                    <div className={styles.img}>
                        <p className={styles.damageDealt} ref={damageDealt}></p>
                        <img src="../public/images/sentry-class-enforcer.jpeg" alt="" height={500}/>
                    </div>
                    <div className={styles.health}>
                        <p className={styles.text}><span><Cpu />HP:</span> {state.enemy.hp} / {state.enemy.maxHp}</p>
                        <div className={styles.bars}>
                            <progress className={styles.bar} max={ state.enemy.maxHp } value={ state.enemy.hp }></progress>
                            <div className={styles.blockBar} style={state.enemy.armor > 0 ? {opacity: 1} : {opacity: 0}}><ShieldCog height={24}/>{state.enemy.armor}</div>
                        </div>
                    </div>
                </div>
                <div className={`${styles.player}`}>
                    <p className={styles.turn}><span>Turn:</span> {state.turn} </p>
                    <div className={styles.upperPlayer}>
                        <div className={styles.stats}>
                            <p><span><AudioLines />Trace:</span> {state.enemy.trace} / {state.enemy.maxTrace}</p>
                            <p><span><Zap />Cycles:</span> {state.cycles}</p>
                            <progress className={styles.bar} max={ state.enemy.maxTrace } value={ state.enemy.trace }></progress>
                        </div>
                    </div>
                    <div className={styles.programs}>
                        {state.programs.map((program, key) => (
                            <div 
                            key={key} 
                            className={`${styles.programBtn} ${styles[typeClass[key]]} ${ATTRIBUTES[state.pending?.attributeQueue[0]] && styles[toCamel(state.pending.attributeQueue[0])]} ${program.patched && styles.patched} ${program.permaPatched === "PATCHED" && styles.permaPatched}`}
                            onClick={state.pending 
                                ? () => dispatch({ type: "SELECT_PENDING", programIndex: key}) 
                                : () => dispatch({ type: "PLAY_PROGRAM", programIndex: key})
                            }>
                                <div className={styles.intro}>
                                    <div>
                                        <div className={styles.type}>{program.type}</div>
                                        <div className={styles.name}>{program.name}</div>
                                    </div>
                                    <div className={styles.cost}>
                                        <div className={styles.cyclePoints}>{program.cyclePoints}<Zap size={20}/></div>
                                        <div className={styles.trace}>{program.trace} trace</div>
                                    </div>
                                </div>
                                <div className={styles.output}>
                                    {program.damage > 0 &&
                                    <div className={`${styles.damage}`}>
                                        <Cpu /> <span className={`${Object.keys(program.endTurnQueue).includes('damage') ? styles.damageIncrease : ''}`}>{program.damage}</span> <span className={styles.label}>damage</span>
                                    </div>
                                    }
                                    {program.block > 0 && 
                                    <div className={styles.block}><Shield /> {program.block} <span className={styles.label}>block</span></div>
                                    }
                                    {program.effect && 
                                        <div className={styles.effect}>{program.effect}</div>
                                    }                          
                                </div>
                                <div className={styles.attributes}> 
                                    {AttributeRender(program, program.type)}
                                    <p className={styles.patchChance}>pc: {(program.patchChance * 2) * 10}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={styles.lower}>
                        <div className={styles.health}>
                            <p className={styles.text}><span>Player HP:</span> {state.player.hp} / {state.player.maxHp}</p>
                            <div className={styles.bars}>
                                <progress className={`${styles.bar}`} max={ state.player.maxHp } value={ state.player.hp }></progress>
                                <div className={styles.blockBar} style={state.player.block > 0 ? {opacity: 1} : {opacity: 0}}><Shield fill="white" height={24}/>{state.player.block}</div>
                            </div>
                        </div>
                        <button className={styles.endTurnBtn} type="button" onClick={() => dispatch({ type: "TURN_END" })}>
                            End Turn
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
}
