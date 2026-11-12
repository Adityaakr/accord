// What a winning tender agent does after the award, so it can finish the job without anyone pasting anything:
//
// 1. It tells the app which second key approves its recipients (the agreement's vendor_authority, which must differ
//    from the vendor) and which account it is paid to, signed by its winning key (winnerMessage). The buyer's app reads
//    that to open the agreement with one button; the relay funds the three accounts once so they can pay their gas.
// 2. Once the buyer links the agreement on the board, it plays the vendor: `vendorMove` reads the agreement and returns
//    the vendor's (or its authority's) next valid move, or whose move it is. It is pure, so the CLI loop, a script and
//    the tests share one decision table. It mirrors the app's demo counterparty (app/src/server/demo.ts).
// 3. Each item it delivers is the output of the agent's own work; the app hosts it (signed with deliveryMessage) and
//    the agreement records its sha256. The agent is paid by the buyer's agent, or claims the item itself after the
//    agreement's claim delay. The contract checks recipient, evidence and amount either way.

import { ed25519 } from "@noble/curves/ed25519";
import type { Mandate } from "./sealing.js";
import type { AgreementView, ItemView, RecipientVersion } from "./types.js";

const utf8 = (s: string) => new TextEncoder().encode(s);
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));
const HEX64 = /^[0-9a-f]{64}$/;
const SIG = /^[0-9a-f]{128}$/;

function verify(bidder: string, message: string, signature: string): boolean {
  try {
    return HEX64.test(bidder) && SIG.test(signature) && ed25519.verify(unhex(signature), utf8(message), unhex(bidder));
  } catch {
    return false;
  }
}

/** What the winning key signs to name its approver and payee for this job. */
export const winnerMessage = (board: string, job: number, authority: string, recipient: string): string =>
  `accord-tender:v1:winner:${board}:${job}:${authority}:${recipient}`;
export const signWinner = (seed: string, board: string, job: number, authority: string, recipient: string): string =>
  hex(ed25519.sign(utf8(winnerMessage(board, job, authority, recipient)), unhex(seed)));
export const verifyWinner = (bidder: string, board: string, job: number, authority: string, recipient: string, signature: string): boolean =>
  verify(bidder, winnerMessage(board, job, authority, recipient), signature);

/** What the vendor key signs to publish the work it delivered for an item. */
export const deliveryMessage = (agreement: string, item: number, sha256: string): string => `accord-tender:v1:delivery:${agreement}:${item}:${sha256}`;
export const signDelivery = (seed: string, agreement: string, item: number, sha256: string): string =>
  hex(ed25519.sign(utf8(deliveryMessage(agreement, item, sha256)), unhex(seed)));
export const verifyDelivery = (bidder: string, agreement: string, item: number, sha256: string, signature: string): boolean =>
  verify(bidder, deliveryMessage(agreement, item, sha256), signature);

/**
 * The winner's sealed mandate: its winning bid is both its floor and its target, so the Sealed Table cannot settle it
 * below the price it won with. Two to four items, as the app's procurement rooms expect.
 */
export function tenderVendorMandate(price: bigint, opts: { job: number; title: string; capabilities?: string }): Mandate {
  return {
    kind: "procurement",
    role: "vendor",
    shared: { capabilities: (opts.capabilities ?? `Won tender job ${opts.job} ("${opts.title}") with a sealed bid; delivers the work it bid for.`).slice(0, 500) },
    limits: {
      min_total: price.toString(), target_total: price.toString(), min_items: 2, max_items: 4, min_due_offset_secs: 60,
      max_acceptance_window_secs: 604800,
    },
    instructions: "This price won an open tender. Hold it: never go below the floor. Split it into deliverable milestones.",
  };
}

export type VendorMove =
  | { kind: "seal" }
  | { kind: "negotiate" }
  | { kind: "approve"; terms: string }
  | { kind: "propose"; recipient: string; domain: string }
  | { kind: "authority-approve"; version: number }
  | { kind: "activate"; version: number }
  | { kind: "deliver"; item: number }
  | { kind: "claim"; item: number }
  | { kind: "wait"; why: string; buyer: boolean }
  | { kind: "done"; why: string };

