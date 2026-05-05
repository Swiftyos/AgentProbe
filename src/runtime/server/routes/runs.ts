import type { RunRecord } from "../../../shared/types/contracts.ts";
import type { ServerContext } from "../app-server.ts";
import {
  errorResponse,
  jsonResponse,
  parsePositiveInt,
} from "../http-helpers.ts";
import { HttpInputError, readJsonObject } from "../validation.ts";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function handleListRuns(
  request: Request,
  context: ServerContext,
): Promise<Response> {
  if (!context.config.dbUrl) {
    return jsonResponse(
      { runs: [], total: 0, next_cursor: null },
      { requestId: context.requestId },
    );
  }

  const url = new URL(request.url);
  const limit = parsePositiveInt(
    url.searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  const offset = parsePositiveInt(
    url.searchParams.get("offset"),
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const filters = {
    status: url.searchParams.get("status"),
    preset: url.searchParams.get("preset"),
    presetId: url.searchParams.get("preset_id"),
    trigger: url.searchParams.get("trigger"),
    suiteFingerprint: url.searchParams.get("suite_fingerprint"),
  };

  try {
    const [runs, total] = await Promise.all([
      context.repository.listRuns({ limit, offset, ...filters }),
      context.repository.countRuns(filters),
    ]);
    const nextOffset = offset + runs.length;
    return jsonResponse(
      {
        runs,
        total,
        limit,
        offset,
        next_cursor: nextOffset < total ? String(nextOffset) : null,
      },
      { requestId: context.requestId },
    );
  } catch (error) {
    return errorResponse({
      status: 500,
      type: "PersistenceError",
      message: error instanceof Error ? error.message : String(error),
      requestId: context.requestId,
    });
  }
}

export async function handleStartRun(
  request: Request,
  context: ServerContext,
): Promise<Response> {
  try {
    await context.runController.assertRunnable();
    const spec = await context.runController.specFromRunRequest(request);
    const result = await context.runController.start(spec);
    return jsonResponse(
      {
        run_id: result.runId,
        status: result.status,
      },
      { status: 202, requestId: context.requestId },
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
    if (error instanceof Error && error.name === "AgentProbeConfigError") {
      return errorResponse({
        status: 400,
        type: "bad_request",
        message: error.message,
        requestId: context.requestId,
      });
    }
    const message = error instanceof Error ? error.message : String(error);
    const isConflict = /unique constraint/i.test(message);
    return errorResponse({
      status: isConflict ? 409 : 500,
      type: isConflict ? "conflict" : "run_start_failed",
      message,
      requestId: context.requestId,
    });
  }
}

export function handleCancelRun(
  _request: Request,
  context: ServerContext,
  params: { runId: string },
): Response {
  try {
    const result = context.runController.cancel(params.runId);
    return jsonResponse(result, {
      status: 202,
      requestId: context.requestId,
    });
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
      type: "cancel_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId: context.requestId,
    });
  }
}

export async function handleGetRun(
  _request: Request,
  context: ServerContext,
  params: { runId: string },
): Promise<Response> {
  if (!context.config.dbUrl) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Run \`${params.runId}\` was not found (no database configured).`,
      requestId: context.requestId,
    });
  }

  let run: RunRecord | undefined;
  try {
    run = await context.repository.getRun(params.runId);
  } catch (error) {
    return errorResponse({
      status: 500,
      type: "PersistenceError",
      message: error instanceof Error ? error.message : String(error),
      requestId: context.requestId,
    });
  }
  if (!run) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Run \`${params.runId}\` was not found.`,
      requestId: context.requestId,
    });
  }
  return jsonResponse({ run }, { requestId: context.requestId });
}

function nullableStringField(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
): { present: boolean; value: string | null } {
  if (!Object.hasOwn(body, key)) {
    return { present: false, value: null };
  }
  const raw = body[key];
  if (raw === null) {
    return { present: true, value: null };
  }
  if (typeof raw !== "string") {
    throw new HttpInputError(
      400,
      "bad_request",
      `${key} must be a string or null.`,
    );
  }
  const trimmed = raw.trim();
  if (trimmed.length > maxLength) {
    throw new HttpInputError(
      400,
      "bad_request",
      `${key} must be ${maxLength} characters or fewer.`,
    );
  }
  return { present: true, value: trimmed.length === 0 ? null : trimmed };
}

export async function handlePatchRun(
  request: Request,
  context: ServerContext,
  params: { runId: string },
): Promise<Response> {
  if (!context.config.dbUrl) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Run \`${params.runId}\` was not found (no database configured).`,
      requestId: context.requestId,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(request);
  } catch (error) {
    if (error instanceof HttpInputError) {
      return errorResponse({
        status: error.status,
        type: error.code,
        message: error.message,
        requestId: context.requestId,
      });
    }
    throw error;
  }

  let label: { present: boolean; value: string | null };
  let notes: { present: boolean; value: string | null };
  try {
    label = nullableStringField(body, "label", 200);
    notes = nullableStringField(body, "notes", 4000);
  } catch (error) {
    if (error instanceof HttpInputError) {
      return errorResponse({
        status: error.status,
        type: error.code,
        message: error.message,
        requestId: context.requestId,
      });
    }
    throw error;
  }

  if (!label.present && !notes.present) {
    return errorResponse({
      status: 400,
      type: "bad_request",
      message: "Provide at least one of `label` or `notes`.",
      requestId: context.requestId,
    });
  }

  const patch: { label?: string | null; notes?: string | null } = {};
  if (label.present) {
    patch.label = label.value;
  }
  if (notes.present) {
    patch.notes = notes.value;
  }

  let run: RunRecord | undefined;
  try {
    run = await context.repository.updateRunMetadata(params.runId, patch);
  } catch (error) {
    return errorResponse({
      status: 500,
      type: "PersistenceError",
      message: error instanceof Error ? error.message : String(error),
      requestId: context.requestId,
    });
  }

  if (!run) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Run \`${params.runId}\` was not found.`,
      requestId: context.requestId,
    });
  }
  return jsonResponse({ run }, { requestId: context.requestId });
}

export async function handleGetScenarioRun(
  _request: Request,
  context: ServerContext,
  params: { runId: string; ordinal: string },
): Promise<Response> {
  if (!context.config.dbUrl) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Run \`${params.runId}\` was not found (no database configured).`,
      requestId: context.requestId,
    });
  }

  const ordinal = Number(params.ordinal);
  if (!Number.isInteger(ordinal) || ordinal < 0) {
    return errorResponse({
      status: 400,
      type: "BadRequest",
      message: `Scenario ordinal must be a non-negative integer (got \`${params.ordinal}\`).`,
      requestId: context.requestId,
    });
  }

  let run: RunRecord | undefined;
  try {
    run = await context.repository.getRun(params.runId);
  } catch (error) {
    return errorResponse({
      status: 500,
      type: "PersistenceError",
      message: error instanceof Error ? error.message : String(error),
      requestId: context.requestId,
    });
  }
  if (!run) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Run \`${params.runId}\` was not found.`,
      requestId: context.requestId,
    });
  }
  const scenario = run.scenarios.find((item) => item.ordinal === ordinal);
  if (!scenario) {
    return errorResponse({
      status: 404,
      type: "NotFound",
      message: `Scenario ordinal ${ordinal} was not found for run \`${params.runId}\`.`,
      requestId: context.requestId,
    });
  }
  return jsonResponse(
    {
      run: {
        runId: run.runId,
        status: run.status,
        passed: run.passed,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      },
      scenario,
    },
    { requestId: context.requestId },
  );
}
