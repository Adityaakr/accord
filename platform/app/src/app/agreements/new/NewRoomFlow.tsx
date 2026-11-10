"use client";

// The guided way to open a deal room (docs/build/PLATFORM.md §5, buyer steps 4 and 5): pick the agreement type, write the brief,
// name the counterparty and its NEAR accounts, then review what the factory will charge before the wallet signs.
// Creation is the existing SDK call (`create_agreement` with type, title, vendor, settlement authority, canaries and
// timings); the room opens with an invitation card for the counterparty.
// Everything else on these screens (the brief, company names, domain, figures) stays in this browser
// (`accord-brief:<room>`): the buyer's own working brief, shown back on the invite card and the seal page, never published.
//
// Layout: the website's record language (apps/web "Inspect an agreement"): one centred column, groups with small
// uppercase labels, hairline-divided rows with a mono number gutter, quiet fields that strengthen on focus.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
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

/* Payment controls, shown under the agreement types so both live in one place: three live (links) on the first row,
   three planned (muted, inert) on the second. They never change the type chosen above. */
type ToolCard = { id: string; icon: PixelName; title: string; text: string; href: string | null };
const TOOLS: ToolCard[] = [
  { id: "check", icon: "check", title: "Check a payment", href: "/check",
    text: "Before signing, see whether a room's contract would pay or refuse a payment, gate by gate." },
  { id: "alerts", icon: "bell", title: "Refusal alerts", href: "/settings?tab=alerts",
    text: "Webhook, Telegram or email the moment the contract refuses your agent, with an incident view and revoke." },
  { id: "exports", icon: "sheet", title: "Finance exports", href: "/record?scope=org",
    text: "Every payment matched to your PO or invoice, ready for QuickBooks or Xero." },
  { id: "monitoring", icon: "pulse", title: "Continuous monitoring", href: null,
    text: "Every agent payment across your rooms in one live view, with unusual patterns flagged and funds traced after an incident." },
  { id: "guard", icon: "lock", title: "Accord Guard", href: null,
    text: "The same payment rules as a firewall for any agent wallet, without a negotiated deal." },
  { id: "inference", icon: "terminal", title: "Inference marketplace", href: null,
    text: "Pay another company's model per request, each payment tied to a receipt naming the model that answered." },
];

function Arrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToolGrid({ label, items }: { label: string; items: ToolCard[] }) {
  return (
    <div className={styles.toolRow}>
      <span className={styles.rowLabel}>{label}</span>
      <ul className={styles.types} aria-label={label}>
        {items.map((t) => {
          const inner = (
            <>
              <span className={styles.typeTop}>
                <IconTile name={t.icon} size={40} />
                {t.href ? <span className={styles.open} aria-hidden="true">Open<Arrow /></span> : <span className={styles.planned}>Planned</span>}
              </span>
              <span className={styles.typeTitle}>{t.title}</span>
              <span className={styles.typeText}>{t.text}</span>
            </>
          );
          return (
            <li key={t.id} className={styles.toolItem}>
              {t.href ? (
                <Link href={t.href} prefetch={false} className={`${styles.type} ${styles.tool}`}>{inner}</Link>
              ) : (
                <div className={`${styles.type} ${styles.toolPlanned}`} aria-label={`${t.title}, planned`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The payment controls section: a "New" pill, a heading the size of the step's, live row then planned row. */
export function Tools() {
  return (
    <section id="payment-controls" aria-labelledby="t-tools" className={`${styles.wide} ${styles.tools}`}>
      <div className={`${styles.head} ${styles.toolsHead}`}>
        <span className={styles.pill}><span className={styles.indicator} aria-hidden="true" />New</span>
        <h2 id="t-tools" className={styles.h}>Payment controls for your agent</h2>
        <p className={styles.lead}>Three are live today; three are planned. Use them with any room or on their own.</p>
      </div>
      <ToolGrid label="Live" items={TOOLS.filter((t) => t.href)} />
      <ToolGrid label="Planned" items={TOOLS.filter((t) => !t.href)} />
    </section>
  );
}

const STEPS = ["Type", "Brief", "Counterparty", "Review"] as const;
const NEAR_ACCOUNT = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
const DOMAIN = /^(?=.{3,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/;

export interface DemoVendor { vendor: string; authority: string; domain: string }

const two = (n: number) => String(n).padStart(2, "0");

/** A group of rows: a small uppercase label (with an optional quiet action on the right), an optional note, the rows. */
function Group({ label, meta, note, children }: { label: ReactNode; meta?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}><span className={styles.groupName}>{label}</span>{meta}</div>
      {note ? <p className={styles.note}>{note}</p> : null}
      <div className={styles.rows}>{children}</div>
    </div>
  );
}

/** One form row: mono number, label, the control (with its hint or error under it). `end` sets short values on the right. */
function Row({ n, label, id, labelId, hint, error, end, text, children }: {
  n: number; label: string; id?: string; labelId?: string; hint?: ReactNode; error?: string; end?: boolean; text?: boolean; children: ReactNode;
}) {
  return (
    <div className={`${styles.row} ${text ? styles.rowText : ""}`} data-invalid={error ? "" : undefined}>
      <span className={`mono ${styles.num}`}>{two(n)}</span>
      {id ? <label htmlFor={id} className={styles.name}>{label}</label> : <span id={labelId} className={styles.name}>{label}</span>}
      <div className={`${styles.control} ${end ? styles.controlEnd : ""}`}>
        {children}
        {error ? <span className={styles.fieldError} role="alert">{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
      </div>
    </div>
  );
}

/** A quiet choice between a few options: a dot and a word each, the chosen one strong with a teal dot. */
function Choices<T extends string>({ labelledBy, value, options, onChange }: {
  labelledBy: string; value: T; options: { id: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void;
}) {
  return (
    <div className={styles.choices} role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} disabled={o.disabled}
          className={`${styles.choice} ${value === o.id ? styles.choiceOn : ""}`} onClick={() => onChange(o.id)}>
          <span className={styles.dotMark} aria-hidden="true" />{o.label}
        </button>
      ))}
    </div>
  );
}

function Lock() {
  return (
    <svg className={styles.lock} width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Check({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.3 5 8.6l4.5-5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 14 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -14 }),
  };
  const head = (id: string, h: string, lead: ReactNode, action?: ReactNode) => (
    <div className={styles.head}>
      <h2 id={id} className={styles.h}>{h}</h2>
      <p className={styles.lead}>{lead}</p>
      {action}
    </div>
  );
  /** A quiet field: transparent until hovered, a faint fill and the row's teal line on focus; the unit sits in mono on the right. */
  const amountInput = (id: string, k: keyof Intake, unit: string, placeholder: string, numeric = false) => (
    <div className={`${styles.box} ${styles.boxShort}`}>
      <input id={id} className={`${styles.input} ${styles.mono} ${styles.right}`} inputMode={numeric ? "numeric" : "decimal"} value={String(intake[k])} aria-invalid={!!fe(k)}
        onChange={(e) => set(k, e.target.value as Intake[typeof k])} placeholder={placeholder} />
      <span className={styles.unit}>{unit}</span>
    </div>
  );

  const stepBody = (() => {
    if (step === 0) return (
      <section aria-labelledby="t-type" className={styles.wide}>
        {head("t-type", "What kind of agreement?", "Every type runs the same controls. Only the terms and the evidence that releases a payment change.")}
        <div className={styles.types} role="radiogroup" aria-label="Agreement type">
          {TYPES.map((t) => {
            const on = t.id === typeId, planned = !t.kind;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={on} aria-disabled={planned} disabled={planned}
                className={`${styles.type} ${on ? styles.typeOn : ""} ${planned ? styles.typePlanned : ""}`}
                onClick={() => { setTypeId(t.id); setError(null); }}>
                <span className={styles.typeTop}>
                  <IconTile name={t.icon} size={40} />
                  {planned ? <span className={styles.planned}>Planned</span>
                    : on ? <span className={styles.typeCheck} aria-hidden="true"><Check size={11} /></span> : null}
                </span>
                <span className={styles.typeTitle}>{t.title}</span>
                <span className={styles.typeText}>{t.text}</span>
              </button>
            );
          })}
        </div>
      </section>
    );

    if (step === 1) {
      let n = 0;
      const k = () => ++n;
      return (
        <section aria-labelledby="t-brief" className={styles.col}>
          {head("t-brief", "Write the brief", "Only the title is required, and only the title is public on NEAR. The rest stays in this browser.",
            <button type="button" className={styles.quiet} onClick={fillSample}>Fill with an example</button>)}

          <Group label="The room">
            <Row n={k()} id="f-title" label="Title" error={fe("title")}>
              <div className={styles.box}>
                <input id="f-title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
                  aria-invalid={!!fe("title")} placeholder={proc ? "Treasury reporting integration, phase one" : "NEAR/USDC liquidity retainer, Q1"} />
              </div>
            </Row>

            {currencies.length > 1 && (
              <Row n={k()} labelId="l-cur" label="Settle in"
                hint={circle ? <>Fund it from <a className="link" href={CIRCLE_FAUCET} target="_blank" rel="noreferrer">faucet.circle.com</a> (NEAR Testnet), about 20 USDC per address every 1 to 2 hours.</> : undefined}>
                <Choices labelledBy="l-cur" value={currencyId} onChange={setCurrencyId}
                  options={currencies.map((c) => ({ id: c.id, label: c.id === "usdc" ? "Circle USDC" : "Test USDC" }))} />
              </Row>
            )}

            <Row n={k()} id="f-brief" label={proc ? "Scope" : "Mandate"} text>
              <div className={styles.box}>
                <textarea id="f-brief" className={`${styles.input} ${styles.textarea}`} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1200} rows={3}
                  placeholder={proc
                    ? "What you are buying, what counts as delivered, and when to walk away."
                    : "What the desk must keep up, on which pool, and when a period is not paid."} />
              </div>
            </Row>

            {!proc && (
              <Row n={k()} id="f-pair" label="Pair" error={fe("pair")} end>
                <div className={`${styles.box} ${styles.boxShort}`}>
                  <input id="f-pair" className={`${styles.input} ${styles.mono} ${styles.right}`} value={intake.pair} onChange={(e) => set("pair", e.target.value.toUpperCase())} maxLength={25} placeholder="NEAR/USDC" aria-invalid={!!fe("pair")} />
                </div>
              </Row>
            )}
          </Group>

          {proc && (
            <Group label="Milestones" meta={<span className={`mono ${styles.groupMeta}`}>{intake.milestones.length} of {MAX_MILESTONES}</span>}>
              <AnimatePresence initial={false}>
                {intake.milestones.map((m, i) => {
                  const no = k();
                  return (
                    <motion.div key={i} className={styles.msWrap}
                      initial={reduce ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease }}>
                      <div className={styles.msRow} data-invalid={fe(`milestone${i}`) ? "" : undefined}>
                        <span className={`mono ${styles.num}`}>{two(no)}</span>
                        <div className={styles.box}>
                          <input className={styles.input} aria-label={`Milestone ${i + 1} name`} value={m.name} maxLength={60}
                            placeholder={["Data pipeline", "Dashboard", "Handover"][i] ?? "Milestone"}
                            onChange={(e) => set("milestones", intake.milestones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        </div>
                        <div className={styles.box}>
                          <input className={`${styles.input} ${styles.soft}`} aria-label={`Milestone ${i + 1} deliverable`} value={m.deliverable} maxLength={160}
                            placeholder="Accepted when…"
                            onChange={(e) => set("milestones", intake.milestones.map((x, j) => (j === i ? { ...x, deliverable: e.target.value } : x)))} />
                        </div>
                        <button type="button" className={styles.remove} aria-label={`Remove milestone ${i + 1}`} disabled={intake.milestones.length === 1}
                          onClick={() => set("milestones", intake.milestones.filter((_, j) => j !== i))}>×</button>
                        {fe(`milestone${i}`) && <span className={`${styles.fieldError} ${styles.msErr}`} role="alert">{fe(`milestone${i}`)}</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {intake.milestones.length < MAX_MILESTONES && (
                <div className={styles.addRow}>
                  <button type="button" className={styles.quiet} onClick={() => set("milestones", [...intake.milestones, { name: "", deliverable: "" }])}>+ Add milestone</button>
                </div>
              )}
            </Group>
          )}

          <Group label={<><Lock />Sealed limits</>} meta={<span className={styles.groupMetaText}>set when you seal</span>}
            note={<>Only the Sealed Table&apos;s enclave reads these; the vendor never does.</>}>
            {proc ? (
              <>
                <Row n={k()} id="f-ceiling" label="Budget ceiling" error={fe("ceiling")} end>{amountInput("f-ceiling", "ceiling", symbol, circle ? "18.00" : "40.00")}</Row>
                <Row n={k()} id="f-target" label="Target price" error={fe("target")} end>{amountInput("f-target", "target", symbol, circle ? "15.00" : "32.00")}</Row>
                <Row n={k()} id="f-term" label="Longest term" error={fe("termWeeks")} end>{amountInput("f-term", "termWeeks", "weeks", "4", true)}</Row>
                <Row n={k()} id="f-review" label="Review per delivery" error={fe("reviewDays")} end>{amountInput("f-review", "reviewDays", "days", "2", true)}</Row>
              </>
            ) : (
              <>
                <Row n={k()} id="f-ret" label="Retainer per period" error={fe("retainer")} end>{amountInput("f-ret", "retainer", symbol, circle ? "4.00" : "8.00")}</Row>
                <Row n={k()} id="f-per" label="Periods" error={fe("periods")} end>{amountInput("f-per", "periods", "periods", "4", true)}</Row>
                <Row n={k()} id="f-spread" label="Widest spread" error={fe("spreadBps")} end>{amountInput("f-spread", "spreadBps", "bps", "200", true)}</Row>
                <Row n={k()} id="f-depth" label="Depth each side" error={fe("depth")} end>{amountInput("f-depth", "depth", symbol, "20.00")}</Row>
                <Row n={k()} id="f-slots" label="Readings per period" error={fe("slots")} end>{amountInput("f-slots", "slots", "readings", "6", true)}</Row>
                <Row n={k()} id="f-thr" label="Readings that must pass" error={fe("threshold")} end>{amountInput("f-thr", "threshold", "readings", "4", true)}</Row>
              </>
            )}
          </Group>
        </section>
      );
    }

    if (step === 2) {
      let n = 0;
      const k = () => ++n;
      return (
        <section aria-labelledby="t-party" className={styles.col}>
          {head("t-party", "Who is the counterparty?", "The vendor seals its own limits. Its settlement authority, a separate account, approves where payments go.")}

          <Group label="Vendor"
            meta={demoVendor && type.kind === "procurement" ? <button type="button" className={styles.metaLink} onClick={applyDemoVendor}>Use the demo vendor</button> : undefined}>
            <Row n={k()} id="f-vco" label="Company">
              <div className={styles.box}>
                <input id="f-vco" aria-label="Vendor company" className={styles.input} value={intake.vendorCompany} onChange={(e) => set("vendorCompany", e.target.value)} maxLength={80} placeholder="Halcyon Markets" />
              </div>
            </Row>
            <Row n={k()} id="f-domain" label="Domain" error={fe("domain")}>
              <div className={styles.box}>
                <input id="f-domain" className={`${styles.input} ${styles.mono}`} value={domain} onChange={(e) => setDomain(e.target.value.trim().toLowerCase())} placeholder="halcyon.markets" aria-invalid={!!fe("domain")} />
              </div>
            </Row>
            <Row n={k()} id="f-vendor" label="NEAR account" error={fe("vendor")}>
              <div className={styles.box}>
                <input id="f-vendor" className={`${styles.input} ${styles.mono}`} value={vendor} onChange={(e) => setVendor(e.target.value.trim().toLowerCase())} placeholder={`halcyon-desk.${suffix}`} aria-invalid={!!fe("vendor")} autoComplete="off" spellCheck={false} />
              </div>
            </Row>
            <Row n={k()} id="f-auth" label="Settlement authority" error={fe("authority")} hint="A second vendor account. It approves the payout account.">
              <div className={styles.box}>
                <input id="f-auth" className={`${styles.input} ${styles.mono}`} value={authority} onChange={(e) => setAuthority(e.target.value.trim().toLowerCase())} placeholder={`halcyon-treasury.${suffix}`} aria-invalid={!!fe("authority")} autoComplete="off" spellCheck={false} />
              </div>
            </Row>
          </Group>

          <Group label="Your company"
            meta={w.accountId ? <span className={`mono ${styles.groupMeta}`}>{shortAccount(w.accountId)}</span> : <span className={styles.groupMetaText}>not signed in</span>}>
            <Row n={k()} id="f-bco" label="Company">
              <div className={styles.box}>
                <input id="f-bco" aria-label="Your company" className={styles.input} value={intake.buyerCompany} onChange={(e) => set("buyerCompany", e.target.value)} maxLength={80} placeholder="Northwind Foundation" />
              </div>
            </Row>
          </Group>

          <div className={styles.group}>
            <button type="button" className={styles.advanced} onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
              <span className={styles.groupName}>Advanced controls</span>
              <span className={`${styles.chev} ${advanced ? styles.chevOpen : ""}`} aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {advanced && (
                <motion.div className={styles.advancedWrap} initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.26, ease }}>
                  <div className={styles.rows}>
                    <Row n={k()} id="f-can" label="Canary accounts" error={fe("canaries")}
                      hint="Accounts nobody should ever pay. A request naming one deletes your agent's key.">
                      <div className={styles.box}>
                        <input id="f-can" className={`${styles.input} ${styles.mono}`} value={canaries} onChange={(e) => setCanaries(e.target.value)} placeholder={`halcyon-payments.${suffix}`} />
                      </div>
                    </Row>
                    <Row n={k()} labelId="l-time" label="Timings"
                      hint={demo
                        ? "A recipient change waits 2 minutes and a claim 2 minutes."
                        : `A recipient change waits 24 hours and a claim 72 hours.${demoAllowed ? "" : " This factory allows live timings only."}`}>
                      <Choices labelledBy="l-time" value={demo ? "demo" : "live"} onChange={(v) => setDemo(v === "demo")}
                        options={[{ id: "live", label: "Live" }, { id: "demo", label: "Demo", disabled: !demoAllowed }]} />
                    </Row>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      );
    }

    const privateRows: [string, ReactNode, boolean?][] = [
      ...(intake.buyerCompany.trim() ? [["Your company", intake.buyerCompany.trim()] as [string, ReactNode]] : []),
      ...(intake.vendorCompany.trim() || domain ? [["Vendor", <>{intake.vendorCompany.trim()}{domain ? <span className={intake.vendorCompany.trim() ? styles.faint : "mono"}>{intake.vendorCompany.trim() ? ` · ${domain}` : domain}</span> : null}</>] as [string, ReactNode]] : []),
      ...(brief.trim() ? [[proc ? "Scope" : "Mandate", <span key="b" className={styles.clamp}>{brief.trim()}</span>] as [string, ReactNode]] : []),
      ...facts.map((f) => [f.label, f.value, true] as [string, ReactNode, boolean]),
    ];
    const publicRows: [string, ReactNode, boolean?][] = [
      ["Type", type.title],
      ["Title", title.trim()],
      ["Buyer", w.accountId ?? "Not signed in", true],
      ["Vendor", vendor, true],
      ["Settlement authority", authority, true],
      ...(canaryList.length > 0 ? [["Canaries", canaryList.join(", "), true] as [string, ReactNode, boolean]] : []),
      ["Settles in", symbol, true],
      ["Timings", demo ? "Demo" : "Live"],
    ];
    let n = 0;
    const list = (rows: [string, ReactNode, boolean?][]) => (
      <dl className={styles.review}>
        {rows.map(([label, value, mono]) => {
          const prose = label === "Scope" || label === "Mandate";
          return (
            <div key={label} className={`${styles.rRow} ${prose ? styles.rRowText : ""}`}>
              <span className={`mono ${styles.num}`} aria-hidden="true">{two(++n)}</span>
              <dt>{label}</dt>
              <dd className={mono ? "mono" : undefined}>{value}</dd>
            </div>
          );
        })}
      </dl>
    );
    return (
      <section aria-labelledby="t-review" className={styles.col}>
        {head("t-review", "Review and create", "The room becomes its own NEAR account. Nothing is negotiated, funded or paid yet.")}

        <div className={styles.group}>
          <div className={styles.groupLabel}><span className={styles.groupName}>On NEAR</span><button type="button" className={styles.metaLink} onClick={() => go(2)}>Edit</button></div>
          {list(publicRows)}
        </div>

        <div className={styles.group}>
          <div className={styles.groupLabel}><span className={styles.groupName}>Private to you</span><button type="button" className={styles.metaLink} onClick={() => go(1)}>Edit</button></div>
          {privateRows.length ? list(privateRows) : <p className={styles.note}>Nothing added. You can still set your limits when you seal.</p>}
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
      {/* Type step only: a quiet strip so the payment controls are seen before anyone presses Continue */}
      {step === 0 && (
        <nav className={styles.strip} aria-label="New: payment controls">
          <span className={styles.stripHead}>
            <span className={styles.stripTag}>New</span>
            <span className={styles.stripLead}>Payment controls for your agent:</span>
          </span>
          <span className={styles.stripLinks}>
            {TOOLS.filter((t) => t.href).map((t, i) => (
              <span key={t.id} className={styles.stripItem}>
                {i > 0 ? <span className={styles.stripDot} aria-hidden="true">·</span> : null}
                <Link href={t.href!} prefetch={false} className={styles.stripLink}>{t.title}</Link>
              </span>
            ))}
            <button type="button" className={styles.stripMore}
              onClick={() => document.getElementById("payment-controls")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })}>
              +3 planned ↓
            </button>
          </span>
        </nav>
      )}
      <div className={styles.stepper} ref={headRef}>
        <ol className={styles.steps} aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className={`${styles.stepItem} ${i === step ? styles.stepOn : ""} ${i < step ? styles.stepDone : ""}`} aria-current={i === step ? "step" : undefined}>
              <button type="button" onClick={() => { if (i < step) go(i); }} disabled={i >= step}>
                <span className={`mono ${styles.stepNo}`}>{i < step ? <Check /> : two(i + 1)}</span>
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ol>
        {/* one hairline under the row that fills as you advance */}
        <span className={styles.track} aria-hidden="true"><span className={styles.fill} style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} /></span>
      </div>

      <div className={styles.body}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: reduce ? 0.12 : 0.26, ease }}>
            {stepBody}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.foot}>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p key={error} className={styles.error} role="alert" initial={reduce ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {error}
            </motion.p>
          )}
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

      {/* step 1 only: the tools sit after Continue, so choosing a type and moving on stays one short reach */}
      {step === 0 && <Tools />}
    </div>
  );
}
