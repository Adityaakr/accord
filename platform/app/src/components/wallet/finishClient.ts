// The browser's half of finishing a wallet-free visit (lib/finish.ts): the throwaway key ends its rooms through the
// relayer, Accord's demo vendor joins the close, and the account deletes itself with the faucet as beneficiary.
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
    deleteSelf: (beneficiary) => signer.deleteAccount(beneficiary),
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    progress,
  });
}
