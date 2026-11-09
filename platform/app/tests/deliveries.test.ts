// The demo delivery document the demo vendor's evidence hash commits to: served as the exact text, so the hash on
// chain can be recomputed from the delivery URL.
import { describe, expect, it } from "vitest";
import { demoDelivery, sha256Hex } from "@accord/sdk";
import { GET } from "../src/app/api/deliveries/[id]/[item]/route";

const call = (id: string, item: string) => GET(new Request(`http://x/app/api/deliveries/${id}/${item}`), { params: Promise.resolve({ id, item }) });

describe("/api/deliveries/<agreement>/<item>", () => {
  it("serves the document whose sha256 is the submitted evidence hash", async () => {
    const r = await call("a10.accord-v2.testnet", "2");
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toBe(demoDelivery("a10.accord-v2.testnet", 2).document);
    expect(sha256Hex(text)).toBe(demoDelivery("a10.accord-v2.testnet", 2).hash);
    expect(r.headers.get("x-accord-evidence-sha256")).toBe(sha256Hex(text));
    expect(JSON.parse(text).note).toMatch(/^Demo delivery evidence/);
  });
  it("refuses what is not an account and an item number", async () => {
    expect((await call("Not An Account", "1")).status).toBe(400);
    expect((await call("a1.accord-v2.testnet", "one")).status).toBe(400);
  });
});
