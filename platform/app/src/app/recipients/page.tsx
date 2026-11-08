import { Recipients } from "@/components/me/Recipients";

export const metadata = { title: "Recipients" };

// Buyers and settlement authorities: recipients across your rooms and the changes waiting on you.
export default function Page() {
  return <Recipients title="Recipient changes" lead="Recipient changes in the rooms you take part in. As the vendor's settlement authority you approve a change; as the buyer you accept it; either of you can cancel it during its delay." />;
}
