// What a refusal code means in plain words, and which transaction in a room's timeline carried a refusal. Pure and
// free of Node modules, so the room page's incident panel (a client component) and the alert scan share it.

export const REFUSAL_WORDS: Record<string, string> = {
  ERR_PAYEE_MISMATCH: "the recipient is not the approved one",
  ERR_AMOUNT_MISMATCH: "the amount differs from the approved amount",
  ERR_NOT_DUE: "the item is not due yet",
  ERR_CANARY: "a canary request: the agent key was revoked",
  ERR_REVOKED: "the agent key is revoked",
  ERR_NO_RECIPIENT: "no recipient is active yet",
  ERR_UNKNOWN_ITEM: "no such item in the terms",
  ERR_ALREADY_PAID: "the item is already paid",
  ERR_PERIOD_WITHHELD: "the period did not pass its evidence check",
  ERR_CAP_EXCEEDED: "the payment would exceed the agreed total",
  ERR_INSUFFICIENT_FUNDS: "the escrow does not hold enough",
  ERR_IN_FLIGHT: "another payment is in flight",
  ERR_NOT_EXECUTING: "the agreement is not executing",
};

export const words = (code: string) => REFUSAL_WORDS[code] ?? code;

/** The refusal's transaction in the room's timeline: the act_refused row at its block with its code and item, and
 * whether the same transaction revoked the agent key. */
export function refusalTx(r: { code: string; item: number; block: number }, rows: readonly { event: string; tx: string; block: number; item: number | null; code: string | null; red: boolean }[]): { tx: string | null; revokedInTx: boolean | undefined } {
  const same = rows.filter((x) => x.event === "act_refused" && x.code === r.code && x.item === r.item);
  const hit = same.find((x) => x.block === r.block) ?? (same.length === 1 ? same[0] : undefined);
  if (!hit) return { tx: null, revokedInTx: undefined };
  return { tx: hit.tx, revokedInTx: rows.some((x) => x.tx === hit.tx && x.event === "agent_key_revoked" && x.red) };
}

