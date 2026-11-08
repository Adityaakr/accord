import Link from "next/link";
import { KindLabel } from "@/components/rooms/KindLabel";
import { notFound } from "next/navigation";
import { accord, config } from "@/server/accord";
import { isCirclePreset, presets } from "@/server/presets";
import { PageHead, Pill } from "@/components/ui";
import { SealForm } from "./SealForm";

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
  const a = await accord().agreement(id).get().catch(() => null);
  if (!a) notFound();
  const commitments = await accord().agreement(id).commitments();
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
        presets={roomPresets(a.kind, config().currencies.find((c) => c.factory === a.factory)?.id === "usdc")}
      />
    </div>
  );
}
