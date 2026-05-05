import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ApiError, api, jsonBody } from "../../dashboard/src/api/client.ts";
import { useDashboard } from "../../dashboard/src/hooks/useDashboard.ts";

let root: Root | undefined;
let container: HTMLDivElement;
let browser: Window;
let intervalCallback: (() => void) | undefined;
let clearedInterval = false;

const originalGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  HTMLElement: globalThis.HTMLElement,
  fetch: globalThis.fetch,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  IS_REACT_ACT_ENVIRONMENT: (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT,
};

function installDom(): void {
  browser = new Window({ url: "http://localhost/" });
  container = browser.document.createElement("div");
  browser.document.body.append(container);
  Object.defineProperty(globalThis, "window", {
    value: browser,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: browser.document,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: browser.navigator,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    value: browser.HTMLElement,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
    writable: true,
  });
}

function restoreDom(): void {
  browser?.close();
  Object.defineProperty(globalThis, "window", {
    value: originalGlobals.window,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: originalGlobals.document,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: originalGlobals.navigator,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    value: originalGlobals.HTMLElement,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: originalGlobals.IS_REACT_ACT_ENVIRONMENT,
    configurable: true,
    writable: true,
  });
  globalThis.fetch = originalGlobals.fetch;
  globalThis.setInterval = originalGlobals.setInterval;
  globalThis.clearInterval = originalGlobals.clearInterval;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function flush(): Promise<void> {
  await act(async () => {
    await browser.happyDOM.whenAsyncComplete();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function DashboardProbe() {
  const { data, error } = useDashboard();
  return (
    <output>
      {data ? `${data.done}/${data.total}` : "no-data"}
      {error ? `:${error}` : ""}
    </output>
  );
}

beforeEach(() => {
  intervalCallback = undefined;
  clearedInterval = false;
  installDom();
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = undefined;
  restoreDom();
});

describe("dashboard API client", () => {
  test("merges JSON headers and parses successful responses", async () => {
    const seenHeaders: Record<string, string> = {};
    globalThis.fetch = (async (_input, init) => {
      for (const [key, value] of new Headers(init?.headers).entries()) {
        seenHeaders[key] = value;
      }
      return jsonResponse({ ok: true });
    }) as typeof fetch;

    await expect(
      api<{ ok: boolean }>("/api/example", jsonBody("POST", { hello: true })),
    ).resolves.toEqual({ ok: true });
    expect(seenHeaders.accept).toBe("application/json");
    expect(seenHeaders["content-type"]).toBe("application/json");
  });

  test("throws ApiError with server envelope message", async () => {
    globalThis.fetch = (async () =>
      jsonResponse(
        { error: { message: "Selection requires file and id." } },
        400,
      )) as typeof fetch;

    try {
      await api("/api/example");
      throw new Error("api() should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
      expect((error as Error).message).toBe("Selection requires file and id.");
    }
  });
});

describe("useDashboard live polling", () => {
  test("stops polling after all_done and clears the interval on unmount", async () => {
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount += 1;
      return jsonResponse({
        total: 1,
        elapsed: 0,
        passed: 1,
        failed: 0,
        errored: 0,
        running: 0,
        done: 1,
        all_done: true,
        scenarios: [],
        details: {},
        averages: [],
      });
    }) as typeof fetch;
    globalThis.setInterval = ((callback: () => void) => {
      intervalCallback = callback;
      return 123 as never;
    }) as typeof setInterval;
    globalThis.clearInterval = (() => {
      clearedInterval = true;
    }) as typeof clearInterval;

    await act(async () => {
      root = createRoot(container);
      root.render(<DashboardProbe />);
    });
    await flush();
    expect(container.textContent).toContain("1/1");

    intervalCallback?.();
    await flush();
    expect(fetchCount).toBe(1);

    await act(async () => {
      root?.unmount();
    });
    expect(clearedInterval).toBe(true);
  });
});
