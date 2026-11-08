// A section that is designed but not built yet: what it will hold, and where that lives today.
import Link from "next/link";
import styles from "./ComingNext.module.css";

export function ComingNext({ title, lead, holds, today }: { title: string; lead: string; holds: string[]; today?: { label: string; href: string }[] }) {
  return (
    <div className="container">
      <div className={styles.head}>
        <p className="eyebrow">Coming next</p>
        <h1 className="h2">{title}</h1>
        <p className="body-lg">{lead}</p>
      </div>
      <div className={styles.card}>
        <p className="h5">What it will hold</p>
        <ul className={styles.list}>{holds.map((h) => <li key={h}><span className={styles.dot} aria-hidden="true" />{h}</li>)}</ul>
        {today && today.length > 0 && (
          <p className={styles.today}>Today: {today.map((t, i) => <span key={t.href}>{i ? " · " : ""}<Link className="link" href={t.href}>{t.label}</Link></span>)}</p>
        )}
      </div>
    </div>
  );
}
