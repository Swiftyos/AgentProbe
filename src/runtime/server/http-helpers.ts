import { randomUUID } from "node:crypto";

import { HttpInputError } from "./validation.ts";

export type ErrorEnvelope = {
  error: {
    code: string;
    type: string;
    message: string;
    request_id: string;
    details: Record<string, never>;
  };
};

type ServerHeaders = Record<string, string> | Array<[string, string]>;

type JsonResponseInit = Omit<ResponseInit, "headers"> & {
  headers?: ServerHeaders;
  requestId: string;
};

export function jsonResponse(body: unknown, init: JsonResponseInit): Response {
  const { requestId, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  headers.set("x-request-id", requestId);
  return new Response(JSON.stringify(body), {
    ...rest,
    headers,
  });
}

export function errorResponse(options: {
  status: number;
  type: string;
  message: string;
  requestId: string;
  headers?: ServerHeaders;
}): Response {
  const envelope: ErrorEnvelope = {
    error: {
      code: options.type,
      type: options.type,
      message: options.message,
      request_id: options.requestId,
      details: {},
    },
  };
  return jsonResponse(envelope, {
    status: options.status,
    headers: options.headers,
    requestId: options.requestId,
  });
}

export function routeErrorResponse(
  error: unknown,
  options: {
    requestId: string;
    fallbackType: string;
    fallbackStatus?: number;
    mapConfigErrors?: boolean;
  },
): Response {
  if (error instanceof HttpInputError) {
    return errorResponse({
      status: error.status,
      type: error.code,
      message: error.message,
      requestId: options.requestId,
    });
  }
  if (
    options.mapConfigErrors !== false &&
    error instanceof Error &&
    error.name === "AgentProbeConfigError"
  ) {
    return errorResponse({
      status: 400,
      type: "bad_request",
      message: error.message,
      requestId: options.requestId,
    });
  }
  return errorResponse({
    status: options.fallbackStatus ?? 500,
    type: options.fallbackType,
    message: error instanceof Error ? error.message : String(error),
    requestId: options.requestId,
  });
}

export function ensureRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  if (incoming?.trim()) {
    return incoming.trim();
  }
  return randomUUID();
}

export function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max: number,
): number {
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return fallback;
  }
  return Math.min(value, max);
}
