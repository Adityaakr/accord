// A tender amount in its job's token: the number in mono, the symbol after it in a quieter size. The decimals come
// from the SDK's token list; a token this app does not know shows its raw base units and the token id, never a guess.
import { tenderAmount } from "@accord/sdk";
import { tokenOf } from "./lib";
import styles from "./tenders.module.css";

export function TokenAmount({ base, token }: { base: string | bigint; token: string }) {
  const t = tokenOf(token);
  if (!t) {
    return (
      <span className="num" title={`${String(base)} base units of ${token}`}>
        {String(base)}<span className={styles.sym}> base units · {token.length > 20 ? `${token.slice(0, 8)}…` : token}</span>
      </span>
    );
  }
  let text: string;
  try {
    text = tenderAmount(base, token);
  } catch {
    text = String(base);
  }
  return (
    <span className="num">
      {text}<span className={styles.sym}> {t.symbol}</span>
    </span>
  );
}
