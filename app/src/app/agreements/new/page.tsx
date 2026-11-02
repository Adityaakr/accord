import { PageHead } from "@/components/ui";
import { config } from "@/server/accord";
import { NewAgreementForm } from "./NewAgreementForm";

export const metadata = { title: "New agreement" };

export default function NewAgreement() {
  const c = config();
  return (
    <div className="container">
      <PageHead
        eyebrow={<span className="small">step 1 of 3 · create · seal · approve</span>}
        title="New agreement"
        lead="The buyer creates the deal room. The factory makes it its own NEAR account with the release's code and no key of its own; the creation deposit pays its storage and gas."
      />
      <NewAgreementForm network={c.network} />
    </div>
  );
}
