import type { ServerContext } from "../app-server.ts";
import { errorResponse } from "../http-helpers.ts";
import { HttpInputError } from "../validation.ts";

function parseRunIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function handleCompareRuns(
  request: Request,
  context: ServerContext,
): Promise<Response> {
  const url = new URL(request.url);
  const runIds = parseRunIds(url.searchParams.get("run_ids"));
  try {
    const payload = await context.comparisonController.compare(runIds);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
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
    throw error;
  }
}
