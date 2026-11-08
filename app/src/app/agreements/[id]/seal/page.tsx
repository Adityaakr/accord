import Link from "next/link";
import { notFound } from "next/navigation";
import { accord } from "@/server/accord";
import { presets } from "@/server/presets";
import { PageHead, Pill } from "@/components/ui";
import { SealForm } from "./SealForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seal your mandate" };

export default async function Seal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await accord().agreement(id).get().catch(() => null);
  if (!a) notFound();
  const commitments = await accord().agreement(id).commitments();
  return (
    <div className="container">
      <PageHead
        eyebrow={<><Link href={`/agreements/${id}`} className="small link">{id}</Link><Pill>{a.kind === "market-making" ? "market making" : "vendor contract"}</Pill></>}
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
        presets={presets().filter((p) => p.mandate.kind === a.kind)}
      />
    </div>
  );
}
