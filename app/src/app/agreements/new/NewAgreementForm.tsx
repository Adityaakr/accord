"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Accord, AccordError, type Kind, type Params } from "@accord/sdk";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useAppConfig } from "@/components/AppConfig";
import { Panel, Pill } from "@/components/ui";
import styles from "../form.module.css";

const DEMO: Params = {
  mode: "demo", timelock_secs: 120, claim_delay_secs: 120, grace_secs: 600, min_acceptance_window_secs: 60,
  max_acceptance_window_secs: 604_800, require_two_sided: true, observation_grace_secs: 60, refusal_limit: 5,
  refusal_window_secs: 3_600, agent_allowance: "500000000000000000000000",
};
const LIVE: Params = {
  ...DEMO, mode: "live", timelock_secs: 86_400, claim_delay_secs: 259_200, grace_secs: 345_600,
  min_acceptance_window_secs: 3_600, observation_grace_secs: 600,
};

export function NewAgreementForm({ network }: { network: string }) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("procurement");
  const [title, setTitle] = useState("Liquidity reporting integration");
  const [vendor, setVendor] = useState("");
  const [authority, setAuthority] = useState("");
  const [canaries, setCanaries] = useState("");
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!w.signer) { setError("Connect the buyer's wallet first."); return; }
    setBusy(true);
    setError(null);
    try {
      const accord = new Accord({ network: network === "sandbox" ? "sandbox" : "testnet", factory: cfg.factory, rpc: cfg.rpc, signer: w.signer });
      const { agreement } = await accord.createAgreement({
        kind, title: title.trim(), vendor: vendor.trim(), vendor_authority: authority.trim(),
        canaries: canaries.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
        params: demo ? DEMO : LIVE,
      });
      router.push(`/agreements/${agreement}/seal`);
    } catch (err) {
      setError(err instanceof AccordError ? err.code ?? err.message : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className={styles.layout} onSubmit={submit}>
      <div className={styles.main}>
        <Panel title="What kind of agreement">
          <div className={styles.choices} role="radiogroup" aria-label="Agreement type">
            <Choice on={kind === "procurement"} onClick={() => setKind("procurement")} title="Procurement"
              text="Milestones paid when the buyer accepts a delivery, or when the acceptance window lapses without a dispute." />
            <Choice on={kind === "market-making"} onClick={() => setKind("market-making")} title="Accord Atlas"
              text="A liquidity retainer paid per period when enough hidden-time observations of the venue pass the agreed conditions." />
          </div>
        </Panel>

        <Panel title="The parties">
          <Field label="Title" hint="Shown in the deal room. Public.">
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </Field>
          <Field label="Buyer" hint="You. The account that signs this creation.">
            <input className={styles.input} value={w.accountId ?? "connect a wallet"} readOnly />
          </Field>
          <Field label="Vendor" hint="The account that seals the vendor's mandate and delivers.">
            <input className={styles.input} value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="halcyon-demo.testnet" required />
          </Field>
          <Field label="Vendor's settlement authority" hint="A separate account that approves where payments go.">
            <input className={styles.input} value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="halcyon-auth.testnet" required />
          </Field>
          <Field label="Canary accounts" hint="Accounts nobody should ever pay. A request naming one deletes the agent's key at once. Optional, comma separated.">
            <input className={styles.input} value={canaries} onChange={(e) => setCanaries(e.target.value)} placeholder="halcyon-mm-payments.testnet, halcyon-treasury.testnet" />
          </Field>
        </Panel>
      </div>

      <aside className={styles.side}>
        <Panel title="Timings" aside={<Pill tone={demo ? "warn" : "teal"}>{demo ? "demo timings" : "live"}</Pill>}>
          <label className={styles.toggle}>
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            <span>Demo timings</span>
          </label>
          <ul className={styles.facts}>
            <li><span>Recipient change waits</span><span className="mono">{demo ? "2 min" : "24 h"}</span></li>
            <li><span>Vendor claim after</span><span className="mono">{demo ? "2 min" : "72 h"}</span></li>
            <li><span>Grace after the term</span><span className="mono">{demo ? "10 min" : "96 h"}</span></li>
            <li><span>Refusals before revoke</span><span className="mono">5 per hour</span></li>
            <li><span>Agent key allowance</span><span className="mono">0.5 NEAR</span></li>
          </ul>
          <p className="small">These are fixed when the account is created and carried into every check. Live agreements cannot go below the live minimums.</p>
        </Panel>
        {error && <p className={`small mono ${styles.error}`} role="alert">{error}</p>}
        <button type="submit" className={styles.submit} disabled={busy || !w.accountId}>
          {busy ? "Creating the account…" : w.accountId ? "Create the deal room" : "Connect the buyer's wallet"}
        </button>
        <p className="small">Next, both companies seal their mandates in their own browsers.</p>
      </aside>
    </form>
  );
}

function Choice({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`${styles.choice} ${on ? styles.choiceOn : ""}`} onClick={onClick}>
      <span className="h4">{title}</span>
      <span className="small">{text}</span>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className="small">{hint}</span>}
    </label>
  );
}
