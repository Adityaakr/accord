// The app's part in a winning agent's path: only the winning key may name an approver and payee, the payee must agree,
// the first pair named stands, the faucet funds a job's winner once, and a delivery is accepted only from the
// agreement's vendor for the job's own linked agreement, stored by the sha256 the agreement will record.
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createHash } from "node:crypto";
import { bidderKey, signDelivery, signLink, signWinner, type TenderJob } from "@accord/sdk";

const mem: Record<string, unknown> = {};
const grants = vi.fn(async (g: { account: string }[]) => g.map((x) => `tx-${x.account.slice(0, 4)}`));
const registered = vi.fn(async () => undefined);
let job: TenderJob | null = null;
let vendorOnChain = "";
let authorityOnChain = "";
let onChainEvidence: string | null = null;

vi.mock("@accord/store", async (orig) => {
  const real = await orig<typeof import("@accord/store")>();
  return {
    ...real,
    registerDemoVendor: registered,
    tenderWork: real.tenderWorkStore({ db: async () => null, read: () => mem, mutate: (f) => f(mem) }),
  };
});
vi.mock("../src/server/demo", () => ({ faucetGrants: grants, demoConfig: () => ({ domain: "demo.example" }) }));
vi.mock("../src/server/accord", () => ({ accord: () => ({ agreement: () => ({
  get: async () => ({ vendor: vendorOnChain, vendor_authority: authorityOnChain }),
  items: async () => [{ id: 1, delivery: onChainEvidence ? { evidence_hash: onChainEvidence } : null }],
}) }) }));
vi.mock("../src/server/tender", async (orig) => ({ ...(await orig<object>()), boardId: () => "board.testnet", getJob: async () => job }));

const { claimAccount, publishDelivery, registerWinner, winnerSetup } = await import("../src/server/tenderwork");
const { resetLimits } = await import("../src/server/limiter");
const { tenderWork } = await import("@accord/store");

const W = bidderKey("01".repeat(32)), A = bidderKey("02".repeat(32)), R = bidderKey("03".repeat(32)), X = bidderKey("04".repeat(32));
const awarded = (over: Partial<TenderJob> = {}): TenderJob => ({
  id: 7, buyer: "buyer.testnet", title: "t", spec: "", evidence_hash: "", budget: "20000000", token: "tusdc.accord-v1.testnet",
  created_at: 0, commit_ends: 0, reveal_ends: 0, phase: "awarded", bids: [], winner: W.id, agreement: null, ...over,
});
const body = (by = W, a = A, r = R, rBy = R) => ({
  bidder: by.id, authority: a.id, recipient: r.id,
  signature: signWinner(by.seed, "board.testnet", 7, a.id, r.id), authority_signature: signWinner(a.seed, "board.testnet", 7, a.id, r.id),
  recipient_signature: signWinner(rBy.seed, "board.testnet", 7, a.id, r.id),
});

beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
  grants.mockClear(); registered.mockClear(); resetLimits(); job = awarded();
  vendorOnChain = W.id; authorityOnChain = A.id; onChainEvidence = null;
});

