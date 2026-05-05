import { createRecordingRepository } from "../../providers/persistence/factory.ts";
import { resolveSqlitePath } from "../../providers/persistence/sqlite-connection.ts";
import type {
  PersistenceRepository,
  RecordingRepository,
} from "../../providers/persistence/types.ts";
import {
  AgentProbeConfigError,
  AgentProbeRuntimeError,
} from "../../shared/utils/errors.ts";
import {
  createSecretCipher,
  resolveMasterKey,
} from "../../shared/utils/secret-cipher.ts";
import type { ServerConfig } from "./config.ts";
import {
  type ComparisonController,
  createComparisonController,
} from "./controllers/comparison-controller.ts";
import { EndpointOverridesController } from "./controllers/endpoint-overrides-controller.ts";
import { PresetController } from "./controllers/preset-controller.ts";
import { RunController } from "./controllers/run-controller.ts";
import { SettingsController } from "./controllers/settings-controller.ts";
import { SuiteController } from "./controllers/suite-controller.ts";
import {
  logDefaultPresetSeedResults,
  seedDefaultPresets,
} from "./default-presets.ts";
import { ensureRequestId, errorResponse } from "./http-helpers.ts";
import { handleCompareRuns } from "./routes/comparisons.ts";
import {
  handleDeleteEndpointOverride,
  handleGetEndpointOverride,
  handleListEndpointOverrides,
  handlePutEndpointOverride,
} from "./routes/endpoint-overrides.ts";
import { handleHealthz, handleReadyz, handleSession } from "./routes/health.ts";
import {
  handleCreatePreset,
  handleCreatePresetFromRun,
  handleDeletePreset,
  handleGetPreset,
  handleListPresets,
  handlePresetRuns,
  handleStartPresetRun,
  handleUpdatePreset,
} from "./routes/presets.ts";
import { handleRunReport } from "./routes/reports.ts";
import {
  handleCancelRun,
  handleGetRun,
  handleGetScenarioRun,
  handleListRuns,
  handlePatchRun,
  handleStartRun,
} from "./routes/runs.ts";
import {
  handleDeleteOpenRouterApiKey,
  handleGetOpenRouterStatus,
  handlePutOpenRouterApiKey,
} from "./routes/settings.ts";
import { handleRunSse } from "./routes/sse.ts";
import { handleStatic } from "./routes/static.ts";
import {
  handleListAllScenarios,
  handleListSuiteScenarios,
  handleListSuites,
  handleScenarioLookup,
} from "./routes/suites.ts";
import { StreamHub } from "./streams/hub.ts";

export const SERVER_VERSION = "0.1.0";

export type ServerContext = {
  config: ServerConfig;
  presetController: PresetController;
  runController: RunController;
  suiteController: SuiteController;
  comparisonController: ComparisonController;
  settingsController: SettingsController;
  endpointOverridesController: EndpointOverridesController;
  repository: PersistenceRepository;
  streamHub: StreamHub;
  requestId: string;
  startedAt: number;
  version: string;
};

export type StartedServer = {
  url: string;
  hostname: string;
  port: number;
  streamHub: StreamHub;
  suiteController: SuiteController;
  stop: () => Promise<void>;
};

type RouteHandler = (
  request: Request,
  context: ServerContext,
  params: Record<string, string>,
) => Response | Promise<Response>;

type Route = {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
};

