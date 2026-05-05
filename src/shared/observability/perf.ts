import { AsyncLocalStorage } from "node:async_hooks";

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

export class Perf implements PerfTracker {
  private readonly start: number;
  private readonly spans: Span[] = [];

  constructor(start: number = performance.now()) {
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

const NOOP_PERF: PerfTracker = {
  async span<T>(_name: string, fn: () => Promise<T> | T): Promise<T> {
    return await fn();
  },
  mark() {
    /* no-op */
  },
  completed() {
    return [];
  },
};

const perfStorage = new AsyncLocalStorage<PerfTracker>();

export function withPerf<T>(
  perf: PerfTracker,
  fn: () => Promise<T>,
): Promise<T> {
  return perfStorage.run(perf, fn);
}

export function currentPerf(): PerfTracker {
  return perfStorage.getStore() ?? NOOP_PERF;
}

/**
 * Record a span for `fn` against the current request's perf tracker. Outside
 * a request (e.g. background work), this is a no-op pass-through.
 */
export function span<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
  return currentPerf().span(name, fn);
}
