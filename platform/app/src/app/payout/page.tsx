import { Recipients } from "@/components/me/Recipients";

export const metadata = { title: "Payout account" };

// Vendor workspace: the account each room pays you to, how it was bound to your domain, and any change in progress.
export default function Page() {
  return <Recipients role="vendor" title="Payout account"
    lead="The account each room pays you to. It was proven against your domain and approved by your settlement authority; a change needs a fresh proof, your authority, the buyer and a delay." />;
}
