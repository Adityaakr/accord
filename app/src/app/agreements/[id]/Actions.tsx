"use client";

// "Your actions": what the connected principal can do in this deal room right now, and nothing else. Every button
// is one of the principal's own transactions, signed by their own wallet; the contract checks the caller again.

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  parseUnits, formatUnits,
  type AgreementView, type ExceptionView, type ItemView, type PeriodView, type RecipientVersion,
} from "@accord/sdk";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useAppConfig } from "@/components/AppConfig";
import { Panel, Pill } from "@/components/ui";
import { agreementClient, errorText, txLine } from "@/components/me/client";
import styles from "./actions.module.css";

type Role = "buyer" | "vendor" | "authority" | "viewer";

export function Actions({
  agreement: a, items, exceptions, recipients, periods,
}: {
  agreement: AgreementView; items: ItemView[]; exceptions: ExceptionView[]; recipients: RecipientVersion[]; periods: PeriodView[];
}) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [agentSecret, setAgentSecret] = useState<string | null>(null);

  const role: Role = !w.accountId ? "viewer"
    : w.accountId === a.buyer ? "buyer"
    : w.accountId === a.vendor ? "vendor"
    : w.accountId === a.vendor_authority ? "authority" : "viewer";

  const client = useMemo(() => (w.signer ? agreementClient(w.signer, cfg, a.account) : null), [w.signer, cfg, a.account]);

  async function run(label: string, fn: () => Promise<{ txHash?: string } | unknown>) {
    setBusy(label);
    setResult(null);
    try {
      setResult(txLine(label, await fn()));
      router.refresh();
    } catch (e) {
      setResult({ ok: false, text: `${label}: ${errorText(e)}` });
    } finally {
      setBusy(null);
    }
  }

  const open = (label: string, fn: () => Promise<unknown>) => () => void run(label, fn);
  const now = a.now;
  const entries: ReactNode[] = [];
  const add = (key: string, node: ReactNode) => entries.push(<li key={key}>{node}</li>);

  if (client) {
    const party = role === "buyer" || role === "vendor";
    // Sealing and negotiation.
    // Once both sides have sealed (Ready, Requested or Done) there is nothing left to seal.
    if (party && a.state === "Sealed" && a.negotiation === "AwaitingMandates") {
      add("seal", <a className={styles.btn} href={`/agreements/${a.account}/seal`}>Seal your mandate</a>);
    }
    if (a.state === "Sealed" && typeof a.negotiation === "object" && "Ready" in a.negotiation) {
      add("negotiate", <Btn busy={busy} label="Start the negotiation" onClick={open("Start the negotiation", () => client.startNegotiation())} />);
    }
    if (party && a.state === "Attested" && a.terms_hash && !(role === "buyer" ? a.approvals.buyer : a.approvals.vendor)) {
      add("approve", <Btn busy={busy} primary label="Approve these terms" onClick={open("Approve these terms", () => client.approveTerms(a.terms_hash!))} />);
    }
    if (party && (a.state === "Sealed" || a.state === "Attested")) {
      add("cancel", <Btn busy={busy} quiet label="Cancel the agreement" onClick={open("Cancel", () => client.cancel())} />);
    }

    // Buyer.
    if (role === "buyer" && a.state === "Executing") {
      const missing = BigInt(a.total) - BigInt(a.funded);
      if (missing > 0n) {
        add("fund", <Btn busy={busy} primary label={`Fund ${formatUnits(missing)} USDC`} onClick={open("Fund the escrow", () => client.fund(missing.toString()))} />);
      }
      for (const v of recipients.filter((x) => x.status === "AuthorityApproved")) {
        add(`accept-${v.version}`, (
          <Btn busy={busy} primary label={`Accept recipient ${v.account}${v.rating === "warn" ? " (warnings)" : ""}`}
            disabled={v.rating === "block"}
            onClick={open("Accept the recipient", () => client.acceptRecipient(v.version, { acknowledgeWarnings: v.rating === "warn" }))} />
        ));
      }
      for (const it of items.filter((i) => i.status === "Delivered" && i.delivery && i.delivery.window_end > now)) {
        add(`acc-${it.id}`, (
          <div className={styles.pair}>
            <Btn busy={busy} label={`Accept delivery ${it.id}`} onClick={open(`Accept delivery ${it.id}`, () => client.acceptDelivery(it.id))} />
            <Btn busy={busy} quiet label="Dispute" onClick={open(`Dispute delivery ${it.id}`, () => client.disputeDelivery(it.id, "Does not meet the deliverable"))} />
          </div>
        ));
      }
      for (const e of exceptions.filter((x) => x.status === "pending")) {
        add(`ex-${e.id}`, (
          <div className={styles.pair}>
            <Btn busy={busy} label={`Approve exception ${e.id} · ${formatUnits(e.amount)} USDC`} onClick={open("Approve the exception", () => client.approveException(e.id))} />
            <Btn busy={busy} quiet label="Reject" onClick={open("Reject the exception", () => client.rejectException(e.id))} />
          </div>
        ));
      }
      for (const p of periods.filter((x) => x.outcome === "Review" || x.outcome === "Withheld")) {
        add(`p-${p.period}`, (
          <div className={styles.pair}>
            <Btn busy={busy} label={`Pay period ${p.period + 1}`} onClick={open(`Resolve period ${p.period + 1}`, () => client.resolvePeriod(p.period, true))} />
            <Btn busy={busy} quiet label="Close unpaid" onClick={open(`Resolve period ${p.period + 1}`, () => client.resolvePeriod(p.period, false))} />
          </div>
        ));
      }
      if (!a.agent_key) {
        add("install", <Btn busy={busy} label="Install an agent key" onClick={open("Install an agent key", async () => {
          const { KeyPair } = await import("near-api-js");
          const kp = KeyPair.fromRandom("ed25519");
          const tx = await client.installAgentKey(kp.getPublicKey().toString(), a.params.agent_allowance);
          setAgentSecret(kp.toString());
          return tx;
        })} />);
      }
      // Revoke lives in the room header, always in view (RoomHeader: hold to confirm, key read back first).
    }
    if (role === "buyer" && a.state === "Settled") {
      add("withdraw", <Btn busy={busy} label="Withdraw spare NEAR" onClick={open("Withdraw NEAR", () => client.withdrawNear())} />);
    }

    // Vendor.
    if (role === "vendor" && a.state !== "NoDeal" && a.state !== "Cancelled" && !a.pending_recipient) {
      add("propose", <ProposeRecipient busy={busy} domain={a.domain} onSubmit={(acct, domain) => run("Propose the recipient", () => client.proposeRecipient(acct, domain))} />);
    }
    if (role === "vendor" && a.state === "Executing") {
      for (const it of items.filter((i) => a.kind === "procurement" && (i.status === "Open" || i.status === "Disputed"))) {
        add(`d-${it.id}`, <Btn busy={busy} label={`Deliver item ${it.id}`} onClick={open(`Deliver item ${it.id}`, async () => {
          const evidence = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
          return client.submitDelivery(it.id, evidence, `${location.origin}/deliveries/${a.account}/${it.id}`);
        })} />);
      }
      for (const it of items.filter((i) => (i.status === "Eligible" || i.status === "Reserved") && i.eligible_at && now >= i.eligible_at + a.params.claim_delay_secs)) {
        add(`c-${it.id}`, <Btn busy={busy} label={`Claim item ${it.id}`} onClick={open(`Claim item ${it.id}`, () => client.claim(it.id))} />);
      }
    }

    // Authority.
    if (role === "authority") {
      for (const v of recipients.filter((x) => x.status === "Proven")) {
        add(`ap-${v.version}`, <Btn busy={busy} primary label={`Approve recipient ${v.account}`} onClick={open("Approve the recipient", () => client.approveRecipient(v.version))} />);
      }
    }

    // Anyone.
    for (const v of recipients.filter((x) => x.status === "Accepted" && x.active_at !== null && x.active_at <= now)) {
      add(`act-${v.version}`, <Btn busy={busy} label={`Activate recipient ${v.version}`} onClick={open("Activate the recipient", () => client.activateRecipient(v.version))} />);
    }
    for (const p of periods.filter((x) => x.outcome === "Open" && x.closable_at !== undefined && x.closable_at <= now)) {
      add(`cp-${p.period}`, <Btn busy={busy} label={`Close period ${p.period + 1}`} onClick={open(`Close period ${p.period + 1}`, () => client.closePeriod(p.period))} />);
    }
    if (a.state === "Executing" && a.ends_at && now >= a.ends_at + a.params.grace_secs) {
      add("close", <Btn busy={busy} label="Close the agreement" onClick={open("Close", () => client.close())} />);
    }
  }

  return (
    <Panel
      title="Your actions"
      eyebrow={w.accountId ? <>signed in as <span className="mono">{w.accountId}</span> · {role === "viewer" ? "not a party" : role}</> : "connect a wallet to act as a party"}
      aside={role !== "viewer" ? <Pill tone="teal">{role}</Pill> : undefined}
    >
      {!w.accountId && <p className="small">Anyone can read this room. Only its buyer, vendor and settlement authority can act, each with their own wallet.</p>}
      {w.accountId && entries.length === 0 && <p className="small">Nothing for you to do here right now.</p>}
      {entries.length > 0 && <ul className={styles.list}>{entries}</ul>}
      {agentSecret && (
        <div className={styles.secret} role="alert">
          <p className="small strong">Give this key to the agent, then close this message. It is not stored anywhere.</p>
          <code className="mono">{agentSecret}</code>
          <button type="button" className={styles.link} onClick={() => setAgentSecret(null)}>I saved it</button>
        </div>
      )}
      {result && <p className={`small mono ${result.ok ? styles.ok : styles.bad}`} role="status">{result.text}</p>}
    </Panel>
  );
}

