// NEP-366 signed delegate actions: decode the base64 borsh a wallet returns from `signDelegateActions`, and decide
// whether Accord's relayer will pay the gas to submit it. Pure functions (no server-only) so they are testable; the
// broadcast lives in ./relay.ts.
//
// The relayer only carries calls into Accord: `create_agreement` on the factory, any call on one of the factory's
// agreement accounts (the contract checks who may call what), and `ft_transfer_call` on the configured token when it
// funds one of those agreements. Each delegate holds exactly one function call. Deposits come from the sender's own
// account inside the delegate; the relayer's outer transaction attaches none.

import { deserialize } from "borsh";
import { SCHEMA } from "near-api-js";

const TGAS = 1_000_000_000_000n;
/** Gas the relayer will buy for one call: the most any Accord call asks for. */
export const MAX_GAS = 300n * TGAS;
/** How far ahead a delegate may expire, in blocks (about two hours on testnet); wallets ask for a few hundred. */
export const MAX_AHEAD = 7200n;

export interface FunctionCallShape {
  methodName: string;
  args: Uint8Array;
  gas: bigint;
  deposit: bigint;
}

export interface DecodedDelegate {
  delegateAction: {
    senderId: string;
    receiverId: string;
    actions: Array<Record<string, unknown>>;
    nonce: bigint;
    maxBlockHeight: bigint;
    publicKey: unknown;
  };
  signature: unknown;
}

/** Decodes a base64 borsh `SignedDelegate`; throws on anything that is not one. */
export function decodeSignedDelegate(b64: string): DecodedDelegate {
  if (typeof b64 !== "string" || b64.length === 0 || b64.length > 16_384 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    throw new Error("not a signed delegate action");
  }
  try {
    return deserialize(SCHEMA.SignedDelegate, Buffer.from(b64, "base64")) as DecodedDelegate;
  } catch {
    throw new Error("not a signed delegate action");
  }
}

export interface RelayPolicy {
  factory: string;
  token: string;
  /** The chain's current block height. */
  height: bigint;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const agreementPattern = (factory: string) => new RegExp(`^a[0-9]+\\.${escape(factory)}$`);

function jsonArgs(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const v = JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Why the relayer will not submit this delegate, or null when it will. */
export function rejectDelegate(d: DecodedDelegate, p: RelayPolicy): string | null {
  const da = d.delegateAction;
  if (da.maxBlockHeight <= p.height) return "this signed request has expired; sign it again";
  if (da.maxBlockHeight > p.height + MAX_AHEAD) return "this signed request expires too far ahead";
  if (da.senderId === da.receiverId) return "a delegate must call a contract, not the sender";
  if (da.actions.length !== 1) return "the relayer carries exactly one call";
  const call = da.actions[0]?.functionCall as FunctionCallShape | undefined;
  if (!call || Object.keys(da.actions[0] ?? {}).length !== 1) return "the relayer carries function calls only";
  if (call.gas <= 0n || call.gas > MAX_GAS) return "the call asks for more gas than the relayer pays";

  if (da.receiverId === p.factory) {
    if (call.methodName !== "create_agreement") return "the relayer carries create_agreement only on the factory";
    return null;
  }
  if (agreementPattern(p.factory).test(da.receiverId)) return null;
  if (da.receiverId === p.token) {
    if (call.methodName !== "ft_transfer_call") return "the relayer carries ft_transfer_call only on the token";
    if (call.deposit !== 1n) return "ft_transfer_call takes exactly 1 yoctoNEAR";
    const args = jsonArgs(call.args);
    if (!args || typeof args.receiver_id !== "string" || !agreementPattern(p.factory).test(args.receiver_id)) {
      return "the relayer only carries token transfers into an Accord agreement";
    }
    return null;
  }
  return "the relayer only carries calls into Accord";
}

export type Status = { SuccessValue?: string; SuccessReceiptId?: string; Failure?: unknown };
interface RawOutcome { id: string; outcome: { executor_id: string; receipt_ids: string[]; status: Status } }
export interface RawTx { status: Status; transaction: { hash: string }; transaction_outcome: RawOutcome; receipts_outcome: RawOutcome[] }

/**
 * The outer transaction's status only says the relayer's receipt ran. The user's call is the receipt the delegate
 * spawned on its receiver; follow its result (through any promise chain) and report that as the status, so the app
 * reads the call's own success, value and failure.
 */
export function innerStatus(tx: RawTx, receiverId: string): Status {
  const byId = new Map(tx.receipts_outcome.map((o) => [o.id, o]));
  const delegateReceipt = byId.get(tx.transaction_outcome.outcome.receipt_ids[0] ?? "");
  if (!delegateReceipt) return tx.status;
  if (delegateReceipt.outcome.status.Failure !== undefined) return delegateReceipt.outcome.status;
  let o = delegateReceipt.outcome.receipt_ids.map((id) => byId.get(id)).find((x) => x?.outcome.executor_id === receiverId);
  if (!o) return tx.status;
  for (let i = 0; i < 16 && o.outcome.status.SuccessReceiptId; i++) {
    const next = byId.get(o.outcome.status.SuccessReceiptId);
    if (!next) break;
    o = next;
  }
  return o.outcome.status;
}
