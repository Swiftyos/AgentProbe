import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startDashboardServer } from "./support.ts";

describe("agentprobe start-server", () => {
  test("boots without OPEN_ROUTER_API_KEY and shuts down on SIGTERM", async () => {
    const root = mkdtempSync(join(tmpdir(), "agentprobe-server-e2e-"));
    const dbPath = join(root, "runs.sqlite3");

    const server = await startDashboardServer({
      dataPath: "data",
      dbPath,
      startupTimeoutMs: 10_000,
    });

    try {
      const health = await fetch(`${server.url}/healthz`);
      const ready = await fetch(`${server.url}/readyz`);

      expect(health.status).toBe(200);
      expect(ready.status).toBe(200);
    } finally {
      await server.stop();
    }

    expect(await server.process.exited).toBe(0);
  });
});
