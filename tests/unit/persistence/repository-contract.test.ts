import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { PostgresRepository } from "../../../src/providers/persistence/postgres-backend.ts";
import { SqliteRepository } from "../../../src/providers/persistence/sqlite-backend.ts";
import type {
  RecordingRepository,
  RunRecorder,
} from "../../../src/providers/persistence/types.ts";
import type {
  Endpoints,
  Persona,
  Rubric,
  Scenario,
} from "../../../src/shared/types/contracts.ts";
import {
  adapterReply,
  buildPersona,
  buildRubric,
  buildScenario,
  buildScore,
  makeTempDir,
  toolCall,
} from "../support.ts";
import { withPostgresTestDatabase } from "./postgres-test-utils.ts";

const endpointConfig: Endpoints = {
  metadata: { sourcePath: "data/endpoints.yaml" },
  transport: "http",
  preset: "contract-preset",
  connection: { baseUrl: "https://example.test" },
  endpoints: {},
};

const scenario: Scenario = buildScenario({
  id: "contract-scenario",
  name: "Contract Scenario",
  tags: ["contract"],
});
const persona: Persona = buildPersona();
const rubric: Rubric = buildRubric();

type ContractBackend = {
  name: string;
  create: () => Promise<RecordingRepository>;
};

async function recordCompletedRun(
  repo: RecordingRepository,
  options: {
    trigger?: string;
    presetId?: string | null;
    label?: string;
    startedRunName?: string;
  } = {},
): Promise<string> {
  const recorder = repo.createRecorder();
  const runId = await recorder.recordRunStarted({
    endpoint: "data/endpoints.yaml",
    scenarios: "data/scenarios.yaml",
    personas: "data/personas.yaml",
    rubric: "data/rubric.yaml",
    trigger: options.trigger ?? "contract",
    label: options.label,
    presetId: options.presetId ?? null,
    presetSnapshot: options.presetId
      ? {
          id: options.presetId,
          name: "Contract Preset",
          description: null,
          endpoint: "data/endpoints.yaml",
          personas: "data/personas.yaml",
          rubric: "data/rubric.yaml",
          selection: [{ file: "data/scenarios.yaml", id: scenario.id }],
          parallel: { enabled: false, limit: null },
          repeat: 1,
          dryRun: false,
          createdAt: "2026-04-17T00:00:00.000Z",
          updatedAt: "2026-04-17T00:00:00.000Z",
          deletedAt: null,
        }
      : null,
  });
  await recorder.recordRunConfiguration({
    endpointConfig,
    scenarioCollection: { scenarios: [scenario] },
    personaCollection: { personas: [persona] },
    rubricCollection: { rubrics: [rubric] },
    selectedScenarios: [scenario],
  });
  const scenarioRunId = await recorder.recordScenarioStarted({
    scenario,
    persona,
    rubric,
    ordinal: 0,
    userId: "contract-user",
  });
  await recorder.recordTurn(scenarioRunId, {
    turnIndex: 0,
    turn: { role: "user", content: options.startedRunName ?? "hello" },
    source: "user_exact",
  });
  await recorder.recordTurn(scenarioRunId, {
    turnIndex: 1,
    turn: { role: "assistant", content: "done" },
    source: "assistant",
  });
  await recorder.recordAssistantReply(scenarioRunId, {
    turnIndex: 1,
    reply: adapterReply("done", {
      toolCalls: [toolCall("lookup", { token: "secret-token" }, { order: 0 })],
      rawExchange: { api_key: "secret-key", visible: "ok" },
      latencyMs: 4,
      usage: { total_tokens: 3 },
    }),
  });
  await recorder.recordJudgeResult(scenarioRunId, {
    rubric,
    score: buildScore(),
    overallScore: 0.8,
  });
  await recorder.recordScenarioFinished(scenarioRunId, {
    result: {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      personaId: persona.id,
      rubricId: rubric.id,
      userId: "contract-user",
      passed: true,
      overallScore: 0.8,
      transcript: [],
      checkpoints: [],
      judgeScore: buildScore(),
    },
  });
  await recorder.recordRunFinished({
    runId,
    passed: true,
    exitCode: 0,
    results: [],
  });
  return runId;
}

