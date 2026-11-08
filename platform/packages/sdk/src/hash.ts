// RFC 8785 (JCS) canonical JSON and SHA-256, byte for byte the same as `accord-core::hash`
// (`crates/accord-core/tests/jcs_vectors.json` holds the shared vectors).

import canonicalizeLib from "canonicalize";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

const canonicalize = canonicalizeLib as unknown as (value: unknown) => string | undefined;

export function jcs(value: unknown): string {
  const out = canonicalize(value);
  if (out === undefined) throw new Error("value has no JSON form");
  return out;
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return bytesToHex(sha256(typeof bytes === "string" ? utf8ToBytes(bytes) : bytes));
}

export function jcsSha256(value: unknown): string {
  return sha256Hex(jcs(value));
}

/** The bytes a job signs: JCS of its output without `sig`. */
export function signedBytes(output: Record<string, unknown>): Uint8Array {
  const { sig: _sig, ...rest } = output;
  return utf8ToBytes(jcs(rest));
}
