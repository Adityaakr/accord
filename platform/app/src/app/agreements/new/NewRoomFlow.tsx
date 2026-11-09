"use client";

// The guided way to open a deal room (docs/build/PLATFORM.md §5, buyer steps 4 and 5): pick the agreement type, write the brief,
// name both companies and their NEAR accounts, then review what the factory will charge before the wallet signs.
// Creation is the existing SDK call (`create_agreement` with type, title, vendor, settlement authority, canaries and
// timings); the room opens with an invitation card for the counterparty.
// Everything else on these screens (the brief, company names, domain, figures) stays in this browser: it is the buyer's
// own working brief, shown back on the invite card and the seal page, and is never published. Each field says where it goes.

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
  EMPTY_INTAKE, MAX_MILESTONES, briefErrors, briefFacts, milestones, sampleBrief, type Intake, type StoredBrief, type Where,
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

type TypeCard = {
  id: string; kind: Kind | null; icon: PixelName; title: string; text: string;
  usedFor?: string; releases?: string; parties?: [string, string];
};
const TYPES: TypeCard[] = [
  { id: "market-making", kind: "market-making", icon: "chart", title: "Market making",
    text: "A liquidity retainer paid per period, only when readings of the pool at hidden times meet the agreed spread and depth.",
    usedFor: "Token issuers and foundations retaining a desk to keep a pair liquid on a NEAR venue.",
    releases: "Observer readings of the Rhea pool pass for the period",
    parties: ["The issuer or treasury", "The market-making desk"] },
  { id: "vendor", kind: "procurement", icon: "bag", title: "Vendor contracts",
    text: "Milestones paid when you accept a delivery, and only to the vendor's proven account.",
    usedFor: "Integrations, data feeds, audits and other services billed by milestone.",
    releases: "You accept the delivery for that milestone",
    parties: ["Your company, the buyer", "The supplier"] },
  { id: "agent-services", kind: null, icon: "agents", title: "Agent services", text: "Buy a service from another company's agent within a weekly amount and a cap." },
  { id: "security", kind: null, icon: "shield", title: "Security fixes", text: "A fee held until the agreed checks pass and the named reviewer approves." },
  { id: "infrastructure", kind: null, icon: "server", title: "Infrastructure", text: "Monthly capacity paid when availability and latency meet the agreed levels." },
  { id: "grants", kind: null, icon: "vault", title: "Grants", text: "Tranches released when two of three named reviewers accept the milestone." },
];

