import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  type StartedServer,
  startAgentProbeServer,
} from "../../../src/runtime/server/app-server.ts";
import { buildServerConfig } from "../../../src/runtime/server/config.ts";
import { makeTempDir } from "../../unit/support.ts";

type SecretStatusResponse = {
  open_router_api_key: { configured: boolean; source: "db" | "env" | null };
};

type SessionResponse = {
  secrets: SecretStatusResponse;
};

const SETTINGS_PATH = "/api/settings/secrets/open_router_api_key";

async function startServer(): Promise<StartedServer> {
  const root = makeTempDir("settings-routes");
  const data = join(root, "data");
  mkdirSync(data, { recursive: true });
  const config = buildServerConfig({
    args: [
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--data",
      data,
      "--db",
      join(root, "runs.sqlite3"),
    ],
    env: {},
  });
  return startAgentProbeServer(config);
}

describe("settings secrets routes", () => {
  const servers: StartedServer[] = [];
  const previousOpenRouterKey = Bun.env.OPEN_ROUTER_API_KEY;

  afterEach(async () => {
    for (const server of servers.splice(0)) {
      await server.stop();
    }
    Bun.env.OPEN_ROUTER_API_KEY = previousOpenRouterKey;
  });

  test("GET reports unconfigured by default", async () => {
    Bun.env.OPEN_ROUTER_API_KEY = "";
    const server = await startServer();
    servers.push(server);
    const response = await fetch(`${server.url}${SETTINGS_PATH}`);
    expect(response.ok).toBe(true);
    const body = (await response.json()) as SecretStatusResponse;
    expect(body.open_router_api_key).toEqual({
      configured: false,
      source: null,
    });
  });

  test("GET reports env source when env var is set", async () => {
    Bun.env.OPEN_ROUTER_API_KEY = "env-secret";
    const server = await startServer();
    servers.push(server);
    const body = (await (
      await fetch(`${server.url}${SETTINGS_PATH}`)
    ).json()) as SecretStatusResponse;
    expect(body.open_router_api_key).toEqual({
      configured: true,
      source: "env",
    });
  });

  test("PUT stores the key, GET reports db source, DELETE clears it", async () => {
    Bun.env.OPEN_ROUTER_API_KEY = "env-secret";
    const server = await startServer();
    servers.push(server);

    const putResponse = await fetch(`${server.url}${SETTINGS_PATH}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "  db-secret  " }),
    });
    expect(putResponse.ok).toBe(true);
    const putBody = (await putResponse.json()) as SecretStatusResponse;
    expect(putBody.open_router_api_key).toEqual({
      configured: true,
      source: "db",
    });

    const session = (await (
      await fetch(`${server.url}/api/session`)
    ).json()) as SessionResponse;
    expect(session.secrets.open_router_api_key).toEqual({
      configured: true,
      source: "db",
    });

    const deleteResponse = await fetch(`${server.url}${SETTINGS_PATH}`, {
      method: "DELETE",
    });
    expect(deleteResponse.ok).toBe(true);
    const deleteBody = (await deleteResponse.json()) as SecretStatusResponse;
    expect(deleteBody.open_router_api_key).toEqual({
      configured: true,
      source: "env",
    });
  });

  test("PUT rejects an empty value", async () => {
    const server = await startServer();
    servers.push(server);
    const response = await fetch(`${server.url}${SETTINGS_PATH}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "" }),
    });
    expect(response.status).toBe(400);
  });
});
