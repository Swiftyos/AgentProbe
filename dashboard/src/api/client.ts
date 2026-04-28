import { useCallback } from "react";
import type { ServerRequest } from "./types.ts";

export const SERVER_TOKEN_KEY = "agentprobe:server-token";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function readStoredToken(): string {
  try {
    return window.sessionStorage.getItem(SERVER_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredToken(token: string): void {
  try {
    if (token) {
      window.sessionStorage.setItem(SERVER_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SERVER_TOKEN_KEY);
    }
  } catch {
    // Storage can be unavailable in locked-down browser contexts.
  }
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

export async function api<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  const incomingHeaders = new Headers(init.headers);
  for (const [key, value] of incomingHeaders.entries()) {
    headers[key] = value;
  }
  if (token) headers.authorization = `Bearer ${token}`;

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

export function useServerRequest(
  token: string,
  onAuthRequired: () => void,
): ServerRequest {
  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      try {
        return await api<T>(path, token, init);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onAuthRequired();
        }
        throw error;
      }
    },
    [token, onAuthRequired],
  );
}
