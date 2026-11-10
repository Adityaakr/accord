import { Tools } from "../agreements/new/NewRoomFlow";
import styles from "../agreements/new/flow.module.css";

export const metadata = {
  title: "Payment controls",
  description: "Check a payment before signing, refusal alerts and finance exports, live today. Next: continuous monitoring and Accord Guard.",
};

// Public (components/Chrome.tsx PUBLIC and READ_ONLY): the same three cards and Next line as the Type step of Open a deal room.
export default function ControlsPage() {
  return <div className={styles.flow}><Tools /></div>;
}