const STEPS = ["Type", "Brief", "Counterparty", "Review"] as const;
const CONTINUE = ["Continue to the brief", "Continue to the counterparty", "Review the room"] as const;
const NEAR_ACCOUNT = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
const DOMAIN = /^(?=.{3,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/;

export interface DemoVendor { vendor: string; authority: string; domain: string }

const WHERE_LABEL: Record<Where, string> = { public: "Public on NEAR", browser: "This browser only", sealed: "Sealed next" };
const WHERE_TITLE: Record<Where, string> = {
  public: "Written to the room's NEAR account when you create it. Anyone can read it.",
  browser: "Kept in this browser's storage for your own reference. Never sent to NEAR or to Accord's server.",
  sealed: "Kept in this browser for now. You enter it as a sealed limit on the next screen, where it is encrypted to the Sealed Table's enclave.",
};

function Tag({ where }: { where: Where }) {
  return <span className={`${styles.tag} ${styles[`tag_${where}`]}`} title={WHERE_TITLE[where]}><i aria-hidden="true" /><span className={styles.tagText}>{WHERE_LABEL[where]}</span></span>;
}

function Field({ label, where, hint, error, children, id, optional }: {
  label: string; where: Where; hint?: ReactNode; error?: string; children: ReactNode; id: string; optional?: boolean;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>{label}{optional ? <span className={styles.opt}> optional</span> : null}</label>
        <Tag where={where} />
      </div>
      {children}
      {error ? <span className={styles.fieldError} id={`${id}-err`} role="alert">{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  );
}

function Unit({ children, unit }: { children: ReactNode; unit: string }) {
  return <div className={styles.unitWrap}>{children}<span className={styles.unit}>{unit}</span></div>;
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
  const canaryList = useMemo(() => canaries.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean), [canaries]);
  const suffix = network === "mainnet" ? "near" : network === "sandbox" ? "test.near" : "testnet";
  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setIntake((i) => ({ ...i, [k]: v }));

  // field errors per step, in plain words
  const errorsFor = (i: number): Record<string, string> => {
    if (i === 1) return briefErrors(kind, title, intake);
    if (i === 2) {
      const e: Record<string, string> = {};
      const v = vendor.trim(), a = authority.trim();
      if (domain.trim() && !DOMAIN.test(domain.trim())) e.domain = "Enter a domain such as halcyon.markets, without https:// or a path.";
      if (!NEAR_ACCOUNT.test(v)) e.vendor = v ? "Not a valid NEAR account. Use lowercase letters, digits, - and _, separated by dots." : "Enter the vendor's NEAR account.";
      if (!NEAR_ACCOUNT.test(a)) e.authority = a ? "Not a valid NEAR account." : "Enter the vendor's settlement authority.";
      else if (v === a) e.authority = "Must be a different account from the vendor, so one stolen key cannot redirect payments.";
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
    if (i === 0) return type.kind ? null : "This agreement type is planned. Choose market making or vendor contracts.";
    if (i === 3) return w.accountId ? null : "Sign in as the buyer to create the room.";
    const e = Object.values(errorsFor(i));
    return e.length ? (e.length === 1 ? e[0]! : `${e.length} fields need attention before you continue.`) : null;
  };
  const fe = (k: string): string | undefined => (shown.has(step) ? errorsFor(step)[k] : undefined);

  useEffect(() => { if (shown.has(step) && !blocker(step)) setError(null); });

  function go(to: number) {
    setDir(to > step ? 1 : -1);
    setError(null);
    setStep(to);
    // bring the step's heading into view on a phone, where the flow can be taller than the screen
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
    setIntake((i) => ({ ...i, ...s.intake, buyerCompany: i.buyerCompany || "Northwind Foundation" }));
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
  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -28 }),
  };

  const stepBody = (() => {
    if (step === 0) return (
      <section aria-labelledby="t-type">
        <p className={styles.kicker}>Step 1 of 4</p>
        <h2 id="t-type" className={styles.h}>What kind of agreement are you opening?</h2>
        <p className={styles.lead}>Every type runs on the same controls: sealed limits, a negotiation inside the Sealed Table, approval by both companies, and an agent that can only pay what the terms allow. The type sets the terms and the evidence that releases each payment.</p>
        <div className={`${styles.types} ${styles.reveal}`} role="radiogroup" aria-label="Agreement type">
          {TYPES.map((t) => {
            const on = t.id === typeId, planned = !t.kind;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} aria-disabled={planned} disabled={planned}
                className={`${styles.type} ${on ? styles.typeOn : ""} ${planned ? styles.typePlanned : ""}`}
                onClick={() => { setTypeId(t.id); setError(null); }}>
                <span className={styles.typeTop}>
                  <IconTile name={t.icon} size={40} />
                  {planned ? <span className={styles.planned}>Planned</span> : <span className={`${styles.radio} ${on ? styles.radioOn : ""}`} aria-hidden="true" />}
                </span>
                <span className={styles.typeTitle}>{t.title}</span>
                <span className={styles.typeText}>{t.text}</span>
                {t.usedFor && <span className={styles.typeMeta}><b>Used for</b>{t.usedFor}</span>}
                {t.releases && <span className={styles.typeMeta}><b>Payment releases when</b>{t.releases}</span>}
              </button>
            );
          })}
        </div>
      </section>
    );

    if (step === 1) return (
      <section aria-labelledby="t-brief">
        <p className={styles.kicker}>Step 2 of 4 · {type.title}</p>
        <h2 id="t-brief" className={styles.h}>Write the brief</h2>
        <p className={styles.lead}>Name the room and set down what your company wants from this {kind === "procurement" ? "supplier" : "desk"}. Only the title goes on NEAR. The rest is your working brief: it stays in this browser, and the figures marked <em>Sealed next</em> are the limits you seal on the next screen.</p>
        <div className={styles.sampleBar}>
          <span>Starting from scratch? Fill the form with a worked example from a fictional buyer, then edit it.</span>
          <button type="button" className={styles.ghost} onClick={fillSample}>Use the sample brief</button>
        </div>

        <div className={`${styles.form} ${styles.reveal}`}>
          <fieldset className={styles.group}>
            <legend className={styles.groupTitle}>The room</legend>
            <Field id="f-title" label="Room title" where="public" error={fe("title")}
              hint="Both companies see it in the deal room. Keep commercial figures out of it.">
              <input id="f-title" className={`${styles.input} ${styles.text}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
                aria-invalid={!!fe("title")} placeholder={kind === "procurement" ? "Treasury reporting integration, phase one" : "NEAR/USDC liquidity retainer, Q1"} />
            </Field>
            <div className={styles.pair}>
              <Field id="f-ref" label="Internal reference" where="browser" optional hint="A PO, cost centre or ticket number, for your own records.">
                <input id="f-ref" className={styles.input} value={intake.reference} onChange={(e) => set("reference", e.target.value)} maxLength={40} placeholder={kind === "procurement" ? "PO-2026-0142" : "TRS-MM-Q1"} />
              </Field>
              <Field id="f-cur" label="Settle in" where="public" hint={currencies.length > 1 ? "Picks the factory, and so the token the room holds and pays in." : "The token this room holds in escrow and pays in."}>
                {currencies.length > 1 ? (
                  <div className={styles.segment} role="radiogroup" aria-label="Settle in" id="f-cur">
                    {currencies.map((c) => (
                      <button key={c.id} type="button" role="radio" aria-checked={currencyId === c.id}
                        className={`${styles.segBtn} ${currencyId === c.id ? styles.segOn : ""}`} onClick={() => setCurrencyId(c.id)}>
                        {c.id === "usdc" ? "Circle USDC" : "Test USDC (tUSDC)"}
                      </button>
                    ))}
                  </div>
                ) : <div className={styles.static} id="f-cur">{symbol === "USDC" ? "USDC" : "Test USDC (tUSDC)"}</div>}
              </Field>
            </div>
            {circle && (
              <p className={styles.note}>
                You fund a Circle USDC room from <a className="link" href={CIRCLE_FAUCET} target="_blank" rel="noreferrer">faucet.circle.com</a> (network NEAR Testnet): about 20 USDC per address every 1 to 2 hours, so keep the ceiling you seal within 20 USDC.
              </p>
            )}
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupTitle}>{kind === "procurement" ? "Scope of work" : "Mandate for the desk"}</legend>
            <Field id="f-brief" label={kind === "procurement" ? "What you are buying" : "What the desk must do"} where="browser"
              hint={`${brief.length}/1200 · Your own notes for the negotiation. You write the instructions your negotiator follows when you seal.`}>
              <textarea id="f-brief" className={styles.textarea} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1200} rows={4}
                placeholder={kind === "procurement"
                  ? "Integrate liquidity reporting into our treasury dashboard: a data pipeline, a dashboard and a handover. Walk away rather than exceed the ceiling."
                  : "Keep NEAR/USDC liquid on the Rhea pool: quotes on both sides, spread within 200 bps. Pay a period only when the readings met the terms."} />
            </Field>

            {kind === "procurement" && (
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>Milestones <span className={styles.opt}>optional · up to {MAX_MILESTONES}</span></span>
                  <Tag where="browser" />
                </div>
                <div className={styles.milestones}>
                  <AnimatePresence initial={false}>
                    {intake.milestones.map((m, n) => (
                      <motion.div key={n} className={styles.milestone} layout={!reduce}
                        initial={reduce ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.3, 1] }}>
                        <span className={styles.msNo}>{n + 1}</span>
                        <input className={`${styles.input} ${styles.text}`} aria-label={`Milestone ${n + 1} name`} value={m.name} maxLength={60}
                          placeholder={["Data pipeline", "Dashboard", "Handover"][n] ?? "Milestone"}
                          onChange={(e) => set("milestones", intake.milestones.map((x, j) => (j === n ? { ...x, name: e.target.value } : x)))} />
                        <input className={`${styles.input} ${styles.text}`} aria-label={`Milestone ${n + 1} deliverable`} value={m.deliverable} maxLength={160}
                          placeholder={["Hourly pool snapshots in our database, with tests", "Spread, depth and volume panels", "Runbook and a one-hour walkthrough"][n] ?? "What you accept as delivered"}
                          onChange={(e) => set("milestones", intake.milestones.map((x, j) => (j === n ? { ...x, deliverable: e.target.value } : x)))} />
                        <button type="button" className={styles.remove} aria-label={`Remove milestone ${n + 1}`} disabled={intake.milestones.length === 1}
                          onClick={() => set("milestones", intake.milestones.filter((_, j) => j !== n))}>×</button>
                        {fe(`milestone${n}`) && <span className={`${styles.fieldError} ${styles.msErr}`} role="alert">{fe(`milestone${n}`)}</span>}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className={styles.msFoot}>
                  <button type="button" className={styles.ghost} disabled={intake.milestones.length >= MAX_MILESTONES}
                    onClick={() => set("milestones", [...intake.milestones, { name: "", deliverable: "" }])}>Add a milestone</button>
                  <span className={styles.hint}>The negotiated terms set the final items and amounts. Each one pays only when you accept its delivery.</span>
                </div>
              </div>
            )}

            {kind === "market-making" && (
              <div className={styles.pair}>
                <Field id="f-pair" label="Pair" where="browser" optional error={fe("pair")} hint="The pool readings come from is fixed in the mandate you seal.">
                  <input id="f-pair" className={styles.input} value={intake.pair} onChange={(e) => set("pair", e.target.value.toUpperCase())} maxLength={25} placeholder="NEAR/USDC" />
                </Field>
                <Field id="f-venue" label="Venue" where="sealed" hint="Shared with the desk in the sealed mandate.">
                  <div className={styles.static} id="f-venue">Rhea DCL pool, NEAR mainnet</div>
                </Field>
              </div>
            )}
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupTitle}>{kind === "procurement" ? "Budget and timeline" : "Retainer and service levels"}<span className={styles.opt}> all optional</span></legend>
            <p className={styles.groupLead}>Your limits, for your eyes. The vendor never sees them: you seal them on the next screen, and only the Sealed Table's enclave reads them.</p>
            {kind === "procurement" ? (
              <>
                <div className={styles.pair}>
                  <Field id="f-ceiling" label="Budget ceiling" where="sealed" error={fe("ceiling")} hint="The most you will pay in all. Your negotiator walks away above it.">
                    <Unit unit={symbol}><input id="f-ceiling" className={styles.input} inputMode="decimal" value={intake.ceiling} onChange={(e) => set("ceiling", e.target.value)} placeholder={circle ? "18.00" : "40.00"} /></Unit>
                  </Field>
                  <Field id="f-target" label="Target price" where="sealed" error={fe("target")} hint="What you aim to pay.">
                    <Unit unit={symbol}><input id="f-target" className={styles.input} inputMode="decimal" value={intake.target} onChange={(e) => set("target", e.target.value)} placeholder={circle ? "15.00" : "32.00"} /></Unit>
                  </Field>
                </div>
                <div className={styles.pair}>
                  <Field id="f-term" label="Term" where="sealed" error={fe("termWeeks")} hint="The longest the engagement may run.">
                    <Unit unit="weeks"><input id="f-term" className={styles.input} inputMode="numeric" value={intake.termWeeks} onChange={(e) => set("termWeeks", e.target.value)} placeholder="4" /></Unit>
                  </Field>
                  <Field id="f-review" label="Review window" where="sealed" error={fe("reviewDays")} hint="Time you need to check each delivery before it counts as accepted.">
                    <Unit unit="days"><input id="f-review" className={styles.input} inputMode="numeric" value={intake.reviewDays} onChange={(e) => set("reviewDays", e.target.value)} placeholder="2" /></Unit>
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className={styles.pair}>
                  <Field id="f-ret" label="Retainer ceiling" where="sealed" error={fe("retainer")} hint="The most you pay for one period that passes.">
                    <Unit unit={`${symbol} / period`}><input id="f-ret" className={styles.input} inputMode="decimal" value={intake.retainer} onChange={(e) => set("retainer", e.target.value)} placeholder={circle ? "4.00" : "8.00"} /></Unit>
                  </Field>
                  <Field id="f-per" label="Periods" where="sealed" error={fe("periods")} hint="How many periods the retainer covers.">
                    <Unit unit="periods"><input id="f-per" className={styles.input} inputMode="numeric" value={intake.periods} onChange={(e) => set("periods", e.target.value)} placeholder="4" /></Unit>
                  </Field>
                </div>
                <div className={styles.triple}>
                  <Field id="f-spread" label="Widest spread" where="sealed" error={fe("spreadBps")} hint="100 bps is 1%.">
                    <Unit unit="bps"><input id="f-spread" className={styles.input} inputMode="numeric" value={intake.spreadBps} onChange={(e) => set("spreadBps", e.target.value)} placeholder="200" /></Unit>
                  </Field>
                  <Field id="f-depth" label="Depth each side" where="sealed" error={fe("depth")} hint="Least liquidity on the bid and on the ask.">
                    <Unit unit={symbol}><input id="f-depth" className={styles.input} inputMode="decimal" value={intake.depth} onChange={(e) => set("depth", e.target.value)} placeholder="20.00" /></Unit>
                  </Field>
                  <Field id="f-band" label="Within" where="sealed" error={fe("bandBps")} hint="Of the mid price.">
                    <Unit unit="bps"><input id="f-band" className={styles.input} inputMode="numeric" value={intake.bandBps} onChange={(e) => set("bandBps", e.target.value)} placeholder="200" /></Unit>
                  </Field>
                </div>
                <div className={styles.pair}>
                  <Field id="f-slots" label="Readings per period" where="sealed" error={fe("slots")} hint="Taken at times drawn inside the observer's enclave, unknown in advance.">
                    <Unit unit="readings"><input id="f-slots" className={styles.input} inputMode="numeric" value={intake.slots} onChange={(e) => set("slots", e.target.value)} placeholder="6" /></Unit>
                  </Field>
                  <Field id="f-thr" label="Readings that must pass" where="sealed" error={fe("threshold")} hint="Your uptime bar. A period below it is not paid.">
                    <Unit unit="must pass"><input id="f-thr" className={styles.input} inputMode="numeric" value={intake.threshold} onChange={(e) => set("threshold", e.target.value)} placeholder="4" /></Unit>
                  </Field>
                </div>
              </>
            )}
          </fieldset>
        </div>
      </section>
    );

    if (step === 2) return (
      <section aria-labelledby="t-party">
        <p className={styles.kicker}>Step 3 of 4 · {type.title}</p>
        <h2 id="t-party" className={styles.h}>Who is on each side?</h2>
        <p className={styles.lead}>A room has three accounts. Yours, as the buyer. The vendor&apos;s, which seals its own limits and delivers. And the vendor&apos;s settlement authority, a separate account that approves where payments go, so one stolen key cannot redirect them.</p>
        {demoVendor && type.kind === "procurement" && (
          <div className={styles.sampleBar}>
            <span>No counterparty to hand? Accord&apos;s demo vendor, a fictional supplier, plays its side of the room for you.</span>
            <button type="button" className={styles.ghost} onClick={applyDemoVendor}>Use the demo vendor</button>
          </div>
        )}
        <div className={`${styles.parties} ${styles.reveal}`}>
          <div className={styles.party}>
            <div className={styles.partyHead}><span className={styles.role}>Buyer</span><span className={styles.partyNote}>{type.parties?.[0]}</span></div>
            <Field id="f-bco" label="Your company" where="browser" optional hint="Shown on your copy of the room's brief.">
              <input id="f-bco" className={`${styles.input} ${styles.text}`} value={intake.buyerCompany} onChange={(e) => set("buyerCompany", e.target.value)} maxLength={80} placeholder="Northwind Foundation" />
            </Field>
            <Field id="f-buyer" label="Buyer account" where="public" hint="Signs the room, seals your limits, approves the terms, funds escrow and installs your agent's key.">
              <div className={`${styles.static} mono`} id="f-buyer">{w.accountId ?? "Sign in to set the buyer"}</div>
            </Field>
          </div>
          <div className={styles.party}>
            <div className={styles.partyHead}><span className={`${styles.role} ${styles.roleVendor}`}>Vendor</span><span className={styles.partyNote}>{type.parties?.[1]}</span></div>
            <div className={styles.pair}>
              <Field id="f-vco" label="Company" where="browser" optional>
                <input id="f-vco" className={`${styles.input} ${styles.text}`} value={intake.vendorCompany} onChange={(e) => set("vendorCompany", e.target.value)} maxLength={80} placeholder="Halcyon Markets" />
              </Field>
              <Field id="f-domain" label="Domain" where="browser" optional error={fe("domain")}>
                <input id="f-domain" className={styles.input} value={domain} onChange={(e) => setDomain(e.target.value.trim().toLowerCase())} placeholder="halcyon.markets" aria-invalid={!!fe("domain")} />
              </Field>
            </div>
            <p className={styles.note}>Payee: the vendor names its payout account against a file on its own domain, checked inside an enclave. Its authority approves it and you accept it before any payment.</p>
            <Field id="f-vendor" label="Vendor account" where="public" error={fe("vendor")} hint="Seals the vendor's limits and submits each delivery.">
              <input id="f-vendor" className={styles.input} value={vendor} onChange={(e) => setVendor(e.target.value.trim().toLowerCase())} placeholder={`halcyon-desk.${suffix}`} aria-invalid={!!fe("vendor")} autoComplete="off" spellCheck={false} />
            </Field>
            <Field id="f-auth" label="Settlement authority" where="public" error={fe("authority")} hint="A different vendor account. Approves the payout account; a change needs it again.">
              <input id="f-auth" className={styles.input} value={authority} onChange={(e) => setAuthority(e.target.value.trim().toLowerCase())} placeholder={`halcyon-treasury.${suffix}`} aria-invalid={!!fe("authority")} autoComplete="off" spellCheck={false} />
            </Field>
          </div>
        </div>

        <button type="button" className={styles.advanced} onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
          <span className={`${styles.chev} ${advanced ? styles.chevOpen : ""}`} aria-hidden="true">›</span>Advanced controls
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div className={styles.advancedWrap} initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.3, 1] }}>
              <div className={styles.advancedBody}>
                <Field id="f-can" label="Canary accounts" where="public" optional error={fe("canaries")}
                  hint="Accounts nobody should ever pay, such as a look-alike of the vendor. A payment request naming one deletes your agent's key at once.">
                  <input id="f-can" className={styles.input} value={canaries} onChange={(e) => setCanaries(e.target.value)} placeholder={`halcyon-payments.${suffix}, halcyon-desk-ops.${suffix}`} />
                </Field>
                <div className={styles.field}>
                  <div className={styles.labelRow}><span className={styles.label}>Timings</span><Tag where="public" /></div>
                  <div className={styles.segment} role="radiogroup" aria-label="Timings">
                    <button type="button" role="radio" aria-checked={!demo} className={`${styles.segBtn} ${!demo ? styles.segOn : ""}`} onClick={() => setDemo(false)}>Live</button>
                    <button type="button" role="radio" aria-checked={demo} disabled={!demoAllowed} className={`${styles.segBtn} ${demo ? styles.segOn : ""}`} onClick={() => setDemo(true)}>Demo</button>
                  </div>
                  <span className={styles.hint}>{demo
                    ? "Demo: a recipient change waits 2 minutes and a claim 2 minutes, so you can run the whole flow in one sitting."
                    : `Live: a recipient change waits 24 hours and a vendor's claim 72 hours.${demoAllowed ? "" : " This factory only allows live timings."}`}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );

    return (
      <section aria-labelledby="t-review">
        <p className={styles.kicker}>Step 4 of 4 · {type.title}</p>
        <h2 id="t-review" className={styles.h}>Review and create the room</h2>
        <p className={styles.lead}>Creating the room makes it its own NEAR account, running the release&apos;s code with no full-access key. Nothing is negotiated, funded or paid yet.</p>

        <div className={`${styles.reviewGroups} ${styles.reveal}`}>
          <div className={styles.reviewGroup}>
            <div className={styles.reviewHead}><h3>Written to NEAR</h3><Tag where="public" /><button type="button" className={styles.edit} onClick={() => go(2)}>Edit</button></div>
            <dl className={styles.review}>
              <div><dt>Type</dt><dd><IconTile name={type.icon} size={24} className={styles.tileGap} />{type.title} <span className={styles.faint}>· <span className="mono">{type.kind}</span></span></dd></div>
              <div><dt>Title</dt><dd>{title.trim()}</dd></div>
              <div><dt>Buyer</dt><dd className="mono">{w.accountId ?? "sign in"}</dd></div>
              <div><dt>Vendor</dt><dd className="mono">{vendor}</dd></div>
              <div><dt>Settlement authority</dt><dd className="mono">{authority}</dd></div>
              {canaryList.length > 0 && <div><dt>Canaries</dt><dd className="mono">{canaryList.join(", ")}</dd></div>}
              <div><dt>Settles in</dt><dd className="mono">{symbol}<span className={styles.faint}> · factory {factory}</span></dd></div>
              <div><dt>Timings</dt><dd>{demo ? "Demo: a recipient change waits 2 min; claims after 2 min" : "Live: a recipient change waits 24 h; claims after 72 h"}</dd></div>
            </dl>
          </div>

          <div className={styles.reviewGroup}>
            <div className={styles.reviewHead}><h3>Your working brief</h3><Tag where="browser" /><button type="button" className={styles.edit} onClick={() => go(1)}>Edit</button></div>
            <dl className={styles.review}>
              {intake.buyerCompany.trim() && <div><dt>Your company</dt><dd>{intake.buyerCompany.trim()}</dd></div>}
              {(intake.vendorCompany.trim() || domain) && <div><dt>Vendor</dt><dd>{intake.vendorCompany.trim()}{domain ? <span className="mono">{intake.vendorCompany.trim() ? " · " : ""}{domain}</span> : null}</dd></div>}
              {intake.reference.trim() && <div><dt>Reference</dt><dd className="mono">{intake.reference.trim()}</dd></div>}
              {brief.trim() && <div><dt>Brief</dt><dd className={styles.clamp}>{brief.trim()}</dd></div>}
              {facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd><span className="mono">{f.value}</span>{f.sealAs ? <span className={styles.sealAs}>seal as <span className="mono">{f.sealAs}</span></span> : null}</dd></div>)}
              {!brief.trim() && !facts.length && !intake.reference.trim() && <div><dt>Brief</dt><dd className={styles.faint}>Nothing written. You can still seal your limits from a sample mandate.</dd></div>}
            </dl>
          </div>

          <div className={styles.sign}>
            <div>
              <span className={styles.signTitle}>What you sign</span>
              <span className={styles.signText}>One transaction: <span className="mono">create_agreement</span> on <span className="mono">{factory}</span>{w.method === "throwaway" ? ", signed by this tab's throwaway key" : w.method === "wallet" ? ", in your wallet" : ""}.</span>
            </div>
            <div className={styles.signAmount}>
              <span className="mono">{deposit ? `${formatUnits(deposit, 24, 2)} NEAR` : "read from the factory"}</span>
              <span className={styles.faint}>deposit for the room&apos;s storage and gas</span>
            </div>
          </div>
        </div>
      </section>
    );
  })();

  return (
    <div className={styles.shell}>
      <div className={styles.flow}>
        <div className={styles.stepper} ref={headRef}>
          <ol className={styles.steps} aria-label="Steps">
            {STEPS.map((s, i) => (
              <li key={s} className={`${styles.stepItem} ${i === step ? styles.stepOn : ""} ${i < step ? styles.stepDone : ""}`} aria-current={i === step ? "step" : undefined}>
                <button type="button" onClick={() => { if (i < step) go(i); }} disabled={i >= step}>
                  <span className={styles.stepNo} aria-hidden="true">{i < step ? "✓" : i + 1}</span>
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
              transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.2, 0.8, 0.3, 1] }}>
              {stepBody}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.foot}>
          <AnimatePresence mode="wait" initial={false}>
            {error ? (
              <motion.p key={error} className={styles.error} role="alert" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {error}
              </motion.p>
            ) : <span key="none" className={styles.footNote}>{step === 3 ? "You can close this tab before signing; nothing is kept until the room exists." : `Step ${step + 1} of 4`}</span>}
          </AnimatePresence>
          <div className={styles.buttons}>
            {step > 0 && <button type="button" className={styles.back} onClick={() => go(step - 1)} disabled={busy}>Back</button>}
            {step < 3 ? (
              <button type="button" className={styles.primary} onClick={next}>{CONTINUE[step]}<span aria-hidden="true" className={styles.arrow}>→</span></button>
            ) : (
              <button type="button" className={styles.primary} onClick={() => void create()} disabled={busy || !w.accountId}>
                {busy ? <><span className={styles.spinner} aria-hidden="true" />Creating the room…</> : w.accountId ? "Create the deal room" : "Sign in as the buyer"}
              </button>
            )}
          </div>
        </div>
      </div>

      <Aside step={step} type={type} title={title} buyer={w.accountId} buyerCompany={intake.buyerCompany} vendorCompany={intake.vendorCompany}
        vendor={vendor} authority={authority} domain={domain} symbol={symbol} demo={demo} facts={facts} deposit={deposit} />
    </div>
  );
}

