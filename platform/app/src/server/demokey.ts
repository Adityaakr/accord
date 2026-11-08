// The demo agent's per-room key: an ed25519 key derived from the server's seed and the agreement id, so the server
// can sign as the agent in a test room without storing a key per room. Pure (no server-only) so it is testable.
import { createHmac, createPrivateKey, createPublicKey } from "node:crypto";
import { baseEncode } from "near-api-js";

const PKCS8_ED25519 = Buffer.from("302e020100300506032b657004220420", "hex");

/** `generation` is the room's revoked-key count, so a key the buyer revoked is never derived again. */
export function deriveAgentKey(seedSource: string, agreement: string, generation = 0): { publicKey: string; secretKey: string } {
  const seed = createHmac("sha256", seedSource).update(`accord:demo-agent:v1:${agreement}:${generation}`).digest();
  const priv = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519, seed]), format: "der", type: "pkcs8" });
  const pub = Buffer.from(createPublicKey(priv).export({ format: "jwk" }).x as string, "base64url");
  return { publicKey: `ed25519:${baseEncode(pub)}`, secretKey: `ed25519:${baseEncode(Buffer.concat([seed, pub]))}` };
}
