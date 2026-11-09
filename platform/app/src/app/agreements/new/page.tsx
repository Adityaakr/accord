import { accord, config } from "@/server/accord";
import { demoConfig, demoReady } from "@/server/demo";
import { NewRoomFlow } from "./NewRoomFlow";
import styles from "./flow.module.css";

export const metadata = { title: "New deal room" };
export const dynamic = "force-dynamic";

// The factory's own config decides the creation deposit and whether demo timings are allowed; both are shown
// before the wallet signs. When this server runs Accord's demo counterparty, the counterparty step offers it.
// The head is the website's centred page hero (apps/web PageHero, centred): a pill, the headline, one lead line.
export default async function NewAgreement() {
  const c = config();
  const factory = await accord().config().catch(() => null);
  const d = demoReady().counterparty ? demoConfig() : null;
  return (
    <div className="container">
      <header className={`page-in ${styles.hero}`}>
        <p className={styles.pill}><span className={styles.indicator} aria-hidden="true" />New deal room</p>
        <h1 className={styles.title}>Open a deal room</h1>
        <p className={styles.heroLead}>Four short steps. The room becomes its own NEAR account; then both companies seal their limits and the agents negotiate.</p>
      </header>
      <NewRoomFlow network={c.network} deposit={factory?.create_deposit ?? null} demoAllowed={factory?.demo_allowed ?? true}
        demoVendor={d ? { vendor: d.vendor, authority: d.authority, domain: d.domain } : null} />
    </div>
  );
}
