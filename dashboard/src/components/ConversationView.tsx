import type { ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import type {
  Checkpoint,
  MessagePart,
  ScenarioDetail,
  ToolCall,
  Turn,
} from "../types.ts";
import { CollapsedToolGroup } from "./conversation/CollapsedToolGroup.tsx";
import { partsByTurn } from "./conversation/partsFromStream.ts";
import {
  categoryIcon,
  formatToolName,
  getAnimationText,
  getToolCategory,
} from "./conversation/toolHelpers.ts";
import { Markdown } from "./copilot/Markdown.tsx";
import { Message, MessageContent } from "./copilot/Message.tsx";
import { CopyAction, MessageActions } from "./copilot/MessageActions.tsx";
import { ReasoningCollapse } from "./copilot/ReasoningCollapse.tsx";
import { StepsCollapse } from "./copilot/StepsCollapse.tsx";
import { ToolAccordion } from "./copilot/ToolAccordion.tsx";

interface Props {
  detail: ScenarioDetail;
}

type ToolPart = MessagePart & { kind: "tool" };

function sortToolCalls(calls: ToolCall[]): ToolCall[] {
  return [...calls].sort((a, b) => {
    const ao = a.call_order ?? Number.POSITIVE_INFINITY;
    const bo = b.call_order ?? Number.POSITIVE_INFINITY;
    return ao - bo;
  });
}

function buildTurnRows(detail: ScenarioDetail): Turn[] {
  const toolsByTurn: Record<number, ToolCall[]> = {};
  for (const tc of detail.tool_calls ?? []) {
    const idx = (tc as unknown as Record<string, number>).turn_index ?? -1;
    if (!toolsByTurn[idx]) toolsByTurn[idx] = [];
    toolsByTurn[idx].push(tc);
  }
  const cpByTurn: Record<number, Checkpoint[]> = {};
  for (const cp of detail.checkpoints ?? []) {
    const idx =
      (cp as unknown as Record<string, number>).preceding_turn_index ?? -1;
    if (!cpByTurn[idx]) cpByTurn[idx] = [];
    cpByTurn[idx].push(cp);
  }
  const partsByTurnIndex = partsByTurn(detail.target_events ?? []);
  return (detail.turns ?? []).map((t) => ({
    ...t,
    tool_calls: sortToolCalls(toolsByTurn[t.turn_index] ?? []),
    checkpoints: cpByTurn[t.turn_index] ?? [],
    parts: partsByTurnIndex[t.turn_index],
  }));
}

const SESSION_BOUNDARY_RE =
  /session_id:\s*(\S+)|reset_policy:\s*(\S+)|time_offset:\s*(\S+)|user_id:\s*(\S+)/g;

function parseSessionBoundary(content: string) {
  const fields: Record<string, string> = {};
  for (const m of content.matchAll(SESSION_BOUNDARY_RE)) {
    if (m[1]) fields.session_id = m[1];
    if (m[2]) fields.reset_policy = m[2];
    if (m[3]) fields.time_offset = m[3];
    if (m[4]) fields.user_id = m[4];
  }
  return fields;
}

function isSessionBoundary(turn: Turn): boolean {
  return (
    turn.role === "system" &&
    typeof turn.content === "string" &&
    turn.content.startsWith("--- Session boundary")
  );
}

const THINK_TAG_RE = /<think>([\s\S]*?)<\/think>/gi;

function splitReasoning(content: string): {
  reasoning: string;
  body: string;
} {
  const matches = [...content.matchAll(THINK_TAG_RE)];
  if (matches.length === 0) return { reasoning: "", body: content };
  const reasoning = matches.map((m) => (m[1] ?? "").trim()).join("\n\n");
  const body = content.replace(THINK_TAG_RE, "").trim();
  return { reasoning, body };
}

function renderMarkdown(content: string): ReactNode {
  return <Markdown>{content}</Markdown>;
}

function Divider({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="my-2 flex flex-col items-center gap-1">
      <div className="flex w-full items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

function BoundaryRow({ turn }: { turn: Turn }) {
  const fields = parseSessionBoundary(turn.content ?? "");
  return (
    <Divider label="Session boundary">
      {Object.keys(fields).length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {Object.entries(fields).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              <span className="text-muted-foreground/70">{k}:</span>
              <span className="text-foreground">{v}</span>
            </span>
          ))}
        </div>
      )}
    </Divider>
  );
}

