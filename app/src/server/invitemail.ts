// Invitation email, only when RESEND_API_KEY is set; otherwise the admin copies the link. The link is the only
// place the token exists outside the invitee's browser.

import "server-only";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendInvite(to: string, link: string, orgName: string, role: string): Promise<boolean> {
  const keyValue = process.env.RESEND_API_KEY;
  if (!keyValue) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${keyValue}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Accord <invites@accord.app>",
      to: [to],
      subject: `${orgName} invited you to Accord`,
      text: `${orgName} invited you to join its Accord organisation as ${role}.\n\nOpen the invitation: ${link}\n\nThe link works once and expires in 72 hours. Accord never asks for a seed phrase or a private key.`,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return Boolean(r?.ok);
}
