// A tender agent's path from bidding to being paid, as far as this app takes part in it. Every write is checked against
// a signature by the agent's own bidder key and against the board; none of it moves money or decides anything the
// board or the agreement contracts would not:
//
// - claim: an agent says which account runs it (the link signature). It waits on that account's dashboard until the
//   owner approves it, so no agent joins a dashboard uninvited and nobody pastes a link.
// - winner: the winning key names its approver (the agreement's vendor_authority) and its payee, both keys it holds
//   (the payee signs too). The faucet funds the three accounts once per job so they can pay their own gas, and the
//   payee is registered on the app's labelled demo domain so the Payee job can prove it. The buyer's page then opens
//   the agreement with one button.
// - delivery: the work the winner delivered for an item, hosted for the buyer to read; the agreement holds its sha256.
import "server-only";
import { createHash } from "node:crypto";
import { registerDemoVendor, tenderWork, TENDER_DELIVERY_MAX, type TenderClaim, type TenderDelivery, type TenderWinner } from "@accord/store";
import { tenderToken, validAgentLabel, verifyDelivery, verifyLink, verifyWinner, type TenderJob } from "@accord/sdk";
import { accord } from "./accord";
import { demoConfig, faucetGrants } from "./demo";
import { takeAll } from "./limiter";
import { RelayError, boardId, getJob } from "./tender";

const NEAR = 10n ** 24n;
/**
 * Enough for each key's own gas through the whole deal: the vendor signs about ten calls, the approver one, the payee
 * none. A 300 TGas call (start_negotiation, propose_recipient) needs about 0.301 NEAR on hand before it runs, though
 * most of it is refunded, so the vendor gets 1 NEAR (0.3 failed live on job 18 with "Not enough balance").
 */
export const WINNER_GRANTS = { vendor: NEAR, authority: NEAR / 10n, recipient: NEAR / 20n } as const;
const ACCOUNT = /^(?=.{2,64}$)([a-z\d]+[-_])*[a-z\d]+(\.([a-z\d]+[-_])*[a-z\d]+)*$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SOURCES = ["browser", "script", "cli", "mcp"] as const;

// ---- claims -----------------------------------------------------------------------------------------------------

export async function claimAccount(b: Record<string, unknown>): Promise<{ ok: true; account: string; bidder: string }> {
  const account = String(b.account ?? "").trim().toLowerCase(), bidder = String(b.bidder ?? ""), signature = String(b.signature ?? "");
  const label = typeof b.label === "string" && b.label.trim() ? b.label.trim() : `agent ${bidder.slice(0, 6)}`;
  const source = (SOURCES as readonly string[]).includes(String(b.source)) ? (b.source as TenderClaim["source"]) : "script";
  if (!ACCOUNT.test(account)) throw new RelayError(400, "account is the NEAR account that runs this agent");
  if (!HEX64.test(bidder)) throw new RelayError(400, "bidder is the agent's public key, 64 hex characters");
  if (!validAgentLabel(label)) throw new RelayError(400, "a label is 1 to 64 printable ASCII characters, no ':'");
  if (!verifyLink(bidder, account, signature)) throw new RelayError(403, `the signature is not this agent's over "accord-tender:v1:link:${account}"`);
  // anyone's key can ask: a cap per account keeps a stranger from flooding an owner's dashboard
  if (takeAll([{ key: `tender:claims:account:${account}`, max: 10, windowMs: 3_600_000 }])) throw new RelayError(429, `${account} has had enough agents ask to join this hour`);
  await tenderWork.claim({ account, bidder, label, source, signature });
  return { ok: true, account, bidder };
}

// ---- the winner ---------------------------------------------------------------------------------------------------

/** `domain`: where the Payee job proves the payee (the app's labelled demo domain). */
export interface WinnerSetup { authority: string; recipient: string; funded: boolean; domain: string }

export async function winnerSetup(job: number): Promise<WinnerSetup | null> {
  const w = await tenderWork.winner(boardId(), job).catch(() => null);
  // "sending" (a send in progress, or one that never finished) is not funded
  return w ? { authority: w.authority, recipient: w.recipient, funded: !!w.funded_tx && w.funded_tx !== "sending", domain: demoConfig().domain } : null;
}

/** Checks a winner's request against the board: this key won this job, and the job can still become an agreement. */
function checkWinner(j: TenderJob, bidder: string) {
  if (j.phase !== "awarded" && j.phase !== "linked") throw new RelayError(409, `job ${j.id} is ${j.phase}; only an awarded job has a winner`);
  if (j.winner !== bidder) throw new RelayError(403, `this key did not win job ${j.id}`);
}

/**
 * The winner names its approver and payee (kept so the buyer can open the agreement). Nothing is funded or registered
 * until the buyer has opened and linked that agreement (paying its creation deposit): only then does the faucet fund
 * the three accounts for gas, at most a few jobs per buyer a day, and the payee go on the demo domain. The agent calls
 * this again once the job is linked (`accord tender work` does).
 */
