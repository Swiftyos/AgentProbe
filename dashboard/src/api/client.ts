import { useCallback } from "react";
import type { ServerRequest } from "./types.ts";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  const incomingHeaders = new Headers(init.headers);
  for (const [key, value] of incomingHeaders.entries()) {
    headers[key] = value;
  }

  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessageFromBody(body, `HTTP ${response.status}`),
    );
  }
  return body as T;
}

export function jsonBody(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export function useServerRequest(): ServerRequest {
  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      return await api<T>(path, init);
    },
    [],
  );
}
