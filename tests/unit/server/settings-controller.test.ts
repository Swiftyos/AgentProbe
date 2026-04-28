import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { SqliteRepository } from "../../../src/providers/persistence/sqlite-backend.ts";
import { SettingsController } from "../../../src/runtime/server/controllers/settings-controller.ts";
import {
  createSecretCipher,
  resolveMasterKey,
} from "../../../src/shared/utils/secret-cipher.ts";
import { makeTempDir } from "../support.ts";

async function makeController(): Promise<{
  controller: SettingsController;
  env: NodeJS.ProcessEnv;
  repository: SqliteRepository;
}> {
  const dir = makeTempDir("settings-controller");
  const dbPath = join(dir, "runs.sqlite3");
  const dbUrl = `sqlite:///${dbPath}`;
  const repository = new SqliteRepository(dbUrl);
  await repository.initialize();
  const cipher = createSecretCipher(resolveMasterKey({ sqlitePath: dbPath }));
  const env = {} as NodeJS.ProcessEnv;
  return {
    controller: new SettingsController({ repository, cipher, env }),
    env,
    repository,
  };
}

describe("SettingsController.openRouterApiKey", () => {
  test("reports unconfigured when no DB or env value is set", async () => {
    const { controller } = await makeController();
    const status = await controller.openRouterApiKeyStatus();
    expect(status).toEqual({ configured: false, source: null });
    const resolved = await controller.getOpenRouterApiKey();
    expect(resolved.value).toBeNull();
  });

  test("falls back to environment variable when DB is empty", async () => {
    const { controller, env } = await makeController();
    env.OPEN_ROUTER_API_KEY = "  env-key  ";
    const resolved = await controller.getOpenRouterApiKey();
    expect(resolved).toEqual({ value: "env-key", source: "env" });
  });

  test("DB-stored value takes precedence over env var", async () => {
    const { controller, env } = await makeController();
    env.OPEN_ROUTER_API_KEY = "env-key";
    await controller.setOpenRouterApiKey("db-key");
    const resolved = await controller.getOpenRouterApiKey();
    expect(resolved).toEqual({ value: "db-key", source: "db" });
  });

  test("setOpenRouterApiKey stores ciphertext and round-trips through getOpenRouterApiKey", async () => {
    const { controller, repository } = await makeController();
    await controller.setOpenRouterApiKey("sk-or-secret");
    const stored = await repository.getSecret("open_router_api_key");
    expect(stored).toBeDefined();
    expect(stored?.ciphertext).not.toContain("sk-or-secret");
    const resolved = await controller.getOpenRouterApiKey();
    expect(resolved.value).toBe("sk-or-secret");
  });

  test("clearOpenRouterApiKey removes the stored value", async () => {
    const { controller, repository } = await makeController();
    await controller.setOpenRouterApiKey("sk-or-secret");
    const removed = await controller.clearOpenRouterApiKey();
    expect(removed).toBe(true);
    expect(await repository.getSecret("open_router_api_key")).toBeUndefined();
    const status = await controller.openRouterApiKeyStatus();
    expect(status).toEqual({ configured: false, source: null });
  });

  test("rejects empty values", async () => {
    const { controller } = await makeController();
    await expect(controller.setOpenRouterApiKey("   ")).rejects.toThrow();
  });
});