describe("a tender winner names its approver and payee", () => {
  it("keeps the pair at the award, and funds and registers only once the buyer linked an agreement naming them", async () => {
    const r = await registerWinner(7, body());
    expect(r.setup).toEqual({ authority: A.id, recipient: R.id, funded: false, domain: "demo.example" });
    expect(grants).not.toHaveBeenCalled();
    expect(registered).not.toHaveBeenCalled();
    job = awarded({ phase: "linked", agreement: "a9.accord-v2.testnet" });
    const linked = await registerWinner(7, body());
    expect(linked.setup.funded).toBe(true);
    expect(grants.mock.calls[0]![0].map((g) => g.account)).toEqual([W.id, A.id, R.id]);
    expect(registered).toHaveBeenCalledWith(R.id, A.id);
    await registerWinner(7, body()); // a rerun of `accord tender work`
    expect(grants).toHaveBeenCalledTimes(1);
  });
  it("funds nothing for an agreement that does not name this winner's approver, and caps grants per buyer", async () => {
    job = awarded({ phase: "linked", agreement: "a9.accord-v2.testnet" });
    authorityOnChain = X.id;
    await expect(registerWinner(7, body())).rejects.toThrow("does not name");
    authorityOnChain = A.id;
    for (const id of [7, 8, 9]) { job = awarded({ id, phase: "linked", agreement: `a${id}.accord-v2.testnet` }); await registerWinner(id, { ...body(), ...{ signature: signWinner(W.seed, "board.testnet", id, A.id, R.id), authority_signature: signWinner(A.seed, "board.testnet", id, A.id, R.id), recipient_signature: signWinner(R.seed, "board.testnet", id, A.id, R.id) } }); }
    job = awarded({ id: 10, phase: "linked", agreement: "a10.accord-v2.testnet" });
    await expect(registerWinner(10, { ...body(), signature: signWinner(W.seed, "board.testnet", 10, A.id, R.id), authority_signature: signWinner(A.seed, "board.testnet", 10, A.id, R.id), recipient_signature: signWinner(R.seed, "board.testnet", 10, A.id, R.id) })).rejects.toThrow("enough tender winners");
    expect(grants).toHaveBeenCalledTimes(3);
  });
  it("refuses a key that did not win, a payee that did not sign, a job not awarded, and a second pair", async () => {
    await expect(registerWinner(7, body(X))).rejects.toThrow("did not win");
    await expect(registerWinner(7, body(W, A, R, X))).rejects.toThrow("payee key did not sign");
    await expect(registerWinner(7, { ...body(), authority_signature: "00".repeat(64) })).rejects.toThrow("approver key did not sign");
    await expect(registerWinner(7, body(W, A, A, A))).rejects.toThrow("three different keys");
    job = awarded({ phase: "revealing" });
    await expect(registerWinner(7, body())).rejects.toThrow("only an awarded job");
    job = awarded();
    await registerWinner(7, body());
    await expect(registerWinner(7, body(W, X, R))).rejects.toThrow("already named another approver");
  });
  it("does not fund a job in a token this board cannot link", async () => {
    job = awarded({ token: "wrap.testnet" });
    await expect(registerWinner(7, body())).rejects.toThrow("only tUSDC");
    expect(grants).not.toHaveBeenCalled();
  });
});

describe("a winner's delivery", () => {
  const send = (over: Record<string, unknown> = {}) => {
    const text = "the inference report\n";
    const sha = createHash("sha256").update(text).digest("hex");
    return { agreement: "a9.accord-v2.testnet", item: 1, body: text, signature: signDelivery(W.seed, "a9.accord-v2.testnet", 1, sha), ...over };
  };
  it("is stored by its sha256 when the vendor key of the job's linked agreement signs it", async () => {
    job = awarded({ phase: "linked", agreement: "a9.accord-v2.testnet" });
    vendorOnChain = W.id;
    const r = await publishDelivery(7, send());
    expect(r).toMatchObject({ ok: true, path: "/api/tenders/deliveries/a9.accord-v2.testnet/1" });
    expect((await tenderWork.delivery("a9.accord-v2.testnet", 1))?.sha256).toBe(r.sha256);
    const { deliveryOf } = await import("../src/server/tenderwork");
    expect((await deliveryOf("a9.accord-v2.testnet", 1))?.matches).toBe(null);
    onChainEvidence = r.sha256;
    expect((await deliveryOf("a9.accord-v2.testnet", 1))?.matches).toBe(true);
    onChainEvidence = "cd".repeat(32);
    expect((await deliveryOf("a9.accord-v2.testnet", 1))?.matches).toBe(false);
  });
  it("is refused for another agreement, another signer, or an agreement whose vendor is not the winner", async () => {
    job = awarded({ phase: "linked", agreement: "a9.accord-v2.testnet" });
    vendorOnChain = W.id;
    await expect(publishDelivery(7, send({ agreement: "a8.accord-v2.testnet" }))).rejects.toThrow("not linked");
    await expect(publishDelivery(7, send({ body: "something else" }))).rejects.toThrow("signature");
    // once the item is delivered on chain, only the copy with that sha256 is accepted, and a stale copy is not served
    onChainEvidence = "ab".repeat(32);
    await expect(publishDelivery(7, send())).rejects.toThrow("another sha256");
    vendorOnChain = X.id;
    await expect(publishDelivery(7, send())).rejects.toThrow("vendor is not");
  });
});

describe("an agent asks to join a dashboard", () => {
  it("is kept as a claim only with the agent's link signature for that account", async () => {
    await claimAccount({ account: "Adi.testnet", bidder: W.id, label: "my-agent", source: "cli", signature: signLink(W, "adi.testnet") });
    expect((await tenderWork.claims("adi.testnet")).map((c) => c.label)).toEqual(["my-agent"]);
    await expect(claimAccount({ account: "bob.testnet", bidder: W.id, label: "x", signature: signLink(W, "adi.testnet") })).rejects.toThrow("signature");
    await tenderWork.dismissClaim("adi.testnet", W.id);
    await claimAccount({ account: "adi.testnet", bidder: W.id, label: "again", source: "cli", signature: signLink(W, "adi.testnet") });
    expect(await tenderWork.claims("adi.testnet")).toEqual([]); // "Not mine" holds
  });
});
