// The demo vendor's delivery document for one item, served at /app/api/deliveries/<agreement>/<item> and at
// /app/deliveries/<agreement>/<item> (older rooms' on-chain URIs say /deliveries/..., which the site sends here).
// The document says "the evidence hash on chain is sha256 of this exact JSON text", so it is served only when that is
// true: the item's on-chain evidence_hash, read through the SDK, equals the sha256 of the text. Rooms delivered before
// the documents existed carry a placeholder (32 bytes of 0xee); for those the response says so instead. Pure of
// server-only so it is testable with a stand-in reader.
import { demoDelivery, isAccountId, NOT_AN_AGREEMENT, PLACEHOLDER_EVIDENCE, type ItemView } from "@accord/sdk";

export type ReadItems = (agreement: string) => Promise<ItemView[]>;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

export async function deliveryResponse(id: string, item: string, readItems: ReadItems): Promise<Response> {
  const n = Number(item);
  if (!isAccountId(id) || !/^\d{1,6}$/.test(item) || !Number.isSafeInteger(n)) {
    return json({ error: "expected /deliveries/<agreement account>/<item number>" }, 400);
  }
  let items: ItemView[];
  try {
    items = await readItems(id);
  } catch (e) {
    if (NOT_AN_AGREEMENT.test((e as Error).message ?? "")) return json({ error: `${id} is not an Accord agreement` }, 404);
    return json({ error: "could not read the agreement's items from the chain; try again" }, 502);
  }
  const it = items.find((x) => x.id === n);
  if (!it?.delivery) return json({ error: `item ${n} of ${id} has no delivery on chain` }, 404);
  const onChain = it.delivery.evidence_hash;
  const d = demoDelivery(id, n);
  if (onChain === d.hash) {
    return new Response(d.document, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-accord-evidence-sha256": d.hash,
        "x-accord-evidence-on-chain": "match",
        "cache-control": "public, max-age=300",
      },
    });
  }
  if (onChain === PLACEHOLDER_EVIDENCE) {
    return json({
      type: "accord-demo-delivery-placeholder",
      agreement: id,
      item: n,
      evidence_hash_on_chain: onChain,
      note: "Demo delivery evidence, not real work. This item was delivered before the demo vendor served delivery documents: the evidence hash on chain is a placeholder (32 bytes of 0xee), not the sha256 of any document, so there is no text here to recompute it from.",
    }, 200, { "x-accord-evidence-on-chain": "placeholder", "cache-control": "public, max-age=300" });
  }
  return json({
    error: `item ${n}'s evidence hash on chain is not a demo delivery's; Accord serves documents only for its demo vendor's deliveries`,
    evidence_hash_on_chain: onChain,
  }, 404);
}
