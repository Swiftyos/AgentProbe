import type { ServerContext } from "../app-server.ts";
import {
  errorResponse,
  jsonResponse,
  routeErrorResponse,
} from "../http-helpers.ts";
import { readJsonObject, readOptionalJsonObject } from "../validation.ts";

function routeError(error: unknown, requestId: string): Response {
  return routeErrorResponse(error, {
    requestId,
    fallbackType: "bad_request",
  });
}

export async function handleListPresets(
  _request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    return jsonResponse(
      { presets: await context.presetController.list() },
      { requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleGetPreset(
  _request: Request,
  context: ServerContext,
  params: { presetId: string },
): Promise<Response> {
  try {
    const result = await context.presetController.get(params.presetId);
    if (!result) {
      return errorResponse({
        status: 404,
        type: "not_found",
        message: `Preset \`${params.presetId}\` was not found.`,
        requestId: context.requestId,
      });
    }
    return jsonResponse(result, { requestId: context.requestId });
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleCreatePreset(
  request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const preset = await context.presetController.create(body);
    return jsonResponse(
      { preset },
      { status: 201, requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleUpdatePreset(
  request: Request,
  context: ServerContext,
  params: { presetId: string },
): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const preset = await context.presetController.update(params.presetId, body);
    if (!preset) {
      return errorResponse({
        status: 404,
        type: "not_found",
        message: `Preset \`${params.presetId}\` was not found.`,
        requestId: context.requestId,
      });
    }
    return jsonResponse({ preset }, { requestId: context.requestId });
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleDeletePreset(
  _request: Request,
  context: ServerContext,
  params: { presetId: string },
): Promise<Response> {
  try {
    const preset = await context.presetController.delete(params.presetId);
    if (!preset) {
      return errorResponse({
        status: 404,
        type: "not_found",
        message: `Preset \`${params.presetId}\` was not found.`,
        requestId: context.requestId,
      });
    }
    return jsonResponse({ preset }, { requestId: context.requestId });
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handlePresetRuns(
  _request: Request,
  context: ServerContext,
  params: { presetId: string },
): Promise<Response> {
  try {
    const runs = await context.presetController.runs(params.presetId);
    if (!runs) {
      return errorResponse({
        status: 404,
        type: "not_found",
        message: `Preset \`${params.presetId}\` was not found.`,
        requestId: context.requestId,
      });
    }
    return jsonResponse({ runs }, { requestId: context.requestId });
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleCreatePresetFromRun(
  request: Request,
  context: ServerContext,
  params: { runId: string },
): Promise<Response> {
  try {
    const body = await readOptionalJsonObject(request);
    const preset = await context.presetController.createFromRun(
      params.runId,
      body,
    );
    return jsonResponse(
      { preset },
      { status: 201, requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}

export async function handleStartPresetRun(
  request: Request,
  context: ServerContext,
  params: { presetId: string },
): Promise<Response> {
  try {
    await context.runController.assertRunnable();
    const spec = await context.runController.specFromPresetRunRequest(
      params.presetId,
      request,
    );
    const result = await context.runController.start(spec);
    return jsonResponse(
      { run_id: result.runId, status: result.status },
      { status: 202, requestId: context.requestId },
    );
  } catch (error) {
    return routeError(error, context.requestId);
  }
}
