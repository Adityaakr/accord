// The signed-in account's tender agents. GET lists them with their bids; POST links one (with a signature by the
// agent's own bidder key over "accord-tender:v1:link:<account>"); DELETE ?bidder= unlinks one. Same-origin, session.
import { NextResponse } from "next/server";
import { body, withSession } from "@/server/orgapi";
import { LinkError, agentsFor, linkAgent, unlinkAgent } from "@/server/tenderagents";

export const dynamic = "force-dynamic";

const out = async (f: () => Promise<unknown>) => {
  try {
    return NextResponse.json(await f());
  } catch (e) {
    if (e instanceof LinkError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
};

export function GET(req: Request) {
  return withSession(req, (account) => out(async () => ({ account, agents: await agentsFor(account) })));
}
export function POST(req: Request) {
  return withSession(req, async (account) => out(async () => linkAgent(account, await body(req))));
}
export function DELETE(req: Request) {
  return withSession(req, (account) => out(async () => unlinkAgent(account, new URL(req.url).searchParams.get("bidder") ?? "")));
}
