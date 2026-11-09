// The demo vendor's delivery evidence. A demonstration has no real deliverable, so the demo vendor delivers a small,
// deterministic JSON document that says so; the hash on chain is sha256 of that exact text, and the app serves the
// same text at the delivery URL (`/app/api/deliveries/<agreement>/<item>`), so anyone can fetch it and recompute the
// hash. Deterministic (no timestamp) so it can be served again without storing anything.

import { jcs, sha256Hex } from "./hash.js";

/** Evidence hashes that predate this document: the demo vendor once submitted 32 bytes of 0xee. */
export const PLACEHOLDER_EVIDENCE = "ee".repeat(32);

export interface DemoDelivery { document: string; hash: string }

export function demoDelivery(agreement: string, item: number): DemoDelivery {
  const document = jcs({
    type: "accord-demo-delivery",
    agreement,
    item,
    note: "Demo delivery evidence: the demonstration vendor's stand-in deliverable for this item, not real work. The evidence hash on chain is sha256 of this exact JSON text.",
  });
  return { document, hash: sha256Hex(document) };
}

/** The path the app serves a demo delivery document at, below its basePath. */
export const demoDeliveryPath = (agreement: string, item: number) => `/app/api/deliveries/${agreement}/${item}`;

/** True when an evidence hash is the old placeholder or a demo delivery document's hash. */
export function isDemoEvidence(hash: string | null | undefined, agreement?: string, item?: number): boolean {
  if (!hash) return false;
  if (hash === PLACEHOLDER_EVIDENCE) return true;
  return agreement !== undefined && item !== undefined && demoDelivery(agreement, item).hash === hash;
}
