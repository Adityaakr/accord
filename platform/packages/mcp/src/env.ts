// `.env` from the repository root (values already in the environment win), and the secrets to scrub from output.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export type Env = Record<string, string | undefined>;

export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2]!;
    const q = value[0];
    if ((q === '"' || q === "'") && value.length >= 2 && value.endsWith(q)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "").trim();
    out[m[1]!] = value;
  }
  return out;
}

export function loadDotEnv(env: Env, starts: readonly string[]): void {
  for (const start of starts) {
    let dir = resolve(start);
    for (;;) {
      if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
        const file = join(dir, ".env");
        if (existsSync(file)) {
          for (const [k, v] of Object.entries(parseDotEnv(readFileSync(file, "utf8")))) if (env[k] === undefined) env[k] = v;
        }
        return;
      }
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  }
}

export function secretValues(env: Env): string[] {
  return Object.entries(env)
    .filter(([k, v]) => v && v.length >= 8 && /(_KEY|_SECRET|_SALT|^DATABASE_URL)$/.test(k))
    .map(([, v]) => v!);
}
