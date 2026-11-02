// Sealing a mandate (ARCHITECTURE.md 8.2). The envelope binds the mandate to one agreement, role, party and
// release; the commitment is sha256 of its JCS bytes; the ciphertext is ECIES (secp256k1, HKDF-SHA256,
// AES-256-GCM) to the release's mandate key. The plaintext never leaves the party's device.

import { encrypt, decrypt, PrivateKey } from "eciesjs";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { jcs, sha256Hex } from "./hash.js";
import type { Signer } from "./chain.js";

export type Role = "buyer" | "vendor";

/** A mandate (INTERFACES.md 6.2): `shared` is shown to the other side; `limits` and `instructions` stay sealed. */
export interface Mandate {
  kind: "procurement" | "market-making";
  role: Role;
  shared: Record<string, unknown>;
  limits: Record<string, unknown>;
  instructions: string;
}

export interface Envelope {
  v: 1;
  agreement: string;
  role: Role;
  party: string;
  release: number;
  mandate: Mandate;
  salt: string;
  doc_pubkey: string;
  doc_key_signer: string;
}

export interface Sealed {
  commitment: string;
  ciphertext: string; // base64
  envelope: Envelope;
}

export const MAX_CIPHERTEXT = 8 * 1024;

/** The commercial terms document key: derived again on any device from the same wallet key. */
export interface DocKey {
  secret: Uint8Array;
  publicKey: string; // compressed secp256k1, 66 hex
  signer: string; // the wallet key that signed
}

export function docKeyMessage(agreement: string): string {
  return `accord:doc-key:v1:${agreement}`;
}

/** NEP-413 signature over `accord:doc-key:v1:<agreement>` with nonce sha256(message), reduced to a scalar. */
export async function deriveDocKey(signer: Signer, agreement: string): Promise<DocKey> {
  if (!signer.signMessage) throw new Error("this signer cannot sign messages (NEP-413)");
  const message = docKeyMessage(agreement);
  const { signature, publicKey } = await signer.signMessage(message, agreement, sha256(utf8ToBytes(message)));
  return docKeyFromSignature(signature, publicKey);
}

export function docKeyFromSignature(signature: Uint8Array, signerPublicKey: string): DocKey {
  const okm = hkdf(sha256, signature, undefined, utf8ToBytes("accord/doc-key/v1"), 32);
  let scalar = BigInt(`0x${bytesToHex(okm)}`) % secp256k1.CURVE.n;
  if (scalar === 0n) scalar = 1n;
  const secret = hexToBytes(scalar.toString(16).padStart(64, "0"));
  return {
    secret,
    publicKey: bytesToHex(secp256k1.getPublicKey(secret, true)),
    signer: signerPublicKey,
  };
}

export function seal(args: {
  agreement: string;
  role: Role;
  party: string;
  release: number;
  mandate: Mandate;
  mandatePubkey: string;
  docKey: DocKey;
  salt?: Uint8Array;
}): Sealed {
  if (args.mandate.role !== args.role) throw new Error(`mandate is for the ${args.mandate.role}, not the ${args.role}`);
  const envelope: Envelope = {
    v: 1,
    agreement: args.agreement,
    role: args.role,
    party: args.party,
    release: args.release,
    mandate: args.mandate,
    salt: bytesToHex(args.salt ?? randomBytes(32)),
    doc_pubkey: args.docKey.publicKey,
    doc_key_signer: args.docKey.signer,
  };
  const bytes = utf8ToBytes(jcs(envelope));
  const ciphertext = encrypt(args.mandatePubkey, bytes);
  if (ciphertext.length > MAX_CIPHERTEXT) {
    throw new Error(`sealed mandate is ${ciphertext.length} bytes; the limit is ${MAX_CIPHERTEXT}`);
  }
  return {
    commitment: sha256Hex(bytes),
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    envelope,
  };
}

/** Opens an envelope with the mandate key's secret: used only by the Sealed Table and by tests. */
export function open(ciphertextB64: string, secretHex: string): { envelope: Envelope; commitment: string } {
  const bytes = decrypt(secretHex, Buffer.from(ciphertextB64, "base64"));
  const text = Buffer.from(bytes).toString("utf8");
  return { envelope: JSON.parse(text) as Envelope, commitment: sha256Hex(bytes) };
}

/** Decrypts the commercial terms document encrypted to this party's document key. */
export function decryptDocument(ciphertextB64: string, docKey: DocKey): unknown {
  const bytes = decrypt(docKey.secret, Buffer.from(ciphertextB64, "base64"));
  return JSON.parse(Buffer.from(bytes).toString("utf8"));
}

/**
 * The sanity check `make negotiate` prints: one party's document key cannot open the other party's sealed mandate.
 * It is a check, not the proof; the proof is the encryption to the enclave's key, the seed gating and the
 * attestations.
 */
export function sealedCheck(ciphertextB64: string, docKey: DocKey): "ERR_SEALED" | "READABLE" {
  try {
    decrypt(docKey.secret, Buffer.from(ciphertextB64, "base64"));
    return "READABLE";
  } catch {
    return "ERR_SEALED";
  }
}

export function newMandateKey(): { secret: string; publicKey: string } {
  const sk = new PrivateKey();
  return { secret: sk.toHex(), publicKey: sk.publicKey.toHex(true) };
}
