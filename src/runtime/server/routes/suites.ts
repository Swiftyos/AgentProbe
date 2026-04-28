import type { ServerContext } from "../app-server.ts";
import { errorResponse, jsonResponse } from "../http-helpers.ts";
import { HttpInputError } from "../validation.ts";

export function handleListSuites(
  _request: Request,
  context: ServerContext,
): Response {
  const inventory = context.suiteController.inventory();
  return jsonResponse(
    {
      data_path: inventory.dataPath,
      scanned_at: inventory.scannedAt,
      suites: inventory.suites,
      errors: inventory.errors,
    },
    { requestId: context.requestId },
  );
}

export function handleListAllScenarios(
  _request: Request,
  context: ServerContext,
): Response {
  const inventory = context.suiteController.inventory();
  return jsonResponse(
    {
      scanned_at: inventory.scannedAt,
      scenarios: inventory.scenarios,
    },
    { requestId: context.requestId },
  );
}

export function handleListSuiteScenarios(
  _request: Request,
  context: ServerContext,
  params: { suiteId: string },
): Response {
  const suite = context.suiteController.suite(params.suiteId);
  if (!suite) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Suite \`${params.suiteId}\` was not found.`,
      requestId: context.requestId,
    });
  }
  const scenarios = context.suiteController.scenariosForSuite(params.suiteId);
  return jsonResponse(
    {
      suite,
      scenarios,
    },
    { requestId: context.requestId },
  );
}

export function handleScenarioLookup(
  request: Request,
  context: ServerContext,
): Response {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");
  const id = url.searchParams.get("id");
  if (!file || !id) {
    return errorResponse({
      status: 400,
      type: "bad_request",
      message: "Both `file` and `id` query parameters are required.",
      requestId: context.requestId,
    });
  }
  try {
    const scenario = context.suiteController.scenarioRecord(file, id);
    if (!scenario) {
      const summary = context.suiteController
        .scenarios()
        .find((item) => item.sourcePath === file && item.id === id);
      return errorResponse({
        status: 404,
        type: "NotFound",
        message: summary
          ? `Scenario \`${id}\` from \`${file}\` could not be re-loaded; the inventory may have been invalidated.`
          : `Scenario \`${id}\` was not found in \`${file}\`.`,
        requestId: context.requestId,
      });
    }
    const summary = context.suiteController
      .scenarios()
      .find((item) => item.sourcePath === file && item.id === id);
    return jsonResponse(
      {
        suiteId: summary?.suiteId ?? null,
        sourcePath: file,
        scenario,
      },
      { requestId: context.requestId },
    );
  } catch (error) {
    if (error instanceof HttpInputError) {
      return errorResponse({
        status: error.status,
        type: error.code,
        message: error.message,
        requestId: context.requestId,
      });
    }
    return errorResponse({
      status: 500,
      type: "internal_error",
      message: error instanceof Error ? error.message : String(error),
      requestId: context.requestId,
    });
  }
}
