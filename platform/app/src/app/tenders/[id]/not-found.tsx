// An unknown tender job: a real 404, marked so the app frame does not send a visitor to sign-in.
import Link from "next/link";
import { NotFoundMark } from "@/components/Chrome";
import { PageHead } from "@/components/ui";

export default function TenderNotFound() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <NotFoundMark />
      <PageHead title="No such tender" lead="There is no job with this id on the tender board. Job ids are positive whole numbers, given out in order." />
      <p><Link className="link" href="/tenders">See every open tender</Link></p>
    </div>
  );
}