async function recordCancelledRun(
  repo: RecordingRepository,
): Promise<{ runId: string; recorder: RunRecorder }> {
  const recorder = repo.createRecorder();
  const runId = await recorder.recordRunStarted({
    endpoint: "data/endpoints.yaml",
    scenarios: "data/scenarios.yaml",
    personas: "data/personas.yaml",
    rubric: "data/rubric.yaml",
    trigger: "contract-cancel",
  });
  await recorder.recordRunConfiguration({
    endpointConfig,
    scenarioCollection: { scenarios: [scenario] },
    personaCollection: { personas: [persona] },
    rubricCollection: { rubrics: [rubric] },
    selectedScenarios: [scenario],
  });
  return { runId, recorder };
}

async function runRepositoryContract(backend: ContractBackend): Promise<void> {
  const repo = await backend.create();
  await repo.initialize();
  try {
    const preset = await repo.createPreset({
      name: `${backend.name} Contract Preset`,
      description: "Characterization preset",
      endpoint: "data/endpoints.yaml",
      personas: "data/personas.yaml",
      rubric: "data/rubric.yaml",
      selection: [{ file: "data/scenarios.yaml", id: scenario.id }],
      parallel: { enabled: true, limit: 2 },
      repeat: 1,
      dryRun: false,
    });
    const runId = await recordCompletedRun(repo, {
      presetId: preset.id,
      label: "Initial label",
    });

    const persisted = await repo.getRun(runId);
    expect(persisted?.status).toBe("completed");
    expect(persisted?.label).toBe("Initial label");
    expect(persisted?.presetSnapshot?.name).toBe("Contract Preset");
    expect(persisted?.aggregateCounts).toEqual({
      scenarioTotal: 1,
      scenarioPassedCount: 1,
      scenarioFailedCount: 0,
      scenarioHarnessFailedCount: 0,
      scenarioErroredCount: 0,
    });
    expect(JSON.stringify(persisted?.scenarios[0]?.toolCalls ?? [])).toContain(
      "[REDACTED]",
    );

    expect(await repo.countRuns({ trigger: "contract" })).toBe(1);
    expect(await repo.listRuns({ status: "completed" })).toHaveLength(1);
    expect(await repo.listRuns({ preset: "contract-preset" })).toHaveLength(1);
    expect(await repo.listRunsForPreset(preset.id)).toHaveLength(1);

    const latest = await repo.latestRunForSuite(
      persisted?.suiteFingerprint ?? "",
    );
    expect(latest?.runId).toBe(runId);

    const updated = await repo.updateRunMetadata(runId, {
      label: "Updated label",
      notes: "Updated notes",
    });
    expect(updated?.label).toBe("Updated label");
    expect(updated?.notes).toBe("Updated notes");

    await repo.putSecret("open_router", {
      ciphertext: "ciphertext",
      iv: "iv",
      authTag: "tag",
    });
    expect(await repo.getSecret("open_router")).toEqual({
      ciphertext: "ciphertext",
      iv: "iv",
      authTag: "tag",
    });
    expect(await repo.deleteSecret("open_router")).toBe(true);

    const override = await repo.putEndpointOverride("endpoints.yaml", {
      base_url: "https://override.test",
    });
    expect(override.endpointPath).toBe("endpoints.yaml");
    expect(await repo.listEndpointOverrides()).toHaveLength(1);
    expect(await repo.deleteEndpointOverride("endpoints.yaml")).toBe(true);

    const { runId: cancelRunId, recorder } = await recordCancelledRun(repo);
    await recorder.recordRunCancelled({
      runId: cancelRunId,
      exitCode: 130,
      results: [],
      passed: false,
      cancelled: true,
    });
    const cancelled = await repo.getRun(cancelRunId);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.cancelledAt).toBeTruthy();

    const manualCancelled = await repo.markRunCancelled(runId);
    expect(manualCancelled?.status).toBe("cancelled");
  } finally {
    await repo.close?.();
  }
}

describe("RecordingRepository contract", () => {
  test("SQLite implements the shared run/preset/settings contract", async () => {
    const dir = makeTempDir("repo-contract-sqlite");
    await runRepositoryContract({
      name: "sqlite",
      create: async () =>
        new SqliteRepository(`sqlite:///${join(dir, "runs.sqlite3")}`),
    });
  });

  test("Postgres implements the shared run/preset/settings contract when configured", async () => {
    await withPostgresTestDatabase(async (url) => {
      await runRepositoryContract({
        name: "postgres",
        create: async () => new PostgresRepository(url),
      });
    });
  });
});