function Btn({ label, onClick, busy, primary, danger, quiet, disabled }: {
  label: string; onClick: () => void; busy: string | null; primary?: boolean; danger?: boolean; quiet?: boolean; disabled?: boolean;
}) {
  const cls = [styles.btn, primary && styles.primary, danger && styles.danger, quiet && styles.quiet].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} onClick={onClick} disabled={busy !== null || disabled}>
      {busy === label ? "Waiting for the network…" : label}
    </button>
  );
}

function ProposeRecipient({ busy, domain, onSubmit }: { busy: string | null; domain: string | null; onSubmit: (account: string, domain: string) => void }) {
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState("");
  const [dom, setDom] = useState(domain ?? "");
  if (!open) return <button type="button" className={styles.btn} onClick={() => setOpen(true)}>Propose a recipient</button>;
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); onSubmit(acct.trim(), dom.trim()); }}>
      <label className={styles.field}><span className="small">Recipient account</span>
        <input className={styles.input} value={acct} onChange={(e) => setAcct(e.target.value)} placeholder="halcyon-mm.testnet" required />
      </label>
      <label className={styles.field}><span className="small">Domain with /.well-known/accord.json</span>
        <input className={styles.input} value={dom} onChange={(e) => setDom(e.target.value)} placeholder="halcyon.example" required readOnly={!!domain} />
      </label>
      <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={busy !== null}>Propose</button>
    </form>
  );
}

export function parseAmount(text: string): string {
  return parseUnits(text).toString();
}
