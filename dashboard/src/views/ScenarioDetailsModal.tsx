import { useEffect, useState } from "react";
import type { ServerRequest } from "../api/types.ts";
import { Badge } from "../components/ui/badge.tsx";
import { Separator } from "../components/ui/separator.tsx";
import {
  Button,
  Card,
  ErrorBanner,
  Loading,
  Modal,
  Tag,
} from "../ui/index.tsx";

export type ScenarioDetailsTarget = {
  file: string;
  id: string;
  /** Optional summary fields from the picker, used as a fallback header. */
  name?: string | null;
  description?: string | null;
  tags?: readonly string[];
  priority?: string | null;
};

type ScenarioPayload = {
  suiteId: string | null;
  sourcePath: string;
  scenario: Record<string, unknown>;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function turnRoleStyle(role: string): {
  variant:
    | "default"
    | "info"
    | "success"
    | "warning"
    | "destructive"
    | "secondary";
  label: string;
} {
  switch (role) {
    case "user":
      return { variant: "info", label: "User" };
    case "assistant":
      return { variant: "default", label: "Assistant" };
    case "checkpoint":
      return { variant: "warning", label: "Checkpoint" };
    case "inject":
      return { variant: "destructive", label: "Inject" };
    default:
      return { variant: "secondary", label: role };
  }
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mt-5 mb-2">
      {children}
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 text-sm border-b border-border last:border-b-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`min-w-0 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ContentBlock({ text }: { text: string }) {
  return (
    <pre className="whitespace-pre-wrap text-sm text-foreground bg-secondary/40 border border-border rounded-md px-3 py-2 font-mono leading-relaxed overflow-x-auto">
      {text}
    </pre>
  );
}

function TurnCard({
  turn,
  ordinal,
}: {
  turn: Record<string, unknown>;
  ordinal: number;
}) {
  const role = String(turn.role ?? "turn");
  const style = turnRoleStyle(role);
  const content = asString(turn.content);
  const useExact = turn.useExactMessage === true;
  const attachments = asArray(turn.attachments);
  const assertions = asArray(turn.assertions);
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {ordinal.toString().padStart(2, "0")}
          </span>
          <Badge variant={style.variant} className="uppercase tracking-wider">
            {style.label}
          </Badge>
          {useExact ? <Tag tone="warn">verbatim</Tag> : null}
        </div>
      </div>
      {content ? <ContentBlock text={content} /> : null}
      {attachments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((raw, idx) => {
            const attachment = asObject(raw);
            const path = asString(attachment?.path) ?? "";
            const name = asString(attachment?.name) ?? path.split("/").pop();
            return (
              <Tag tone="info" key={`${path}-${idx}`}>
                {name || path}
              </Tag>
            );
          })}
        </div>
      ) : null}
      {role === "checkpoint" && assertions.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {assertions.map((raw, idx) => {
            const a = asObject(raw);
            if (!a) return null;
            return (
              <li
                key={`assert-${idx}`}
                className="text-xs bg-secondary/40 border border-border rounded-md p-2 space-y-1"
              >
                {asString(a.toolCalled) ? (
                  <div>
                    <span className="text-muted-foreground">tool:</span>{" "}
                    <span className="font-mono">{a.toolCalled as string}</span>
                  </div>
                ) : null}
                {Array.isArray(a.responseContainsAny) &&
                a.responseContainsAny.length > 0 ? (
                  <div>
                    <span className="text-muted-foreground">contains any:</span>{" "}
                    <span className="font-mono">
                      {(a.responseContainsAny as string[]).join(" | ")}
                    </span>
                  </div>
                ) : null}
                {Array.isArray(a.responseMustNotContain) &&
                a.responseMustNotContain.length > 0 ? (
                  <div>
                    <span className="text-muted-foreground">
                      must not contain:
                    </span>{" "}
                    <span className="font-mono">
                      {(a.responseMustNotContain as string[]).join(" | ")}
                    </span>
                  </div>
                ) : null}
                {asString(a.responseMentions) ? (
                  <div>
                    <span className="text-muted-foreground">mentions:</span>{" "}
                    <span className="font-mono">
                      {a.responseMentions as string}
                    </span>
                  </div>
                ) : null}
                {asObject(a.withArgs) ? (
                  <pre className="font-mono text-[11px] mt-1 whitespace-pre-wrap">
                    {JSON.stringify(a.withArgs, null, 2)}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

function SessionPanel({
  session,
  index,
}: {
  session: Record<string, unknown>;
  index: number;
}) {
  const turns = asArray(session.turns);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="uppercase">
          Session {index + 1}
        </Badge>
        {asString(session.id) ? (
          <span className="font-mono text-xs text-muted-foreground">
            {session.id as string}
          </span>
        ) : null}
        {asString(session.timeOffset) ? (
          <Tag>+{session.timeOffset as string}</Tag>
        ) : null}
        {asString(session.reset) ? (
          <Tag>reset: {session.reset as string}</Tag>
        ) : null}
        {typeof session.maxTurns === "number" ? (
          <Tag>max turns: {session.maxTurns as number}</Tag>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {turns.map((raw, idx) => {
          const turn = asObject(raw);
          if (!turn) return null;
          return <TurnCard key={`t-${idx}`} turn={turn} ordinal={idx + 1} />;
        })}
        {turns.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            No turns in this session.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExpectationsPanel({
  expectations,
}: {
  expectations: Record<string, unknown>;
}) {
  const must = asArray(expectations.mustInclude) as string[];
  const mustNot = asArray(expectations.mustNotInclude) as string[];
  const tools = asArray(expectations.expectedTools);
  const failureModes = asArray(expectations.failureModes);
  const expectedBehavior = asString(expectations.expectedBehavior);
  const expectedOutcome = asString(expectations.expectedOutcome);
  const groundTruth = asString(expectations.groundTruth);
  const testerNote = asString(expectations.testerNote);

  const isEmpty =
    must.length === 0 &&
    mustNot.length === 0 &&
    tools.length === 0 &&
    failureModes.length === 0 &&
    !expectedBehavior &&
    !expectedOutcome &&
    !groundTruth &&
    !testerNote;
  if (isEmpty) return null;

  return (
    <Card className="p-4 space-y-3">
      {expectedOutcome ? (
        <MetaRow label="Outcome" value={expectedOutcome} />
      ) : null}
      {expectedBehavior ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Expected behavior
          </div>
          <ContentBlock text={expectedBehavior} />
        </div>
      ) : null}
      {must.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Response must include
          </div>
          <div className="flex flex-wrap gap-1.5">
            {must.map((value, idx) => (
              <Tag key={`m-${idx}`} tone="success">
                {value}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}
      {mustNot.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Response must NOT include
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mustNot.map((value, idx) => (
              <Tag key={`mn-${idx}`} tone="warn">
                {value}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}
      {tools.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Expected tool calls
          </div>
          <ul className="text-sm font-mono space-y-1">
            {tools.map((raw, idx) => {
              const tool = asObject(raw);
              if (!tool) return null;
              return (
                <li
                  key={`tool-${idx}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span>{asString(tool.name) ?? "?"}</span>
                  {tool.required ? <Tag tone="warn">required</Tag> : null}
                  {typeof tool.callOrder === "number" ? (
                    <Tag>order: {tool.callOrder as number}</Tag>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {failureModes.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Failure modes
          </div>
          <ul className="space-y-2">
            {failureModes.map((raw, idx) => {
              const mode = asObject(raw);
              if (!mode) return null;
              return (
                <li
                  key={`fm-${idx}`}
                  className="bg-secondary/40 border border-border rounded-md p-2"
                >
                  <div className="font-medium text-sm">
                    {asString(mode.name) ?? "(unnamed)"}
                  </div>
                  {asString(mode.description) ? (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {asString(mode.description)}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {groundTruth ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Ground truth</div>
          <ContentBlock text={groundTruth} />
        </div>
      ) : null}
      {testerNote ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Tester note</div>
          <ContentBlock text={testerNote} />
        </div>
      ) : null}
    </Card>
  );
}

function ContextPanel({ context }: { context: Record<string, unknown> }) {
  const systemPrompt = asString(context.systemPrompt);
  const userName = asString(context.userName);
  const copilotMode = asString(context.copilotMode);
  const injected = asObject(context.injectedData);
  if (!systemPrompt && !userName && !copilotMode && !injected) return null;

  return (
    <Card className="p-4 space-y-3">
      {userName || copilotMode ? (
        <div className="flex flex-wrap gap-2">
          {userName ? <Tag tone="info">user: {userName}</Tag> : null}
          {copilotMode ? <Tag tone="info">mode: {copilotMode}</Tag> : null}
        </div>
      ) : null}
      {systemPrompt ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            System prompt
          </div>
          <ContentBlock text={systemPrompt} />
        </div>
      ) : null}
      {injected && Object.keys(injected).length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Injected data
          </div>
          <ContentBlock text={JSON.stringify(injected, null, 2)} />
        </div>
      ) : null}
    </Card>
  );
}

export function ScenarioDetailsModal({
  open,
  target,
  request,
  onClose,
}: {
  open: boolean;
  target: ScenarioDetailsTarget | null;
  request: ServerRequest;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<ScenarioPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!open || !target) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPayload(null);
    setShowRaw(false);
    request<ScenarioPayload>(
      `/api/scenarios/lookup?file=${encodeURIComponent(target.file)}&id=${encodeURIComponent(target.id)}`,
    )
      .then((next) => {
        if (cancelled) return;
        setPayload(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target, request]);

  if (!target) return null;

  const scenario = payload?.scenario ?? null;
  const name = asString(scenario?.name) ?? target.name ?? target.id;
  const description =
    asString(scenario?.description) ?? target.description ?? null;
  const tags = (scenario?.tags as string[] | undefined) ?? target.tags ?? [];
  const priority = asString(scenario?.priority) ?? target.priority ?? null;
  const persona = asString(scenario?.persona);
  const rubric = asString(scenario?.rubric);
  const maxTurns = scenario?.maxTurns;
  const baseDate = asString(scenario?.baseDate);
  const sessions = asArray(scenario?.sessions);
  const standaloneTurns = asArray(scenario?.turns);
  const expectations = asObject(scenario?.expectations);
  const context = asObject(scenario?.context);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-baseline gap-2 flex-wrap pr-6">
          <span className="text-foreground">{name}</span>
          {priority ? <Tag tone="info">{priority}</Tag> : null}
        </div>
      }
      description={
        <span className="font-mono text-xs text-muted-foreground">
          {target.id} · {target.file}
        </span>
      }
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw((value) => !value)}
            disabled={!scenario}
          >
            {showRaw ? "Hide raw spec" : "View raw spec"}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {loading ? <Loading label="Loading scenario…" /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {scenario ? (
        <div className="space-y-1">
          {description ? (
            <p className="text-sm text-foreground leading-relaxed">
              {description}
            </p>
          ) : null}

          <SectionHeader>Metadata</SectionHeader>
          <Card className="px-4 py-2">
            <MetaRow label="Suite" value={target.file} mono />
            {persona ? <MetaRow label="Persona" value={persona} mono /> : null}
            {rubric ? <MetaRow label="Rubric" value={rubric} mono /> : null}
            {typeof maxTurns === "number" ? (
              <MetaRow label="Max turns" value={maxTurns} mono />
            ) : null}
            {baseDate ? (
              <MetaRow label="Base date" value={baseDate} mono />
            ) : null}
            {tags.length > 0 ? (
              <MetaRow
                label="Tags"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                }
              />
            ) : null}
          </Card>

          {context ? (
            <>
              <SectionHeader>Context</SectionHeader>
              <ContextPanel context={context} />
            </>
          ) : null}

          {sessions.length > 0 ? (
            <>
              <SectionHeader>Sessions</SectionHeader>
              <div className="space-y-4">
                {sessions.map((raw, idx) => {
                  const session = asObject(raw);
                  if (!session) return null;
                  return (
                    <SessionPanel
                      key={`s-${idx}`}
                      session={session}
                      index={idx}
                    />
                  );
                })}
              </div>
            </>
          ) : null}

          {sessions.length === 0 && standaloneTurns.length > 0 ? (
            <>
              <SectionHeader>Turns</SectionHeader>
              <div className="space-y-2">
                {standaloneTurns.map((raw, idx) => {
                  const turn = asObject(raw);
                  if (!turn) return null;
                  return (
                    <TurnCard key={`t-${idx}`} turn={turn} ordinal={idx + 1} />
                  );
                })}
              </div>
            </>
          ) : null}

          {expectations ? (
            <>
              <SectionHeader>Expectations</SectionHeader>
              <ExpectationsPanel expectations={expectations} />
            </>
          ) : null}

          {showRaw ? (
            <>
              <Separator className="my-4" />
              <SectionHeader>Raw spec</SectionHeader>
              <ContentBlock text={JSON.stringify(scenario, null, 2)} />
            </>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
