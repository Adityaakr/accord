import { ComingNext } from "@/components/ComingNext";

export const metadata = { title: "Settings" };

export default function Page() {
  return <ComingNext title="Settings" lead="Your organisation, its people and what each of them can sign."
    holds={["Organisation: name and a verified domain", "Members and roles: who can seal, approve, fund, decide exceptions and revoke", "Wallets and keys: the funding account and agent keys", "Notifications: email, Slack or webhook on a refusal, a hold, an approval or a recipient change", "Developers: the MCP endpoint and API keys", "Billing"]}
    today={[{ label: "Your profile", href: "/profile" }]} />;
}
