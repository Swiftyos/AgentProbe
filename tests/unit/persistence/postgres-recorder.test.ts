import { describe, expect, test } from "bun:test";

import { PostgresRepository } from "../../../src/providers/persistence/postgres-backend.ts";
import type {
  Endpoints,
  Persona,
  Rubric,
  Scenario,
} from "../../../src/shared/types/contracts.ts";
import { withPostgresTestDatabase } from "./postgres-test-utils.ts";

const scenario: Scenario = {
  id: "scenario-a",
  name: "Scenario A",
  tags: ["postgres"],
  persona: "persona-a",
  rubric: "rubric-a",
  turns: [],
  sessions: [],
  expectations: {
    mustInclude: ["done"],
    mustNotInclude: [],
    expectedTools: [{ name: "lookup" }],
    failureModes: [],
  },
};

const persona: Persona = {
  id: "persona-a",
  name: "Persona A",
  demographics: {
    role: "tester",
    techLiteracy: "high",
    domainExpertise: "expert",
    languageStyle: "terse",
  },
  personality: {
    patience: 5,
    assertiveness: 5,
    detailOrientation: 5,
    cooperativeness: 5,
    emotionalIntensity: 1,
  },
  behavior: {
    openingStyle: "direct",
    followUpStyle: "direct",
    escalationTriggers: [],
    topicDrift: "none",
    clarificationCompliance: "high",
  },
  systemPrompt: "Test the target.",
};

const rubric: Rubric = {
  id: "rubric-a",
  name: "Rubric A",
  passThreshold: 0.7,
  metaPrompt: "Judge the transcript.",
  dimensions: [
    {
      id: "quality",
      name: "Quality",
      weight: 1,
      scale: { type: "numeric", points: 5, labels: {} },
      judgePrompt: "Score quality.",
    },
  ],
  judge: {
    provider: "openai",
    model: "gpt-test",
    temperature: 0,
    maxTokens: 256,
  },
};

const endpointConfig: Endpoints = {
  metadata: {},
  transport: "http",
  endpoints: {},
};

describe("PostgresRunRecorder", () => {
  test("persists a full recorder lifecycle and aggregates", async () => {
    await withPostgresTestDatabase(async (url) => {
      const repo = new PostgresRepository(url);
      await repo.initialize();
      try {
        const recorder = repo.createRecorder();
        const runId = await recorder.recordRunStarted({
          endpoint: "data/endpoints.yaml",
          scenarios: "data/scenarios.yaml",
          personas: "data/personas.yaml",
          rubric: "data/rubrics.yaml",
          trigger: "test",
          label: "postgres-recorder",
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
          userId: "user-a",
        });
        await recorder.recordTurn(scenarioRunId, {
          turnIndex: 0,
          turn: { role: "user", content: "please help" },
          source: "user_exact",
        });
        await recorder.recordTurn(scenarioRunId, {
          turnIndex: 1,
          turn: { role: "assistant", content: "done" },
          source: "assistant",
        });
        await recorder.recordAssistantReply(scenarioRunId, {
          turnIndex: 1,
          reply: {
            assistantText: "done",
            toolCalls: [
              {
                name: "lookup",
                order: 0,
                args: { id: "abc" },
                raw: { name: "lookup" },
              },
            ],
            rawExchange: { status: "ok" },
            latencyMs: 12,
            usage: { total_tokens: 4 },
          },
        });
        await recorder.recordCheckpoint(scenarioRunId, {
          checkpointIndex: 0,
          precedingTurnIndex: 1,
          assertions: [{ responseContainsAny: ["done"] }],
          result: { passed: true, failures: [] },
        });
        await recorder.recordJudgeResult(scenarioRunId, {
          rubric,
          overallScore: 1,
          score: {
            dimensions: {
              quality: { reasoning: "good", evidence: ["done"], score: 5 },
            },
            overallNotes: "passed",
            passed: true,
          },
        });
        await recorder.recordScenarioFinished(scenarioRunId, {
          result: {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            personaId: persona.id,
            rubricId: rubric.id,
            userId: "user-a",
            passed: true,
            overallScore: 1,
            transcript: [],
            checkpoints: [],
          },
        });
        await recorder.recordRunFinished({
          runId,
          passed: true,
          exitCode: 0,
          results: [],
        });

        const persisted = await repo.getRun(runId);
        expect(persisted?.status).toBe("completed");
        expect(persisted?.aggregateCounts).toEqual({
          scenarioTotal: 1,
          scenarioPassedCount: 1,
          scenarioFailedCount: 0,
          scenarioHarnessFailedCount: 0,
          scenarioErroredCount: 0,
        });
        expect(persisted?.scenarios[0]?.counts).toEqual({
          turnCount: 2,
          assistantTurnCount: 1,
          toolCallCount: 1,
          checkpointCount: 1,
        });
      } finally {
        await repo.close();
      }
    });
  });
});
