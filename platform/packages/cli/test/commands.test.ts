import { describe, expect, it } from "vitest";
import type {
  ActResult, AgreementView, ItemView, PreflightResult, Rating, Terms, TxResult, VerifyReport,
} from "@accord/sdk";
import { run, type DepsFactory } from "../src/cli.js";
import type { AgreementApi, Deps } from "../src/commands.js";

const KEY = "ed25519:2LUF1DHqLvEvKKdogNaqUkhj76empvybjEcGjd3Qh7uf8vt5MsUz6PjDaqJzAaYaKARHy26XKizdzckehNDqG3rH";
const NEW_SECRET = "ed25519:5FAKEsecretFAKEsecretFAKEsecretFAKEsecretFAKEsecretFAKEsecret";
const ID = "a7.accord-v1.testnet";
const env = {
  ACCORD_FACTORY: "accord-v1.testnet",
  BUYER_ACCOUNT: "northwind-demo.testnet", BUYER_KEY: KEY,
  VENDOR_ACCOUNT: "halcyon-demo.testnet", VENDOR_KEY: KEY,
  AGENT_AGREEMENT: ID, ACCORD_AGENT_KEY: KEY,
};

const tx = (hash = "TX1"): TxResult => ({ txHash: hash, ok: true, value: null, logs: [], events: [], gasBurnt: 1n });

const view = {
  id: 7, account: ID, factory: "accord-v1.testnet", release: 1, kind: "procurement", title: "Liquidity reporting",
  state: "Executing", buyer: "northwind-demo.testnet", vendor: "halcyon-demo.testnet",
  vendor_authority: "halcyon-auth.testnet", token: "tusdc.testnet", params: { mode: "demo" },
  terms_hash: "ab".repeat(32), approvals: { buyer: true, vendor: true }, executing_at: 1_700_000_000,
  ends_at: 1_700_086_400, funded: "32000000", paid: "12000000", reserved: "0", refunded: "0", total: "32000000",
  in_flight: null, closing: false, recipient: { version: 1, account: "halcyon-mm.testnet", domain: "halcyon.example" },
  pending_recipient: null, agent_key: "ed25519:AgentPub", revoked_keys: 1, canary_tripped: false, refusals: 2,
  exceptions: 0, observation_conflicts: 0, periods: [], budget: { balance: "3000000000000000000000000", storage_stake: "1000000000000000000000000", liquid: "2000000000000000000000000" },
  now: 1_700_000_100,
} as unknown as AgreementView;

const terms = { total: "32000000", decimals: 6, items: [{ id: 1 }, { id: 2 }] } as unknown as Terms;
const items = [
  { id: 1, amount: "12000000", status: "Paid", due_at: 1_700_000_000, evidence: "DeliveryAccepted", delivery: null, pending_exception: null },
  { id: 2, amount: "20000000", status: "Open", due_at: null, evidence: "DeliveryAccepted", delivery: null, pending_exception: null },
] as unknown as ItemView[];

function preflightResult(rating: Rating, approvedByBuyer = false): PreflightResult {
  const sources = {} as PreflightResult["sources"];
  return { rating, reasons: rating === "allow" ? [] : [`${rating} reason`], approvedByBuyer, signals: {} as PreflightResult["signals"], sources };
}

interface Recorder {
  calls: string[];
  files: Record<string, string>;
}

