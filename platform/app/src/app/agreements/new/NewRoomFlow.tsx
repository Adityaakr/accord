"use client";

// The guided way to open a deal room (docs/build/PLATFORM.md §5, buyer steps 4 and 5): pick the agreement type, write the brief
// in plain language, name the counterparty by domain, then review what the factory will charge before the wallet
// signs. Creation is the existing SDK call; the room opens with an invitation card for the counterparty.
// The brief stays in this browser: it is the buyer's own instruction and is never published.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Accord, AccordError, formatUnits, type Kind, type Params } from "@accord/sdk";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CIRCLE_FAUCET, useAppConfig } from "@/components/AppConfig";
import type { PixelName } from "@/components/PixelIcon";
import styles from "./flow.module.css";
import { IconTile } from "@/components/IconTile";

const DEMO: Params = {
  mode: "demo", timelock_secs: 120, claim_delay_secs: 120, grace_secs: 600, min_acceptance_window_secs: 60,
  max_acceptance_window_secs: 604_800, require_two_sided: true, observation_grace_secs: 60, refusal_limit: 5,
  refusal_window_secs: 3_600, agent_allowance: "500000000000000000000000",
};
const LIVE: Params = {
  ...DEMO, mode: "live", timelock_secs: 86_400, claim_delay_secs: 259_200, grace_secs: 345_600,
  min_acceptance_window_secs: 3_600, observation_grace_secs: 600,
};

type TypeCard = { id: string; kind: Kind | null; icon: PixelName; title: string; text: string; brief: string; titleHint: string };
const TYPES: TypeCard[] = [
  { id: "market-making", kind: "market-making", icon: "chart", title: "Market making",
    text: "A liquidity retainer paid per period when enough hidden-time readings of the venue meet the agreed spread and depth.",
    brief: "Renew our market-making retainer: spread under 70 bps, at least 10,000 USDC of depth within 2%, quotes on both sides. Our agent must not overpay or pay the wrong desk.",
    titleHint: "NEAR/USDC liquidity, Q1" },
  { id: "vendor", kind: "procurement", icon: "bag", title: "Vendor contracts",
    text: "Milestones paid when the buyer accepts a delivery, only to the vendor's proven account.",
    brief: "Pay each milestone only when we accept the delivery, only to the vendor's proven address, and hold anything that does not match.",
    titleHint: "Reporting integration, phase one" },
  { id: "agent-services", kind: null, icon: "agents", title: "Agent services", text: "Buy a service from another company's agent within a weekly amount and a cap.", brief: "", titleHint: "" },
  { id: "security", kind: null, icon: "shield", title: "Security fixes", text: "A fee held until the agreed checks pass and the named reviewer approves.", brief: "", titleHint: "" },
  { id: "infrastructure", kind: null, icon: "server", title: "Infrastructure", text: "Monthly capacity paid when availability and latency meet the agreed levels.", brief: "", titleHint: "" },
  { id: "grants", kind: null, icon: "vault", title: "Grants", text: "Tranches released when two of three named reviewers accept the milestone.", brief: "", titleHint: "" },
];

