import type { MessagePart } from "../../types.ts";

type Event = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Convert a Vercel AI SDK UIMessage stream (the same shape AutoGPT/Copilot
 * stores in its data-stream events) into an ordered MessagePart[]. Preserves
 * the natural interleaving of reasoning / text / tool calls as emitted by the
 * model.
 *
 * Returns an empty array when the input doesn't look like a UIMessage stream
 * so callers can fall back to flat text + tool-call rendering.
 */
export function partsFromStream(events: Event[]): MessagePart[] {
  type OpenText = { part: MessagePart & { kind: "text" }; id: string };
  type OpenReasoning = {
    part: MessagePart & { kind: "reasoning" };
    id: string;
  };

  const parts: MessagePart[] = [];
  const toolByCallId = new Map<string, MessagePart & { kind: "tool" }>();
  let openText: OpenText | null = null;
  let openReasoning: OpenReasoning | null = null;

  let sawAnyKnownEvent = false;

  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const type = asString(ev.type);
    if (!type) continue;

    switch (type) {
      case "text-start": {
        sawAnyKnownEvent = true;
        const id = asString(ev.id) ?? "";
        const part: MessagePart & { kind: "text" } = { kind: "text", text: "" };
        parts.push(part);
        openText = { part, id };
        break;
      }
      case "text-delta": {
        sawAnyKnownEvent = true;
        const id = asString(ev.id) ?? "";
        const delta = asString(ev.delta) ?? asString(ev.text) ?? "";
        if (openText && (openText.id === id || !id)) {
          openText.part.text += delta;
        }
        break;
      }
      case "text-end":
        sawAnyKnownEvent = true;
        openText = null;
        break;

      case "reasoning-start": {
        sawAnyKnownEvent = true;
        const id = asString(ev.id) ?? "";
        const part: MessagePart & { kind: "reasoning" } = {
          kind: "reasoning",
          text: "",
        };
        parts.push(part);
        openReasoning = { part, id };
        break;
      }
      case "reasoning-delta": {
        sawAnyKnownEvent = true;
        const id = asString(ev.id) ?? "";
        const delta = asString(ev.delta) ?? asString(ev.text) ?? "";
        if (openReasoning && (openReasoning.id === id || !id)) {
          openReasoning.part.text += delta;
        }
        break;
      }
      case "reasoning-end":
        sawAnyKnownEvent = true;
        openReasoning = null;
        break;

      case "tool-input-available": {
        sawAnyKnownEvent = true;
        const toolCallId = asString(ev.toolCallId);
        const name = asString(ev.toolName) ?? "tool";
        const part: MessagePart & { kind: "tool" } = {
          kind: "tool",
          name,
          toolCallId,
          input: ev.input,
        };
        parts.push(part);
        if (toolCallId) toolByCallId.set(toolCallId, part);
        break;
      }
      case "tool-output-available": {
        sawAnyKnownEvent = true;
        const toolCallId = asString(ev.toolCallId);
        if (toolCallId) {
          const existing = toolByCallId.get(toolCallId);
          if (existing) {
            existing.output = ev.output;
          }
        }
        break;
      }
    }
  }

  if (!sawAnyKnownEvent) return [];

  return parts.filter((p) => {
    if (p.kind === "text") return p.text.trim().length > 0;
    if (p.kind === "reasoning") return p.text.trim().length > 0;
    return true;
  });
}

/**
 * Walk the API's targetEvents list and group them by `turn_index`, returning
 * `{ [turn_index]: MessagePart[] }`. Each entry is the in-order parts for
 * that turn's assistant reply, reconstructed from raw_exchange.response.body.
 */
export function partsByTurn(
  targetEvents: Array<Record<string, unknown>>,
): Record<number, MessagePart[]> {
  const out: Record<number, MessagePart[]> = {};
  for (const event of targetEvents ?? []) {
    if (!event || typeof event !== "object") continue;
    const turnIndex = Number(
      (event as Record<string, unknown>).turn_index ?? -1,
    );
    if (!Number.isInteger(turnIndex) || turnIndex < 0) continue;
    const raw = (event as Record<string, unknown>).raw_exchange;
    if (!raw || typeof raw !== "object") continue;
    const response = (raw as Record<string, unknown>).response;
    if (!response || typeof response !== "object") continue;
    const body = (response as Record<string, unknown>).body;
    if (!Array.isArray(body)) continue;
    const parts = partsFromStream(body as Array<Record<string, unknown>>);
    if (parts.length === 0) continue;
    if (out[turnIndex]) {
      out[turnIndex].push(...parts);
    } else {
      out[turnIndex] = parts;
    }
  }
  return out;
}
