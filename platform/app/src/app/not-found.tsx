// Any unknown /app address: a real 404 page, the same for everyone. It marks itself (NotFoundMark) so the app frame
// does not send a signed-out visitor to sign-in instead.
import Link from "next/link";
import { NotFoundMark } from "@/components/Chrome";
import { PageHead } from "@/components/ui";
import styles from "./pages.module.css";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <NotFoundMark />
      <PageHead
        title="Page not found"
        lead="There is nothing at this address in the Accord app. To check an agreement without signing in, open Verify."
      />
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className={styles.button} href="/verify">Verify an agreement</Link>
        <Link className="link" href="/try-it">Try a deal</Link>
        <Link className="link" href="/docs">Docs</Link>
        <Link className="link" href="/">App home</Link>
      </p>
    </div>
  );
}