function fakes(opts: { rating?: Rating; approved?: boolean; payResult?: ActResult; verify?: VerifyReport } = {}) {
  const rec: Recorder = { calls: [], files: {} };
  const deal = {
    id: ID,
    get: async () => view,
    terms: async () => terms,
    items: async () => items,
    recipients: async () => [],
    exceptions: async () => [],
    receipts: async () => [],
    refusals: async () => [],
    pay: async (p: { item: number; amount: string; recipient: string }) => {
      rec.calls.push(`pay ${p.item} ${p.amount} ${p.recipient}`);
      return opts.payResult ?? { status: "sent", txHash: "PAYTX" };
    },
    installAgentKey: async (pk: string, allowance: string) => { rec.calls.push(`install ${pk} ${allowance}`); return tx("INSTALLTX"); },
    fund: async (amount: string) => { rec.calls.push(`fund ${amount}`); return tx("FUNDTX"); },
    approveTerms: async (h: string) => { rec.calls.push(`approve ${h}`); return tx(); },
    acceptRecipient: async (v: number, o: { acknowledgeWarnings?: boolean }) => { rec.calls.push(`accept-recipient ${v} ${String(o.acknowledgeWarnings)}`); return tx(); },
  } as unknown as AgreementApi;
  const factory: DepsFactory = (o) => {
    const deps: Deps = {
      signer: o.identity ? { role: o.identity.role, accountId: o.identity.accountId, publicKey: "ed25519:SignerPub" } : undefined,
      agreement: (id) => { rec.calls.push(`agreement ${id}`); return deal; },
      createAgreement: async () => ({ agreement: ID, tx: tx() }),
      preflight: async (a, r) => { rec.calls.push(`preflight ${a} ${r}`); return preflightResult(opts.rating ?? "allow", opts.approved); },
      verify: async () => opts.verify ?? { agreement: ID, checks: [], ok: 0, failed: 0, notChecked: 0 },
      sealedCheck: async () => "ERR_SEALED",
      ftBalance: async () => "0",
      ftTransfer: async () => tx(),
      generateKeyPair: () => ({ publicKey: "ed25519:NewAgentPub", secretKey: NEW_SECRET }),
      writeSecretFile: async (p, c) => { rec.files[p] = c; },
      readText: async () => "",
      sleep: async () => {},
    };
    return deps;
  };
  return { rec, factory };
}

async function cli(argv: string[], f: ReturnType<typeof fakes>) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, { ...env }, { stdout: (t) => out.push(t), stderr: (t) => err.push(t) }, f.factory);
  return { code, out: out.join("\n"), err: err.join("\n") };
}

describe("pay", () => {
  it("allow: preflight, then the SDK pay", async () => {
    const f = fakes({ rating: "allow" });
    const r = await cli(["pay", "1", "12", "--to", "halcyon-mm.testnet", "--as", "agent"], f);
    expect(r.code).toBe(0);
    expect(f.rec.calls).toContain(`preflight ${ID} halcyon-mm.testnet`);
    expect(f.rec.calls).toContain("pay 1 12000000 halcyon-mm.testnet");
    expect(r.out).toContain("  sent      payment_sent · tx PAYTX");
  });
  it("block: never signs", async () => {
    const f = fakes({ rating: "block" });
    const r = await cli(["pay", "1", "12", "--to", "halcyon-markets.testnet", "--as", "agent"], f);
    expect(r.code).toBe(1);
    expect(f.rec.calls.some((c) => c.startsWith("pay "))).toBe(false);
    expect(r.out).toContain("  preflight block: block reason");
    expect(r.out).toContain("  signed    no · preflight block refuses to sign");
  });
  it("warn without approval returns needs_human in JSON", async () => {
    const f = fakes({ rating: "warn" });
    const r = await cli(["pay", "1", "12000000", "--raw", "--to", "x.testnet", "--as", "agent", "--json"], f);
    expect(JSON.parse(r.out)).toMatchObject({ status: "needs_human", amount: "12000000", reasons: ["warn reason"] });
    expect(f.rec.calls.some((c) => c.startsWith("pay "))).toBe(false);
  });
  it("needs --as agent, and the agent key signs only for its own agreement", async () => {
    expect((await cli(["pay", "1", "12", "--to", "x", "--as", "buyer", "--agreement", ID], fakes())).err)
      .toContain("this command signs as agent, not buyer");
    expect((await cli(["pay", "1", "12", "--to", "x", "--as", "agent", "--agreement", "a8.accord-v1.testnet"], fakes())).err)
      .toContain("the agent key signs only for AGENT_AGREEMENT");
  });
});

