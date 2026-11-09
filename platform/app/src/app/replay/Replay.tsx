"use client";

// The recorded run, step by step, in about 60 s. Each step appears at its real elapsed time scaled to the replay's
// length, with that time shown. Play, pause, restart and step through it; with reduced motion nothing plays on its
// own and every step is shown at once.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REPLAY_AGREEMENT, REPLAY_PLAY_SECS, REPLAY_STEPS, clock, shownAt } from "@/lib/replay";
import styles from "./replay.module.css";

const TICK_MS = 250;
const END = REPLAY_STEPS.at(-1)!.at;
/** The replay second at which step i appears. */
const startOf = (i: number) => (REPLAY_STEPS[i]!.at / END) * REPLAY_PLAY_SECS;

export function Replay({ explorer }: { explorer: string | null }) {
  const [played, setPlayed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduce, setReduce] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduce(m.matches);
      if (m.matches) { setPlaying(false); setPlayed(REPLAY_PLAY_SECS); }
      else if (!started.current) { started.current = true; setPlaying(true); }
    };
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPlayed((p) => {
      const next = p + TICK_MS / 1000;
      if (next >= REPLAY_PLAY_SECS) { setPlaying(false); return REPLAY_PLAY_SECS; }
      return next;
    }), TICK_MS);
    return () => clearInterval(t);
  }, [playing]);

  const shown = shownAt(played);
  const done = shown >= REPLAY_STEPS.length;
  const realNow = Math.min(END, (played / REPLAY_PLAY_SECS) * END);
  const txUrl = (h: string) => (explorer ? `${explorer}/txns/${h}` : null);

  const restart = () => { setPlayed(0); setPlaying(!reduce); };
  const stepTo = (n: number) => { setPlaying(false); setPlayed(n <= 0 ? 0 : startOf(Math.min(n, REPLAY_STEPS.length) - 1)); };

  return (
    <div className={styles.wrap}>
      <div className={styles.controls} role="group" aria-label="Replay controls">
        <button type="button" className={styles.primary} onClick={() => (done ? restart() : setPlaying((v) => !v))}>
          {done ? "Replay again" : playing ? "Pause" : played > 0 ? "Resume" : "Play"}
        </button>
        <button type="button" className={styles.secondary} onClick={() => stepTo(shown - 1)} disabled={shown <= 0}>Previous step</button>
        <button type="button" className={styles.secondary} onClick={() => stepTo(shown + 1)} disabled={done}>Next step</button>
        <button type="button" className={styles.secondary} onClick={restart}>Restart</button>
        <span className={`mono small ${styles.clock}`} aria-live="off">
          run time {clock(realNow)} of {clock(END)} · step {shown} of {REPLAY_STEPS.length}
        </span>
      </div>
      <div className={styles.bar} aria-hidden="true"><span style={{ width: `${(played / REPLAY_PLAY_SECS) * 100}%` }} /></div>

      <ol className={styles.steps} aria-live="polite">
        {REPLAY_STEPS.map((s, i) => {
          const on = i < shown;
          return (
            <li key={s.id} className={`${styles.step} ${on ? styles.on : styles.off} ${on && !reduce ? styles.enter : ""}`} aria-hidden={!on}>
              <span className={`mono small ${styles.at}`}>{clock(s.at)}</span>
              <div className={styles.body}>
                <h2 className="h5">{s.title}{s.code && <span className={`mono ${styles.code}`}>{s.code}</span>}</h2>
                <p className="small">{s.detail}</p>
                {s.txs.length > 0 && (
                  <span className={styles.txs}>
                    {s.txs.map((t) => {
                      const u = txUrl(t.hash);
                      return u
                        ? <a key={t.hash} className="mono link small" href={u} target="_blank" rel="noreferrer" tabIndex={on ? 0 : -1}>{t.label} · tx {t.hash.slice(0, 8)}</a>
                        : <span key={t.hash} className="mono small">{t.label} · tx {t.hash.slice(0, 8)}</span>;
                    })}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="small">
        <Link className="link" href={`/verify/${REPLAY_AGREEMENT}`}>Verify a32 yourself →</Link>
        {" "}· <Link className="link" href="/try">Send a scam to the live room</Link> (pre-funded, on chain, no funds needed)
        {" "}· <Link className="link" href="/try-it">Run it yourself</Link>
      </p>
    </div>
  );
}
