// The chain boundary: read-only views over RPC, and a `Signer` that sends function calls. The CLI and the agent
// sign with keys from the environment (`KeySigner`); the app wraps NEAR Connect in the same interface.

import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions, type KeyPairString } from "near-api-js";
import type { AccordEvent } from "./types.js";
import { fromBase64, utf8 } from "./bytes.js";

export const RPC: Record<string, { rpc: string; fallback: string; explorer: string }> = {
  testnet: {
    rpc: "https://test.rpc.fastnear.com",
    fallback: "https://rpc.testnet.near.org",
    explorer: "https://testnet.nearblocks.io",
  },
  mainnet: {
    rpc: "https://free.rpc.fastnear.com",
    fallback: "https://rpc.mainnet.near.org",
    explorer: "https://nearblocks.io",
  },
};

export const TGAS = 1_000_000_000_000n;

export interface TxResult {
  txHash: string;
  ok: boolean;
  /** The last receipt's return value, JSON-decoded when it is JSON. */
  value: unknown;
  logs: string[];
  events: AccordEvent[];
  /** The first failure's message, such as `ERR_NOT_BUYER`, when `ok` is false. */
  failure?: string;
  gasBurnt: bigint;
}

export interface CallOptions {
  gas?: bigint;
  deposit?: bigint;
}

/** Anything that can send a function call as `accountId`. */
export interface Signer {
  accountId: string;
  call(contractId: string, method: string, args: object, opts?: CallOptions): Promise<TxResult>;
  /** NEP-413, for the document key and the app's signed approvals. */
  signMessage?(message: string, recipient: string, nonce: Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }>;
}

export interface AccessKeyEntry {
  public_key: string;
  access_key: {
    nonce: number;
    permission: "FullAccess" | { FunctionCall: { allowance: string | null; receiver_id: string; method_names: string[] } };
  };
}

export interface AccountInfo {
  amount: string;
  locked: string;
  code_hash: string;
  global_contract_hash?: string;
  storage_usage: number;
}

export interface BlockInfo {
  header: { height: number; hash: string; timestamp_nanosec: string };
}

export class Chain {
  readonly provider: JsonRpcProvider;
  constructor(readonly rpcUrl: string) {
    this.provider = new JsonRpcProvider({ url: rpcUrl }, { retries: 4, backoff: 1.6, wait: 400 });
  }

  async view<T>(contractId: string, method: string, args: object = {}, blockId?: number): Promise<T> {
    const blockQuery = blockId === undefined ? { finality: "final" as const } : { blockId };
    const res = await this.provider.callFunction<T & object>({ contractId, method, args: args as Record<string, unknown>, blockQuery });
    return res as T;
  }

  async accessKeys(accountId: string): Promise<AccessKeyEntry[]> {
    const list = await this.provider.viewAccessKeyList({ accountId, finalityQuery: { finality: "final" } });
    return list.keys as unknown as AccessKeyEntry[];
  }

  async account(accountId: string): Promise<AccountInfo> {
    return (await this.provider.viewAccount({ accountId, blockQuery: { finality: "final" } })) as unknown as AccountInfo;
  }

  async block(finality: "final" | "optimistic" = "final"): Promise<BlockInfo> {
    return (await this.provider.viewBlock({ finality })) as unknown as BlockInfo;
  }
}

/** Signs with a key pair held in the environment (`ed25519:<base58 secret>`). */
export class KeySigner implements Signer {
  private readonly account: Account;
  private readonly keyPair: KeyPair;
  constructor(readonly accountId: string, secretKey: string, chain: Chain) {
    this.keyPair = KeyPair.fromString(secretKey as KeyPairString);
    this.account = new Account(accountId, chain.provider, new KeyPairSigner(this.keyPair));
  }

  get publicKey(): string {
    return this.keyPair.getPublicKey().toString();
  }

  async call(contractId: string, method: string, args: object, opts: CallOptions = {}): Promise<TxResult> {
    const res = await this.account.signAndSendTransaction({
      receiverId: contractId,
      actions: [actions.functionCall(method, args, opts.gas ?? 100n * TGAS, opts.deposit ?? 0n)],
      waitUntil: "FINAL",
      throwOnFailure: false,
    });
    return toTxResult(res);
  }

  async signMessage(message: string, recipient: string, nonce: Uint8Array) {
    const signed = await this.account.signNep413Message({ message, recipient, nonce });
    return { signature: signed.signature, publicKey: signed.publicKey.toString() };
  }
}

interface RawOutcome {
  outcome: { logs: string[]; gas_burnt: number; status: unknown };
}
interface RawTx {
  transaction: { hash: string };
  transaction_outcome: RawOutcome;
  receipts_outcome: RawOutcome[];
  status: { SuccessValue?: string; Failure?: unknown };
}

/** Normalises an RPC transaction response: hash, success, return value, logs and Accord events. */
export function toTxResult(res: unknown): TxResult {
  const tx = res as RawTx;
  const outcomes = [tx.transaction_outcome, ...tx.receipts_outcome];
  const logs = outcomes.flatMap((o) => o.outcome.logs);
  const gasBurnt = outcomes.reduce((sum, o) => sum + BigInt(o.outcome.gas_burnt), 0n);
  const receiptFailure = tx.receipts_outcome
    .map((o) => (o.outcome.status as { Failure?: unknown }).Failure)
    .find((f) => f !== undefined);
  const failure = tx.status.Failure ?? receiptFailure;
  let value: unknown = null;
  if (tx.status.SuccessValue) {
    const text = utf8(fromBase64(tx.status.SuccessValue));
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
  }
  return {
    txHash: tx.transaction.hash,
    ok: tx.status.Failure === undefined,
    value,
    logs,
    events: parseEvents(logs),
    failure: failure === undefined ? undefined : failureMessage(failure),
    gasBurnt,
  };
}

export function parseEvents(logs: string[]): AccordEvent[] {
  const out: AccordEvent[] = [];
  for (const line of logs) {
    if (!line.startsWith("EVENT_JSON:")) continue;
    try {
      const e = JSON.parse(line.slice("EVENT_JSON:".length)) as { standard: string; event: string; data: unknown[] };
      if (e.standard === "accord") out.push({ event: e.event, data: (e.data[0] ?? {}) as Record<string, unknown> });
    } catch {
      // not an Accord event
    }
  }
  return out;
}

/** The panic string (`ERR_*`) out of a NEAR failure, or the failure's JSON. */
export function failureMessage(failure: unknown): string {
  const text = JSON.stringify(failure);
  const err = text.match(/ERR_[A-Z_]+/);
  return err ? err[0] : text;
}
