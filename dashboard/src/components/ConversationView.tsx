import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import type { Checkpoint, ScenarioDetail, ToolCall, Turn } from "../types.ts";
import { Markdown } from "./copilot/Markdown.tsx";
import { Message, MessageContent } from "./copilot/Message.tsx";
import { ReasoningCollapse } from "./copilot/ReasoningCollapse.tsx";
import { ToolAccordion } from "./copilot/ToolAccordion.tsx";

interface Props {
  detail: ScenarioDetail;
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
  return (detail.turns ?? []).map((t) => ({
    ...t,
    tool_calls: toolsByTurn[t.turn_index] ?? [],
    checkpoints: cpByTurn[t.turn_index] ?? [],
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

function renderContent(content: string): ReactNode {
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
          {renderContent(turn.content)}
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
          renderContent(turn.content)
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

function ToolAccordionBlock({ tc }: { tc: ToolCall }) {
  const argsPreview =
    tc.args != null
      ? typeof tc.args === "string"
        ? tc.args
        : JSON.stringify(tc.args)
      : "";
  const description =
    argsPreview.length > 0
      ? argsPreview.length > 80
        ? `${argsPreview.slice(0, 77)}…`
        : argsPreview
      : undefined;
  return (
    <ToolAccordion
      icon={<Wrench size={14} strokeWidth={2.25} />}
      title={<span className="font-mono">{tc.name}</span>}
      description={description}
    >
      {tc.args != null ? (
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-[11px] text-foreground">
          {JSON.stringify(tc.args, null, 2)}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">(no arguments)</p>
      )}
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

function AssistantMessage({ turn }: { turn: Turn }) {
  const { reasoning, body } = splitReasoning(turn.content ?? "");
  const hasBody = body.length > 0;
  const hasTools = (turn.tool_calls ?? []).length > 0;
  const hasReasoning = reasoning.length > 0;

  return (
    <Message from="assistant">
      <MessageContent>
        {hasReasoning && (
          <ReasoningCollapse>
            <Markdown className="text-xs text-muted-foreground">
              {reasoning}
            </Markdown>
          </ReasoningCollapse>
        )}
        {hasBody && (
          <div className="text-sm leading-relaxed text-foreground">
            {renderContent(body)}
          </div>
        )}
        {hasTools && (
          <div className="flex flex-col gap-1.5">
            {turn.tool_calls?.map((tc, i) => (
              <ToolAccordionBlock key={i} tc={tc} />
            ))}
          </div>
        )}
        <CheckpointRow checkpoints={turn.checkpoints ?? []} />
      </MessageContent>
      <TurnMeta turn={turn} />
    </Message>
  );
}

export function ConversationView({ detail }: Props) {
  const rows = buildTurnRows(detail);
  return (
    <div className={cn("flex flex-col gap-4")}>
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
