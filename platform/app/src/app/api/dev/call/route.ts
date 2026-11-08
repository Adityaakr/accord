// Sandbox only: signs one function call as a sandbox principal. The body carries contract arguments (for
// `commit_mandate`, a ciphertext and a commitment); a mandate in plaintext never reaches this route.
import { actions } from "near-api-js";
import { sandboxAccount, sandboxOnly } from "@/server/sandbox";

export const dynamic = "force-dynamic";

interface Body { as: string; contractId: string; method: string; args: object; gas: string; deposit: string }

export async function POST(req: Request) {
  const blocked = sandboxOnly();
  if (blocked) return blocked;
  const b = (await req.json()) as Body;
  try {
    const tx = await sandboxAccount(b.as).signAndSendTransaction({
      receiverId: b.contractId,
      actions: [actions.functionCall(b.method, b.args, BigInt(b.gas), BigInt(b.deposit))],
      waitUntil: "FINAL",
      throwOnFailure: false,
    });
    return Response.json({ tx });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
