// The house buyer after an award: when an agent outside the house set wins a house job and accepts it (names its
// approver and payee, signed with its winning key), the keeper opens the agreement and plays the buyer, so the winner
// can do the job and be paid without a person on the buyer's side:
//
// - open: a procurement agreement on the board's factory with the winning key as vendor and its approver as vendor
//   authority, then linked to the job (the board checks it with the factory). An agreement created by an earlier step
//   whose link did not go through is found on the factory and linked, never created twice.
// - the deal: `buyerMove` reads the agreement and returns the buyer's next valid move, the mirror of the SDK's
//   `vendorMove`. The buyer's sealed ceiling is the winning price, so the terms cannot settle above it. It accepts a
//   payee only after the Payee job proved it and the winner's approver approved it, funds the escrow (test USDC is
//   minted when the house account is short), and accepts a delivery only when the copy hosted by the app has the
//   sha256 the agreement holds. It installs no agent key: the vendor claims each accepted item after the claim delay.
// - the end: once every item is paid it asks to close, and takes the spare NEAR back when the agreement is over. An
//   agreement the winner leaves unsealed or unapproved for a day is cancelled, which returns the creation deposit.
//
// A house agent that wins has nobody to do the work, so its job still stops at the award.

import { tenderWork } from "@accord/store";
import {
  DEMO_PARAMS, TGAS, TenderBoardClient, type Accord, type AgreementView, type ItemView, type KeySigner, type Mandate, type RecipientVersion,
  type TenderJob,
} from "@accord/sdk";

const NEAR = 10n ** 24n;
/** Spare NEAR worth a withdrawal; below this the agreement is finished for the keeper. */
const WORTH_WITHDRAWING = NEAR / 20n;
/** NEAR the house buyer keeps after paying a creation deposit, for the gas of the deal and of the next jobs. */
const KEEP_AFTER_CREATE = 3n * NEAR;
/** A winner that accepted but does not seal or approve within this long loses the agreement (the deposit comes back). */
export const PATIENCE_SECS = 24 * 3600;

export type BuyerMove =
  | { kind: "seal" }
  | { kind: "approve"; terms: string }
  | { kind: "accept-recipient"; version: number; warn: boolean }
  | { kind: "fund"; amount: bigint }
  | { kind: "accept-delivery"; item: number }
  | { kind: "mutual-close" }
  | { kind: "close" }
  | { kind: "cancel"; why: string }
  | { kind: "withdraw" }
  | { kind: "wait"; why: string }
  | { kind: "done"; why: string };

export interface BuyerView {
  agreement: AgreementView;
  /** Whether each side's mandate commitment is on chain. */
  sealed: { buyer: boolean; vendor: boolean };
  recipients: RecipientVersion[];
  items: ItemView[];
  /** sha256 of the delivery the app hosts for an item, where it hosts one. */
  hosted: Record<number, string>;
  /** Seconds (the chain's clock) since the keeper first saw this agreement. */
  age: number;
}

const wait = (why: string): BuyerMove => ({ kind: "wait", why });

