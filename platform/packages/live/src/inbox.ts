// The inbox fixtures (`fixtures/inbox/messages.json`) with the network's real account names: the messages name the
// testnet demo accounts, which `make setup` may suffix and a local node names `*.test.near`.

import { readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot, type World } from "./world.js";

export interface InboxFixture { id: string; sender: string; subject: string; body: string; expect: string }

export function inbox(w: World): Map<string, InboxFixture> {
  const list = JSON.parse(readFileSync(path.join(repoRoot(), "fixtures/inbox/messages.json"), "utf8")) as InboxFixture[];
  const names: [RegExp, string][] = [
    [/\bhalcyon-markets\.testnet\b/g, w.attacker],
    [/\bhalcyon-mm-payments\.testnet\b/g, w.canaries[0] ?? "halcyon-mm-payments.testnet"],
  ];
  return new Map(list.map((m) => {
    let body = m.body;
    for (const [re, name] of names) body = body.replace(re, name);
    return [m.id, { ...m, body }];
  }));
}