export interface VendorView {
  agreement: AgreementView;
  /** Whether each side's mandate commitment is on chain. */
  sealed: { buyer: boolean; vendor: boolean };
  recipients: RecipientVersion[];
  items: ItemView[];
  /** Seconds, the chain's clock (agreement.now when the view has it). */
  now: number;
}

const liveVersion = (v: RecipientVersion) => !["ProofFailed", "Superseded", "Cancelled"].includes(v.status);
const wait = (why: string, buyer = false): VendorMove => ({ kind: "wait", why, buyer });

/** The vendor's next valid move in a procurement agreement, given who it is paid to and on which domain. */
export function vendorMove(v: VendorView, payee: { recipient: string; domain: string }): VendorMove {
  const a = v.agreement;
  if (a.state === "NoDeal") return { kind: "done", why: "the Sealed Table found no deal inside both mandates" };
  if (a.state === "Cancelled") return { kind: "done", why: "the agreement was cancelled" };
  if (a.state === "Settled") return { kind: "done", why: "the agreement is settled" };

  if (a.state === "Sealed") {
    if (!v.sealed.vendor) return { kind: "seal" };
    if (!v.sealed.buyer) return wait("the buyer seals its mandate in the deal room", true);
    if (typeof a.negotiation === "object" && "Ready" in a.negotiation) return { kind: "negotiate" };
    return wait("the Sealed Table is negotiating (about a minute)");
  }
  if (a.state === "Attested") {
    if (!a.approvals.vendor && a.terms_hash) return { kind: "approve", terms: a.terms_hash };
    return wait("the buyer reads and approves the terms", true);
  }

  // Executing: the recipient first, then funding, then the items one at a time, until the term ends.
  if (a.ends_at !== null && v.now >= a.ends_at) return { kind: "done", why: "the agreement's term has ended; deliveries are closed" };
  const current = v.recipients.filter(liveVersion).at(-1) ?? null;
  if (!a.recipient && !current) {
    // a payee the Payee job could not prove is proposed once more at most: each proposal costs the agreement a deposit
    const failed = v.recipients.filter((x) => x.status === "ProofFailed");
    if (failed.length >= 2) return { kind: "done", why: `the payee could not be proven: ${failed.at(-1)!.failure ?? failed.at(-1)!.reasons.join("; ")}` };
    return { kind: "propose", recipient: payee.recipient, domain: payee.domain };
  }
  if (current && current.status !== "Active") {
    if (current.status === "Proposed") return wait("the Payee job is checking the recipient on the domain (about a minute)");
    if (current.status === "Proven") return { kind: "authority-approve", version: current.version };
    if (current.status === "AuthorityApproved") return wait(`the buyer accepts recipient ${current.account}`, true);
    if (current.status === "Accepted") {
      if (current.active_at !== null && current.active_at > v.now) return wait("the recipient change is in its timelock");
      return { kind: "activate", version: current.version };
    }
  }
  if (BigInt(a.funded) < BigInt(a.total)) return wait("the buyer funds the escrow", true);

  const items = [...v.items].sort((x, y) => x.id - y.id);
  const delivered = items.find((it) => it.status === "Delivered");
  if (delivered) return wait(`the buyer accepts delivery ${delivered.id}`, true);
  const eligible = items.find((it) => it.status === "Eligible");
  if (eligible) {
    const ready = eligible.eligible_at !== null && v.now >= eligible.eligible_at + a.params.claim_delay_secs;
    return ready ? { kind: "claim", item: eligible.id } : wait(`item ${eligible.id} is eligible: the buyer's agent pays it, or the vendor claims it after the claim delay`);
  }
  // a disputed item is delivered again (the contract takes a new delivery for it)
  const next = items.find((it) => it.evidence === "DeliveryAccepted" && ((it.status === "Open" && !it.delivery) || it.status === "Disputed"));
  if (next) return { kind: "deliver", item: next.id };
  if (items.every((it) => it.status === "Paid" || it.status === "AssumedPaid")) return { kind: "done", why: "every item is paid" };
  return wait("nothing for the vendor to do until the buyer moves", true);
}
