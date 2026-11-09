"use client";

// The mandate editor. The mandate exists only in this component's memory: it is sealed with the SDK in the browser
// and the wallet sends the ciphertext. No request from this page carries the mandate.

import { useEffect, useMemo, useState } from "react";
import { AccountId, shortAccount } from "@/components/account/AccountId";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deriveDocKey, formatUnits, parseUnits, type DocKey, type Kind, type Mandate } from "@accord/sdk";
import { browserAccord } from "@/components/chainClient";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useAppConfig } from "@/components/AppConfig";
import { errorText } from "@/components/me/client";
import { Panel, Pill } from "@/components/ui";
import type { Preset } from "@/server/presets";
import styles from "../../form.module.css";
import { SealMoment } from "./SealMoment";
import { TxLink } from "@/components/TxLink";
import { briefFacts, readStoredBrief } from "../../new/intake";

const AMOUNT_KEYS = /total|retainer|depth_quote/;
const LIMIT_LABELS: Record<string, string> = {
  max_total: "Most we will pay in all", target_total: "What we aim for", min_total: "Least we will accept",
  max_items: "Most milestones", min_items: "Fewest milestones", max_duration_secs: "Longest term (seconds)",
  min_acceptance_window_secs: "Shortest acceptance window (seconds)", max_acceptance_window_secs: "Longest acceptance window (seconds)",
  min_due_offset_secs: "Earliest due time (seconds after start)", max_retainer_per_period: "Most retainer per period",
  min_retainer_per_period: "Least retainer per period", periods: "Periods", period_secs: "Period length (seconds)",
  max_spread_bps: "Widest spread we accept (bps)", tightest_spread_bps: "Tightest spread we promise (bps)",
  min_depth_quote: "Least depth each side", max_depth_quote: "Most depth we promise", depth_band_bps: "Depth band (bps)",
  min_slots: "Fewest slots per period", min_threshold: "Lowest pass threshold", max_threshold: "Highest pass threshold",
  min_depth_band_bps: "Narrowest depth band we accept (bps)",
};

type Draft = Record<string, string>;

function toDraft(limits: Record<string, unknown>): Draft {
  const d: Draft = {};
  for (const [k, v] of Object.entries(limits)) {
    d[k] = AMOUNT_KEYS.test(k) && typeof v === "string" && /^\d+$/.test(v) ? formatUnits(v, 6, 2).replace(/,/g, "") : String(v);
  }
  return d;
}

function fromDraft(draft: Draft, template: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(draft)) {
    const t = template[k];
    out[k] = typeof t === "number" ? Number(v) : AMOUNT_KEYS.test(k) ? parseUnits(v).toString() : v;
  }
  return out;
}

