// Writes fixtures/jobs/sealed-table/sealed.json: mandates sealed by the SDK's own `seal` (eciesjs), so the Rust
// Sealed Table's tests decrypt exactly what a browser or the CLI produces. Everything here is a TEST value: a
// fixed test seed (never a release seed), fixed document-key "signatures" and fixed salts, so the file is
// reproducible except for the ECIES ephemeral keys.
//
// Run: pnpm --dir scripts/probe-ai exec tsx seal-fixtures.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { seal, docKeyFromSignature, type Mandate, type DocKey } from "../../packages/sdk/src/sealing.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const out = join(repo, "fixtures/jobs/sealed-table/sealed.json");

// The test seed: sha256("accord sealed-table test seed"). Never used outside tests.
const seed = sha256(utf8ToBytes("accord sealed-table test seed"));
const okm = hkdf(sha256, seed, undefined, utf8ToBytes("accord/sealed-table/mandate/v1"), 32);
let scalar = BigInt(`0x${bytesToHex(okm)}`) % secp256k1.CURVE.n;
if (scalar === 0n) scalar = 1n;
const mandateSecret = hexToBytes(scalar.toString(16).padStart(64, "0"));
const mandatePubkey = bytesToHex(secp256k1.getPublicKey(mandateSecret, true));

const read = (p: string): Mandate => JSON.parse(readFileSync(join(repo, "fixtures/companies", p), "utf8")) as Mandate;
const docKey = (label: string): DocKey =>
  docKeyFromSignature(sha256(utf8ToBytes(`test doc-key signature ${label}`)), `ed25519:Test${label}`);

const agreement = "a7.accord-v1.testnet";
const release = 3;
const parties = { buyer: "northwind-demo.testnet", vendor: "halcyon-demo.testnet" };
const keys = { buyer: docKey("buyer"), vendor: docKey("vendor") };
const salt = (label: string): Uint8Array => sha256(utf8ToBytes(`test salt ${label}`));

function sealed(role: "buyer" | "vendor", mandate: Mandate, label: string, room = agreement) {
  const s = seal({ agreement: room, role, party: parties[role], release, mandate, mandatePubkey, docKey: keys[role], salt: salt(label) });
  return {
    commitment: s.commitment,
    ciphertext: s.ciphertext,
    doc_pubkey: keys[role].publicKey,
    doc_key_signer: keys[role].signer,
  };
}

const fixture = {
  note: "TEST VALUES ONLY: sealed by packages/sdk/src/sealing.ts (eciesjs 0.4.18) with a test seed; regenerate with scripts/probe-ai/seal-fixtures.ts",
  test_seed: bytesToHex(seed),
  mandate_pubkey: mandatePubkey,
  agreement,
  release,
  parties,
  doc_secrets: { buyer: bytesToHex(keys.buyer.secret), vendor: bytesToHex(keys.vendor.secret) },
  procurement: {
    buyer: sealed("buyer", read("northwind/procurement.buyer.json"), "p-buyer"),
    vendor: sealed("vendor", read("halcyon/procurement.vendor.json"), "p-vendor"),
  },
  market_making: {
    buyer: sealed("buyer", read("northwind/market-making.buyer.json"), "m-buyer"),
    vendor: sealed("vendor", read("halcyon/market-making.vendor.json"), "m-vendor"),
  },
  // The buyer's procurement mandate sealed for another room, then copied into this one: must end as BAD_INPUT.
  copied_from_a8: sealed("buyer", read("northwind/procurement.buyer.json"), "p-buyer-a8", "a8.accord-v1.testnet"),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`wrote ${out} (mandate key ${mandatePubkey})`);
