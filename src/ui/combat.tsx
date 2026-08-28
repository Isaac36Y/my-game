import { initialCombatState, type Program } from "../sim/state";
import { resolve, type Action, type Frame } from "../sim/engine";
import styles from "./combat.module.scss"
import { Zap, Cpu, AudioLines, Shield, ShieldCog, Waypoints } from "lucide-react";
import { useRef, useState } from "react";
import { ATTRIBUTES } from "../sim/attributes";

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
    // sim is immediate return of the new state and each frame returned
    const [sim, setSim] = useState(initialCombatState)
    // view is what shows in UI. Runs through sims frames
    const [view, setView] = useState(initialCombatState)
    // fx is what the UI reads to know what to animate
    const [fx, setFx] = useState([])
    const queue = useRef<Frame[]>([])
    const [queueFill, setQueueFill] = useState(false)


    const isPlaying = view !== sim
    
    function step() {
        const frame = queue.current.shift()
        console.log(frame.event)
        if (!frame) { setQueueFill(false); return }
        setView(frame.state)
        setFx([...fx, frame.event])
    }

    const send = (action: Action) => {
        if (isPlaying) return
        queue.current = []
        setFx([])
        const result = resolve(sim, action)
        setSim(result.state)
        if (result.frames.length === 0) {
            setView(result.state)
        }else {
        queue.current = result.frames 
        setQueueFill(true)
        step()
        }
    }

    const endCombat = view.winner !== "NULL"
    let winnerDesc: {head: string, body: string} = { head: '', body: ''}

    if (endCombat) {
        winnerDesc = {
            head: view.winner === "PLAYER" ? "You Win!" : "You Lose...",
            body: ""
        }
    }

    const typeClass = view.programs.map(program => program.type.toLowerCase())
    const intentIndex = view.enemy.intentIndex

    if (queueFill) setTimeout(() => {step()}, 500)
    return (
        <>
            <div className={styles.backdrop} style={endCombat ? {display: "flex"} : {display: 'none'}}></div>
            <div className={styles.endGameModule} style={endCombat ? {display: "flex"} : {display: 'none'}}>
                <h2>{winnerDesc.head}</h2>
                <p>{winnerDesc.body}</p>
                <button type="button" onClick={() => send({ type: "RESET_GAME" })}>Start Over</button>
            </div>
            <div className={`${styles.header} title`}>
                <h1>Access Intrusion</h1>
            </div >
            <div className={`${styles.combatUI}`}>
                <div className={`${styles.enemy}`}>
                    <p className={`${styles.name}`} style={view.enemy.intent[intentIndex].type === "ATTACK" ? {boxShadow: '0 0 80px 20px red'} : {boxShadow: '0 0 80px 20px var(--color-block)'}}>Sentry-Class Enforcer</p>
                    <div className={styles.stats}>
                        <p><span><Waypoints />Intent:</span> {view.enemy.intent[intentIndex].type} {view.enemy.intent[intentIndex].amount}</p>
                    </div>
                    <div className={styles.img}>
                        <img src="../public/images/sentry-class-enforcer.jpeg" alt="" height={500}/>
                    </div>
                    <div className={styles.health}>
                        {fx.at(-1)?.type === "DAMAGE_DEALT" && <p className={styles.damageDealt}>-{fx.at(-1).amount}</p>}
                        <p className={`${styles.text}`}><span><Cpu />HP:</span> {view.enemy.hp} / {view.enemy.maxHp}</p>
                        <div className={styles.bars}>
                            <progress className={styles.bar} max={ view.enemy.maxHp } value={ view.enemy.hp }></progress>
                            <div className={styles.blockBar} style={view.enemy.armor > 0 ? {opacity: 1} : {opacity: 0}}><ShieldCog height={24}/>{view.enemy.armor}</div>
                        </div>
                    </div>
                </div>
                <div className={`${styles.player}`}>
                    <p className={styles.turn}><span>Turn:</span> {view.turn} </p>
                    <div className={styles.upperPlayer}>
                        <div className={styles.stats}>
                            <p><span><AudioLines />Trace:</span> {view.enemy.trace} / {view.enemy.maxTrace}</p>
                            <p><span><Zap />Cycles:</span> {view.cycles}</p>
                            <progress className={styles.bar} max={ view.enemy.maxTrace } value={ view.enemy.trace }></progress>
                        </div>
                    </div>
                    <div className={styles.programs}>
                        {view.programs.map((program, key) => (
                            <button 
                            key={key} 
                            disabled={isPlaying}
                            className={`${styles.programBtn} ${styles[typeClass[key]]} ${ATTRIBUTES[view.pending?.attributeQueue[0]] && styles[toCamel(view.pending.attributeQueue[0])]} ${program.patched && styles.patched} ${program.permaPatched === "PATCHED" && styles.permaPatched}`}
                            onClick={view.pending 
                                ? () => send({ type: "SELECT_PENDING", programIndex: key}) 
                                : () => send({ type: "PLAY_PROGRAM", programIndex: key})
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
                            </button>
                        ))}
                    </div>
                    <div className={styles.lower}>
                        <div className={styles.health}>
                            <p className={styles.text}><span>Player HP:</span> {view.player.hp} / {view.player.maxHp}</p>
                            <div className={styles.bars}>
                                <progress className={`${styles.bar}`} max={ view.player.maxHp } value={ view.player.hp }></progress>
                                <div className={styles.blockBar} style={view.player.block > 0 ? {opacity: 1} : {opacity: 0}}><Shield fill="white" height={24}/>{view.player.block}</div>
                            </div>
                        </div>
                        <button className={styles.endTurnBtn} type="button" onClick={() => send({ type: "TURN_END" })}>
                            End Turn
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
}
