// Timelocked reveals for sealed tender bids. A bidder encrypts its price and salt to the drand quicknet round just
// after the job's bidding deadline (tlock, identity-based encryption to a future round signature). Until drand's
// League of Entropy publishes that round, nobody can read the price: not the relay that stores the ciphertext, not
// Accord, not the house agents. After the deadline anyone can open it and send the reveal, which the board accepts
// from anyone holding the price and salt (RULES.md). So a bidder no longer has to be online in the reveal window.
//
// The limit: this trusts drand's threshold network not to publish a round early (a threshold of its members would
// have to collude), and the reveal waits if drand is unreachable; the bidder can still reveal itself.

import { mainnetClient, roundAt, timelockDecrypt, timelockEncrypt, Buffer } from "tlock-js";
import { commitment } from "./tender.js";

export interface TimelockSecret { price: string; salt: string }

// one client per process: its chain caches drand's info, so the round maths costs one request, not one per call
let client: ReturnType<typeof mainnetClient> | null = null;
const drand = (): ReturnType<typeof mainnetClient> => (client ??= mainnetClient());

/** The drand round a reveal is locked to: the first one published strictly after the bidding deadline. */
export async function timelockRoundFor(commitEndsNs: number): Promise<number> {
  const info = await drand().chain().info();
  return roundAt(Math.ceil(commitEndsNs / 1e6), info) + 1;
}

/** Encrypts a bid's price and salt so they open only after the job's bidding deadline. */
export async function timelockBidSecret(secret: TimelockSecret, commitEndsNs: number): Promise<string> {
  if (!/^[1-9][0-9]{0,30}$/.test(secret.price) || !/^[0-9a-f]{64}$/.test(secret.salt)) throw new Error("a timelocked secret is a positive integer price and a 32-byte hex salt");
  const round = await timelockRoundFor(commitEndsNs);
  return timelockEncrypt(round, Buffer.from(JSON.stringify({ price: secret.price, salt: secret.salt })), drand());
}

/** The drand round a ciphertext is locked to, read from its tlock stanza without decrypting; null when it is not one. */
export function timelockRoundOf(ciphertext: string): number | null {
  const body = ciphertext.replace(/-----(BEGIN|END) AGE ENCRYPTED FILE-----/g, "").replace(/\s+/g, "");
  let text: string;
  try { text = Buffer.from(body, "base64").toString("utf8"); } catch { return null; }
  const m = /^-> tlock (\d+) [0-9a-f]{64}$/m.exec(text);
  return m ? Number(m[1]) : null;
}

/**
 * Opens a timelocked secret once its round is out and checks it opens the bid's commitment. Returns null while the
 * round is still in the future; throws when the ciphertext is malformed or does not match the commitment.
 */
export async function openTimelockedBid(
  ciphertext: string, bid: { board: string; job: number; bidder: string; commitment: string },
): Promise<TimelockSecret | null> {
  let plain: Buffer;
  try {
    plain = await timelockDecrypt(ciphertext, drand());
  } catch (e) {
    if (/too early/i.test((e as Error).message)) return null;
    throw e;
  }
  const s = JSON.parse(plain.toString("utf8")) as Partial<TimelockSecret>;
  if (typeof s.price !== "string" || !/^[1-9][0-9]{0,30}$/.test(s.price) || typeof s.salt !== "string" || !/^[0-9a-f]{64}$/.test(s.salt)) {
    throw new Error("the timelocked secret is not {price, salt}");
  }
  if (commitment(bid.board, bid.job, bid.bidder, BigInt(s.price), s.salt) !== bid.commitment) throw new Error("the timelocked secret does not open this bid's commitment");
  return { price: s.price, salt: s.salt };
}
