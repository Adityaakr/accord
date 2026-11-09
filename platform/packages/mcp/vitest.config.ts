import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests run against the SDK's sources, so they need no build step.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@accord\/sdk\/node$/, replacement: fileURLToPath(new URL("../sdk/src/release-node.ts", import.meta.url)) },
      { find: /^@accord\/sdk$/, replacement: fileURLToPath(new URL("../sdk/src/index.ts", import.meta.url)) },
    ],
  },
  test: { include: ["test/**/*.test.ts"] },
});
