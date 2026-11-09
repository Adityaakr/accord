// /api/verify/<id>: a malformed id is a 400 with a plain message and never reaches the RPC; a well-formed account
// that is not an agreement stays 404.
import { describe, expect, it } from "vitest";
import { NotAnAgreementError, type VerifyReport } from "@accord/sdk";
import { verifyResponse } from "../src/server/verifyroute";

const never = async (): Promise<VerifyReport> => { throw new Error("the RPC must not be called"); };

describe("/api/verify/<id>", () => {
  it("400s a malformed id before any RPC call, with no RPC text in the message", async () => {
    for (const id of ["bogus..id", "Upper.testnet", "a", "x".repeat(65), "-lead.testnet", "space id"]) {
      const r = await verifyResponse(id, undefined, never);
      expect(r.status).toBe(400);
      const body = (await r.json()) as { error: string };
      expect(body.error).toMatch(/is not a NEAR account id/);
      expect(body.error).not.toMatch(/parse|RPC|-32/i);
    }
  });
  it("404s a well-formed account that is not an agreement", async () => {
    const r = await verifyResponse("nobody.testnet", undefined, async (a) => { throw new NotAnAgreementError(a); });
    expect(r.status).toBe(404);
  });
  it("400s a bad nonce and passes a good one through", async () => {
    expect((await verifyResponse("a6.accord-v2.testnet", "xyz", never)).status).toBe(400);
    let seen: string | undefined;
    const ok = await verifyResponse("a6.accord-v2.testnet", "0".repeat(64), async (_a, n) => { seen = n; return { checks: [] } as unknown as VerifyReport; });
    expect(ok.status).toBe(200);
    expect(seen).toBe("0".repeat(64));
  });
});