const STEPS = ["Type", "Brief", "Counterparty", "Review"] as const;
const NEAR_ACCOUNT = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export function NewRoomFlow({ network, deposit, demoAllowed }: { network: string; deposit: string | null; demoAllowed: boolean }) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [typeId, setTypeId] = useState<string>("market-making");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [domain, setDomain] = useState("");
  const [vendor, setVendor] = useState("");
  const [authority, setAuthority] = useState("");
  const [canaries, setCanaries] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [demo, setDemo] = useState(demoAllowed);
  // Settlement: the default factory's test USDC unless the visitor picks Circle's testnet USDC (when offered).
  const currencies = cfg.currencies ?? [];
  const [currencyId, setCurrencyId] = useState<"default" | "usdc">("default");
  const currency = currencies.find((c) => c.id === currencyId) ?? null;
  const factory = currency?.factory ?? cfg.factory;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = TYPES.find((t) => t.id === typeId)!;
  const canaryList = useMemo(() => canaries.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean), [canaries]);

  // what blocks each step, in plain words
  const blocker = (i: number): string | null => {
    if (i === 0) return type.kind ? null : "This agreement type is planned.";
    if (i === 1) return title.trim().length < 3 ? "Give the room a title." : null;
    if (i === 2) {
      if (!NEAR_ACCOUNT.test(vendor.trim())) return "Enter the vendor's NEAR account.";
      if (!NEAR_ACCOUNT.test(authority.trim())) return "Enter the vendor's settlement authority.";
      if (vendor.trim() === authority.trim()) return "The settlement authority must be a different account from the vendor.";
      if (w.accountId && (vendor.trim() === w.accountId || authority.trim() === w.accountId)) return "The counterparty cannot be your own account.";
      if (canaryList.some((c) => !NEAR_ACCOUNT.test(c))) return "A canary is not a valid NEAR account.";
      return null;
    }
    return w.accountId ? null : "Sign in as the buyer to create the room.";
  };

  function next() {
    const b = blocker(step);
    if (b) { setError(b); return; }
    setError(null);
    if (step === 0 && !title) setTitle(type.titleHint);
    if (step === 0 && !brief) setBrief(type.brief);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function create() {
    const b = blocker(3);
    if (b || !w.signer || !type.kind) { setError(b ?? "Sign in as the buyer to create the room."); return; }
    setBusy(true);
    setError(null);
    try {
      const accord = new Accord({ network: network === "sandbox" ? "sandbox" : "testnet", factory, rpc: cfg.rpc, signer: w.signer });
      const { agreement } = await accord.createAgreement({
        kind: type.kind, title: title.trim(), vendor: vendor.trim(), vendor_authority: authority.trim(),
        canaries: canaryList, params: demo ? DEMO : LIVE,
      });
      try {
        localStorage.setItem(`accord-brief:${agreement}`, JSON.stringify({ brief: brief.trim(), domain: domain.trim() }));
      } catch {
        // storage unavailable: the brief is simply not kept
      }
      router.push(`/agreements/${agreement}?created=1`);
    } catch (err) {
      setError(err instanceof AccordError ? err.code ?? err.message : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.flow}>
      <div className={styles.stepper}>
        <ol className={styles.steps} aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className={`${styles.stepItem} ${i === step ? styles.stepOn : ""} ${i < step ? styles.stepDone : ""}`} aria-current={i === step ? "step" : undefined}>
              <button type="button" onClick={() => { if (i < step) { setError(null); setStep(i); } }} disabled={i >= step}>
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
        {step === 0 && (
          <section aria-labelledby="t-type">
            <h2 id="t-type" className={styles.h}>What kind of agreement?</h2>
            <p className={styles.lead}>Every type runs the same controls. Only the terms and the evidence that releases a payment change.</p>
            <div className={styles.types} role="radiogroup" aria-label="Agreement type">
              {TYPES.map((t) => {
                const on = t.id === typeId, planned = !t.kind;
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={on} aria-disabled={planned} disabled={planned}
                    className={`${styles.type} ${on ? styles.typeOn : ""} ${planned ? styles.typePlanned : ""}`}
                    onClick={() => { setTypeId(t.id); setTitle(""); setBrief(""); setError(null); }}>
                    <span className={styles.typeTop}>
                      <IconTile name={t.icon} size={40} />
                      {planned ? <span className={styles.planned}>Planned</span> : on ? <span className={styles.check} aria-hidden="true">✓</span> : null}
                    </span>
                    <span className={styles.typeTitle}>{t.title}</span>
                    <span className={styles.typeText}>{t.text}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="t-brief" className={styles.form}>
            <h2 id="t-brief" className={styles.h}>Write the brief</h2>
            <p className={styles.lead}>In plain language, what your agent should get and what it must never do. The brief stays in this browser; only the sealed limits go on NEAR.</p>
            <label className={styles.field}>
              <span className={styles.label}>Room title</span>
              <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={type.titleHint} />
              <span className={styles.hint}>Shown in the deal room to both companies. Public on NEAR.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Brief</span>
              <textarea className={styles.textarea} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1200} rows={5} />
              <span className={styles.hint}>Kept in this browser. You set the exact limits when you seal them, next.</span>
            </label>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="t-party" className={styles.form}>
            <h2 id="t-party" className={styles.h}>Who is the counterparty?</h2>
            <p className={styles.lead}>The vendor seals its own limits and delivers. A separate account of the vendor, its settlement authority, approves where payments go.</p>
            <label className={styles.field}>
              <span className={styles.label}>Vendor's domain</span>
              <input className={styles.input} value={domain} onChange={(e) => setDomain(e.target.value.toLowerCase())} placeholder="halcyon-mm.xyz" />
              <span className={styles.hint}>Payments only ever go to an account proven against this domain (Payee).</span>
            </label>
            <div className={styles.pair}>
              <label className={styles.field}>
                <span className={styles.label}>Vendor account</span>
                <input className={styles.input} value={vendor} onChange={(e) => setVendor(e.target.value.trim().toLowerCase())} placeholder="halcyon-demo.testnet" />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Settlement authority</span>
                <input className={styles.input} value={authority} onChange={(e) => setAuthority(e.target.value.trim().toLowerCase())} placeholder="halcyon-auth.testnet" />
              </label>
            </div>
            <button type="button" className={styles.advanced} onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
              {advanced ? "Hide" : "Show"} advanced
            </button>
            {advanced && (
              <div className={styles.advancedBody}>
                <label className={styles.field}>
                  <span className={styles.label}>Canary accounts</span>
                  <input className={styles.input} value={canaries} onChange={(e) => setCanaries(e.target.value)} placeholder="halcyon-mm-payments.testnet, halcyon-treasury.testnet" />
                  <span className={styles.hint}>Accounts nobody should ever pay. A request naming one deletes the agent's key at once.</span>
                </label>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={demo} disabled={!demoAllowed} onChange={(e) => setDemo(e.target.checked)} />
                  <span>Demo timings</span>
                  <span className={styles.hint}>{demoAllowed ? "Minutes instead of days, for trying the flow." : "This factory only allows live timings."}</span>
                </label>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="t-review">
            <h2 id="t-review" className={styles.h}>Review before you sign</h2>
            <p className={styles.lead}>Creating the room makes it its own NEAR account with the release's code and no key of its own. Nothing is negotiated or paid yet.</p>
            {currencies.length > 1 && (
              <fieldset className={styles.field} aria-label="Settle in" style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
                <span className={styles.label}>Settle in</span>
                {currencies.map((c) => (
                  <label key={c.id} className={styles.toggle}>
                    <input type="radio" name="currency" checked={currencyId === c.id} onChange={() => setCurrencyId(c.id)} />
                    <span>{c.id === "usdc" ? "Circle USDC (testnet, from faucet.circle.com)" : "Test USDC (instant, from our faucet)"}</span>
                  </label>
                ))}
                {currencyId === "usdc" && (
                  <span className={styles.hint}>
                    Fund the room from <a className="link" href={CIRCLE_FAUCET} target="_blank" rel="noreferrer">faucet.circle.com</a> (network NEAR Testnet): about 20 USDC per address every 1 to 2 hours, so keep the ceiling you seal within 20 USDC.
                  </span>
                )}
              </fieldset>
            )}
            <dl className={styles.review}>
              <div><dt>Type</dt><dd><IconTile name={type.icon} size={24} className={styles.tileGap} />{type.title}</dd></div>
              <div><dt>Title</dt><dd>{title.trim()}</dd></div>
              <div><dt>Buyer</dt><dd className="mono">{w.accountId ?? "sign in"}</dd></div>
              <div><dt>Vendor</dt><dd className="mono">{vendor}{domain ? <span className={styles.faint}> · {domain}</span> : null}</dd></div>
              <div><dt>Settlement authority</dt><dd className="mono">{authority}</dd></div>
              {canaryList.length > 0 && <div><dt>Canaries</dt><dd className="mono">{canaryList.join(", ")}</dd></div>}
              {currencies.length > 1 && <div><dt>Settlement</dt><dd className="mono">{currencyId === "usdc" ? "Circle USDC" : "test USDC"}<span className={styles.faint}> · factory {factory}</span></dd></div>}
              <div><dt>Timings</dt><dd>{demo ? "Demo: a recipient change waits 2 min; claims after 2 min" : "Live: a recipient change waits 24 h; claims after 72 h"}</dd></div>
              <div className={styles.deposit}><dt>Creation deposit</dt><dd><span className="mono">{deposit ? `${formatUnits(deposit, 24, 2)} NEAR` : "read from the factory"}</span><span className={styles.faint}> pays the room's storage and gas</span></dd></div>
            </dl>
            <p className={styles.next}>Next: you and the vendor each seal your limits in your own browsers, then the agents negotiate inside the Sealed Table.</p>
          </section>
        )}
      </div>

      <div className={styles.foot}>
        {error ? <p className={styles.error} role="alert">{error}</p> : <span />}
        <div className={styles.buttons}>
          {step > 0 && <button type="button" className={styles.back} onClick={() => { setError(null); setStep((s) => s - 1); }} disabled={busy}>Back</button>}
          {step < 3 ? (
            <button type="button" className={styles.primary} onClick={next}>Continue</button>
          ) : (
            <button type="button" className={styles.primary} onClick={() => void create()} disabled={busy || !w.accountId}>
              {busy ? "Creating the room…" : w.accountId ? "Create the deal room" : "Sign in as the buyer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
