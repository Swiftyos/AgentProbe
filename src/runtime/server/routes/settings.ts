import type { ServerContext } from "../app-server.ts";
import { errorResponse, jsonResponse } from "../http-helpers.ts";
import { HttpInputError, readJsonObject } from "../validation.ts";

function routeError(error: unknown, requestId: string): Response {
  if (error instanceof HttpInputError) {
    return errorResponse({
      status: error.status,
      type: error.code,
      message: error.message,
      requestId,
    });
  }
  return errorResponse({
    status: 500,
    type: "internal_error",
    message: error instanceof Error ? error.message : String(error),
    requestId,
  });
}

export async function handleGetOpenRouterStatus(
  _request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    const status = await context.settingsController.openRouterApiKeyStatus();
    return jsonResponse(
      { open_router_api_key: status },
      { requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handlePutOpenRouterApiKey(
  request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const raw = body.value;
    if (typeof raw !== "string" || !raw.trim()) {
      throw new HttpInputError(
        400,
        "bad_request",
        "`value` must be a non-empty string.",
      );
    }
    await context.settingsController.setOpenRouterApiKey(raw);
    const status = await context.settingsController.openRouterApiKeyStatus();
    return jsonResponse(
      { open_router_api_key: status },
      { requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleDeleteOpenRouterApiKey(
  _request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    await context.settingsController.clearOpenRouterApiKey();
    const status = await context.settingsController.openRouterApiKeyStatus();
    return jsonResponse(
      { open_router_api_key: status },
      { requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}
