// GET /api/me/agents?account=<id>: read from contract views only; nothing here reads or holds a key.

import { agents } from "@/server/data";
import { forAccount } from "@/server/account";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return forAccount(req, agents);
}
