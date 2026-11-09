// `make cancel DEAL=<agreement>`: the vendor cancels an agreement that never reached `Executing`, the same call the
// app's stale room sweep makes (app/src/server/demo.ts `vendorCancel`). The contract allows `cancel` to either party
// only in `Sealed` or `Attested`; any other state is reported and left alone.

import { header, line } from "../flow.js";
import type { World } from "../world.js";

export async function run(w: World): Promise<void> {
  const id = process.env.DEAL ?? "";
  if (!id) throw new Error("usage: make cancel DEAL=<agreement account>");
  header("cancel", id, "", w);
  const a = await w.reader.agreement(id).get();
  line("state", `${a.state} · vendor ${a.vendor}`);
  if (a.state !== "Sealed" && a.state !== "Attested") {
    line("skipped", `cancel is allowed only in Sealed or Attested; ${id} is ${a.state}`);
    return;
  }
  if (a.vendor !== w.principals.vendor.account) throw new Error(`${id}'s vendor is ${a.vendor}, not ${w.principals.vendor.account}`);
  const tx = await w.as("vendor").agreement(id).cancel();
  const after = await w.reader.agreement(id).get();
  line("cancel", `vendor · cancel · ${w.explorer ?? ""}/txns/${tx.txHash}`);
  line("state", `${after.state} · the buyer may withdraw the spare NEAR with withdraw_near`);
  if (after.state !== "Cancelled") process.exitCode = 1;
}
