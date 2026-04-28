import { redactDbUrl } from "../../../providers/persistence/url.ts";
import type { ServerContext } from "../app-server.ts";
import { jsonResponse } from "../http-helpers.ts";

export function handleHealthz(
  _request: Request,
  context: ServerContext,
): Response {
  return jsonResponse(
    {
      status: "ok",
      version: context.version,
      uptime_seconds: Math.round((Date.now() - context.startedAt) / 1000),
    },
    { requestId: context.requestId },
  );
}

export async function handleSession(
  _request: Request,
  context: ServerContext,
): Promise<Response> {
  const openRouter = await context.settingsController.openRouterApiKeyStatus();
  return jsonResponse(
    {
      version: context.version,
      auth_required: Boolean(context.config.token),
      db: {
        backend: context.repository.kind,
        url: context.config.dbUrl ? redactDbUrl(context.config.dbUrl) : null,
      },
      secrets: {
        open_router_api_key: openRouter,
      },
    },
    { requestId: context.requestId },
  );
}

export function handleReadyz(
  _request: Request,
  context: ServerContext,
): Response {
  try {
    context.suiteController.inventory();
    return jsonResponse(
      {
        status: "ready",
        data_path: context.config.dataPath,
        db_url: context.config.dbUrl ? redactDbUrl(context.config.dbUrl) : null,
        db_backend: context.repository.kind,
      },
      { requestId: context.requestId },
    );
  } catch (error) {
    return jsonResponse(
      {
        status: "not_ready",
        reason: error instanceof Error ? error.message : String(error),
      },
      { status: 503, requestId: context.requestId },
    );
  }
}
