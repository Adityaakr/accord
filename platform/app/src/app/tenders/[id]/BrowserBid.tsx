"use client";

// Bid from this browser: the signed-in person seals a price with a bidder key kept in this browser's storage, and
// the app's relay submits it (it pays the gas and the bond; the board checks the key's signature). The price and
// the salt stay here until the reveal window, when this page reveals the bid once on its own. The key is linked to
// the signed-in account, so the bid shows on /tenders/agents.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  addBidSecret, nextNonce, parseTenderAmount, prepareBid, secretFor, validAgentLabel, type BidderKey, type TenderJob,
} from "@accord/sdk";
import { TxLink } from "@/components/TxLink";
import { Panel, Pill } from "@/components/ui";
import { useOrg } from "@/components/org/OrgProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import { bidsKey, browserKey, browserLabel, ensureBrowserKey, isLinked, linkBrowserKey, read, relay, write } from "../browserKey";
import { tokenOf } from "../lib";
import { TokenAmount } from "../TokenAmount";
import styles from "../act.module.css";

type Msg = { ok: boolean; text: string; tx?: string } | null;

export function BrowserBid({ board, job }: { board: string; job: TenderJob }) {
  const w = useWallet();
  const o = useOrg();
  const router = useRouter();
  const [key, setKey] = useState<BidderKey | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [price, setPrice] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    setKey(browserKey());
    setKept(read(bidsKey(board, job.id)));
    setReady(true);
  }, [board, job.id]);
  useEffect(() => { if (w.accountId) setLabel((l) => l || browserLabel(w.accountId!)); }, [w.accountId]);

  const mine = key ? (job.bids.find((b) => b.bidder === key.id) ?? null) : null;
  const secret = mine ? secretFor(kept, mine) : null;
  const canReveal = job.phase === "revealing" && !!mine && mine.price === null && !!secret;

  async function reveal() {
    if (!key || !mine || !secret) return;
    setBusy(true);
    setMsg(null);
    const r = await relay(`/api/tenders/${job.id}/reveal`, { bidder: key.id, price: secret.price, salt: secret.salt });
    setMsg(r.ok ? { ok: true, text: "Revealed.", tx: r.tx } : { ok: false, text: r.error });
    setBusy(false);
    router.refresh();
  }

  // Reveal once on its own when the page is open in the reveal window; the button stays for a retry.
  useEffect(() => {
    if (canReveal && !tried.current) { tried.current = true; void reveal(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReveal]);

  async function bid(e: React.FormEvent) {
    e.preventDefault();
    if (!w.accountId) return;
    setMsg(null);
    const text = price.trim();
    // parsed in the job's own token decimals: a 6-decimal parse on a NEAR job would be a near-zero bid
    let units: bigint;
    try {
      units = parseTenderAmount(text, job.token);
    } catch {
      setMsg({ ok: false, text: "A price is an amount like 36.50, with up to 6 decimals." });
      return;
    }
    if (units <= 0n) { setMsg({ ok: false, text: "The price must be more than 0." }); return; }
    if (units > BigInt(job.budget)) { setMsg({ ok: false, text: "That is above the budget, so the bid could not win." }); return; }
    if (!validAgentLabel(label)) { setMsg({ ok: false, text: "An agent label is 1 to 64 printable characters, no ':', no space at either end." }); return; }
    const got = ensureBrowserKey();
    if (!got) { setMsg({ ok: false, text: "This browser blocks storage, so it cannot keep a bidder key or a sealed price. Bid with the script instead." }); return; }
    setKey(got.key);
    setBusy(true);
    try {
      if (!isLinked(w.accountId, got.key.id)) {
        const err = o.session === w.accountId ? await linkBrowserKey(got.key, w.accountId, label) : "no_session";
        setLinkNote(err === null ? null : err === "no_session" ? "no_session" : `This agent is not on Your agents yet: ${err}`);
      }
      const onChain = job.bids.find((b) => b.bidder === got.key.id) ?? null;
      const prev = read(bidsKey(board, job.id));
      const sealed = prepareBid({ board, job: job.id, price: units, agent: label, key: got.key, nonce: nextNonce(prev, onChain?.nonce ?? null) });
      // the secret is kept before the bid leaves: a bid that lands without its salt could never be revealed
      const next = addBidSecret(prev, sealed);
      if (!write(bidsKey(board, job.id), next)) { setMsg({ ok: false, text: "Could not keep the sealed price in this browser, so nothing was sent." }); return; }
      setKept(next);
      const r = await relay(`/api/tenders/${job.id}/bids`, {
        bidder: sealed.bidder, agent: sealed.agent, commitment: sealed.commitment, nonce: sealed.nonce, signature: sealed.signature,
      });
      setMsg(r.ok ? { ok: true, text: onChain ? "Bid replaced. Sealed on chain." : "Bid sealed on chain.", tx: r.tx } : { ok: false, text: r.error });
      if (r.ok) setPrice("");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  const tok = tokenOf(job.token);
  const amount = (base: string) => <TokenAmount base={base} token={job.token} />;
  const result = msg ? (
    <p className={`${styles.msg} ${msg.ok ? styles.ok : styles.bad}`} role="status">
      {msg.text}{msg.tx ? <> <TxLink hash={msg.tx} /></> : null}
    </p>
  ) : null;
  const keptPrice = secret ? amount(secret.price) : null;

  if (job.phase === "open") {
    if (!w.accountId) {
      return (
        <Panel title="Bid from this browser">
          <p className="small"><Link className="link" href={`/signin?next=/tenders/${job.id}`}>Sign in</Link> to bid here without a script. This browser keeps the key and the sealed price.</p>
        </Panel>
      );
    }
    if (!tok) {
      return (
        <Panel title="Bid from this browser">
          <p className="small">This job pays in <span className="mono">{job.token}</span>, a token this app does not know the decimals of, so it cannot price a bid here. Bid with the script.</p>
        </Panel>
      );
    }
    return (
      <Panel title="Bid from this browser">
        <form className={styles.bidForm} onSubmit={(e) => void bid(e)}>
          {mine ? (
            <p className="small">Your sealed bid: {keptPrice ?? <span className="faint">price not kept in this browser</span>} as <span className="mono">{mine.agent}</span></p>
          ) : null}
          <div className={styles.fields}>
            <label className={styles.fieldRow}>
              <span className={styles.fieldName}>{mine ? "New price" : "Price"}</span>
              <span className={styles.box}>
                <input className={`${styles.input} ${styles.right}`} inputMode="decimal" autoComplete="off" placeholder="36.50" value={price}
                  onChange={(e) => setPrice(e.target.value)} required aria-describedby="bid-budget" />
                <span className={styles.unit}>{tok.symbol}</span>
              </span>
            </label>
            <label className={styles.fieldRow}>
              <span className={styles.fieldName}>Agent</span>
              <span className={styles.box}>
                <input className={`${styles.input} ${styles.right}`} value={label} maxLength={64} onChange={(e) => setLabel(e.target.value)} required spellCheck={false} />
              </span>
            </label>
          </div>
          <p id="bid-budget" className={styles.hint}>Budget {amount(job.budget)}. No NEAR needed: the relay pays the gas and the <span className="mono">0.02</span> NEAR bond.</p>
          <button type="submit" className={`${styles.btn} ${styles.primary} ${styles.full}`} disabled={busy} aria-busy={busy}>
            {busy ? "Sealing and sending…" : mine ? "Replace my bid" : "Seal and bid"}
          </button>
          {result}
          <p className={styles.hint}>This browser keeps the key and the sealed price. Come back after bidding closes: this page reveals the bid, or it cannot win.</p>
          {linkNote === "no_session"
            ? <p className={styles.hint}>To see this agent on <Link className="link" href="/tenders/agents">Your agents</Link>, confirm it is you there; the bid itself does not need it.</p>
            : linkNote ? <p className={styles.hint}>{linkNote}</p> : null}
        </form>
      </Panel>
    );
  }

  if (!mine) return null;

  if (job.phase === "revealing") {
    return (
      <Panel title="Your bid from this browser" eyebrow={<>agent <span className="mono">{mine.agent}</span></>}>
        <div className={styles.bidForm}>
          {mine.price !== null ? (
            <p className="small">Revealed at {amount(mine.price)}. The award opens when the reveal window closes, or once every bid is revealed.</p>
          ) : secret ? (
            <>
              <p className="small">Bidding is closed. Reveal your price of {keptPrice} so the board counts it.</p>
              <button type="button" className={`${styles.btn} ${styles.primary} ${styles.full}`} onClick={() => void reveal()} disabled={busy} aria-busy={busy}>
                {busy ? "Revealing…" : "Reveal my bid"}
              </button>
            </>
          ) : (
            <p className={`${styles.msg} ${styles.warn}`}>This browser does not hold the price and salt for the bid on chain, so it cannot reveal it. Reveal from where the bid was made.</p>
          )}
          {result}
        </div>
      </Panel>
    );
  }

  const won = job.winner === mine.bidder;
  const decided = job.phase === "awarded" || job.phase === "linked" || job.phase === "no_valid_bid";
  return (
    <Panel title="Your bid from this browser" eyebrow={<>agent <span className="mono">{mine.agent}</span></>}
      aside={won ? <Pill tone="teal">won</Pill> : decided ? <Pill tone="muted">lost</Pill> : job.phase === "cancelled" ? <Pill tone="muted">cancelled</Pill> : <Pill tone="neutral">pending</Pill>}>
      <p className="small">Price {mine.price !== null ? amount(mine.price) : <span className="faint">never revealed</span>}</p>
    </Panel>
  );
}
