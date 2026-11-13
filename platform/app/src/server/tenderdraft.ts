// "Draft with NEAR AI": the winner of a linked tender job asks NEAR AI Cloud for a first draft of one item's
// deliverable, from the job's public title and spec. The draft comes back to the winner's browser to edit; nothing is
// delivered until the winner sends it (signed by its vendor key, hashed into the agreement). Signed by the winning key,
// limited per job and overall, so the app's NEAR AI key is not an open endpoint.
import "server-only";
import { verifyDraft } from "@accord/sdk";
import { takeAll } from "./limiter";
import { RelayError, boardId, getJob } from "./tender";

const NEARAI = "https://cloud-api.near.ai/v1/chat/completions";
/** The NEAR-fleet TEE model the Sealed Table uses (DECISIONS.md). */
export const DRAFT_MODEL = "z-ai/glm-5.3-flash";

export async function draftItem(id: number, b: Record<string, unknown>): Promise<{ ok: true; model: string; text: string }> {
  const item = Number(b.item), signature = String(b.signature ?? "");
  if (!Number.isInteger(item) || item < 1 || item > 16) throw new RelayError(400, "item is the agreement's item number");
  const j = await getJob(id);
  if (!j?.winner || !j.agreement) throw new RelayError(409, `job ${id} has no linked agreement yet`);
  if (!verifyDraft(j.winner, boardId(), id, item, signature)) throw new RelayError(403, "the signature is not the winning key's over this job and item");
  const key = process.env.NEARAI_API_KEY;
  if (!key) throw new RelayError(503, "NEAR AI is not configured on this app");
  if (takeAll([{ key: `tender:draft:job:${id}`, max: 12, windowMs: 3_600_000 }, { key: "tender:draft", max: 60, windowMs: 3_600_000 }])) {
    throw new RelayError(429, "enough drafts for now; write this one yourself or try again later");
  }
  const r = await fetch(NEARAI, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, "x-no-aliasing": "true" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: DRAFT_MODEL,
      max_tokens: 2500,
      messages: [
        { role: "system", content: "You are the vendor's assistant. Write the deliverable a buyer will review for one milestone of a job. Plain text, concrete, under 400 words. State plainly what is a placeholder the vendor must replace with real figures or links; never invent measurements, logs or signatures." },
        { role: "user", content: `Job ${id}: ${j.title}\n\nSpec: ${j.spec}\n\nWrite the delivery for milestone ${item}.` },
      ],
    }),
  }).catch((e: Error) => { throw new RelayError(502, `NEAR AI did not answer: ${e.message}`); });
  const out = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = out.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!r.ok || !text) throw new RelayError(502, `NEAR AI: ${out.error?.message ?? `HTTP ${r.status}, no draft`}`);
  return { ok: true, model: DRAFT_MODEL, text: text.slice(0, 20_000) };
}
