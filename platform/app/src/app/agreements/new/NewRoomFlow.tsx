"use client";

// The guided way to open a deal room (docs/build/PLATFORM.md §5, buyer steps 4 and 5): pick the agreement type, write the brief,
// name the counterparty and its NEAR accounts, then review what the factory will charge before the wallet signs.
// Creation is the existing SDK call (`create_agreement` with type, title, vendor, settlement authority, canaries and
// timings); the room opens with an invitation card for the counterparty.
// Everything else on these screens (the brief, company names, domain, figures) stays in this browser
// (`accord-brief:<room>`): the buyer's own working brief, shown back on the invite card and the seal page, never published.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AccordError, formatUnits, type Kind, type Params } from "@accord/sdk";
import { browserAccord } from "@/components/chainClient";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CIRCLE_FAUCET, tokenSymbol, useAppConfig } from "@/components/AppConfig";
import type { PixelName } from "@/components/PixelIcon";
import styles from "./flow.module.css";
import { IconTile } from "@/components/IconTile";
import { shortAccount } from "@/components/account/short";
import {
  EMPTY_INTAKE, MAX_MILESTONES, briefErrors, briefFacts, milestones, sampleBrief, type Intake, type StoredBrief,
} from "./intake";

const DEMO: Params = {
  mode: "demo", timelock_secs: 120, claim_delay_secs: 120, grace_secs: 600, min_acceptance_window_secs: 60,
  max_acceptance_window_secs: 604_800, require_two_sided: true, observation_grace_secs: 60, refusal_limit: 5,
  refusal_window_secs: 3_600, agent_allowance: "500000000000000000000000",
};
const LIVE: Params = {
  ...DEMO, mode: "live", timelock_secs: 86_400, claim_delay_secs: 259_200, grace_secs: 345_600,
  min_acceptance_window_secs: 3_600, observation_grace_secs: 600,
};

type TypeCard = { id: string; kind: Kind | null; icon: PixelName; title: string; text: string };
const TYPES: TypeCard[] = [
  { id: "market-making", kind: "market-making", icon: "chart", title: "Market making",
    text: "A liquidity retainer paid per period when enough hidden-time readings of the venue meet the agreed spread and depth." },
  { id: "vendor", kind: "procurement", icon: "bag", title: "Vendor contracts",
    text: "Milestones paid when the buyer accepts a delivery, only to the vendor's proven account." },
  { id: "agent-services", kind: null, icon: "agents", title: "Agent services", text: "Buy a service from another company's agent within a weekly amount and a cap." },
  { id: "security", kind: null, icon: "shield", title: "Security fixes", text: "A fee held until the agreed checks pass and the named reviewer approves." },
  { id: "infrastructure", kind: null, icon: "server", title: "Infrastructure", text: "Monthly capacity paid when availability and latency meet the agreed levels." },
  { id: "grants", kind: null, icon: "vault", title: "Grants", text: "Tranches released when two of three named reviewers accept the milestone." },
];

