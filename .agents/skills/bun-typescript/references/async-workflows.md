# Async, Jobs, And Durable Workflows

## Choose The Primitive

Use the simplest primitive that matches the failure mode:

```text
normal I/O concurrency       -> async/await, pools, bounded concurrency
large fan-out                -> p-limit or a queue with concurrency
CPU-heavy work               -> Bun Workers or worker_threads
process isolation            -> Bun.spawn, child_process, separate service
HTTP server across cores     -> reusePort, process manager, containers, platform scaling
retryable background jobs    -> BullMQ, cloud queues, Trigger.dev
long-running workflows       -> Temporal or Trigger.dev
high-reliability AI agents   -> durable workflow engine
```

Do not move ordinary database, HTTP, or LLM calls into workers just because they are async. Built-in async I/O is already designed for I/O concurrency.

## Bounded Concurrency

Avoid unbounded fan-out over large or untrusted input:

```ts
await Promise.all(items.map(processItem));
```

Prefer a bounded limiter:

```ts
import pLimit from "p-limit";

const limit = pLimit(8);

await Promise.all(items.map((item) => limit(() => processItem(item))));
```

Tune concurrency based on downstream limits: database pools, provider rate limits, queue throughput, and memory.

## Job Envelope

Every retryable job should carry enough metadata for idempotency and observability:

```ts
export type JobEnvelope<TPayload> = {
  jobId: string;
  idempotencyKey: string;
  attempt: number;
  payload: TPayload;
};
```

Use idempotency keys around side effects: emails, payments, external API calls, file writes, and LLM/tool executions.

## Cancellation

Accept and propagate `AbortSignal` through long-running work:

```ts
export async function streamCompletion(input: {
  conversationId: string;
  signal: AbortSignal;
}) {
  // Pass signal into fetch, model provider calls, stream readers, and polling loops.
}
```

Check cancellation between expensive steps and before side effects when the underlying API does not support `AbortSignal`.

## Streams

Normalize external streaming protocols into app-level events:

```ts
export type ChatStreamEvent =
  | { type: "run.started"; runId: string }
  | { type: "message.delta"; text: string }
  | { type: "tool.started"; toolCallId: string; name: string }
  | { type: "tool.finished"; toolCallId: string; outputHash: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "run.failed"; error: string }
  | { type: "run.finished" };
```

Do not leak provider-specific event shapes through the application boundary.


## Durable Workflows

Use Temporal, Trigger.dev, or a comparable engine when the process must survive restarts, wait for external events, retry steps over time, or coordinate multiple side effects.

Keep durable workflow activities idempotent. External side effects may be retried, so activity inputs need stable ids and dedupe keys.