export async function registerWinner(id: number, b: Record<string, unknown>): Promise<{ ok: true; setup: WinnerSetup; txs: string[] }> {
  const bidder = String(b.bidder ?? ""), authority = String(b.authority ?? ""), recipient = String(b.recipient ?? "");
  if (![bidder, authority, recipient].every((x) => HEX64.test(x))) {
    throw new RelayError(400, "bidder, authority and recipient are 64-hex implicit accounts: the winning key and two more keys the agent holds");
  }
  if (new Set([bidder, authority, recipient]).size !== 3) throw new RelayError(400, "the vendor, its approver and its payee are three different keys");
  // The winning key names the pair; the approver and the payee each agree with their own key.
  if (!verifyWinner(bidder, boardId(), id, authority, recipient, String(b.signature ?? ""))) throw new RelayError(403, "the signature is not the winning key's over this approver and payee");
  if (!verifyWinner(authority, boardId(), id, authority, recipient, String(b.authority_signature ?? ""))) throw new RelayError(403, "the approver key did not sign this approver and payee");
  if (!verifyWinner(recipient, boardId(), id, authority, recipient, String(b.recipient_signature ?? ""))) throw new RelayError(403, "the payee key did not sign this approver and payee");
  const j = await getJob(id);
  if (!j) throw new RelayError(404, `no job ${id} on ${boardId()}`);
  checkWinner(j, bidder);
  if (j.buyer === authority) throw new RelayError(400, "the approver cannot be the buyer");
  if (!tenderToken(j.token).links) throw new RelayError(409, `this board links only tUSDC agreements; job ${id} is in ${tenderToken(j.token).symbol}`);

  const kept: TenderWinner = await tenderWork.setWinner({ board: boardId(), job: id, bidder, authority, recipient });
  if (kept.authority !== authority || kept.recipient !== recipient) {
    throw new RelayError(409, "this job's winner already named another approver and payee; keep using those keys");
  }
  let txs: string[] = [];
  if (j.agreement && kept.funded_tx === null) {
    // the agreement the buyer opened must be this winner's, with this approver
    const a = await accord().agreement(j.agreement).get();
    if (a.vendor !== bidder || a.vendor_authority !== authority) throw new RelayError(409, `${j.agreement} does not name this winner and approver`);
    if (takeAll([{ key: `tender:winner-grants:buyer:${j.buyer}`, max: 3, windowMs: 86_400_000 }, { key: "tender:winner-grants", max: 12, windowMs: 3_600_000 }])) {
      throw new RelayError(429, "the faucet has funded enough tender winners for now; fund the three accounts yourself or try later");
    }
    // claimed before sending, so two racing requests cannot both fund the same job
    if (await tenderWork.markFunded(boardId(), id, "sending")) {
      await registerDemoVendor(recipient, authority);
      try {
        txs = await faucetGrants([
          { account: bidder, yocto: WINNER_GRANTS.vendor }, { account: authority, yocto: WINNER_GRANTS.authority }, { account: recipient, yocto: WINNER_GRANTS.recipient },
        ]);
      } catch (e) {
        // a retry tops up only what is still missing (faucetGrants skips an account that already holds its grant)
        await tenderWork.unmarkFunded(boardId(), id);
        throw new RelayError(503, `the faucet could not fund the winner's accounts: ${(e as Error).message}`);
      }
      await tenderWork.recordFunded(boardId(), id, txs[0] ?? "already funded");
    }
  }
  return { ok: true, setup: (await winnerSetup(id))!, txs };
}

// ---- deliveries ---------------------------------------------------------------------------------------------------

export async function publishDelivery(id: number, b: Record<string, unknown>): Promise<{ ok: true; sha256: string; path: string }> {
  const agreement = String(b.agreement ?? ""), item = Number(b.item), body = typeof b.body === "string" ? b.body : null;
  const contentType = b.content_type === "application/json" ? "application/json" : "text/plain";
  if (!Number.isInteger(item) || item < 1 || item > 16) throw new RelayError(400, "item is the agreement's item number");
  if (body === null || body.length === 0 || body.length > TENDER_DELIVERY_MAX) throw new RelayError(400, `body is the delivered text, 1 to ${TENDER_DELIVERY_MAX} characters`);
  const sha = createHash("sha256").update(body, "utf8").digest("hex");
  const j = await getJob(id);
  if (!j?.winner || j.agreement !== agreement) throw new RelayError(409, `job ${id} is not linked to ${agreement}`);
  if (!verifyDelivery(j.winner, agreement, item, sha, String(b.signature ?? ""))) throw new RelayError(403, "the signature is not the vendor key's over this delivery");
  const deal = accord().agreement(agreement);
  const [a, items] = await Promise.all([deal.get(), deal.items()]);
  if (a.vendor !== j.winner) throw new RelayError(409, "the agreement's vendor is not this job's winner");
  // once an item is delivered on chain, its hosted copy is fixed: only the text whose sha256 the chain holds
  const onChain = items.find((x) => x.id === item)?.delivery?.evidence_hash ?? null;
  if (onChain !== null && onChain !== sha) throw new RelayError(409, `item ${item} is delivered on chain with another sha256; the hosted copy cannot change`);
  await tenderWork.deliver({ agreement, item, bidder: j.winner, sha256: sha, content_type: contentType, body });
  return { ok: true, sha256: sha, path: `/api/tenders/deliveries/${agreement}/${item}` };
}

/**
 * A hosted delivery with whether it is the one the chain holds: `matches` is false when the vendor recorded another
 * sha256 for the item, null when the item is not delivered on chain yet (or the chain could not be read).
 */
export async function deliveryOf(agreement: string, item: number): Promise<(TenderDelivery & { matches: boolean | null }) | null> {
  const d = await tenderWork.delivery(agreement, item);
  if (!d) return null;
  const onChain = await accord().agreement(agreement).items().then((xs) => xs.find((x) => x.id === item)?.delivery?.evidence_hash ?? null, () => null);
  return { ...d, matches: onChain === null ? null : onChain === d.sha256 };
}
