// The real dependencies: the SDK over RPC, keys from the environment, files on disk.

import { writeFile, readFile } from "node:fs/promises";
import { KeyPair } from "near-api-js";
import {
  Accord, KeySigner, TGAS, deriveDocKey, preflight, sealedCheck, verify, type Network,
} from "@accord/sdk";
import type { Deps } from "./commands.js";
import type { Env, Identity } from "./env.js";
import { realReleaseProof } from "./release.js";

export interface RealDepsOptions {
  network: Network;
  factory: string;
  rpc?: string;
  identity?: Identity;
  env: Env;
}

export function realDeps(o: RealDepsOptions): Deps {
  const base = new Accord({ network: o.network, factory: o.factory, rpc: o.rpc });
  let signer: KeySigner | undefined;
  if (o.identity) {
    try {
      signer = new KeySigner(o.identity.accountId, o.identity.secretKey, base.chain);
    } catch {
      throw new Error(`the key for --as ${o.identity.role} could not be read (check its variable in .env)`);
    }
  }
  const accord = signer ? base.withSigner(signer) : base;
  const needSigner = (): KeySigner => {
    if (!signer) throw new Error("this command signs: pass --as");
    return signer;
  };
  const symbols = new Map<string, Promise<string>>();
  return {
    signer: signer && o.identity ? { role: o.identity.role, accountId: signer.accountId, publicKey: signer.publicKey } : undefined,
    agreement: (id) => accord.agreement(id),
    createAgreement: (args) => accord.createAgreement(args),
    preflight: (agreement, recipient) => preflight(accord, agreement, recipient, {
      archivalRpc: o.env.NEAR_ARCHIVAL_RPC_URL || undefined,
      approvalsUrl: o.env.ACCORD_APPROVALS_URL || undefined,
    }),
    // An agreement of either configured factory (ACCORD_FACTORY, ACCORD_FACTORY_USDC) or a known one verifies.
    verify: (agreement) => verify(accord, agreement, {
      nearAiKey: o.env.NEARAI_API_KEY || undefined,
      factories: [o.env.ACCORD_FACTORY_USDC ?? ""],
      // the release check runs OutLayer's verifier when it is installed; otherwise it stays `not checked`
      releaseProof: realReleaseProof(o.env),
    }),
    sealedCheck: async (agreement, other) => {
      const s = needSigner();
      const docKey = await deriveDocKey(s, agreement);
      const c = await accord.agreement(agreement).commitments();
      const target = c[other];
      if (!target) throw new Error(`the ${other} has not sealed a mandate yet`);
      return sealedCheck(target.ciphertext, docKey);
    },
    ftBalance: (token, account) => accord.chain.view<string>(token, "ft_balance_of", { account_id: account }),
    tokenSymbol: (token) => {
      let s = symbols.get(token);
      if (!s) {
        s = accord.chain.view<{ symbol?: string }>(token, "ft_metadata", {}).then((m) => m.symbol ?? "");
        s.catch(() => symbols.delete(token));
        symbols.set(token, s);
      }
      return s;
    },
    ftTransfer: (token, receiver, amount, memo) =>
      needSigner().call(token, "ft_transfer", { receiver_id: receiver, amount, memo }, { gas: 30n * TGAS, deposit: 1n }),
    generateKeyPair: () => {
      const kp = KeyPair.fromRandom("ed25519");
      return { publicKey: kp.getPublicKey().toString(), secretKey: kp.toString() };
    },
    // `wx`: never overwrite an existing file; 0600: readable by the owner only.
    writeSecretFile: (path, content) => writeFile(path, content, { mode: 0o600, flag: "wx" }),
    readText: (path) => readFile(path, "utf8"),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}
