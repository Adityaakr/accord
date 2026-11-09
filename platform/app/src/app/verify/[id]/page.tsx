import Link from "next/link";
import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { VerifiedPanel } from "@/app/agreements/[id]/VerifiedPanel";
import { accord } from "@/server/accord";
import { decodeSegment, isAccountId } from "@/lib/accountid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify ${decodeSegment(id)}` };
}

export default async function VerifyOne({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeSegment((await params).id);
  // not a NEAR account id: nothing to read, and the answer says why
  const valid = isAccountId(id);
  const a = valid ? await accord().agreement(id).get().catch(() => null) : null;
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <PageHead
        eyebrow={<Link href="/verify" className="small link">Verify</Link>}
        title={a ? a.title : "Unknown agreement"}
        lead={a ? <><span className="mono">{id}</span> · <Link className="link" href={`/agreements/${id}`}>open the deal room</Link></> : valid
          ? <>No agreement at <span className="mono">{id}</span> on this network. <Link className="link" href="/verify">Check another</Link>.</>
          : <><span className="mono">{id}</span> is not a NEAR account id. Agreement accounts look like <span className="mono">a6.accord-v2.testnet</span>. <Link className="link" href="/verify">Check another</Link>.</>}
      />
      {a && <VerifiedPanel agreement={id} model={a.model} />}
    </div>
  );
}
