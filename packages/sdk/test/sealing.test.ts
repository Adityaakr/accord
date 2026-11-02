import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519";
import { baseEncode } from "near-api-js";
import {
  docKeyFromSignature, newMandateKey, open, seal, sealedCheck, type Mandate,
} from "../src/sealing.js";
import { signedBytes } from "../src/hash.js";
import { verifyEd25519 } from "../src/verify.js";
import { formatUnits, parseUnits } from "../src/format.js";

const mandate: Mandate = {
  kind: "procurement",
  role: "buyer",
  shared: { scope: "Integrate liquidity reporting into the treasury dashboard" },
  limits: { max_total: "40000000", target_total: "32000000", max_items: 4 },
  instructions: "Prefer three milestones; walk away rather than exceed the ceiling.",
};

describe("sealing", () => {
  const enclave = newMandateKey();
  const buyerDoc = docKeyFromSignature(new Uint8Array(64).fill(1), "ed25519:buyer");
  const vendorDoc = docKeyFromSignature(new Uint8Array(64).fill(2), "ed25519:vendor");

  it("binds the envelope to agreement, role, party and release, and opens only with the enclave key", () => {
    const s = seal({
      agreement: "a7.accord-v1.testnet", role: "buyer", party: "northwind-demo.testnet", release: 1,
      mandate, mandatePubkey: enclave.publicKey, docKey: buyerDoc,
    });
    expect(s.commitment).toMatch(/^[0-9a-f]{64}$/);
    const opened = open(s.ciphertext, enclave.secret);
    expect(opened.commitment).toBe(s.commitment);
    expect(opened.envelope.agreement).toBe("a7.accord-v1.testnet");
    expect(opened.envelope.mandate.limits).toEqual(mandate.limits);
    expect(opened.envelope.doc_pubkey).toBe(buyerDoc.publicKey);
  });

  it("is ERR_SEALED to the other party's document key, and to its own", () => {
    const s = seal({
      agreement: "a7.accord-v1.testnet", role: "buyer", party: "northwind-demo.testnet", release: 1,
      mandate, mandatePubkey: enclave.publicKey, docKey: buyerDoc,
    });
    expect(sealedCheck(s.ciphertext, vendorDoc)).toBe("ERR_SEALED");
    expect(sealedCheck(s.ciphertext, buyerDoc)).toBe("ERR_SEALED");
  });

  it("salts every seal, so the same mandate gives a different commitment", () => {
    const args = {
      agreement: "a7.accord-v1.testnet", role: "buyer" as const, party: "northwind-demo.testnet", release: 1,
      mandate, mandatePubkey: enclave.publicKey, docKey: buyerDoc,
    };
    expect(seal(args).commitment).not.toBe(seal(args).commitment);
  });

  it("refuses a mandate written for the other role", () => {
    expect(() => seal({
      agreement: "a7", role: "vendor", party: "halcyon-demo.testnet", release: 1, mandate,
      mandatePubkey: enclave.publicKey, docKey: vendorDoc,
    })).toThrow(/mandate is for the buyer/);
  });

  it("derives the same document key from the same signature", () => {
    const again = docKeyFromSignature(new Uint8Array(64).fill(1), "ed25519:buyer");
    expect(again.publicKey).toBe(buyerDoc.publicKey);
    expect(buyerDoc.publicKey).toMatch(/^0[23][0-9a-f]{64}$/);
  });
});

describe("job signatures", () => {
  it("verifies an ed25519 signature over JCS without sig, and rejects any changed field", () => {
    const seed = new Uint8Array(32).fill(11);
    const pub = `ed25519:${baseEncode(ed25519.getPublicKey(seed))}`;
    const out: Record<string, unknown> = { mode: "prove", agreement: "a7.accord-v1.testnet", version: 1, rating: "allow" };
    out.sig = Buffer.from(ed25519.sign(signedBytes(out), seed)).toString("base64");
    expect(verifyEd25519(out, pub)).toBe(true);
    expect(verifyEd25519({ ...out, rating: "warn" }, pub)).toBe(false);
  });
});

describe("amounts", () => {
  it("formats and parses base units without floats", () => {
    expect(formatUnits("12000000")).toBe("12.00");
    expect(formatUnits("2020000000")).toBe("2,020.00");
    expect(formatUnits("1")).toBe("0.00");
    expect(formatUnits("1", 6, 6)).toBe("0.000001");
    expect(parseUnits("12.5")).toBe(12_500_000n);
    expect(parseUnits("1,000")).toBe(1_000_000_000n);
    expect(() => parseUnits("0.0000001")).toThrow();
  });
});
