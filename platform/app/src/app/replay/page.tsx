import { PageHead, Quiet } from "@/components/ui";
import { config } from "@/server/accord";
import { REPLAY_AGREEMENT, REPLAY_DATE } from "@/lib/replay";
import { Replay } from "./Replay";

export const metadata = { title: "Replay a recorded run" };

// No funds, no wallet: a recorded wallet-free run (a32.accord-v2.testnet) replayed in about a minute, each step with
// its real transaction. For a visitor the faucet cannot fund (a shared connection, today's budget used).
export default function ReplayPage() {
  return (
    <div className="container">
      <PageHead
        eyebrow={<Quiet>A recording of a real testnet run. Nothing on this page is live.</Quiet>}
        title="Watch a 60-second replay"
        lead={`One wallet-free try-it run, ${REPLAY_DATE}: agreement ${REPLAY_AGREEMENT} from a throwaway key to Finish, about 4 minutes of real time replayed in about one. Every step links its transaction on testnet.`}
      />
      <Replay explorer={config().explorer} />
    </div>
  );
}
