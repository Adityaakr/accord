// GET /api/me?account=<id>: one person's rooms, what needs them and the Home numbers, from contract views only.
// The account is public; nothing here reads or holds a key.

import { portfolio } from "@/server/data";
import { forAccount } from "@/server/account";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return forAccount(req, portfolio);
}