export function SealForm({
  agreement, kind, buyer, vendor, state, sealed, presets,
}: {
  agreement: string; kind: Kind; buyer: string; vendor: string; state: string;
  sealed: { buyer: string | null; vendor: string | null }; presets: Preset[];
}) {
  const w = useWallet();
  const cfg = useAppConfig();
  const role = w.accountId === buyer ? "buyer" : w.accountId === vendor ? "vendor" : null;
  const options = useMemo(() => presets.filter((p) => p.mandate.role === role), [presets, role]);
  const [presetId, setPresetId] = useState<string | null>(null);
  const preset = options.find((p) => p.id === presetId) ?? options[0] ?? null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ commitment: string; txHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A wallet that opens its own window (Meteor, Intear, ...) can open only one window per click: browsers block a
  // second pop-up that no click opened. So a wallet seals in two clicks, each opening one window: sign the message
  // that derives the document key, then send the sealed mandate. A throwaway key opens no window and does both.
  const twoSteps = w.method === "wallet";
  const [docKey, setDocKey] = useState<DocKey | null>(null);

  // The buyer's working brief from the new room flow, if this browser kept it: shown for reference, never sealed as is.
  const [fromBrief, setFromBrief] = useState<{ label: string; value: string; sealAs?: string }[]>([]);
  useEffect(() => {
    const b = readStoredBrief(agreement);
    setFromBrief(b?.intake && b.kind ? briefFacts(b.kind, b.intake, b.symbol ?? "USDC") : []);
  }, [agreement]);

  const limits = draft ?? (preset ? toDraft(preset.mandate.limits) : {});
  const text = instructions ?? preset?.mandate.instructions ?? "";

  function pick(p: Preset) {
    setPresetId(p.id);
    setDraft(toDraft(p.mandate.limits));
    setInstructions(p.mandate.instructions);
  }

  async function unlock() {
    if (!w.signer) return;
    setBusy(true);
    setError(null);
    try {
      setDocKey(await deriveDocKey(w.signer, agreement));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function seal() {
    if (!w.signer || !role || !preset) return;
    setBusy(true);
    setError(null);
    try {
      const mandate: Mandate = {
        kind, role, shared: preset.mandate.shared, limits: fromDraft(limits, preset.mandate.limits), instructions: text,
      };
      const client = browserAccord(cfg, { signer: w.signer })
        .agreement(agreement);
      setDone(await client.sealMandate(mandate, docKey ? { role, docKey } : { role }));
      router.refresh(); // "Sealed so far" re-reads the commitments
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!w.accountId) {
    return <Panel title="Connect the party's wallet"><p className="body">Only the buyer ({buyer}) or the vendor ({vendor}) can seal a mandate here.</p></Panel>;
  }
  if (!role) {
    return <Panel title="Not a party"><p className="body"><AccountId id={w.accountId} /> is neither the buyer nor the vendor of this agreement.</p></Panel>;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <Panel title="Start from" eyebrow="fictional sample mandates (fixtures/companies)">
          <div className={styles.presets}>
            {options.map((p) => (
              <button key={p.id} type="button" className={`${styles.preset} ${p.id === preset?.id ? styles.presetOn : ""}`} onClick={() => pick(p)}>
                {p.company} · {p.label}
              </button>
            ))}
          </div>
        </Panel>

        {preset && (
          <>
            <Panel title="Shared with the other side" eyebrow="their negotiator sees this; it also goes into the commercial terms document">
              <pre className={styles.shared}>{JSON.stringify(preset.mandate.shared, null, 2)}</pre>
            </Panel>

            {done ? (
              <SealMoment role={role} commitment={done.commitment} txHash={done.txHash}
                rows={Object.entries(limits).map(([k, v]) => ({ label: LIMIT_LABELS[k] ?? k, value: v }))} />
            ) : (
            <Panel title="Your limits" eyebrow="private: only your negotiator and the code checks see them" aside={<Pill tone="teal">sealed</Pill>}>
              <div className={styles.limits}>
                {Object.entries(limits).map(([k, v]) => (
                  <label key={k} className={styles.field}>
                    <span className={styles.label}>{LIMIT_LABELS[k] ?? k}</span>
                    <input className={styles.input} value={v} inputMode="decimal"
                      onChange={(e) => setDraft({ ...limits, [k]: e.target.value })} />
                    <span className="small mono faint">{k}{AMOUNT_KEYS.test(k) ? " · USDC" : ""}</span>
                  </label>
                ))}
              </div>
            </Panel>
            )}

            <Panel title="Instructions to your negotiator" eyebrow="private">
              <textarea className={styles.textarea} value={text} onChange={(e) => setInstructions(e.target.value)} maxLength={600} disabled={!!done} />
            </Panel>
          </>
        )}
      </div>

      <aside className={styles.side}>
        <Panel title="Privacy boundary">
          <div className={styles.boundary} style={{ gridTemplateColumns: "1fr" }}>
            <div><span className="h5">Only inside the enclave</span><span className="small">Your limits and instructions; the negotiation transcript.</span></div>
            <div><span className="h5">Both companies</span><span className="small">Each side&apos;s shared part, in the terms document.</span></div>
            <div><span className="h5">Public on NEAR</span><span className="small">The ciphertext, its commitment hash, and later the enforced terms and every payment.</span></div>
          </div>
        </Panel>

        {role === "buyer" && fromBrief.length > 0 && (
          <Panel title="From your brief" eyebrow="kept in this browser; type the figures into your limits">
            <ul className={styles.facts}>
              {fromBrief.map((f) => (
                <li key={f.label}><span>{f.label}</span><span className="mono">{f.value}</span></li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Sealed so far">
          <ul className={styles.facts}>
            <li><span>Buyer</span><span className="mono">{sealed.buyer ? `${sealed.buyer.slice(0, 8)}…` : "not yet"}</span></li>
            <li><span>Vendor</span><span className="mono">{sealed.vendor ? `${sealed.vendor.slice(0, 8)}…` : "not yet"}</span></li>
          </ul>
        </Panel>

        {done ? (
          <div className={styles.sealed}>
            <span className="h5">Sealed as the {role}</span>
            <span className="small mono">commitment {done.commitment.slice(0, 16)}…</span>
            <span className="small mono"><TxLink hash={done.txHash} chars={16} /></span>
            <Link href={`/agreements/${agreement}`} className="small link">Back to the deal room</Link>
          </div>
        ) : (
          state !== "Sealed" ? (
            <button type="button" className={styles.submit} disabled>Negotiation already started</button>
          ) : twoSteps && !docKey ? (
            <button type="button" className={styles.submit} onClick={() => void unlock()} disabled={busy || !preset}>
              {busy ? "Waiting for your wallet…" : "1 · Sign to unlock your document key"}
            </button>
          ) : (
            <button type="button" className={styles.submit} onClick={() => void seal()} disabled={busy || !preset}>
              {busy ? "Sealing in this browser…" : twoSteps ? `2 · Seal and send as the ${role}` : `Seal as the ${role}`}
            </button>
          )
        )}
        {error && <p className={`small mono ${styles.error}`} role="alert">{error}</p>}
        <p className="small">{twoSteps
          ? docKey ? "Key unlocked. Now send the sealed mandate: your wallet opens once more." : "Two steps, one wallet window each: sign a message to derive your document key, then send the sealed mandate. No deposit: the agreement pays for its storage."
          : "Your key signs a message to derive your document key, then sends the sealed mandate. No deposit: the agreement pays for its storage."}</p>
      </aside>
    </div>
  );
}
