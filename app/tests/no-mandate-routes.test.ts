// PROGRESS 4.6: no server route accepts a mandate. Every route handler under src/app is scanned for request fields
// named like a mandate's parts; the store has no column for one either.
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../src");
const FORBIDDEN = /\b(mandate|limits|instructions|max_total|min_total|target_total|plaintext|envelope)\b/i;

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return routes(p);
    return f === "route.ts" ? [p] : [];
  });
}

describe("no route accepts a mandate", () => {
  const files = routes(path.join(ROOT, "app"));
  it("finds the API routes", () => {
    expect(files.length).toBeGreaterThan(10);
  });
  for (const f of files) {
    it(path.relative(ROOT, f), () => {
      const code = readFileSync(f, "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      expect(code).not.toMatch(FORBIDDEN);
    });
  }
  it("the store has no mandate column", () => {
    const store = readFileSync(path.join(ROOT, "server/store.ts"), "utf8");
    const schema = store.slice(store.indexOf("const SCHEMA"), store.indexOf("`;", store.indexOf("const SCHEMA")));
    expect(schema).not.toMatch(FORBIDDEN);
  });
});
