// Finding 8 (L2-6 / L3-F6): from release 4 the sensitive agreement methods take exactly 1 yoctoNEAR. A delegate
// carries that deposit from the user's own account, and the relayer must pass it on for every one of them.
import { describe, expect, it } from "vitest";
import { KeyPair, KeyPairSigner, actions, buildDelegateAction, encodeSignedDelegate } from "near-api-js";
import { decodeSignedDelegate, rejectDelegate } from "../src/server/delegate";

const FACTORY = "accord-v2.testnet";
const HEIGHT = 1_000_000n;
const TGAS = 1_000_000_000_000n;
const METHODS = [
  "install_agent_key", "accept_recipient", "approve_exception", "resolve_period", "accept_delivery",
  "approve_terms", "mutual_close", "withdraw_near", "approve_recipient",
];

async function signed(method: string, deposit: bigint): Promise<string> {
  const kp = KeyPair.fromRandom("ed25519");
  const da = buildDelegateAction({
    senderId: "northwind-try.testnet", receiverId: `a12.${FACTORY}`,
    actions: [actions.functionCall(method, {}, 50n * TGAS, deposit)],
    nonce: 7n, maxBlockHeight: HEIGHT + 100n, publicKey: kp.getPublicKey(),
  });
  const { signedDelegate } = await new KeyPairSigner(kp).signDelegateAction(da);
  return Buffer.from(encodeSignedDelegate(signedDelegate)).toString("base64");
}

describe("1 yoctoNEAR through the relayer", () => {
  it("carries each sensitive agreement method with exactly 1 yoctoNEAR", async () => {
    for (const m of METHODS) {
      const d = decodeSignedDelegate(await signed(m, 1n));
      expect(rejectDelegate(d, { factory: FACTORY, token: "tusdc.accord-v1.testnet", height: HEIGHT }), m).toBeNull();
    }
  });
});
