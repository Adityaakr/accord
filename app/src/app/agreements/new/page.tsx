import { PageHead } from "@/components/ui";
import { accord, config } from "@/server/accord";
import { NewRoomFlow } from "./NewRoomFlow";

export const metadata = { title: "New deal room" };
export const dynamic = "force-dynamic";

// The factory's own config decides the creation deposit and whether demo timings are allowed; both are shown
// before the wallet signs.
export default async function NewAgreement() {
  const c = config();
  const factory = await accord().config().catch(() => null);
  return (
    <div className="container">
      <PageHead
        eyebrow={<span className="small">new deal room</span>}
        title="Open a deal room"
        lead="Four short steps. The room becomes its own NEAR account; both companies then seal their limits, the agents negotiate, and both of you approve."
      />
      <NewRoomFlow network={c.network} deposit={factory?.create_deposit ?? null} demoAllowed={factory?.demo_allowed ?? true} />
    </div>
  );
}
