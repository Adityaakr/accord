import { useCallback, type CSSProperties } from "react"
import { ReplayFrame, Hash } from "./ReplayFrame"
import { shortenIn, type Attack } from "./parse"
import { useReplay } from "./useReplay"
import styles from "./Replay.module.css"

/* make attack, replayed: three inbox messages in turn. Each one slides in as a mail chip, the agent's literal intent
   types out, and the contract's verdict stamps in red (blur crossfade) with "nothing sent". Then the agent's next call,
   rejected by the network, and the agent key struck through. The escrow meter beside it pulses at each refusal and
   never moves. Stages per attempt: chip, intent, verdict; then the next call; then the strike. */

const PER = 3

export function AttackReplay({ data, raw, label, caption }: { data: Attack; raw: string; label?: string; caption?: string }) {
  const n = data.attempts.length
  const NEXT = n * PER + 1, END = n * PER + 2
  const delay = useCallback((s: number) => {
    if (s === 0) return 350
    if (s === NEXT) return 1000
    if (s > n * PER) return 1100
    const k = s % PER
    return k === 1 ? 450 : k === 2 ? 1050 : 1150
  }, [n, NEXT])
  const { ref, stage, done, replay, reduce } = useReplay(END, delay)
  const on = (s: number) => (stage >= s ? styles.on : "")
  const verdictStage = stage > 0 && stage <= n * PER && stage % PER === 0
  const struck = stage >= END

  return (
    <ReplayFrame ref={ref} label={label} caption={caption} raw={raw} onReplay={replay} canReplay={!reduce} ariaLabel={`${data.title} on ${data.account}: ${n} inbox messages, each refused by the contract; the agent key revoked; ${data.escrow.moved}`}>
      <div className={styles.attack} data-done={done ? "" : undefined}>
        <div className={styles.attackTop}>
          <div className={`${styles.keyRow} ${struck ? styles.struck : ""}`}>
            <span className={styles.kicker}>{data.account} · {data.where}</span>
            <span className={styles.keyLine}>
              <span className={styles.keyLabel}>agent key</span>
              <span className={styles.keyValue}><Hash value={data.key} what="agent key" /></span>
              <span className={`${styles.revoked} ${on(END)}`}>revoked and deleted</span>
            </span>
          </div>
          <div className={styles.escrow}>
            <span className={styles.kicker}>escrow</span>
            <span className={styles.escrowAmount}>{data.escrow.before}</span>
            <span className={styles.meter} aria-hidden="true">
              <span className={styles.meterFill} />
              {verdictStage ? <span key={stage} className={styles.pulse} /> : null}
            </span>
            <span className={styles.escrowSub}>
              <span>{data.escrow.before} before</span>
              <span className={`${styles.fade} ${on(END)}`}>{data.escrow.after} after</span>
            </span>
            <span className={styles.moved}>{data.escrow.moved}</span>
          </div>
        </div>

        <ol className={styles.attempts}>
          {data.attempts.map((a, i) => {
            const base = i * PER
            const canary = a.verdict.tag === "canary"
            return (
              <li key={a.subject} className={styles.attempt}>
                <span className={`mono ${styles.num}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={`${styles.chip} ${on(base + 1)}`}>
                  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden="true"><rect x="0.6" y="0.6" width="12.8" height="10.8" rx="2" /><path d="m1.2 1.6 5.8 4.6 5.8-4.6" /></svg>
                  <span className={styles.chipText}><span className={styles.chipFrom}>inbox</span>“{a.subject}”</span>
                </span>
                <span className={`${styles.arrow} ${on(base + 2)}`} aria-hidden="true">→</span>
                <span className={`${styles.intent} ${on(base + 2)}`}>
                  <span className={styles.who}>agent</span>
                  <span className={`mono ${styles.type}`} style={{ "--n": a.intent.length } as CSSProperties}>{a.intent}</span>
                  {a.preflight ? <span className={styles.preflight}>{a.preflight}</span> : null}
                </span>
                <span className={`${styles.verdict} ${on(base + 3)}`}>
                  <span className={styles.who}>{canary ? "canary" : "contract"}</span>
                  <code className={`mono ${styles.code}`}>{a.verdict.code}</code>
                  <span className={styles.vparts}>
                    <span>nothing sent</span>
                    {a.verdict.parts.map((p) => <span key={p}>{shortenIn(p)}</span>)}
                  </span>
                  {a.verdict.tx ? <Hash value={a.verdict.tx.hash} note={a.verdict.tx.note} /> : null}
                </span>
              </li>
            )
          })}
          <li className={`${styles.attempt} ${styles.nextRow}`}>
            <span className={`mono ${styles.num}`} aria-hidden="true" />
            <span className={`${styles.nextLead} ${on(NEXT)}`}><span className={styles.who}>agent</span>next call</span>
            <span className={`${styles.arrow} ${on(NEXT)}`} aria-hidden="true">→</span>
            <span className={`${styles.verdict} ${styles.nextVerdict} ${on(NEXT)}`}>
              <code className={`mono ${styles.code}`}>{data.next.error}</code>
              <span className={styles.vparts}><span>{data.next.why}</span></span>
            </span>
          </li>
        </ol>
      </div>
    </ReplayFrame>
  )
}