describe("agent install", () => {
  it("writes the secret only to --out and prints the public key", async () => {
    const f = fakes();
    const r = await cli(["agent", "install", "--agreement", ID, "--as", "buyer", "--out", "/tmp/agent.key"], f);
    expect(r.code).toBe(0);
    expect(f.rec.files["/tmp/agent.key"]).toBe(`${NEW_SECRET}\n`);
    expect(f.rec.calls).toContain(`install ed25519:NewAgentPub 500000000000000000000000`);
    expect(r.out).toContain("ed25519:NewAgentPub");
    expect(r.out).toContain("allowance 0.5 NEAR");
    expect(r.out + r.err).not.toContain(NEW_SECRET);
    expect(r.out + r.err).not.toContain(KEY);
  });
  it("without --out warns that the secret is not saved and never prints it", async () => {
    const f = fakes();
    const r = await cli(["agent", "install", "--agreement", ID, "--as", "buyer", "--allowance", "0.25"], f);
    expect(r.err).toContain("warning: no --out <file> given");
    expect(f.rec.calls).toContain(`install ed25519:NewAgentPub 250000000000000000000000`);
    expect(r.out + r.err).not.toContain(NEW_SECRET);
  });
});

describe("other commands", () => {
  it("fund parses human USDC", async () => {
    const f = fakes();
    const r = await cli(["fund", "32", "--agreement", ID, "--as", "buyer"], f);
    expect(f.rec.calls).toContain("fund 32000000");
    expect(r.out).toContain("  amount    32.00 USDC");
  });
  it("approve reads the terms hash from the agreement", async () => {
    const f = fakes();
    await cli(["approve", "--agreement", ID, "--as", "vendor"], f);
    expect(f.rec.calls).toContain(`approve ${"ab".repeat(32)}`);
  });
  it("recipient accept passes --acknowledge-warnings", async () => {
    const f = fakes();
    await cli(["recipient", "accept", "2", "--acknowledge-warnings", "--agreement", ID, "--as", "buyer"], f);
    expect(f.rec.calls).toContain("accept-recipient 2 true");
  });
  it("show prints state, parties, terms, items, recipient, agent key and budget", async () => {
    const r = await cli(["show", "--agreement", ID], fakes());
    const lines = r.out.split("\n");
    expect(lines[0]).toBe(`accord show · ${ID} · procurement · demo timings`);
    expect(r.out).toContain("  state     Executing · release 1");
    expect(r.out).toContain("  terms     32.00 USDC · 2 items · terms abababab…");
    expect(r.out).toContain("  item 1    12.00 USDC · Paid · due 2023-11-14T22:13:20Z");
    expect(r.out).toContain("  item 2    20.00 USDC · Open · due not set");
    expect(r.out).toContain("  recipient halcyon-mm.testnet · halcyon.example · version 1");
    expect(r.out).toContain("  agent key ed25519:AgentPub · 1 revoked");
    expect(r.out).toContain("  budget    balance 3.000 NEAR");
  });
  it("verify exits 1 on a failed check and prints the summary", async () => {
    const f = fakes({ verify: { agreement: ID, checks: [{ name: "code", status: "fail", detail: "d" }], ok: 0, failed: 1, notChecked: 0 } });
    const r = await cli(["verify", "--agreement", ID], f);
    expect(r.code).toBe(1);
    expect(r.out.split("\n").at(-1)).toBe("verify: 0 checks ok · 1 failed");
  });
  it("check exits 1 on block; --json gives the full preflight", async () => {
    const r = await cli(["check", "x.testnet", "--agreement", ID, "--json"], fakes({ rating: "block" }));
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out)).toMatchObject({ rating: "block", account: "x.testnet", agreement: ID });
  });
  it("errors come out as JSON with --json", async () => {
    const r = await cli(["show", "--json"], fakes());
    expect(JSON.parse(r.out)).toEqual({ error: "missing --agreement <account>" });
  });
  it("signing commands refuse mainnet", async () => {
    const r = await cli(["fund", "1", "--agreement", ID, "--as", "buyer", "--network", "mainnet"], fakes());
    expect(r.err).toContain("testnet only");
  });
  it("every listed command is dispatched", async () => {
    const { COMMANDS } = await import("../src/commands.js");
    expect(Object.keys(COMMANDS).sort()).toEqual([
      "accept", "agent", "approve", "check", "claim", "close", "create", "deliver", "dispute", "exception", "fund",
      "negotiate", "pay", "period", "receipts", "recipient", "recycle", "refusals", "seal", "sealed-check", "show",
      "verify", "watch", "withdraw",
    ]);
  });
});
