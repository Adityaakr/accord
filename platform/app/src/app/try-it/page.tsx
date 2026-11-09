import { PageHead, Pill } from "@/components/ui";
import { accord, config } from "@/server/accord";
import { demoConfig, demoReady } from "@/server/demo";
import { TryIt } from "./TryIt";

export const dynamic = "force-dynamic";
export const metadata = { title: "Try a deal" };

// The guided testnet path: five steps from a wallet to an agent payment and a refused redirect, against Accord's
// demo vendor. Every step is a real transaction on NEAR testnet with test USDC.
export default async function TryItPage() {
  const c = config();
  const factory = await accord().config().catch(() => null);
  return (
    <div className="container">
      <PageHead
        eyebrow={<Pill tone="warn">NEAR testnet · test USDC</Pill>}
        title="Try a deal in 3 minutes"
        lead="Open a real deal room against Accord's demo vendor, seal your limits, and watch the agents negotiate, the contract pay the right account, and refuse the wrong one. Everything here is on NEAR testnet with test USDC."
      />
      <TryIt
        network={c.network}
        explorer={c.explorer}
        token={factory?.token ?? null}
        deposit={factory?.create_deposit ?? null}
        demo={demoConfig()}
        ready={demoReady()}
      />
    </div>
  );
}
