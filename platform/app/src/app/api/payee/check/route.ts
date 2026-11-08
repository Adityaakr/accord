// Advisory onboarding check of a vendor's accord.json from this server. The binding proof is the Payee job's,
// fetched inside its enclave; this only tells a vendor whether the file will pass.
import { checkDomainFile } from "@/server/payee";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const domain = (u.searchParams.get("domain") ?? "").trim().toLowerCase();
  const account = (u.searchParams.get("account") ?? "").trim();
  const authority = (u.searchParams.get("authority") ?? "").trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return Response.json({ error: "a domain like halcyon.example" }, { status: 400 });
  return Response.json(await checkDomainFile(domain, account, authority));
}
