// Checks the organisation's domain for its record (DNS TXT or the well-known file) and records the proof.
import { NextResponse } from "next/server";
import { org } from "@/server/store";
import { withSession } from "@/server/orgapi";
import { checkDomain, domainFile, domainRecord } from "@/server/domain";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    if (m.member.role !== "admin") return NextResponse.json({ error: "only an admin can do this" }, { status: 403 });
    const via = await checkDomain(m.org.domain, m.org.domain_token);
    if (!via) {
      return NextResponse.json({
        verified: false,
        error: `No record found yet. Add the TXT record ${domainRecord(m.org.domain_token)} to ${m.org.domain}, or serve it at ${domainFile(m.org.domain)}. DNS can take a few minutes.`,
      }, { status: 422 });
    }
    await org.markDomainVerified(m.org.id, account, via);
    return NextResponse.json({ verified: true, via });
  });
}
