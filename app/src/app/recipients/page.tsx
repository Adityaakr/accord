import { ComingNext } from "@/components/ComingNext";

export const metadata = { title: "Recipients" };

export default function Page() {
  return <ComingNext title="Recipients" lead="Every account your agreements pay, how it was bound, and any change in progress."
    holds={["Bound recipients: account, domain, who approved and who accepted", "Pending changes with their 24-hour timer and a cancel control", "An alert to every member when a change is proposed", "Lookalike and blocked-account checks"]}
    today={[{ label: "Payee check", href: "/payee" }]} />;
}