function compileRoute(
  method: string,
  path: string,
  handler: RouteHandler,
): Route {
  const paramNames: string[] = [];
  const regexSource = path.replace(/:([a-zA-Z_]+)/g, (_match, name: string) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return {
    method,
    pattern: new RegExp(`^${regexSource}$`),
    paramNames,
    handler,
  };
}

function buildRoutes(): Route[] {
  return [
    compileRoute("GET", "/healthz", handleHealthz),
    compileRoute("GET", "/readyz", handleReadyz),
    compileRoute("GET", "/api/session", handleSession),
    compileRoute("GET", "/api/suites", handleListSuites),
    compileRoute(
      "GET",
      "/api/suites/:suiteId/scenarios",
      (request, context, params) =>
        handleListSuiteScenarios(request, context, {
          suiteId: params.suiteId ?? "",
        }),
    ),
    compileRoute("GET", "/api/scenarios", handleListAllScenarios),
    compileRoute("GET", "/api/scenarios/lookup", handleScenarioLookup),
    compileRoute("GET", "/api/runs", handleListRuns),
    compileRoute("POST", "/api/runs", handleStartRun),
    compileRoute("GET", "/api/runs/:runId", (request, context, params) =>
      handleGetRun(request, context, { runId: params.runId ?? "" }),
    ),
    compileRoute("PATCH", "/api/runs/:runId", (request, context, params) =>
      handlePatchRun(request, context, { runId: params.runId ?? "" }),
    ),
    compileRoute(
      "POST",
      "/api/runs/:runId/cancel",
      (request, context, params) =>
        handleCancelRun(request, context, { runId: params.runId ?? "" }),
    ),
    compileRoute(
      "GET",
      "/api/runs/:runId/scenarios/:ordinal",
      (request, context, params) =>
        handleGetScenarioRun(request, context, {
          runId: params.runId ?? "",
          ordinal: params.ordinal ?? "",
        }),
    ),
    compileRoute("GET", "/api/runs/:runId/events", (request, context, params) =>
      handleRunSse(request, context, { runId: params.runId ?? "" }),
    ),
    compileRoute(
      "GET",
      "/api/runs/:runId/report.html",
      (request, context, params) =>
        handleRunReport(request, context, { runId: params.runId ?? "" }),
    ),
    compileRoute("GET", "/api/comparisons", (request, context) =>
      handleCompareRuns(request, context),
    ),
    compileRoute("GET", "/api/presets", handleListPresets),
    compileRoute("POST", "/api/presets", handleCreatePreset),
    compileRoute(
      "POST",
      "/api/runs/:runId/save-as-preset",
      (request, context, params) =>
        handleCreatePresetFromRun(request, context, {
          runId: params.runId ?? "",
        }),
    ),
    compileRoute("GET", "/api/presets/:presetId", (request, context, params) =>
      handleGetPreset(request, context, { presetId: params.presetId ?? "" }),
    ),
    compileRoute("PUT", "/api/presets/:presetId", (request, context, params) =>
      handleUpdatePreset(request, context, {
        presetId: params.presetId ?? "",
      }),
    ),
    compileRoute(
      "DELETE",
      "/api/presets/:presetId",
      (request, context, params) =>
        handleDeletePreset(request, context, {
          presetId: params.presetId ?? "",
        }),
    ),
    compileRoute(
      "GET",
      "/api/presets/:presetId/runs",
      (request, context, params) =>
        handlePresetRuns(request, context, { presetId: params.presetId ?? "" }),
    ),
    compileRoute(
      "POST",
      "/api/presets/:presetId/runs",
      (request, context, params) =>
        handleStartPresetRun(request, context, {
          presetId: params.presetId ?? "",
        }),
    ),
    compileRoute(
      "GET",
      "/api/settings/secrets/open_router_api_key",
      handleGetOpenRouterStatus,
    ),
    compileRoute(
      "PUT",
      "/api/settings/secrets/open_router_api_key",
      handlePutOpenRouterApiKey,
    ),
    compileRoute(
      "DELETE",
      "/api/settings/secrets/open_router_api_key",
      handleDeleteOpenRouterApiKey,
    ),
    compileRoute("GET", "/api/endpoint-overrides", handleListEndpointOverrides),
    compileRoute(
      "GET",
      "/api/endpoint-overrides/:endpointPath",
      (request, context, params) =>
        handleGetEndpointOverride(request, context, {
          endpointPath: params.endpointPath ?? "",
        }),
    ),
    compileRoute(
      "PUT",
      "/api/endpoint-overrides/:endpointPath",
      (request, context, params) =>
        handlePutEndpointOverride(request, context, {
          endpointPath: params.endpointPath ?? "",
        }),
    ),
    compileRoute(
      "DELETE",
      "/api/endpoint-overrides/:endpointPath",
      (request, context, params) =>
        handleDeleteEndpointOverride(request, context, {
          endpointPath: params.endpointPath ?? "",
        }),
    ),
  ];
}

function matchRoute(
  routes: Route[],
  method: string,
  pathname: string,
): { route: Route; params: Record<string, string> } | undefined {
  for (const route of routes) {
    if (route.method !== method && route.method !== "*") {
      continue;
    }
    const match = route.pattern.exec(pathname);
    if (!match) {
      continue;
    }
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = match[index + 1] ?? "";
    });
    return { route, params };
  }
  return undefined;
}

const GZIP_MIN_BYTES = 1024;
const GZIP_COMPRESSIBLE_TYPE = /^(application\/(json|javascript|xml)|text\/)/i;

/**
 * Bun.serve does not auto-compress responses. Run-detail payloads can be
 * many MB of JSON, so we gzip eligible responses here. SSE streams and
 * already-encoded responses pass through untouched.
 */
