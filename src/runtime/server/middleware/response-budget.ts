import { createMiddleware } from "hono/factory";

export const RESPONSE_BUDGET_MS = 200;

export interface Span {
  name: string;
  startMs: number;
  durationMs: number;
}

export interface PerfTracker {
  span<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
  mark(name: string, durationMs: number): void;
  completed(): readonly Span[];
}

class Perf implements PerfTracker {
  private readonly start: number;
  private readonly spans: Span[] = [];

  constructor(start: number) {
    this.start = start;
  }

  async span<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      this.spans.push({
        name,
        startMs: t0 - this.start,
        durationMs: performance.now() - t0,
      });
    }
  }

  mark(name: string, durationMs: number) {
    this.spans.push({
      name,
      startMs: performance.now() - this.start - durationMs,
      durationMs,
    });
  }

  completed(): readonly Span[] {
    return this.spans;
  }
}

function serverTimingHeader(spans: readonly Span[], totalMs: number): string {
  const parts = spans.map(
    (s) =>
      `${s.name.replace(/[^a-zA-Z0-9_-]/g, "_")};dur=${s.durationMs.toFixed(1)}`,
  );
  parts.push(`total;dur=${totalMs.toFixed(1)}`);
  return parts.join(", ");
}

function formatBreakdown(spans: readonly Span[], elapsedMs: number) {
  const accountedMs = spans.reduce((acc, s) => acc + s.durationMs, 0);
  const unaccountedMs = Math.max(0, elapsedMs - accountedMs);
  const lines = spans.map(
    (s) =>
      `  ${s.name.padEnd(28)} ${s.durationMs.toFixed(1).padStart(7)}ms  (started +${s.startMs.toFixed(1)}ms)`,
  );
  if (lines.length === 0) lines.push("  (no instrumented spans)");
  lines.push(
    `  ${"unaccounted".padEnd(28)} ${unaccountedMs.toFixed(1).padStart(7)}ms  (work outside spans)`,
  );
  return { text: lines.join("\n"), unaccountedMs, accountedMs };
}

export interface BudgetOptions {
  budgetMs?: number;
  skip?: (path: string, method: string) => boolean;
  onExceeded?: (info: {
    path: string;
    method: string;
    elapsedMs: number;
    budgetMs: number;
    spans: readonly Span[];
    unaccountedMs: number;
    breakdown: string;
  }) => void;
}

const defaultOnExceeded: NonNullable<BudgetOptions["onExceeded"]> = (info) => {
  process.stderr.write(
    `[budget] ${info.method} ${info.path} exceeded ${info.budgetMs}ms (took ${info.elapsedMs.toFixed(1)}ms)\n${info.breakdown}\n`,
  );
};

export type ResponseBudgetEnv = {
  Variables: {
    perf: PerfTracker;
  };
};

export function responseBudget(options: BudgetOptions = {}) {
  const budgetMs = options.budgetMs ?? RESPONSE_BUDGET_MS;
  const skip = options.skip;
  const onExceeded = options.onExceeded ?? defaultOnExceeded;

  return createMiddleware<ResponseBudgetEnv>(async (c, next) => {
    if (skip?.(c.req.path, c.req.method)) {
      await next();
      return;
    }

    const start = performance.now();
    const perf = new Perf(start);
    c.set("perf", perf);

    try {
      await next();
    } finally {
      const elapsedMs = performance.now() - start;
      const spans = perf.completed();

      c.header("Server-Timing", serverTimingHeader(spans, elapsedMs));

      if (elapsedMs > budgetMs) {
        const { text, unaccountedMs } = formatBreakdown(spans, elapsedMs);
        onExceeded({
          path: c.req.path,
          method: c.req.method,
          elapsedMs,
          budgetMs,
          spans,
          unaccountedMs,
          breakdown: text,
        });
      } else if (elapsedMs > budgetMs * 0.8) {
        process.stderr.write(
          `[budget] near-miss ${c.req.method} ${c.req.path} ${elapsedMs.toFixed(0)}ms (budget ${budgetMs}ms)\n`,
        );
      }
    }
  });
}
