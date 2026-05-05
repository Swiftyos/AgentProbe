import type { ServerContext } from "../app-server.ts";
import { jsonResponse, routeErrorResponse } from "../http-helpers.ts";
import { readJsonObject } from "../validation.ts";

function decodePath(raw: string): string {
  return decodeURIComponent(raw);
}

export async function handleListEndpointOverrides(
  _request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    const overrides = await context.endpointOverridesController.list();
    return jsonResponse({ overrides }, { requestId: context.requestId });
  } catch (error) {
    return mapError(error, context.requestId);
  }
}

export async function handleGetEndpointOverride(
  _request: Request,
  context: ServerContext,
  params: { endpointPath: string },
): Promise<Response> {
  try {
    const result = await context.endpointOverridesController.get(
      decodePath(params.endpointPath),
    );
    return jsonResponse(result, { requestId: context.requestId });
  } catch (error) {
    return mapError(error, context.requestId);
  }
}

export async function handlePutEndpointOverride(
  request: Request,
  context: ServerContext,
  params: { endpointPath: string },
): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const override = await context.endpointOverridesController.upsert(
      decodePath(params.endpointPath),
      body,
    );
    return jsonResponse({ override }, { requestId: context.requestId });
  } catch (error) {
    return mapError(error, context.requestId);
  }
}

export async function handleDeleteEndpointOverride(
  _request: Request,
  context: ServerContext,
  params: { endpointPath: string },
): Promise<Response> {
  try {
    const removed = await context.endpointOverridesController.delete(
      decodePath(params.endpointPath),
    );
    return jsonResponse({ removed }, { requestId: context.requestId });
  } catch (error) {
    return mapError(error, context.requestId);
  }
}

function mapError(error: unknown, requestId: string): Response {
  return routeErrorResponse(error, {
    requestId,
    fallbackType: "endpoint_overrides_error",
  });
}
