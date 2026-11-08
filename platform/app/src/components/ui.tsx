// Shared building blocks for the deal-room screens: panels, pills, the four-state strip, amounts and the source
// line every live panel carries.

import type { ReactNode } from "react";
import { shortAccount } from "@/components/account/short";
import { formatUnits, type State } from "@accord/sdk";
import styles from "./ui.module.css";

export function Panel({
  title, eyebrow, aside, children, flush, id, className = "",
}: {
  title?: ReactNode; eyebrow?: ReactNode; aside?: ReactNode; children: ReactNode; flush?: boolean; id?: string;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className}`} id={id} aria-label={typeof title === "string" ? title : undefined}>
      {(title || aside || eyebrow) && (
        <header className={styles.panelHead}>
          <div className={styles.panelTitles}>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2 className="h4">{title}</h2>}
          </div>
          {aside && <div className={styles.panelAside}>{aside}</div>}
        </header>
      )}
      <div className={flush ? styles.panelBodyFlush : styles.panelBody}>{children}</div>
    </section>
  );
}

const STATE_TONE: Record<string, string> = {
  Sealed: styles.toneNeutral!, Attested: styles.toneNeutral!, Executing: styles.toneTeal!, Settled: styles.toneMuted!,
  NoDeal: styles.toneMuted!, Cancelled: styles.toneMuted!,
};

export function StatePill({ state }: { state: State | string }) {
  return <span className={`mono ${styles.pill} ${STATE_TONE[state] ?? styles.toneNeutral}`}>{state}</span>;
}

export type Tone = "neutral" | "teal" | "muted" | "warn" | "refusal" | "purple";
const TONES: Record<Tone, string> = {
  neutral: styles.toneNeutral!, teal: styles.toneTeal!, muted: styles.toneMuted!, warn: styles.toneWarn!,
  refusal: styles.toneRefusal!, purple: styles.tonePurple!,
};

export function Pill({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span className={`mono ${styles.pill} ${TONES[tone]}`} title={title}>{children}</span>;
}

const STEPS = ["Sealed", "Attested", "Executing", "Settled"] as const;
const STEP_NOTE: Record<(typeof STEPS)[number], string> = {
  Sealed: "Mandates sealed",
  Attested: "Terms signed in the enclave",
  Executing: "Both approved · escrow live",
  Settled: "Paid, set aside, refunded",
};

/** Sealed → Attested → Executing → Settled, with NoDeal and Cancelled as terminal states. */
export function StateStrip({ state }: { state: State }) {
  const terminal = state === "NoDeal" || state === "Cancelled";
  const at = terminal ? -1 : STEPS.indexOf(state as (typeof STEPS)[number]);
  return (
    <ol className={styles.strip} aria-label={`Agreement state: ${state}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={`${styles.step} ${i < at ? styles.done : ""} ${i === at ? styles.current : ""}`}
          aria-current={i === at ? "step" : undefined}>
          <span className={styles.stepBar} aria-hidden="true" />
          <span className={styles.stepName}>{s}</span>
          <span className={styles.stepNote}>{STEP_NOTE[s]}</span>
        </li>
      ))}
      {terminal && (
        <li className={`${styles.step} ${styles.current} ${styles.terminal}`} aria-current="step">
          <span className={styles.stepBar} aria-hidden="true" />
          <span className={styles.stepName}>{state === "NoDeal" ? "No deal" : "Cancelled"}</span>
          <span className={styles.stepNote}>{state === "NoDeal" ? "Nothing was funded" : "Before execution"}</span>
        </li>
      )}
    </ol>
  );
}

export function Usdc({ amount, symbol = "USDC", places = 2 }: { amount: string | bigint; symbol?: string; places?: number }) {
  return (
    <span className="num">
      {formatUnits(amount, 6, places)}
      <span className={styles.unit}> {symbol}</span>
    </span>
  );
}

export function Near({ yocto }: { yocto: string }) {
  return (
    <span className="num">
      {formatUnits(yocto, 24, 3)}
      <span className={styles.unit}> NEAR</span>
    </span>
  );
}

export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className={styles.kv}>
      {rows.map(([k, v], i) => (
        <div key={i} className={styles.kvRow}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

export function Account({ id, href }: { id: string; href?: string }) {
  const short = shortAccount(id);
  return href
    ? <a className={`mono link ${styles.account}`} href={href} title={id} target="_blank" rel="noreferrer">{short}</a>
    : <span className={`mono ${styles.account}`} title={id}>{short}</span>;
}

export function Hash({ value, n = 8 }: { value: string | null | undefined; n?: number }) {
  if (!value) return <span className="faint">none</span>;
  return <span className="mono" title={value}>{value.slice(0, n)}…</span>;
}

export function Meter({ value, max, tone = "teal" }: { value: bigint; max: bigint; tone?: "teal" | "muted" }) {
  const pct = max > 0n ? Number((value * 1000n) / max) / 10 : 0;
  return (
    <span className={styles.meter} role="img" aria-label={`${pct.toFixed(0)} percent`}>
      <span className={tone === "teal" ? styles.meterFill : styles.meterFillMuted} style={{ width: `${Math.min(100, pct)}%` }} />
    </span>
  );
}

export function PageHead({ eyebrow, title, lead, aside }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <div className={styles.pageHead}>
      <div className={styles.pageHeadText}>
        {eyebrow && <div className={styles.pageEyebrow}>{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {lead && <p className="body-lg">{lead}</p>}
      </div>
      {aside && <div className={styles.pageHeadAside}>{aside}</div>}
    </div>
  );
}
