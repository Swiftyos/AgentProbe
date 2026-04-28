import { useMemo } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type CategoryRadarRun = {
  run_id: string;
  label: string | null;
};

export type CategoryRadarScenario = {
  category?: string | null;
  entries: Record<string, { score: number | null }>;
};

type CategoryRadarProps = {
  runs: CategoryRadarRun[];
  scenarios: CategoryRadarScenario[];
};

const SERIES_COLORS = [
  "oklch(0.72 0.18 36)",
  "oklch(0.74 0.16 145)",
  "oklch(0.78 0.14 90)",
  "oklch(0.72 0.18 320)",
  "oklch(0.70 0.18 245)",
  "oklch(0.74 0.16 195)",
  "oklch(0.76 0.16 70)",
  "oklch(0.70 0.18 10)",
  "oklch(0.72 0.16 280)",
  "oklch(0.74 0.14 130)",
];

function shortLabel(run: CategoryRadarRun): string {
  if (run.label && run.label.trim()) return run.label.trim();
  return run.run_id.slice(0, 8);
}

export function CategoryRadar({ runs, scenarios }: CategoryRadarProps) {
  const data = useMemo(() => {
    const totals = new Map<
      string,
      Record<string, { sum: number; count: number }>
    >();

    for (const scenario of scenarios) {
      const category = scenario.category?.trim();
      if (!category) continue;
      const perRun = totals.get(category) ?? {};
      for (const run of runs) {
        const entry = scenario.entries[run.run_id];
        const score = entry?.score;
        if (typeof score !== "number") continue;
        const acc = perRun[run.run_id] ?? { sum: 0, count: 0 };
        acc.sum += score;
        acc.count += 1;
        perRun[run.run_id] = acc;
      }
      totals.set(category, perRun);
    }

    const rows = Array.from(totals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, perRun]) => {
        const row: Record<string, string | number> = { category };
        for (const run of runs) {
          const acc = perRun[run.run_id];
          if (acc && acc.count > 0) {
            row[run.run_id] = Number((acc.sum / acc.count).toFixed(2));
          }
        }
        return row;
      });

    return rows;
  }, [runs, scenarios]);

  if (data.length < 3) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Need scenarios in at least 3 categories to render the radar. Currently:{" "}
        {data.length}.
      </div>
    );
  }

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="oklch(0.4 0 0 / 0.4)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{
              fill: "oklch(0.75 0 0)",
              fontSize: 11,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={{ fill: "oklch(0.55 0 0)", fontSize: 10 }}
            stroke="oklch(0.4 0 0 / 0.4)"
          />
          {runs.map((run, index) => {
            const color = SERIES_COLORS[index % SERIES_COLORS.length];
            return (
              <Radar
                key={run.run_id}
                name={shortLabel(run)}
                dataKey={run.run_id}
                stroke={color}
                fill={color}
                fillOpacity={0.18}
                strokeWidth={2}
                isAnimationActive={false}
              />
            );
          })}
          <Tooltip
            contentStyle={{
              background: "oklch(0.18 0 0)",
              border: "1px solid oklch(0.3 0 0)",
              borderRadius: 6,
              color: "oklch(0.95 0 0)",
              fontSize: 12,
            }}
            labelStyle={{ color: "oklch(0.85 0 0)" }}
            formatter={(value: unknown, name: unknown) => {
              const num = typeof value === "number" ? value.toFixed(2) : "—";
              return [num, String(name)];
            }}
          />
          <Legend
            iconType="rect"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