const NEXT: { title: string; text: string }[] = [
  { title: "Open the room", text: "You sign create_agreement. The room becomes its own NEAR account, with the release's code pinned by hash." },
  { title: "Invite the vendor", text: "Send the room link. The vendor names its payout account against its domain (Payee); its authority approves and you accept." },
  { title: "Both companies seal limits", text: "Each side encrypts its limits and instructions in its own browser. NEAR stores only the ciphertext and a commitment hash." },
  { title: "Sealed Table negotiates", text: "Both negotiators meet inside attested enclaves. Terms come out signed by the release's key and checked on chain." },
  { title: "Both companies approve", text: "People decide whether the deal is good. Nothing can be funded until both have signed the terms." },
  { title: "Fund escrow", text: "You transfer the agreed amount to the room's own account, which holds it." },
  { title: "Agent pays within terms", text: "Your agent's only key calls act. A payment to another account or for another amount is refused and recorded." },
];

function Aside({ step, type, title, buyer, buyerCompany, vendorCompany, vendor, authority, domain, symbol, demo, facts, deposit }: {
  step: number; type: TypeCard; title: string; buyer: string | null; buyerCompany: string; vendorCompany: string; vendor: string;
  authority: string; domain: string; symbol: string; demo: boolean; facts: { label: string; value: string }[]; deposit: string | null;
}) {
  const row = (label: string, value: ReactNode, where: Where, mono = false) => (
    <li key={label} className={styles.sumRow}>
      <span className={styles.sumLabel}><i className={`${styles.dot} ${styles[`dot_${where}`]}`} title={WHERE_LABEL[where]} />{label}</span>
      <span className={`${styles.sumValue} ${mono ? "mono" : ""} ${value ? "" : styles.sumEmpty}`}>{value || "not set"}</span>
    </li>
  );
  return (
    <aside className={styles.aside} aria-label="Room summary">
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Room summary</span><span className={styles.cardMeta}>draft</span></div>
        <div className={styles.sumType}><IconTile name={type.icon} size={28} /><div><b>{title.trim() || "Untitled room"}</b><span>{type.title}</span></div></div>
        <ul className={styles.sum}>
          {row("Buyer", buyer ? <>{buyerCompany.trim() ? <span className={styles.co}>{buyerCompany.trim()}</span> : null}<span className="mono" title={buyer}>{shortAccount(buyer)}</span></> : "", "public")}
          {row("Vendor", vendor ? <>{vendorCompany.trim() ? <span className={styles.co}>{vendorCompany.trim()}</span> : null}<span className="mono" title={vendor}>{shortAccount(vendor)}</span></> : "", "public")}
          {row("Authority", authority ? <span title={authority}>{shortAccount(authority)}</span> : "", "public", true)}
          {domain && row("Domain", domain, "browser", true)}
          {row("Settles in", symbol, "public", true)}
          {step >= 2 && row("Timings", demo ? "Demo" : "Live", "public")}
          {facts.slice(0, 5).map((f) => row(f.label, f.value, f.label === "Milestones" || f.label === "Pair" ? "browser" : "sealed", true))}
          {row("Deposit", deposit ? `${formatUnits(deposit, 24, 2)} NEAR` : "", "public", true)}
        </ul>
        <ul className={styles.legend}>
          <li><i className={`${styles.dot} ${styles.dot_public}`} />Public on NEAR</li>
          <li><i className={`${styles.dot} ${styles.dot_browser}`} />This browser only</li>
          <li><i className={`${styles.dot} ${styles.dot_sealed}`} />Sealed next, enclave only</li>
        </ul>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>What happens next</span></div>
        <ol className={styles.timeline}>
          {NEXT.map((n, i) => (
            <li key={n.title} className={`${styles.tl} ${i === 0 ? styles.tlNow : ""}`}>
              <span className={styles.tlDot} aria-hidden="true">{i + 1}</span>
              <div>
                <span className={styles.tlTitle}>{n.title}{i === 0 ? <span className={styles.now}>{step === 3 ? "ready to sign" : "you are here"}</span> : null}</span>
                <span className={styles.tlText}>{n.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
