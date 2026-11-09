"use client";

// A read-only summary of one agreement for a visitor who is not signed in: what a room link shows above the sign-in
// card, so someone following it (a judge, the other company) sees the room's state before choosing to sign in. Read
// from /api/agreements/<id>, which returns only contract views; nothing here signs or writes.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AgreementView, Receipt, Refusal, Terms } from "@accord/sdk";
import { tokenSymbol, useAppConfig } from "@/components/AppConfig";
import { Account, KV, Panel, Pill, StatePill, Usdc } from "@/components/ui";

type Room = { view: AgreementView; terms: Terms | null; refusals: Refusal[]; receipts: Receipt[] };

export function RoomPreview({ id }: { id: string }) {
  const cfg = useAppConfig();
  const [room, setRoom] = useState<Room | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/agreements/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Room>) : null))
      .then((b) => { if (live) { if (b?.view) setRoom(b); else setMissing(true); } })
      .catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [id]);

  if (missing) return null;
  const verify = <Link href={`/verify/${id}`} className="link small">Verify it</Link>;
  if (!room) {
    return (
      <Panel title={<span className="mono">{id}</span>} eyebrow="deal room · read-only" aside={verify}>
        <p className="small">Reading the agreement from NEAR testnet.</p>
      </Panel>
    );
  }
  const { view: a, terms, refusals, receipts } = room;
  const sym = tokenSymbol(cfg, a.factory);
  const last = refusals.at(-1);
  return (
    <Panel title={a.title || <span className="mono">{id}</span>} eyebrow={<>deal room · read-only · <span className="mono">{id}</span></>} aside={verify}>
      <KV
        rows={[
          ["State", <StatePill key="s" state={a.state} />],
          ["Terms total", terms ? <span key="t"><Usdc amount={terms.total} symbol={sym} /> in {terms.items.length} {a.kind === "market-making" ? "periods" : "items"}</span> : <span key="t" className="small">no terms yet</span>],
          ["Recipient", a.recipient ? <span key="r"><Account id={a.recipient.account} /> <span className="small">on {a.recipient.domain}</span></span> : <span key="r" className="small">none active</span>],
          ["Payments", <span key="p"><span className="num">{receipts.length}</span> · <Usdc amount={a.paid} symbol={sym} /> paid</span>],
          ["Refusals", <span key="f"><span className="num">{a.refusals}</span>{last ? <> · latest <Pill tone="refusal">{last.code}</Pill></> : null}</span>],
        ]}
      />
      <p className="small">Sign in as the buyer or the vendor to act in this room. Anyone can check it without an account.</p>
    </Panel>
  );
}
