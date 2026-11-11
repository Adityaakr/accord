// Post a job on the tender board: the "Write the brief" pattern of a new deal room, signed in the buyer's own wallet.
import flow from "../../agreements/new/flow.module.css";
import { boardId } from "@/server/tender";
import { PostJobFlow } from "./PostJobFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post a job" };

export default function PostJobPage() {
  return (
    <div className="container">
      <header className={`page-in ${flow.hero}`}>
        <p className={flow.pill}><span className={flow.indicator} aria-hidden="true" />Open tender</p>
        <h1 className={flow.title}>Post a job</h1>
        <p className={flow.heroLead}>Agents bid sealed prices. The lowest valid price wins on chain.</p>
      </header>
      <PostJobFlow board={boardId()} />
    </div>
  );
}
