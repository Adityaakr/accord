import Link from "next/link";
import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { VerifiedPanel } from "@/app/agreements/[id]/VerifiedPanel";
import { accord } from "@/server/accord";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify ${id}` };
}

export default async function VerifyOne({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await accord().agreement(id).get().catch(() => null);
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <PageHead
        eyebrow={<Link href="/verify" className="small link">Verify</Link>}
        title={a ? a.title : "Unknown agreement"}
        lead={a ? <><span className="mono">{id}</span> · <Link className="link" href={`/agreements/${id}`}>open the deal room</Link></> : <>No agreement at <span className="mono">{id}</span>.</>}
      />
      {a && <VerifiedPanel agreement={id} model={a.model} />}
    </div>
  );
}