/** The house buyer's next valid move in a tender-won procurement agreement. `price` is the winning bid. */
export function buyerMove(v: BuyerView, price: bigint): BuyerMove {
  const a = v.agreement;
  if (a.state === "NoDeal" || a.state === "Cancelled" || a.state === "Settled") {
    if (BigInt(a.budget.liquid) >= WORTH_WITHDRAWING) return { kind: "withdraw" };
    return { kind: "done", why: `the agreement is ${a.state}` };
  }
  if (a.state === "Sealed") {
    if (!v.sealed.buyer) return { kind: "seal" };
    if (!v.sealed.vendor && v.age >= PATIENCE_SECS) return { kind: "cancel", why: "the winner did not seal its mandate within a day" };
    return wait(v.sealed.vendor ? "the Sealed Table is negotiating" : "the winner seals its mandate");
  }
  if (a.state === "Attested") {
    // The sealed ceiling already holds this; checked again because the approval is the buyer's own signature.
    if (BigInt(a.total) > price) return { kind: "cancel", why: `the terms total ${a.total}, above the winning price ${price}` };
    if (!a.approvals.buyer && a.terms_hash) return { kind: "approve", terms: a.terms_hash };
    if (!a.approvals.vendor && v.age >= PATIENCE_SECS) return { kind: "cancel", why: "the winner did not approve the terms within a day" };
    return wait("the winner approves the terms");
  }

  // Executing.
  const now = a.now;
  const over = a.ends_at !== null && now >= a.ends_at;
  if (a.in_flight || a.closing) return wait("a payment or the close is in flight");
  if (over) return { kind: "close" };
  const pending = v.recipients.find((r) => r.status === "AuthorityApproved");
  if (pending && pending.rating !== "block") return { kind: "accept-recipient", version: pending.version, warn: pending.rating === "warn" };
  if (BigInt(a.funded) < BigInt(a.total)) return { kind: "fund", amount: BigInt(a.total) - BigInt(a.funded) };
  const items = [...v.items].sort((x, y) => x.id - y.id);
  const delivered = items.find((it) => it.status === "Delivered");
  if (delivered) {
    const sha = delivered.delivery?.evidence_hash;
    if (sha && v.hosted[delivered.id] === sha) return { kind: "accept-delivery", item: delivered.id };
    return wait(`delivery ${delivered.id} has no hosted copy with the sha256 the agreement holds`);
  }
  if (items.length > 0 && items.every((it) => it.status === "Paid" || it.status === "AssumedPaid")) {
    return a.mutual_close.buyer ? wait("every item is paid; the agreement closes when the winner agrees or its term ends") : { kind: "mutual-close" };
  }
  return wait("the winner's move");
}

/** The house buyer's sealed mandate: the winning price is both its ceiling and its target, so that is what it pays. */
export function houseBuyerMandate(job: Pick<TenderJob, "id" | "title" | "spec">, price: bigint): Mandate {
  return {
    kind: "procurement",
    role: "buyer",
    shared: { scope: `Tender job ${job.id}: ${job.title}. ${job.spec}`.slice(0, 500) },
    limits: {
      max_total: price.toString(), target_total: price.toString(), max_items: 4, max_duration_secs: 604800, min_acceptance_window_secs: 120,
    },
    instructions: "This job was awarded on an open tender at this price. Agree to the winning price, split into two to four milestones. Walk away rather than exceed it.",
  };
}

export const tenderTitle = (job: Pick<TenderJob, "id" | "title">): string => `Tender ${job.id}: ${job.title}`.slice(0, 120);

type WorkStore = Pick<typeof tenderWork, "winner" | "delivery">;

export class HouseBuyer {
  private readonly board: TenderBoardClient;
  private factory: Promise<Accord> | null = null;
  /** Agreements with nothing left for the buyer; read again only after a restart. */
  private readonly finished = new Set<string>();
  private readonly firstSeen = new Map<string, number>();

  constructor(
    private readonly boardId: string, private readonly reader: Accord, private readonly buyer: KeySigner, private readonly log: (s: string) => void,
    private readonly work: WorkStore = tenderWork,
  ) {
    this.board = new TenderBoardClient(reader.chain, boardId);
  }

  /** One move per job: `jobs` are the house buyer's own, `isHouseKey` says whether a bidder is one of its agents. */
  async step(jobs: TenderJob[], isHouseKey: (job: number, bidder: string) => boolean): Promise<void> {
    for (const j of jobs) {
      if (!j.winner || isHouseKey(j.id, j.winner)) continue;
      try {
        if (j.phase === "awarded" && !j.agreement) await this.open(j);
        else if (j.phase === "linked" && j.agreement && !this.finished.has(j.agreement)) await this.play(j, j.agreement);
      } catch (e) {
        this.log(`job ${j.id}: ${(e as Error).message.slice(0, 200)}`);
      }
    }
  }

  /** The buyer's client on the factory the board checks links against. */
  private accord(): Promise<Accord> {
    this.factory ??= this.reader.chain.view<string>(this.boardId, "get_factory", {})
      .then((f) => this.reader.onFactory(f).withSigner(this.buyer));
    this.factory.catch(() => { this.factory = null; });
    return this.factory;
  }