function SystemRow({ turn }: { turn: Turn }) {
  const label =
    turn.role === "system"
      ? "System"
      : turn.role === "inject"
        ? "Inject"
        : turn.role === "checkpoint"
          ? "Checkpoint"
          : turn.role;
  return (
    <Divider label={label}>
      {turn.content && (
        <div className="max-w-[85%] text-center text-xs text-muted-foreground">
          {renderMarkdown(turn.content)}
        </div>
      )}
    </Divider>
  );
}

function TurnMeta({ turn }: { turn: Turn }) {
  return (
    <div className="text-[10px] text-muted-foreground">
      Turn {turn.turn_index}
      {turn.source ? ` · ${turn.source}` : ""}
    </div>
  );
}

function UserMessage({ turn }: { turn: Turn }) {
  return (
    <Message from="user">
      <MessageContent>
        {turn.content ? (
          renderMarkdown(turn.content)
        ) : (
          <span className="text-muted-foreground italic">(empty)</span>
        )}
      </MessageContent>
      <div className="ml-auto pr-1">
        <TurnMeta turn={turn} />
      </div>
    </Message>
  );
}

function ToolBlock({
  name,
  input,
  output,
}: {
  name: string;
  input: unknown;
  output?: unknown;
}) {
  const category = getToolCategory(name);
  const Icon = categoryIcon(category);
  const state = output === undefined ? "input-available" : "output-available";
  const animationText = getAnimationText(name, category, state, input);
  const hasOutput = output !== undefined && output !== null;

  return (
    <ToolAccordion
      icon={<Icon size={14} strokeWidth={2} />}
      title={animationText}
      description={<span className="font-mono">{formatToolName(name)}</span>}
    >
      <div className="flex flex-col gap-2">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
            Input
          </div>
          {input != null ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-[11px] text-foreground">
              {typeof input === "string"
                ? input
                : JSON.stringify(input, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">(no arguments)</p>
          )}
        </div>
        {hasOutput && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Output
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-[11px] text-foreground">
              {typeof output === "string"
                ? output
                : JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </ToolAccordion>
  );
}

function CheckpointPill({ cp }: { cp: Checkpoint }) {
  if (cp.passed) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
        title={`Checkpoint ${cp.checkpoint_index}`}
      >
        <span>✓</span>
        <span>Checkpoint {cp.checkpoint_index}</span>
      </span>
    );
  }
  return (
    <details className="group inline-block">
      <summary className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 marker:hidden [&::-webkit-details-marker]:hidden dark:text-rose-400">
        <span>✗</span>
        <span>Checkpoint {cp.checkpoint_index}</span>
        <span className="text-rose-500/70 transition-transform group-open:rotate-90">
          ▸
        </span>
      </summary>
      {(cp.failures ?? []).length > 0 && (
        <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[11px] text-rose-600 dark:text-rose-400">
          {(cp.failures ?? []).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

function CheckpointRow({ checkpoints }: { checkpoints: Checkpoint[] }) {
  if (checkpoints.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-start gap-1.5">
      {checkpoints.map((cp, i) => (
        <CheckpointPill key={i} cp={cp} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Render segments — port of buildRenderSegments + splitReasoningAndResponse */
/* --------------------------------------------------------------------- */

type RenderSegment =
  | { kind: "single"; part: MessagePart; index: number }
  | { kind: "group"; parts: ToolPart[] };

/** Group consecutive completed tool parts (≥2) into a CollapsedToolGroup. */
function buildSegments(parts: MessagePart[]): RenderSegment[] {
  const segments: RenderSegment[] = [];
  let pending: ToolPart[] = [];

  function flush() {
    if (pending.length === 0) return;
    if (pending.length >= 2) {
      segments.push({ kind: "group", parts: pending });
    } else {
      segments.push({ kind: "single", part: pending[0], index: -1 });
    }
    pending = [];
  }

  parts.forEach((part, i) => {
    if (part.kind === "tool") {
      pending.push(part);
    } else {
      flush();
      segments.push({ kind: "single", part, index: i });
    }
  });
  flush();
  return segments;
}

/** Split parts into "leading reasoning/steps" and "final response" — the
 * trailing run of text+tools that follows the last reasoning boundary. The
 * leading slice goes into a StepsCollapse, the final into the main bubble.
 */
function splitReasoningAndResponse(parts: MessagePart[]): {
  reasoning: MessagePart[];
  response: MessagePart[];
} {
  let lastReasoningIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].kind === "reasoning") {
      lastReasoningIndex = i;
      break;
    }
  }
  if (lastReasoningIndex === -1) return { reasoning: [], response: parts };

  const after = parts.slice(lastReasoningIndex + 1);
  const hasResponseAfter = after.some(
    (p) => p.kind === "text" && p.text.trim().length > 0,
  );
  if (!hasResponseAfter) return { reasoning: [], response: parts };

  return {
    reasoning: parts.slice(0, lastReasoningIndex + 1),
    response: after,
  };
}

function PartRenderer({ part }: { part: MessagePart }) {
  if (part.kind === "text") {
    return (
      <div className="text-[1rem] leading-relaxed text-foreground">
        {renderMarkdown(part.text)}
      </div>
    );
  }
  if (part.kind === "reasoning") {
    return (
      <ReasoningCollapse>
        <Markdown className="text-xs text-muted-foreground">
          {part.text}
        </Markdown>
      </ReasoningCollapse>
    );
  }
  return <ToolBlock name={part.name} input={part.input} output={part.output} />;
}

function SegmentList({ segments }: { segments: RenderSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "group") {
          return <CollapsedToolGroup key={`group-${i}`} parts={seg.parts} />;
        }
        return <PartRenderer key={`part-${i}`} part={seg.part} />;
      })}
    </>
  );
}

function extractAssistantText(parts: MessagePart[]): string {
  return parts
    .filter((p): p is MessagePart & { kind: "text" } => p.kind === "text")
    .map((p) => p.text)
    .join("\n\n")
    .trim();
}

function AssistantMessage({ turn }: { turn: Turn }) {
  const parts = turn.parts ?? [];
  const useParts = parts.length > 0;

  const { reasoning: leading, response } = useParts
    ? splitReasoningAndResponse(parts)
    : { reasoning: [] as MessagePart[], response: [] as MessagePart[] };

  // Fallback path: no streaming events available; reconstruct from content +
  // sorted tool_calls (text first, then tool calls in call_order).
  const fallback = useParts
    ? null
    : (() => {
        const { reasoning, body } = splitReasoning(turn.content ?? "");
        return {
          reasoning,
          body,
          tools: turn.tool_calls ?? [],
        };
      })();

  const responseSegments = useParts ? buildSegments(response) : null;
  const reasoningSegments =
    useParts && leading.length > 0 ? buildSegments(leading) : null;

  const copyText = useParts
    ? extractAssistantText(response.length > 0 ? response : parts)
    : (fallback?.body ?? turn.content ?? "");

  return (
    <Message from="assistant">
      <MessageContent>
        {useParts ? (
          <>
            {reasoningSegments && (
              <StepsCollapse count={leading.length}>
                <SegmentList segments={reasoningSegments} />
              </StepsCollapse>
            )}
            {responseSegments && <SegmentList segments={responseSegments} />}
          </>
        ) : (
          fallback && (
            <>
              {fallback.reasoning && (
                <ReasoningCollapse>
                  <Markdown className="text-xs text-muted-foreground">
                    {fallback.reasoning}
                  </Markdown>
                </ReasoningCollapse>
              )}
              {fallback.body && (
                <div className="text-[1rem] leading-relaxed text-foreground">
                  {renderMarkdown(fallback.body)}
                </div>
              )}
              {fallback.tools.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {fallback.tools.map((tc, i) => (
                    <ToolBlock key={i} name={tc.name} input={tc.args} />
                  ))}
                </div>
              )}
            </>
          )
        )}
        <CheckpointRow checkpoints={turn.checkpoints ?? []} />
      </MessageContent>
      <div className="flex items-center justify-between gap-2">
        <TurnMeta turn={turn} />
        {copyText.length > 0 && (
          <MessageActions>
            <CopyAction text={copyText} />
          </MessageActions>
        )}
      </div>
    </Message>
  );
}

export function ConversationView({ detail }: Props) {
  const rows = buildTurnRows(detail);
  return (
    <div className={cn("flex flex-col gap-6 px-1 py-2")}>
      {rows.map((turn, i) => {
        if (isSessionBoundary(turn)) {
          return <BoundaryRow key={i} turn={turn} />;
        }
        if (turn.role === "user") {
          return <UserMessage key={i} turn={turn} />;
        }
        if (turn.role === "assistant") {
          return <AssistantMessage key={i} turn={turn} />;
        }
        return <SystemRow key={i} turn={turn} />;
      })}
    </div>
  );
}
