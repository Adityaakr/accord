// The demo delivery document is served only when the item's on-chain evidence hash is its sha256; a placeholder hash
// from before the documents is reported as one, and /app/deliveries/... answers the same as /app/api/deliveries/....
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoDelivery, PLACEHOLDER_EVIDENCE, sha256Hex, type ItemView } from "@accord/sdk";
import { deliveryResponse, type ReadItems } from "../src/server/delivery";

const A = "a15.accord-v2.testnet";
const item = (id: number, evidence_hash: string | null): ItemView =>
  ({ id, delivery: evidence_hash ? { evidence_hash, uri: "u", at: 0, window_end: 0 } : null }) as ItemView;
const chain: ReadItems = async (a) => {
  if (a !== A) throw new Error(`[-32000] Server error: account ${a} does not exist while viewing`);
  return [item(1, PLACEHOLDER_EVIDENCE), item(2, demoDelivery(A, 2).hash), item(3, null), item(4, "ab".repeat(32))];
};

describe("/deliveries/<agreement>/<item>", () => {
  it("serves the exact text when the on-chain hash is its sha256", async () => {
    const r = await deliveryResponse(A, "2", chain);
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toBe(demoDelivery(A, 2).document);
    expect(sha256Hex(text)).toBe(demoDelivery(A, 2).hash);
    expect(r.headers.get("x-accord-evidence-sha256")).toBe(sha256Hex(text));
    expect(r.headers.get("x-accord-evidence-on-chain")).toBe("match");
    expect(JSON.parse(text).note).toMatch(/sha256 of this exact JSON text/);
  });
  it("says the hash is a placeholder for rooms delivered before the documents, and never claims the sha256", async () => {
    const r = await deliveryResponse(A, "1", chain);
    expect(r.status).toBe(200);
    expect(r.headers.get("x-accord-evidence-on-chain")).toBe("placeholder");
    expect(r.headers.get("x-accord-evidence-sha256")).toBeNull();
    const text = await r.text();
    expect(text).not.toMatch(/sha256 of this exact JSON text/);
    expect(JSON.parse(text).note).toMatch(/placeholder/);
  });
  it("404s an item with no delivery, a non-demo hash, and an account that is not an agreement", async () => {
    expect((await deliveryResponse(A, "3", chain)).status).toBe(404);
    const other = await deliveryResponse(A, "4", chain);
    expect(other.status).toBe(404);
    expect(await other.text()).not.toMatch(/exact JSON text/);
    expect((await deliveryResponse("nobody.testnet", "1", chain)).status).toBe(404);
  });
  it("502s without a claim when the chain cannot be read", async () => {
    const r = await deliveryResponse(A, "2", async () => { throw new Error("fetch failed"); });
    expect(r.status).toBe(502);
  });
  it("refuses what is not an account and an item number", async () => {
    expect((await deliveryResponse("Not An Account", "1", chain)).status).toBe(400);
    expect((await deliveryResponse("bogus..id", "1", chain)).status).toBe(400);
    expect((await deliveryResponse(A, "one", chain)).status).toBe(400);
  });
  it("/app/deliveries/... re-exports the /app/api/deliveries/... handler", () => {
    // the route modules import server-only, so this reads the re-export rather than importing it
    const src = readFileSync(new URL("../src/app/deliveries/[id]/[item]/route.ts", import.meta.url), "utf8");
    expect(src).toMatch(/export \{ GET \} from "\.\.\/\.\.\/\.\.\/api\/deliveries\/\[id\]\/\[item\]\/route";/);
  });
});
