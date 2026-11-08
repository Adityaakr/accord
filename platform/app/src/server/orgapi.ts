// What every organisation route shares: the session's account, a same-origin JSON check for writes, and one
// mapping from the store's errors to HTTP statuses.

import "server-only";
import { NextResponse } from "next/server";
import { OrgError } from "@accord/store";
import { sessionAccount } from "./session";
import { fromThisSite } from "./origin";

const STATUS = { not_found: 404, forbidden: 403, conflict: 409, invalid: 400, expired: 410 } as const;

export function fail(e: unknown) {
  if (e instanceof OrgError) return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] });
  return NextResponse.json({ error: (e as Error).message }, { status: 500 });
}

/** Writes must come from this site as JSON; the session cookie is SameSite=Lax as well. */
function sameOrigin(req: Request): boolean {
  if (req.method === "GET") return true;
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return false;
  return fromThisSite(req);
}

export async function withSession(req: Request, f: (account: string) => Promise<Response>): Promise<Response> {
  if (!sameOrigin(req)) return NextResponse.json({ error: "requests must come from this site as JSON" }, { status: 403 });
  const account = await sessionAccount();
  if (!account) return NextResponse.json({ error: "confirm it is you first", code: "no_session" }, { status: 401 });
  try {
    return await f(account);
  } catch (e) {
    return fail(e);
  }
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new OrgError("invalid", "the request body is not JSON");
  }
}
