import { listPrincipals, sandboxOnly } from "@/server/sandbox";

export const dynamic = "force-dynamic";

export function GET() {
  return sandboxOnly() ?? Response.json(listPrincipals());
}
