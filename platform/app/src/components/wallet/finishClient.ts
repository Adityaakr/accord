// The browser's half of finishing a wallet-free visit (lib/finish.ts): the throwaway key ends its rooms through the
// relayer, Accord's demo vendor joins the close, the account sends its test USDC back to the faucet, and it deletes
// itself with the faucet as beneficiary.
import type { AgreementView } from "@accord/sdk";
import { finishThrowaway, type Finished } from "@/lib/finish";
import type { PublicConfig } from "../AppConfig";
import { browserAccord } from "../chainClient";
import type { ThrowawaySigner } from "./throwaway";

/** The rooms this account is the buyer of, on every configured factory. */
export async function buyerRooms(cfg: PublicConfig, account: string): Promise<string[]> {
  const a = browserAccord(cfg);
  const factories = [cfg.factory, ...(cfg.currencies ?? []).map((c) => c.factory).filter((f) => f !== cfg.factory)];
  const lists = await Promise.all(factories.map((f) => a.onFactory(f).listAgreements({ party: account })));
  return lists.flat().filter((r) => r.buyer === account).map((r) => r.account);
}

/** The account's balance of the default currency's token (test USDC) and that token, read through the app's cache. */
export async function tokenBalance(account: string): Promise<{ token: string; ft: string }> {
  const r = await fetch(`/api/chain/balances?account=${encodeURIComponent(account)}`, { cache: "no-store" });
  const b = (await r.json()) as { token?: string; ft?: string; busy?: boolean };
  if (b.busy || !b.token || b.ft === undefined) throw new Error("The network is busy, retrying shortly. Try again in a moment.");
  return { token: b.token, ft: b.ft };
}

/** Whether the account exists on chain (has anything to give back). */
export async function accountExists(account: string): Promise<boolean> {
  const r = await fetch(`/api/chain/balances?account=${encodeURIComponent(account)}`, { cache: "no-store" });
  const b = (await r.json()) as { exists?: boolean; busy?: boolean };
  if (b.busy || b.exists === undefined) throw new Error("The network is busy, retrying shortly. Try again in a moment.");
  return b.exists;
}

export async function finishVisit(cfg: PublicConfig, signer: ThrowawaySigner, progress?: (t: string) => void): Promise<Finished | null> {
  if (!cfg.faucetAccount) throw new Error("This server runs no faucet to return the NEAR to.");
  if (!(await accountExists(signer.accountId))) return null; // never funded: nothing to give back
  const rooms = await buyerRooms(cfg, signer.accountId);
  const client = (id: string) => browserAccord(cfg, { signer }).agreement(id);
  return finishThrowaway(signer.accountId, rooms, cfg.faucetAccount, {
    read: (id) => client(id).get() as Promise<AgreementView>,
    cancel: (id) => client(id).cancel(),
    mutualClose: (id) => client(id).mutualClose(),
    withdrawNear: (id) => client(id).withdrawNear(),
    vendorClose: async (id) => {
      const r = await fetch("/api/demo-counterparty/close", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agreement: id }) });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok && r.status !== 503) throw new Error(b.error ?? `The demo vendor could not close the room (${r.status}).`);
    },
    returnTokens: async (beneficiary) => {
      // the read is cached for about 2.5 s; the finish loop waited READ_SETTLE_MS after the close that refunded the escrow
      const { token, ft } = await tokenBalance(signer.accountId);
      if (BigInt(ft) === 0n) return null;
      // NEP-141 refuses a transfer to an account the token has not registered. The faucet mints tUSDC rather than
      // holding it, so the first visit to finish registers it (storage_deposit, the token's minimum, about
      // 0.00125 NEAR, paid from what would otherwise go to the faucet); after that it stays registered.
      const chain = browserAccord(cfg).chain;
      if ((await chain.view<unknown>(token, "storage_balance_of", { account_id: beneficiary })) === null) {
        const { min } = await chain.view<{ min: string }>(token, "storage_balance_bounds");
        const reg = await signer.call(token, "storage_deposit", { account_id: beneficiary, registration_only: true }, { gas: 30_000_000_000_000n, deposit: BigInt(min) });
        if (!reg.ok) throw new Error(`the faucet could not be registered on the test USDC token: ${reg.failure ?? "failed"}`);
      }
      return signer.transferToken(token, beneficiary, ft);
    },
    deleteSelf: (beneficiary) => signer.deleteAccount(beneficiary),
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    progress,
  });
}
