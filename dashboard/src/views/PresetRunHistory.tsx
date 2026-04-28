import { useMemo, useState } from "react";
import type { RunSummary } from "../api/types.ts";
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  StatusPill,
} from "../ui/index.tsx";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function durationSeconds(
  startedAt: string,
  completedAt?: string | null,
): number | null {
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return null;
  const end = completedAt ? Date.parse(completedAt) : Date.now();
  if (Number.isNaN(end)) return null;
  return Math.max(0, (end - start) / 1000);
}

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function PresetRunHistory({
  runs,
  navigate,
  presetName,
}: {
  runs: RunSummary[];
  navigate: (href: string) => void;
  presetName: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sortedRuns = useMemo(
    () =>
      [...runs].sort(
        (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
      ),
    [runs],
  );

  const toggle = (runId: string) => {
    const next = new Set(selected);
    if (next.has(runId)) next.delete(runId);
    else next.add(runId);
    setSelected(next);
  };

  const compare = () => {
    if (selected.size < 2) return;
    const ids = sortedRuns
      .filter((run) => selected.has(run.runId))
      .slice(0, 10)
      .map((run) => encodeURIComponent(run.runId))
      .join(",");
    navigate(`/compare?run_ids=${ids}`);
  };

  const compareLatestTwo = () => {
    if (sortedRuns.length < 2) return;
    const ids = sortedRuns
      .slice(0, 2)
      .map((run) => encodeURIComponent(run.runId))
      .join(",");
    navigate(`/compare?run_ids=${ids}`);
  };

  if (sortedRuns.length === 0) {
    return (
      <EmptyState
        title="No runs yet"
        description={`Launch ${presetName} to see results here.`}
      />
    );
  }

  const tooFew = selected.size < 2;
  const tooMany = selected.size > 10;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="text-sm text-muted-foreground">
          {selected.size === 0
            ? `${sortedRuns.length} run${sortedRuns.length === 1 ? "" : "s"} · select 2–10 to compare`
            : `${selected.size} selected${tooMany ? " (max 10)" : ""}`}
        </div>
        <div className="flex-1" />
        {sortedRuns.length >= 2 ? (
          <Button variant="secondary" size="sm" onClick={compareLatestTwo}>
            Compare latest two
          </Button>
        ) : null}
        <Button size="sm" onClick={compare} disabled={tooFew || tooMany}>
          Compare {selected.size > 0 ? `(${Math.min(selected.size, 10)})` : ""}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-3 py-2 w-8" />
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2 text-right">Pass / Total</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRuns.map((run) => {
                const isSelected = selected.has(run.runId);
                return (
                  <tr
                    key={run.runId}
                    className={
                      isSelected
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-secondary"
                    }
                  >
                    <td className="px-3 py-2 align-top">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggle(run.runId)}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <a
                        href={`/runs/${encodeURIComponent(run.runId)}`}
                        className="text-foreground hover:text-primary block"
                      >
                        {run.label ? (
                          <span className="font-medium">{run.label}</span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {run.runId.slice(0, 12)}…
                          </span>
                        )}
                      </a>
                      {run.label ? (
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {run.runId.slice(0, 12)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusPill run={run} />
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {fmtDate(run.startedAt)}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {fmtDuration(
                        durationSeconds(run.startedAt, run.completedAt),
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-right font-mono">
                      {run.aggregateCounts.scenarioPassedCount}/
                      {run.aggregateCounts.scenarioTotal}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground max-w-[280px] truncate">
                      {run.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