const STEPS = ["Type", "Brief", "Counterparty", "Review"] as const;
const NEAR_ACCOUNT = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
const DOMAIN = /^(?=.{3,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/;

export interface DemoVendor { vendor: string; authority: string; domain: string }

function Field({ label, hint, error, children, id, optional }: {
  label: string; hint?: ReactNode; error?: string; children: ReactNode; id: string; optional?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}{optional ? <span className={styles.opt}>Optional</span> : null}</label>
      {children}
      {error ? <span className={styles.fieldError} role="alert">{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  );
}

function Unit({ children, unit }: { children: ReactNode; unit: string }) {
  return <div className={styles.unitWrap}>{children}<span className={styles.unit}>{unit}</span></div>;
}

function Lock() {
  return (
    <svg className={styles.lock} width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function NewRoomFlow({ network, deposit, demoAllowed, demoVendor }: {
  network: string; deposit: string | null; demoAllowed: boolean; demoVendor: DemoVendor | null;
}) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [typeId, setTypeId] = useState<string>("market-making");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [intake, setIntake] = useState<Intake>(EMPTY_INTAKE);
  const [domain, setDomain] = useState("");
  const [vendor, setVendor] = useState("");
  const [authority, setAuthority] = useState("");
  const [canaries, setCanaries] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [demo, setDemo] = useState(demoAllowed);
  const [shown, setShown] = useState<Set<number>>(new Set()); // steps whose field errors are visible
  // Settlement: the default factory's test USDC unless the visitor picks Circle's testnet USDC (when offered).
  const currencies = cfg.currencies ?? [];
  const [currencyId, setCurrencyId] = useState<"default" | "usdc">("default");
  const currency = currencies.find((c) => c.id === currencyId) ?? null;
  const factory = currency?.factory ?? cfg.factory;
  const symbol = tokenSymbol(cfg, factory);
  const circle = currencyId === "usdc";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headRef = useRef<HTMLDivElement>(null);

  const type = TYPES.find((t) => t.id === typeId)!;
  const kind: Kind = type.kind ?? "procurement";
  const proc = kind === "procurement";
  const canaryList = useMemo(() => canaries.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean), [canaries]);
  const suffix = network === "mainnet" ? "near" : network === "sandbox" ? "test.near" : "testnet";
  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setIntake((i) => ({ ...i, [k]: v }));

  const errorsFor = (i: number): Record<string, string> => {
    if (i === 1) return briefErrors(kind, title, intake);
    if (i === 2) {
      const e: Record<string, string> = {};
      const v = vendor.trim(), a = authority.trim();
      if (domain.trim() && !DOMAIN.test(domain.trim())) e.domain = "Enter a domain such as halcyon.markets.";
      if (!NEAR_ACCOUNT.test(v)) e.vendor = v ? "Not a valid NEAR account." : "Enter the vendor's NEAR account.";
      if (!NEAR_ACCOUNT.test(a)) e.authority = a ? "Not a valid NEAR account." : "Enter the vendor's settlement authority.";
      else if (v === a) e.authority = "Must be a different account from the vendor.";
      if (w.accountId && v === w.accountId) e.vendor = "The vendor cannot be your own account.";
      if (w.accountId && a === w.accountId) e.authority = "The settlement authority cannot be your own account.";
      const bad = canaryList.find((c) => !NEAR_ACCOUNT.test(c));
      if (bad) e.canaries = `${bad} is not a valid NEAR account.`;
      else if (canaryList.some((c) => c === v || c === a)) e.canaries = "A canary cannot be the vendor or its authority.";
      return e;
    }
    return {};
  };
  const blocker = (i: number): string | null => {
    if (i === 0) return type.kind ? null : "This agreement type is planned.";
    if (i === 3) return w.accountId ? null : "Sign in as the buyer to create the room.";
    const e = Object.values(errorsFor(i));
    return e.length ? (e.length === 1 ? e[0]! : `${e.length} fields need attention.`) : null;
  };
  const fe = (k: string): string | undefined => (shown.has(step) ? errorsFor(step)[k] : undefined);

  useEffect(() => { if (shown.has(step) && !blocker(step)) setError(null); });

  // advanced controls open by themselves when one of them has an error
  useEffect(() => { if (step === 2 && fe("canaries")) setAdvanced(true); });

  function go(to: number) {
    setDir(to > step ? 1 : -1);
    setError(null);
    setStep(to);
    requestAnimationFrame(() => {
      const top = headRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) headRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

  function next() {
    const b = blocker(step);
    if (b) { setShown((s) => new Set(s).add(step)); setError(b); return; }
    go(Math.min(step + 1, STEPS.length - 1));
  }

  function fillSample() {
    const s = sampleBrief(kind, circle);
    setTitle(s.title);
    setBrief(s.brief);
    setIntake((i) => ({ ...i, ...s.intake }));
  }

  function applyDemoVendor() {
    if (!demoVendor) return;
    setVendor(demoVendor.vendor);
    setAuthority(demoVendor.authority);
    setDomain(demoVendor.domain);
    setIntake((i) => ({ ...i, vendorCompany: "Halcyon Markets" }));
  }

  async function create() {
    const b = blocker(3);
    if (b || !w.signer || !type.kind) { setError(b ?? "Sign in as the buyer to create the room."); return; }
    setBusy(true);
    setError(null);
    try {
      const accord = browserAccord(cfg, { factory, signer: w.signer });
      const { agreement } = await accord.createAgreement({
        kind: type.kind, title: title.trim(), vendor: vendor.trim(), vendor_authority: authority.trim(),
        canaries: canaryList, params: demo ? DEMO : LIVE,
      });
      try {
        const kept: StoredBrief = { brief: brief.trim(), domain: domain.trim(), kind: type.kind, symbol, intake: { ...intake, milestones: milestones(intake) } };
        localStorage.setItem(`accord-brief:${agreement}`, JSON.stringify(kept));
      } catch {
        // storage unavailable: the brief is simply not kept
      }
      router.push(`/agreements/${agreement}?created=1`);
    } catch (err) {
      setError(err instanceof AccordError ? err.code ?? err.message : (err as Error).message);
      setBusy(false);
    }
  }

  const facts = briefFacts(kind, intake, symbol);
  const ease = [0.2, 0.8, 0.3, 1] as const;
  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 16 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -16 }),
  };
  const head = (id: string, h: string, lead: ReactNode, action?: ReactNode) => (
    <div className={styles.head}>
      <div className={styles.headText}>
        <h2 id={id} className={styles.h}>{h}</h2>
        <p className={styles.lead}>{lead}</p>
      </div>
      {action}
    </div>
  );
  const amountInput = (id: string, k: keyof Intake, unit: string, placeholder: string, numeric = false) => (
    <Unit unit={unit}>
      <input id={id} className={styles.input} inputMode={numeric ? "numeric" : "decimal"} value={String(intake[k])} aria-invalid={!!fe(k)}
        onChange={(e) => set(k, e.target.value as Intake[typeof k])} placeholder={placeholder} />
    </Unit>
  );

  const stepBody = (() => {
    if (step === 0) return (
      <section aria-labelledby="t-type">
        <h2 id="t-type" className={styles.h}>What kind of agreement?</h2>
        <p className={styles.typeLead}>Every type runs the same controls. Only the terms and the evidence that releases a payment change.</p>
        <div className={styles.types} role="radiogroup" aria-label="Agreement type">
          {TYPES.map((t) => {
            const on = t.id === typeId, planned = !t.kind;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} aria-disabled={planned} disabled={planned}
                className={`${styles.type} ${on ? styles.typeOn : ""} ${planned ? styles.typePlanned : ""}`}
                onClick={() => { setTypeId(t.id); setError(null); }}>
                <span className={styles.typeTop}>
                  <IconTile name={t.icon} size={40} />
                  {planned ? <span className={styles.planned}>Planned</span> : on ? <span className={styles.typeCheck} aria-hidden="true">✓</span> : null}
                </span>
                <span className={styles.typeTitle}>{t.title}</span>
                <span className={styles.typeText}>{t.text}</span>
              </button>
            );
          })}
        </div>
      </section>
    );

    if (step === 1) return (
      <section aria-labelledby="t-brief" className={styles.col}>
        {head("t-brief", "Write the brief", "Only the title is public on NEAR. Everything else stays in this browser.",
          <button type="button" className={styles.textBtn} onClick={fillSample}>Fill with an example</button>)}

        <div className={styles.fields}>
          <Field id="f-title" label="Room title" error={fe("title")}>
            <input id="f-title" className={`${styles.input} ${styles.text}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              aria-invalid={!!fe("title")} placeholder={proc ? "Treasury reporting integration, phase one" : "NEAR/USDC liquidity retainer, Q1"} />
          </Field>

          {currencies.length > 1 && (
            <div className={styles.field}>
              <span className={styles.label} id="l-cur">Settle in</span>
              <div className={styles.segment} role="radiogroup" aria-labelledby="l-cur">
                {currencies.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={currencyId === c.id}
                    className={`${styles.segBtn} ${currencyId === c.id ? styles.segOn : ""}`} onClick={() => setCurrencyId(c.id)}>
                    {c.id === "usdc" ? "Circle USDC" : "Test USDC"}
                  </button>
                ))}
              </div>
              {circle && (
                <span className={styles.hint}>
                  Fund it from <a className="link" href={CIRCLE_FAUCET} target="_blank" rel="noreferrer">faucet.circle.com</a> (NEAR Testnet), about 20 USDC per address every 1 to 2 hours.
                </span>
              )}
            </div>
          )}

          <Field id="f-brief" label={proc ? "Scope" : "Mandate"} optional>
            <textarea id="f-brief" className={styles.textarea} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1200} rows={4}
              placeholder={proc
                ? "What you are buying, what counts as delivered, and when to walk away."
                : "What the desk must keep up, on which pool, and when a period is not paid."} />
          </Field>

          {proc ? (
            <div className={styles.field}>
              <span className={styles.label}>Milestones<span className={styles.opt}>Optional</span></span>
              <div className={styles.milestones}>
                <AnimatePresence initial={false}>
                  {intake.milestones.map((m, n) => (
                    <motion.div key={n} className={styles.milestone}
                      initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease }}>
                      <div className={styles.msRow}>
                        <span className={styles.msNo}>{n + 1}</span>
                        <input className={`${styles.input} ${styles.text}`} aria-label={`Milestone ${n + 1} name`} value={m.name} maxLength={60}
                          placeholder={["Data pipeline", "Dashboard", "Handover"][n] ?? "Milestone"}
                          onChange={(e) => set("milestones", intake.milestones.map((x, j) => (j === n ? { ...x, name: e.target.value } : x)))} />
                        <input className={`${styles.input} ${styles.text}`} aria-label={`Milestone ${n + 1} deliverable`} value={m.deliverable} maxLength={160}
                          placeholder="Accepted when…"
                          onChange={(e) => set("milestones", intake.milestones.map((x, j) => (j === n ? { ...x, deliverable: e.target.value } : x)))} />
                        <button type="button" className={styles.remove} aria-label={`Remove milestone ${n + 1}`} disabled={intake.milestones.length === 1}
                          onClick={() => set("milestones", intake.milestones.filter((_, j) => j !== n))}>×</button>
                      </div>
                      {fe(`milestone${n}`) && <span className={`${styles.fieldError} ${styles.msErr}`} role="alert">{fe(`milestone${n}`)}</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {intake.milestones.length < MAX_MILESTONES && (
                <button type="button" className={styles.textBtn} onClick={() => set("milestones", [...intake.milestones, { name: "", deliverable: "" }])}>+ Add milestone</button>
              )}
            </div>
          ) : (
            <Field id="f-pair" label="Pair" optional error={fe("pair")}>
              <input id="f-pair" className={styles.input} value={intake.pair} onChange={(e) => set("pair", e.target.value.toUpperCase())} maxLength={25} placeholder="NEAR/USDC" aria-invalid={!!fe("pair")} />
            </Field>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}><Lock />Sealed limits<span className={styles.opt}>Optional</span></span>
            <span className={styles.sectionNote}>You seal these once the room exists. Only the Sealed Table&apos;s enclave reads them; the vendor never does.</span>
          </div>
          <div className={styles.grid}>
            {proc ? (
              <>
                <Field id="f-ceiling" label="Budget ceiling" error={fe("ceiling")}>{amountInput("f-ceiling", "ceiling", symbol, circle ? "18.00" : "40.00")}</Field>
                <Field id="f-target" label="Target price" error={fe("target")}>{amountInput("f-target", "target", symbol, circle ? "15.00" : "32.00")}</Field>
                <Field id="f-term" label="Longest term" error={fe("termWeeks")}>{amountInput("f-term", "termWeeks", "weeks", "4", true)}</Field>
                <Field id="f-review" label="Review time per delivery" error={fe("reviewDays")}>{amountInput("f-review", "reviewDays", "days", "2", true)}</Field>
              </>
            ) : (
              <>
                <Field id="f-ret" label="Retainer per period" error={fe("retainer")}>{amountInput("f-ret", "retainer", symbol, circle ? "4.00" : "8.00")}</Field>
                <Field id="f-per" label="Periods" error={fe("periods")}>{amountInput("f-per", "periods", "periods", "4", true)}</Field>
                <Field id="f-spread" label="Widest spread" error={fe("spreadBps")}>{amountInput("f-spread", "spreadBps", "bps", "200", true)}</Field>
                <Field id="f-depth" label="Depth each side" error={fe("depth")}>{amountInput("f-depth", "depth", symbol, "20.00")}</Field>
                <Field id="f-slots" label="Readings per period" error={fe("slots")}>{amountInput("f-slots", "slots", "readings", "6", true)}</Field>
                <Field id="f-thr" label="Readings that must pass" error={fe("threshold")}>{amountInput("f-thr", "threshold", "readings", "4", true)}</Field>
              </>
            )}
          </div>
        </div>
      </section>
    );

    if (step === 2) return (
      <section aria-labelledby="t-party" className={styles.col}>
        {head("t-party", "Who is the counterparty?", "The vendor seals its own limits. Its settlement authority, a separate account, approves where payments go.",
          demoVendor && type.kind === "procurement" ? <button type="button" className={styles.textBtn} onClick={applyDemoVendor}>Use the demo vendor</button> : undefined)}

        <div className={styles.fields}>
          <div className={styles.grid}>
            <Field id="f-vco" label="Vendor company" optional>
              <input id="f-vco" className={`${styles.input} ${styles.text}`} value={intake.vendorCompany} onChange={(e) => set("vendorCompany", e.target.value)} maxLength={80} placeholder="Halcyon Markets" />
            </Field>
            <Field id="f-domain" label="Domain" optional error={fe("domain")}>
              <input id="f-domain" className={styles.input} value={domain} onChange={(e) => setDomain(e.target.value.trim().toLowerCase())} placeholder="halcyon.markets" aria-invalid={!!fe("domain")} />
            </Field>
          </div>
          <Field id="f-vendor" label="Vendor account" error={fe("vendor")}>
            <input id="f-vendor" className={styles.input} value={vendor} onChange={(e) => setVendor(e.target.value.trim().toLowerCase())} placeholder={`halcyon-desk.${suffix}`} aria-invalid={!!fe("vendor")} autoComplete="off" spellCheck={false} />
          </Field>
          <Field id="f-auth" label="Settlement authority" error={fe("authority")} hint="A second vendor account. It approves the payout account.">
            <input id="f-auth" className={styles.input} value={authority} onChange={(e) => setAuthority(e.target.value.trim().toLowerCase())} placeholder={`halcyon-treasury.${suffix}`} aria-invalid={!!fe("authority")} autoComplete="off" spellCheck={false} />
          </Field>
        </div>

        <div className={styles.section}>
          <div className={styles.fields}>
            <Field id="f-bco" label="Your company" optional hint={w.accountId ? <>Signing as <span className="mono">{shortAccount(w.accountId)}</span></> : "Sign in to set the buyer account."}>
              <input id="f-bco" className={`${styles.input} ${styles.text}`} value={intake.buyerCompany} onChange={(e) => set("buyerCompany", e.target.value)} maxLength={80} placeholder="Northwind Foundation" />
            </Field>
          </div>
        </div>

        <div className={styles.section}>
          <button type="button" className={styles.advanced} onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
            <span className={`${styles.chev} ${advanced ? styles.chevOpen : ""}`} aria-hidden="true">›</span>Advanced controls
          </button>
          <AnimatePresence initial={false}>
            {advanced && (
              <motion.div className={styles.advancedWrap} initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.24, ease }}>
                <div className={`${styles.fields} ${styles.advancedBody}`}>
                  <Field id="f-can" label="Canary accounts" optional error={fe("canaries")}
                    hint="Accounts nobody should ever pay. A request naming one deletes your agent's key.">
                    <input id="f-can" className={styles.input} value={canaries} onChange={(e) => setCanaries(e.target.value)} placeholder={`halcyon-payments.${suffix}`} />
                  </Field>
                  <div className={styles.field}>
                    <span className={styles.label} id="l-time">Timings</span>
                    <div className={styles.segment} role="radiogroup" aria-labelledby="l-time">
                      <button type="button" role="radio" aria-checked={!demo} className={`${styles.segBtn} ${!demo ? styles.segOn : ""}`} onClick={() => setDemo(false)}>Live</button>
                      <button type="button" role="radio" aria-checked={demo} disabled={!demoAllowed} className={`${styles.segBtn} ${demo ? styles.segOn : ""}`} onClick={() => setDemo(true)}>Demo</button>
                    </div>
                    <span className={styles.hint}>{demo
                      ? "A recipient change waits 2 minutes and a claim 2 minutes."
                      : `A recipient change waits 24 hours and a claim 72 hours.${demoAllowed ? "" : " This factory allows live timings only."}`}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    );

    const privateRows: [string, ReactNode, boolean?][] = [
      ...(intake.buyerCompany.trim() ? [["Your company", intake.buyerCompany.trim()] as [string, ReactNode]] : []),
      ...(intake.vendorCompany.trim() || domain ? [["Vendor", <>{intake.vendorCompany.trim()}{domain ? <span className={intake.vendorCompany.trim() ? styles.faint : "mono"}>{intake.vendorCompany.trim() ? ` · ${domain}` : domain}</span> : null}</>] as [string, ReactNode]] : []),
      ...(brief.trim() ? [[proc ? "Scope" : "Mandate", <span key="b" className={styles.clamp}>{brief.trim()}</span>] as [string, ReactNode]] : []),
      ...facts.map((f) => [f.label, f.value, true] as [string, ReactNode, boolean]),
    ];
    return (
      <section aria-labelledby="t-review" className={styles.col}>
        {head("t-review", "Review and create", "The room becomes its own NEAR account. Nothing is negotiated, funded or paid yet.")}

        <div className={styles.reviewBlock}>
          <div className={styles.reviewHead}><h3>On NEAR</h3><button type="button" className={styles.edit} onClick={() => go(2)}>Edit</button></div>
          <dl className={styles.review}>
            <div><dt>Type</dt><dd>{type.title}</dd></div>
            <div><dt>Title</dt><dd>{title.trim()}</dd></div>
            <div><dt>Buyer</dt><dd className="mono">{w.accountId ?? "Not signed in"}</dd></div>
            <div><dt>Vendor</dt><dd className="mono">{vendor}</dd></div>
            <div><dt>Settlement authority</dt><dd className="mono">{authority}</dd></div>
            {canaryList.length > 0 && <div><dt>Canaries</dt><dd className="mono">{canaryList.join(", ")}</dd></div>}
            <div><dt>Settles in</dt><dd className="mono">{symbol}</dd></div>
            <div><dt>Timings</dt><dd>{demo ? "Demo" : "Live"}</dd></div>
          </dl>
        </div>

        <div className={styles.reviewBlock}>
          <div className={styles.reviewHead}><h3>Private to you</h3><button type="button" className={styles.edit} onClick={() => go(1)}>Edit</button></div>
          {privateRows.length ? (
            <dl className={styles.review}>
              {privateRows.map(([label, value, mono]) => <div key={label}><dt>{label}</dt><dd className={mono ? "mono" : undefined}>{value}</dd></div>)}
            </dl>
          ) : <p className={styles.empty}>Nothing added. You can still set your limits when you seal.</p>}
        </div>

        <p className={styles.sign}>
          You sign <span className="mono">create_agreement</span> on <span className="mono">{factory}</span>
          <span className={styles.dot} aria-hidden="true">·</span>deposit <span className="mono">{deposit ? `${formatUnits(deposit, 24, 2)} NEAR` : "read from the factory"}</span>
        </p>
      </section>
    );
  })();

  return (
    <div className={styles.flow}>
      <div className={styles.stepper} ref={headRef}>
        <ol className={styles.steps} aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className={`${styles.stepItem} ${i === step ? styles.stepOn : ""} ${i < step ? styles.stepDone : ""}`} aria-current={i === step ? "step" : undefined}>
              <button type="button" onClick={() => { if (i < step) go(i); }} disabled={i >= step}>
                {i < step ? <span className={styles.check} aria-hidden="true">✓</span> : null}
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ol>
        {/* one thin line under the row that fills as you advance */}
        <span className={styles.track} aria-hidden="true"><span className={styles.fill} style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} /></span>
      </div>

      <div className={styles.body}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: reduce ? 0.12 : 0.24, ease }}>
            {stepBody}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.foot}>
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p key={error} className={styles.error} role="alert" initial={reduce ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {error}
            </motion.p>
          ) : <span key="none" />}
        </AnimatePresence>
        <div className={styles.buttons}>
          {step > 0 && <button type="button" className={styles.back} onClick={() => go(step - 1)} disabled={busy}>Back</button>}
          {step < 3 ? (
            <button type="button" className={styles.primary} onClick={next}>Continue</button>
          ) : (
            <button type="button" className={styles.primary} onClick={() => void create()} disabled={busy || !w.accountId}>
              {busy ? <><span className={styles.spinner} aria-hidden="true" />Creating the room…</> : w.accountId ? "Create the deal room" : "Sign in as the buyer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
