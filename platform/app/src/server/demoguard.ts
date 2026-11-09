// Who may make the demo agent act in a test room. "key" only reads the public key the buyer installs, so anyone may
// ask for it. "pay" and "attack" make the agent sign `act`, and five refusals revoke its key, so only the room's buyer,
// proven by the session cookie (/api/session, a NEP-413 signature), may ask for them. Without this a third party
// could send five redirect attempts to someone else's room and revoke their agent. The always-open public room at
// /try runs its own agent from the inbox and does not use this route.

export type AgentAction = "key" | "pay" | "attack";

export type GuardRefusal = { status: 401 | 403; error: string; code: "no_session" | "not_buyer" };

/** null when `session` may ask the demo agent for `action` in a room whose buyer is `buyer`. */
export function agentGuard(action: AgentAction, session: string | null, buyer: string): GuardRefusal | null {
  if (action === "key") return null;
  if (!session) return { status: 401, error: "confirm it is you first: only the room's buyer can make the demo agent act", code: "no_session" };
  if (session !== buyer) return { status: 403, error: "only the room's buyer can make the demo agent act", code: "not_buyer" };
  return null;
}
