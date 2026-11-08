// Audit L3 F3 (finding 6): `verify` on an account the factory never created, running the release's exact code (anyone
// can `use_global_contract(hash)`), must fail; so must an agreement whose id, job keys, token, outlayer or keeper do not
// match its factory's release and config. A genuine agreement of either factory still verifies.
import { afterEach, describe, expect, it, vi } from "vitest";
import { verify } from "../src/verify.js";

const HASH = "8wMuMRreZfLiVPNjcsPjB2ZkcJJwsKh56BsasVxdpEBN";
const KEY = { sealed_table: "ed25519:sealed", payee: "ed25519:payee", observer: "ed25519:observer" };
const CONFIG: Record<string, { token: string; outlayer: string; keeper: string }> = {
  "accord-v2.testnet": { token: "tusdc.accord-v1.testnet", outlayer: "outlayer.testnet", keeper: "accord-keeper.testnet" },
  "accord-usdc.testnet": { token: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af", outlayer: "outlayer.testnet", keeper: "accord-keeper.testnet" },
};
const job = (k: string) => ({ project: "accord-v1.testnet/x", wasm_hash: "7c83", signing_pubkey: k });

function view(id: number, factory: string, over: Record<string, unknown> = {}) {
  return {
    id, factory, release: 3, model: "z-ai/glm-5.3-flash", paid: "0", refusals: 0, observation_conflicts: 0,
    ...CONFIG[factory] ?? { token: "fake-usdc.testnet", outlayer: "rogue.testnet", keeper: "rogue.testnet" },
    jobs: { sealed_table: job(KEY.sealed_table), payee: job(KEY.payee), observer: job(KEY.observer) },
    ...over,
  };
}

function world(agreementView: Record<string, unknown>, registered: (factory: string, account: string) => boolean) {
  const release = {
    version: 3, mode: "Global", code_hash: HASH, mandate_pubkey: "02ab", model: "z-ai/glm-5.3-flash",
    sealed_table: { ...job(KEY.sealed_table), pubkey_task_id: 1 }, payee: job(KEY.payee), observer: job(KEY.observer),
  };
  const chain = {
    account: async () => ({ code_hash: "11111111111111111111111111111111", global_contract_hash: HASH }),
    accessKeys: async () => [],
    view: async (contract: string, method: string, args: { account: string }) => {
      if (method === "is_agreement") return registered(contract, args.account);
      throw new Error(`unexpected view ${contract}.${method}`);
    },
  };
  const deal = {
    get: async () => agreementView,
    sealedOutput: async () => null, commitments: async () => ({}), recipients: async () => [],
    receipts: async () => [], refusals: async () => [], exceptions: async () => [], items: async () => [],
  };
  const on = (factory: string) => ({
    factory, network: "testnet", chain, agreement: () => deal, onFactory: on,
    release: async () => release,
    config: async () => {
      const c = CONFIG[factory];
      if (!c) throw new Error(`${factory} does not exist`);
      return c;
    },
  });
  return on("accord-v2.testnet");
}

const code = async (account: string, w: ReturnType<typeof world>) => {
  const r = await verify(w as never, account);
  return r.checks.find((c) => c.name === "code")!;
};

describe("verify provenance", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a genuine agreement of either factory passes the code check", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    const c1 = await code("a6.accord-v2.testnet", world(view(6, "accord-v2.testnet"), () => true));
    expect(c1.status, c1.detail).toBe("ok");
    const c2 = await code("a1.accord-usdc.testnet", world(view(1, "accord-usdc.testnet"), () => true));
    expect(c2.status, c2.detail).toBe("ok");
  });

  it("fails for an account no known factory created, running the release's code", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    const r = await verify(world(view(1, "rogue.testnet"), () => false) as never, "scam-a7.testnet");
    expect(r.failed).toBeGreaterThan(0);
    const spoof = await code("scam-a7.testnet", world(view(7, "accord-v2.testnet"), () => false));
    expect(spoof.status).toBe("fail");
  });

  it("fails when the id is not a<n>.<factory>", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    const c = await code("a7.accord-v2.testnet", world(view(6, "accord-v2.testnet"), () => true));
    expect(c.status).toBe("fail");
    expect(c.detail).toMatch(/a6\.accord-v2\.testnet/);
  });

  it("fails when a job key, the token, outlayer or keeper differ from the release and the factory's config", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    const cases: Record<string, unknown>[] = [
      { jobs: { sealed_table: job("ed25519:attacker"), payee: job(KEY.payee), observer: job(KEY.observer) } },
      { jobs: { sealed_table: job(KEY.sealed_table), payee: job("ed25519:attacker"), observer: job(KEY.observer) } },
      { jobs: { sealed_table: job(KEY.sealed_table), payee: job(KEY.payee), observer: job("ed25519:attacker") } },
      { token: "fake-usdc.testnet" },
      { outlayer: "rogue.testnet" },
      { keeper: "rogue.testnet" },
    ];
    for (const over of cases) {
      const c = await code("a6.accord-v2.testnet", world(view(6, "accord-v2.testnet", over), () => true));
      expect(c.status, JSON.stringify(over)).toBe("fail");
    }
  });
});