  private async open(j: TenderJob): Promise<void> {
    const w = await this.work.winner(this.boardId, j.id);
    if (!w || w.bidder !== j.winner) return; // the winner has not accepted yet
    const accord = await this.accord();
    const title = tenderTitle(j);
    const made = (await accord.listAgreements({ party: this.buyer.accountId }))
      .find((r) => r.buyer === this.buyer.accountId && r.vendor === j.winner && r.vendor_authority === w.authority && r.title === title);
    let agreement = made?.account;
    if (!agreement) {
      const deposit = BigInt((await accord.config()).create_deposit);
      const have = BigInt((await this.reader.chain.account(this.buyer.accountId)).amount);
      if (have < deposit + KEEP_AFTER_CREATE) {
        this.log(`job ${j.id}: ${this.buyer.accountId} holds too little NEAR to open the agreement; waiting for a top-up`);
        return;
      }
      agreement = (await accord.createAgreement({
        kind: "procurement", title, vendor: j.winner!, vendor_authority: w.authority, canaries: [], params: DEMO_PARAMS,
      })).agreement;
      this.log(`job ${j.id}: created ${agreement} for winner ${j.winner!.slice(0, 8)}`);
    }
    const r = await this.board.link(this.buyer, j.id, Number(agreement.slice(1, agreement.indexOf("."))));
    // the board answers with the linked account, or nothing when its factory check refused the agreement
    if (!r.ok || typeof r.value !== "string" || !r.value) throw new Error(`the board did not link ${agreement}${r.failure ? `: ${r.failure}` : ""}`);
    this.log(`job ${j.id}: linked ${agreement} → ${r.txHash}`);
  }

  private async play(j: TenderJob, id: string): Promise<void> {
    const price = j.bids.find((b) => b.bidder === j.winner)?.price;
    if (!price) return;
    const deal = (await this.accord()).agreement(id);
    const [a, c, recipients, items] = await Promise.all([deal.get(), deal.commitments(), deal.recipients(), deal.items()]);
    if (a.buyer !== this.buyer.accountId || a.vendor !== j.winner) { this.finished.add(id); return; }
    if (!this.firstSeen.has(id)) this.firstSeen.set(id, a.now);
    const hosted: Record<number, string> = {};
    for (const it of items.filter((x) => x.status === "Delivered")) {
      const d = await this.work.delivery(id, it.id).catch(() => null);
      if (d) hosted[it.id] = d.sha256;
    }
    const m = buyerMove({ agreement: a, sealed: { buyer: !!c.buyer, vendor: !!c.vendor }, recipients, items, hosted, age: a.now - this.firstSeen.get(id)! }, BigInt(price));
    if (m.kind === "wait") return;
    if (m.kind === "done") { this.finished.add(id); this.log(`job ${j.id}: ${id} finished (${m.why})`); return; }
    let tx: string | undefined;
    switch (m.kind) {
      case "seal": tx = (await deal.sealMandate(houseBuyerMandate(j, BigInt(price)), { role: "buyer" })).txHash; break;
      case "approve": tx = (await deal.approveTerms(m.terms)).txHash; break;
      case "accept-recipient": tx = (await deal.acceptRecipient(m.version, { acknowledgeWarnings: m.warn })).txHash; break;
      case "fund": await this.ensureToken(a.token, m.amount); tx = (await deal.fund(m.amount.toString())).txHash; break;
      case "accept-delivery": tx = (await deal.acceptDelivery(m.item)).txHash; break;
      case "mutual-close": tx = (await deal.mutualClose()).txHash; break;
      case "close": tx = (await deal.close()).txHash; break;
      case "cancel": tx = (await deal.cancel()).txHash; break;
      case "withdraw": tx = (await deal.withdrawNear()).txHash; break;
    }
    this.log(`job ${j.id}: ${id} ${m.kind}${"item" in m ? ` item ${m.item}` : ""}${"why" in m ? ` (${m.why})` : ""} → ${tx}`);
  }

  /** The house buyer's test USDC: minted when it is short (the test token's mint is open, capped per call). */
  private async ensureToken(token: string, amount: bigint): Promise<void> {
    const have = BigInt(await this.reader.chain.view<string>(token, "ft_balance_of", { account_id: this.buyer.accountId }));
    if (have >= amount) return;
    const r = await this.buyer.call(token, "mint", { account_id: this.buyer.accountId, amount: (amount - have).toString() }, { gas: 30n * TGAS });
    if (!r.ok) throw new Error(`${this.buyer.accountId} holds ${have} of ${token}, needs ${amount}, and the mint failed: ${r.failure}`);
  }
}
