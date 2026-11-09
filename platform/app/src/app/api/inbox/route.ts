// The /try inbox: a form into the demo agent's inbox store and nothing more. No key, no contract call; rate limited
// per visitor (a salted hash of the address, never the address) and in total.
import { createHash } from "node:crypto";
import { addMessage, countMessagesSince } from "@/server/store";
import { clientIp } from "@/server/ratelimit";
import { closedReason, tryRoom } from "@/server/tryroom";

export const dynamic = "force-dynamic";

const PER_VISITOR_PER_HOUR = 10;

function visitorHash(req: Request): string {
  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${process.env.INBOX_DAILY_SALT ?? "accord-dev-salt"}|${day}`).digest("hex");
}

export async function POST(req: Request) {
  let body: { sender?: unknown; subject?: unknown; body?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "send JSON: { sender, subject, body }" }, { status: 400 });
  }
  const sender = typeof body.sender === "string" ? body.sender.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!sender || !subject || !text || sender.length > 120 || subject.length > 160 || text.length > 2000) {
    return Response.json({ error: "sender up to 120, subject up to 160 and body up to 2000 characters, all required" }, { status: 400 });
  }
  const room = await tryRoom();
  if (!room) return Response.json({ error: await closedReason() }, { status: 503 });
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const visitor = visitorHash(req);
  if (await countMessagesSince(hourAgo, visitor) >= PER_VISITOR_PER_HOUR) {
    return Response.json({ error: "10 messages an hour per visitor" }, { status: 429 });
  }
  if (await countMessagesSince(hourAgo) >= Number(process.env.TRY_MAX_MESSAGES_PER_HOUR ?? 120)) {
    return Response.json({ error: "the room has had all the messages it takes this hour" }, { status: 429 });
  }
  const id = await addMessage({ visitor_hash: visitor, sender, subject, body: text, agreement: room.account });
  return Response.json({ id, agreement: room.account });
}