async function maybeGzip(
  request: Request,
  response: Response,
): Promise<Response> {
  if (!request.headers.get("accept-encoding")?.toLowerCase().includes("gzip")) {
    return response;
  }
  if (!response.body || response.status === 204 || response.status === 304) {
    return response;
  }
  if (response.headers.get("content-encoding")) {
    return response;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!GZIP_COMPRESSIBLE_TYPE.test(contentType)) {
    return response;
  }
  if (contentType.toLowerCase().includes("text/event-stream")) {
    return response;
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < GZIP_MIN_BYTES) {
    const headers = new Headers(response.headers);
    headers.append("vary", "Accept-Encoding");
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  const compressed = Bun.gzipSync(new Uint8Array(buffer));
  const headers = new Headers(response.headers);
  headers.set("content-encoding", "gzip");
  headers.set("content-length", String(compressed.byteLength));
  headers.append("vary", "Accept-Encoding");
  return new Response(compressed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function logRequest(
  config: ServerConfig,
  request: Request,
  response: Response,
  durationMs: number,
  requestId: string,
): void {
  const pathname = new URL(request.url).pathname;
  if (config.logFormat === "json") {
    const payload = {
      ts: new Date().toISOString(),
      level: "info",
      component: "agentprobe.server",
      method: request.method,
      path: pathname,
      status: response.status,
      duration_ms: Math.round(durationMs),
      request_id: requestId,
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  process.stderr.write(
    `[server] ${request.method} ${pathname} -> ${response.status} (${durationMs.toFixed(
      1,
    )}ms) rid=${requestId}\n`,
  );
}

export async function startAgentProbeServer(
  config: ServerConfig,
): Promise<StartedServer> {
  const repository: RecordingRepository = createRecordingRepository(
    config.dbUrl,
  );
  await repository.initialize();

  const masterKey = resolveMasterKey({
    backendKind: repository.kind,
    sqlitePath:
      repository.kind === "sqlite"
        ? resolveSqlitePath(config.dbUrl)
        : undefined,
  });
  const cipher = createSecretCipher(masterKey);
  const settingsController = new SettingsController({ repository, cipher });

  const suiteController = new SuiteController({ dataPath: config.dataPath });
  // Warm cache and surface directory errors early.
  suiteController.inventory();
  logDefaultPresetSeedResults(
    await seedDefaultPresets({ repository, suiteController }),
    { logFormat: config.logFormat },
  );

  const streamHub = new StreamHub();
  const presetController = new PresetController({
    repository,
    suiteController,
  });
  const endpointOverridesController = new EndpointOverridesController({
    repository,
    suiteController,
  });
  const runController = new RunController({
    repository,
    suiteController,
    streamHub,
    settingsController,
    endpointOverridesController,
  });
  const comparisonController = createComparisonController({
    repository,
    categoryLookup: (scenarioId, fileHint) => {
      if (fileHint) {
        const direct = suiteController.scenarioRecord(fileHint, scenarioId);
        if (direct?.category) return direct.category;
      }
      for (const summary of suiteController.scenarios()) {
        if (summary.id !== scenarioId) continue;
        const record = suiteController.scenarioRecord(
          summary.sourcePath,
          scenarioId,
        );
        if (record?.category) return record.category;
      }
      return null;
    },
  });
  const routes = buildRoutes();
  const startedAt = Date.now();

  const baseContext = {
    config,
    presetController,
    runController,
    suiteController,
    comparisonController,
    settingsController,
    endpointOverridesController,
    repository,
    streamHub,
    startedAt,
    version: SERVER_VERSION,
  };

  const fetchHandler = async (request: Request): Promise<Response> => {
    const requestId = ensureRequestId(request);
    const url = new URL(request.url);
    const t0 = performance.now();
    let response: Response;
    const context: ServerContext = { ...baseContext, requestId };
    try {
      const matched = matchRoute(routes, request.method, url.pathname);
      if (matched) {
        response = await matched.route.handler(
          request,
          context,
          matched.params,
        );
      } else {
        response = await handleStatic(request, context);
      }
    } catch (error) {
      if (error instanceof AgentProbeConfigError) {
        response = errorResponse({
          status: 400,
          type: "ConfigurationError",
          message: error.message,
          requestId,
        });
      } else if (error instanceof AgentProbeRuntimeError) {
        response = errorResponse({
          status: 500,
          type: "RuntimeError",
          message: error.message,
          requestId,
        });
      } else {
        response = errorResponse({
          status: 500,
          type: "InternalServerError",
          message: error instanceof Error ? error.message : String(error),
          requestId,
        });
      }
    }

    const finalResponse = await maybeGzip(request, response);
    logRequest(
      config,
      request,
      finalResponse,
      performance.now() - t0,
      requestId,
    );
    return finalResponse;
  };

  const server = Bun.serve({
    hostname: config.host,
    port: config.port,
    fetch: fetchHandler,
  });

  const stop = async (): Promise<void> => {
    await runController.cancelAllAndWait(5_000);
    server.stop(true);
    await repository.close?.();
  };

  const hostname = server.hostname ?? config.host;
  const port = server.port ?? config.port;
  const url = `http://${hostname}:${port}`;

  return {
    url,
    hostname,
    port,
    streamHub,
    suiteController,
    stop,
  };
}
