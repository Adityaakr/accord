import Link from "next/link";
import { KindLabel } from "@/components/rooms/KindLabel";
import { notFound } from "next/navigation";
import { accord, config } from "@/server/accord";
import { isCirclePreset, presets } from "@/server/presets";
import { PageHead, Pill } from "@/components/ui";
import { SealForm } from "./SealForm";
import { isRpcBusy } from "@accord/sdk";
import { readWithin } from "@/server/deadline";
import { listJobs } from "@/server/tender";
import type { Preset } from "@/server/presets";
import type { TenderJob } from "@accord/sdk";

/** For a room linked to a tender job: the buyer's mandate sized to that job (its budget is the ceiling). */
function tenderPreset(j: TenderJob): Preset {
  const budget = BigInt(j.budget);
  return {
    id: `tender-${j.id}`, company: "Your company", label: `Tender ${j.id}: ceiling ${Number(budget) / 1e6} (the job's budget)`,
    mandate: {
      kind: "procurement", role: "buyer",
      shared: {
        scope: j.spec || j.title,
        proposed_items: [{ name: "First half", deliverable: `The first half of: ${j.title}` }, { name: "Second half", deliverable: `The rest of: ${j.title}` }],
      },
      limits: { max_total: budget.toString(), target_total: ((budget * 9n) / 10n).toString(), max_items: 4, max_duration_secs: 604800, min_acceptance_window_secs: 120 },
      instructions: `This vendor won tender job ${j.id} with a sealed bid. Pay at most the job's budget; two milestones are preferred.`,
    },
  };
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Seal your mandate" };

// A Circle USDC room starts from the presets sized for Circle's faucet (about 20 USDC per drip); any other room keeps
// the presets it always had.
function roomPresets(kind: string, circle: boolean) {
  const all = presets().filter((p) => p.mandate.kind === kind);
  const usdc = all.filter((p) => isCirclePreset(p.id));
  return circle && usdc.length ? usdc : all.filter((p) => !isCirclePreset(p.id));
}

export default async function Seal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Both reads run together, each bounded at 12 s on the chain: past it the room's error boundary says the network is
  // busy and reads again. The links here use prefetch={false}, so a slow chain never holds a background prefetch open.
  const deal = accord().agreement(id);
  const [got, sealed] = await Promise.allSettled([
    readWithin(deal.get(), 12_000, `reading ${id}`),
    readWithin(deal.commitments(), 12_000, `reading ${id}'s commitments`),
  ]);
  if (got.status === "rejected" && isRpcBusy(got.reason)) throw got.reason;
  const a = got.status === "fulfilled" ? got.value : null;
  if (!a) notFound();
  if (sealed.status === "rejected") throw sealed.reason;
  const commitments = sealed.value;
  const job = (await listJobs().catch(() => [] as TenderJob[])).find((j) => j.agreement === id) ?? null;
  const base = roomPresets(a.kind, config().currencies.find((c) => c.factory === a.factory)?.id === "usdc");
  return (
    <div className="container">
      <PageHead
        eyebrow={<><Link href={`/agreements/${id}`} className="small link">{id}</Link><KindLabel kind={a.kind} /></>}
        title="Seal your mandate"
        lead="Write what your company will accept. It is encrypted in this browser to the Sealed Table's enclave key; the chain stores only the ciphertext and its hash. The other company never sees your numbers."
      />
      <SealForm
        agreement={id}
        kind={a.kind}
        buyer={a.buyer}
        vendor={a.vendor}
        state={a.state}
        sealed={{ buyer: commitments.buyer?.commitment ?? null, vendor: commitments.vendor?.commitment ?? null }}
        presets={job && a.kind === "procurement" ? [tenderPreset(job), ...base] : base}
      />
    </div>
  );
}
