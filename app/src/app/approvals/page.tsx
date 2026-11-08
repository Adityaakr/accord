import { ComingNext } from "@/components/ComingNext";

export const metadata = { title: "Approvals" };

export default function Page() {
  return <ComingNext title="Approvals" lead="One inbox for every decision that is yours across your deal rooms, in the order they are due."
    holds={["Terms waiting for your approval", "Recipients to accept, with the 24-hour timer on any change", "Deliveries to accept or dispute", "Exceptions the agent or vendor asked for", "Periods sent to you for review", "J and K to move, A to approve"]}
    today={[{ label: "Needs you, on Home", href: "/" }]} />;
}
