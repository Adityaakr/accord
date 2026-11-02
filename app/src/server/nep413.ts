// NEP-413 signatures for the app's few signed requests (preflight approvals, demo vendor registration). The
// message names its purpose; the nonce is sha256(message), as for the document key.

import "server-only";
import { verifyMessage } from "near-api-js/nep413";
import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";
import { fromBase64 } from "@accord/sdk";
import { accord } from "./accord";

export async function verifySigned(args: {
  account: string; publicKey: string; message: string; recipient: string; signature: string;
}): Promise<boolean> {
  try {
    await verifyMessage({
      signerAccountId: args.account,
      signerPublicKey: args.publicKey,
      payload: { message: args.message, recipient: args.recipient, nonce: sha256(utf8ToBytes(args.message)) },
      signature: fromBase64(args.signature),
      provider: accord().chain.provider,
    });
    return true;
  } catch {
    return false;
  }
}
