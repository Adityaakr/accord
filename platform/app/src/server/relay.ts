// Accord's relayer for NEP-366 meta-transactions. A wallet that can sign delegate actions (Meteor, Intear and others)
// signs the user's call; the relayer wraps it in its own transaction, pays the gas and broadcasts it, so the user's
// wallet never has to reach the network itself. The relayer holds only its own key (RELAYER_ACCOUNT / RELAYER_KEY in
// the gitignored .env) and attaches no deposit of its own. Under NEP-366 the relayer pays any NEAR a delegate attaches, so the policy (delegate.ts) only carries calls that attach at most 1 yoctoNEAR.

import "server-only";
import { Account, KeyPair, KeyPairSigner, actions, type KeyPairString } from "near-api-js";
import { RotatingRpcProvider, rpcEndpoints, rpcRequest } from "@accord/sdk";
import { accord, config } from "./accord";
import type { FactoryPair } from "./delegate";
import { decodeSignedDelegate, innerStatus, rejectDelegate, type DecodedDelegate, type RawTx } from "./delegate";

// NEAR_RPC_URL (one URL or a comma list) first, then the public testnet endpoints; rotates only on a rate limit or
// a transport failure, so the relayed call's own errors reach the caller as they are (@accord/sdk RotatingRpcProvider).
let provider: RotatingRpcProvider | null = null;
const rpc = () => (provider ??= new RotatingRpcProvider(rpcEndpoints(process.env.NEAR_RPC_URL, "testnet")));

function relayer(): Account {
  const id = process.env.RELAYER_ACCOUNT, key = process.env.RELAYER_KEY;
  if (!id || !key) throw new Error("the relayer is not configured");
  return new Account(id, rpc(), new KeyPairSigner(KeyPair.fromString(key as KeyPairString)));
}

async function height(): Promise<bigint> {
  const b = await rpcRequest<{ header?: { height: number } }>(rpc(), "block", { finality: "final" });
  if (!b?.header) throw new Error("could not read the chain height");
  return BigInt(b.header.height);
}

/**
 * The second factory (ACCORD_FACTORY_USDC) and the token its own config names. When ACCORD_TOKEN_USDC is set and
 * differs from what the factory says, the pair is left out: the relayer never pairs a token with a factory that
 * does not settle in it.
 */
async function extraPairs(): Promise<FactoryPair[]> {
  const out: FactoryPair[] = [];
  for (const cur of config().currencies.slice(1)) {
    const onChain = await accord().onFactory(cur.factory).config().then((x) => x.token).catch(() => null);
    if (onChain && (!cur.token || cur.token === onChain)) out.push({ factory: cur.factory, token: onChain });
  }
  return out;
}

/** Validates and submits one signed delegate; returns the final outcome with the user's call as its status. */
export async function relay(signedDelegate: string): Promise<{ outcome: RawTx; sender: string }> {
  const c = config();
  if (c.network !== "testnet") throw new Error("the relayer runs on testnet only");
  const d: DecodedDelegate = decodeSignedDelegate(signedDelegate);
  const [{ token }, pairs, h] = await Promise.all([accord().config(), extraPairs(), height()]);
  const why = rejectDelegate(d, { factory: c.factory, token, pairs, height: h });
  if (why) throw Object.assign(new Error(why), { status: 400 });
  const r = (await relayer().signAndSendTransaction({
    receiverId: d.delegateAction.senderId,
    actions: [actions.signedDelegate(d as unknown as Parameters<typeof actions.signedDelegate>[0])],
    waitUntil: "FINAL",
  })) as unknown as RawTx;
  return { outcome: { ...r, status: innerStatus(r, d.delegateAction.receiverId) }, sender: d.delegateAction.senderId };
}
