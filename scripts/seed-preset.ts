import { createPreset } from "../src/providers/persistence/sqlite-run-history.ts";
import type { PresetWriteInput } from "../src/providers/persistence/types.ts";

const SCENARIO_IDS = [
  "task-001",
  "task-012",
  "task-021",
  "task-029",
  "task-037",
  "task-045",
  "task-052",
  "task-059",
  "task-066",
  "task-073",
  "task-080",
  "task-086",
  "task-091",
  "task-096",
];

const input: PresetWriteInput = {
  name: "pre-release checks",
  description:
    "Baked-in preset that runs the pre-release validation scenario suite against the AutoGPT endpoint.",
  endpoint: "data/autogpt-endpoint.yaml",
  personas: "data/personas.yaml",
  rubric: "data/rubric.yaml",
  selection: SCENARIO_IDS.map((id) => ({
    file: "data/baseline-scenarios.yaml",
    id,
  })),
  parallel: { enabled: true, limit: 3 },
  repeat: 1,
  dryRun: false,
};

const preset = createPreset(input);
console.log(`Seeded preset "${preset.name}" with id ${preset.id}`);
