// NEP-413 signatures for the app's few signed requests (preflight approvals, demo vendor registration). The
// message names its purpose; the nonce is sha256(message), as for the document key.

import "server-only";
import { verifyMessage } from "near-api-js/nep413";
import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";
import { fromBase64 } from "@accord/sdk";
import { accord } from "./accord";
import { isImplicitAccount, keyNamesImplicitAccount, verifyNep413 } from "./implicit";

export type VerifyResult = "ok" | "bad_signature" | "not_full_access";

/** Checks a NEP-413 signature against the account's full-access keys on chain. An implicit account (64 hex) that is
 *  not funded yet has no keys on chain: its id is its key, so the signature is checked against the id instead. */
export async function verifySignedDetailed(args: {
  account: string; publicKey: string; message: string; recipient: string; signature: string;
}): Promise<VerifyResult> {
  const nonce = sha256(utf8ToBytes(args.message));
  try {
    await verifyMessage({
      signerAccountId: args.account,
      signerPublicKey: args.publicKey,
      payload: { message: args.message, recipient: args.recipient, nonce },
      signature: fromBase64(args.signature),
      provider: accord().chain.provider,
    });
    return "ok";
  } catch (e) {
    const sigOk = verifyNep413(args.publicKey, args.message, args.recipient, nonce, fromBase64(args.signature));
    if (!sigOk) return "bad_signature";
    // the signature is good; the key is not a full-access key on chain (or the account does not exist yet)
    if (isImplicitAccount(args.account) && keyNamesImplicitAccount(args.account, args.publicKey)) {
      const keys = await accessKeyCount(args.account);
      if (keys === 0) return "ok";
    }
    void e;
    return "not_full_access";
  }
}

async function accessKeyCount(account: string): Promise<number> {
  try {
    const r = (await accord().chain.provider.viewAccessKeyList({ accountId: account, finalityQuery: { finality: "final" } })) as unknown as { keys?: unknown[] };
    return r.keys?.length ?? 0;
  } catch {
    return 0; // the account does not exist yet
  }
}

export async function verifySigned(args: {
  account: string; publicKey: string; message: string; recipient: string; signature: string;
}): Promise<boolean> {
  return (await verifySignedDetailed(args)) === "ok";
}
