#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { stringify } from "yaml";

type Task = {
  id: number;
  cluster_id: number;
  cluster_title: string;
  task: string;
  context?: Record<string, unknown>;
};

const dataset = JSON.parse(
  readFileSync("data/tasks_100_dataset.json", "utf8"),
) as { tasks: Task[] };

const clusterToPersona: Record<number, string> = {
  1: "power-user-founder",
  2: "founder-operator",
  4: "data-driven-founder",
  5: "busy-professional",
  6: "agent-deployer",
  7: "data-driven-founder",
  8: "developer",
  9: "smb-founder",
  10: "data-analyst",
  11: "data-analyst",
  12: "academic-researcher",
  13: "busy-professional",
  15: "smb-founder",
  16: "agent-architect",
};

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatContent = (task: Task): string => {
  const ctx = task.context ?? {};
  if (Object.keys(ctx).length === 0) return task.task;
  return `${task.task}\n\nContext:\n${JSON.stringify(ctx, null, 2)}`;
};

const scenarios = dataset.tasks.map((t) => {
  const persona = clusterToPersona[t.cluster_id];
  if (!persona) {
    throw new Error(`No persona mapping for cluster ${t.cluster_id}`);
  }
  return {
    id: `task-${String(t.id).padStart(3, "0")}`,
    name: `${t.cluster_title} — task ${t.id}`,
    description: t.task.slice(0, 180),
    tags: ["tasks-100", slug(t.cluster_title)],
    persona,
    rubric: "operations-automation",
    turns: [
      {
        role: "user",
        content: formatContent(t),
        use_exact_message: true,
      },
    ],
    expectations: {
      expected_behavior:
        "Address the user's request end-to-end, producing the artifacts or actions described. Do not fabricate tool outputs, data, or completed actions. Ask clarifying questions only when strictly necessary.",
      expected_outcome: "resolved",
    },
  };
});

const output = {
  version: "1.0",
  defaults: {
    max_turns: 5,
    timeout_seconds: 60,
  },
  scenarios,
};

writeFileSync(
  "data/tasks-100-scenarios.yaml",
  stringify(output, { lineWidth: 0 }),
);

console.log(
  `Wrote ${scenarios.length} scenarios to data/tasks-100-scenarios.yaml`,
);
