// `make close DEAL=<agreement>` (`make close-usdc` for accord-usdc.testnet): the buyer and the vendor both call
// `mutual_close` on an Executing agreement; the second call settles it, pays what is owed and refunds the unspent
// escrow to the buyer; then the buyer withdraws the spare NEAR. Balances are read before and after.

import { header, line } from "../flow.js";
import type { World } from "../world.js";

export async function run(w: World): Promise<void> {
  const id = process.env.DEAL ?? "";
  if (!id) throw new Error("usage: make close DEAL=<agreement account>");
  header("close", id, "", w);
  const reader = w.reader.agreement(id);
  const a = await reader.get();
  line("state", `${a.state} · funded ${a.funded} · paid ${a.paid} · reserved ${a.reserved} · token ${a.token}`);
  if (a.state !== "Executing") { line("skipped", `mutual close needs Executing; ${id} is ${a.state}`); return; }
  if (a.buyer !== w.principals.buyer.account || a.vendor !== w.principals.vendor.account) {
    throw new Error(`${id}'s parties are ${a.buyer} / ${a.vendor}, not the principals in .env`);
  }
  const bal = (acct: string) => w.reader.chain.view<string>(a.token, "ft_balance_of", { account_id: acct });
  const before = await bal(a.buyer);
  const tb = await w.as("buyer").agreement(id).mutualClose();
  line("buyer", `mutual_close · ${w.explorer ?? ""}/txns/${tb.txHash}`);
  const tv = await w.as("vendor").agreement(id).mutualClose();
  line("vendor", `mutual_close · ${w.explorer ?? ""}/txns/${tv.txHash}`);
  const after = await reader.get();
  const afterBal = await bal(a.buyer);
  line("state", `${after.state} · paid ${after.paid} · buyer token balance ${before} → ${afterBal}`);
  if (after.state === "Settled") {
    const wn = await w.as("buyer").agreement(id).withdrawNear();
    line("withdraw", `buyer · withdraw_near · ${w.explorer ?? ""}/txns/${wn.txHash}`);
  } else process.exitCode = 1;
}
