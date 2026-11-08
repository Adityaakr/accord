// GET /api/me/deliveries?account=<id>: the items in the rooms this account sells in, from contract views only.

import { deliveries } from "@/server/data";
import { forAccount } from "@/server/account";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return forAccount(req, deliveries);
}
