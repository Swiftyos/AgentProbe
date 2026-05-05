import {
  CheckCircle2,
  FileText,
  Gavel,
  MinusCircle,
  Quote,
  Scale,
  XCircle,
} from "lucide-react";
import { scorePct } from "../helpers.ts";
import { cn } from "../lib/utils.ts";
import type { DimensionScore, ScenarioDetail } from "../types.ts";
import { Markdown } from "./copilot/Markdown.tsx";
import { ReasoningCollapse } from "./copilot/ReasoningCollapse.tsx";
import { ToolAccordion } from "./copilot/ToolAccordion.tsx";

interface Props {
  detail: ScenarioDetail;
}

type Verdict = "pass" | "fail" | "unknown";

function deriveVerdict(detail: ScenarioDetail): Verdict {
  if (detail.passed) return "pass";
  if (detail.status === "error") return "unknown";
  if (detail.overall_score == null && detail.passed === undefined)
    return "unknown";
  return "fail";
}

function SectionLabel({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number | string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </div>
      {count != null && (
        <div className="text-[10px] font-mono text-muted-foreground/70">
          {count}
        </div>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "pass") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={14} strokeWidth={2.5} />
        Pass
      </span>
    );
  }
  if (verdict === "fail") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
        <XCircle size={14} strokeWidth={2.5} />
        Fail
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <MinusCircle size={14} strokeWidth={2.5} />
      Unknown
    </span>
  );
}

function VerdictHeader({ detail }: { detail: ScenarioDetail }) {
  const verdict = deriveVerdict(detail);
  const score = detail.overall_score;
  const threshold = detail.pass_threshold;
  const pct = scorePct(score);
  const thresholdPct =
    threshold != null
      ? Math.max(0, Math.min(100, Math.round(threshold * 100)))
      : null;

  const fillColor =
    verdict === "pass"
      ? "bg-emerald-500"
      : verdict === "fail"
        ? "bg-rose-500"
        : "bg-muted-foreground/40";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Gavel size={12} strokeWidth={2.5} />
        <span>Verdict</span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <div
            className={cn(
              "font-mono text-4xl font-semibold tabular-nums leading-none tracking-tight",
              verdict === "pass" && "text-emerald-700 dark:text-emerald-400",
              verdict === "fail" && "text-rose-700 dark:text-rose-400",
              verdict === "unknown" && "text-muted-foreground",
            )}
          >
            {score != null ? score.toFixed(2) : "—"}
          </div>
          {threshold != null && (
            <div className="font-mono text-xs text-muted-foreground">
              / threshold {threshold.toFixed(2)}
            </div>
          )}
        </div>
        <VerdictBadge verdict={verdict} />
      </div>

      <div className="relative">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width]", fillColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        {thresholdPct != null && (
          <div
            className="absolute top-[-3px] h-3 w-px bg-foreground/60"
            style={{ left: `${thresholdPct}%` }}
            aria-hidden
            title={`Pass threshold ${threshold?.toFixed(2)}`}
          />
        )}
      </div>

      {detail.judge?.model && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/70">Judged by</span>
          <span className="font-mono text-foreground">
            {detail.judge.provider ? `${detail.judge.provider} · ` : ""}
            {detail.judge.model}
          </span>
          {detail.judge.temperature != null && (
            <span className="font-mono text-muted-foreground/80">
              · t={detail.judge.temperature}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function OverallNotes({ notes }: { notes: string }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Notes</SectionLabel>
      <blockquote className="relative rounded-md border-l-2 border-foreground/40 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
        <Quote
          className="absolute -left-px -top-2 h-3 w-3 -translate-x-1/2 rotate-180 text-muted-foreground/40"
          strokeWidth={2.5}
          aria-hidden
        />
        <Markdown>{notes}</Markdown>
      </blockquote>
    </section>
  );
}

function dimensionTone(d: DimensionScore): {
  text: string;
  bar: string;
  border: string;
} {
  const norm = d.normalized_score;
  if (norm == null)
    return {
      text: "text-muted-foreground",
      bar: "bg-muted-foreground/40",
      border: "border-border",
    };
  if (norm >= 0.85)
    return {
      text: "text-emerald-700 dark:text-emerald-400",
      bar: "bg-emerald-500",
      border: "border-emerald-500/30",
    };
  if (norm >= 0.6)
    return {
      text: "text-foreground",
      bar: "bg-foreground/70",
      border: "border-border",
    };
  if (norm >= 0.4)
    return {
      text: "text-amber-700 dark:text-amber-400",
      bar: "bg-amber-500",
      border: "border-amber-500/30",
    };
  return {
    text: "text-rose-700 dark:text-rose-400",
    bar: "bg-rose-500",
    border: "border-rose-500/30",
  };
}

function DimensionCard({ d }: { d: DimensionScore }) {
  const pct = scorePct(d.normalized_score);
  const tone = dimensionTone(d);
  const rawScoreLabel =
    d.raw_score != null
      ? `${d.raw_score}${d.scale_points != null ? `/${d.scale_points}` : ""}`
      : "—";
  const evidence = d.evidence ?? [];
  const hasReasoning = !!d.reasoning?.trim();
  const hasEvidence = evidence.length > 0;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-background/50 px-4 py-3",
        tone.border,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">
            {d.dimension_name}
          </h3>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {d.dimension_id}
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 text-right">
          <span
            className={cn(
              "font-mono text-base font-semibold tabular-nums leading-none",
              tone.text,
            )}
          >
            {rawScoreLabel}
          </span>
          {d.weight != null && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              <Scale size={10} strokeWidth={2.5} />×{d.weight}
            </span>
          )}
        </div>
      </header>

      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width]", tone.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>

      {(hasReasoning || hasEvidence) && (
        <ReasoningCollapse label="Reasoning">
          {hasReasoning && (
            <Markdown className="text-xs text-muted-foreground">
              {d.reasoning}
            </Markdown>
          )}
          {hasEvidence && (
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Evidence
              </div>
              {evidence.map((e, i) => (
                <div
                  key={i}
                  className="rounded border-l-2 border-border bg-muted/30 px-2 py-1 font-mono text-[11px] leading-relaxed text-muted-foreground"
                >
                  {e}
                </div>
              ))}
            </div>
          )}
        </ReasoningCollapse>
      )}
    </article>
  );
}

export function RubricView({ detail }: Props) {
  const dims = [...(detail.judge_dimension_scores ?? [])].sort(
    (a, b) => (b.weight ?? 0) - (a.weight ?? 0),
  );
  const notes = detail.judge?.overall_notes;
  const judgeOutput = detail.judge?.output;

  return (
    <div className="flex flex-col gap-5">
      <VerdictHeader detail={detail} />

      {notes && <OverallNotes notes={notes} />}

      <section className="flex flex-col gap-3">
        <SectionLabel count={dims.length || undefined}>Dimensions</SectionLabel>
        {dims.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {dims.map((d, i) => (
              <DimensionCard key={i} d={d} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No rubric dimensions recorded.
          </p>
        )}
      </section>

      {judgeOutput && (
        <ToolAccordion
          icon={<FileText size={14} strokeWidth={2.25} />}
          title="Raw judge output"
          description="Full structured response from the judge model"
        >
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
            {JSON.stringify(judgeOutput, null, 2)}
          </pre>
        </ToolAccordion>
      )}
    </div>
  );
}
