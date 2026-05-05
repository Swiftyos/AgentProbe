import type {
  AdapterReply,
  CheckpointAssertion,
  CheckpointResult,
  Endpoints,
  JsonValue,
  Persona,
  PresetRecord,
  PresetSnapshot,
  Rubric,
  RubricScore,
  RunRecord,
  RunResult,
  RunSummary,
  Scenario,
  ScenarioRunResult,
  ScenarioSelectionRef,
} from "../../shared/types/contracts.ts";

export type PersistenceBackendKind = "sqlite" | "postgres";

export type ParsedDbUrl = {
  kind: PersistenceBackendKind;
  /** Normalized URL used for display. Credentials are redacted. */
  displayUrl: string;
  /** Original URL passed by the caller (for driver use). Never log directly. */
  rawUrl: string;
};

export type PresetWriteInput = {
  name: string;
  description?: string | null;
  endpoint: string;
  personas: string;
  rubric: string;
  selection: ScenarioSelectionRef[];
  parallel?: {
    enabled?: boolean;
    limit?: number | null;
  };
  repeat?: number;
  dryRun?: boolean;
};

export type RunRecorderStartOptions = {
  endpoint: string;
  scenarios: string;
  personas: string;
  rubric: string;
  scenarioFilter?: string;
  tags?: string;
  label?: string;
  notes?: string;
  trigger?: string;
  presetId?: string | null;
  presetSnapshot?: PresetSnapshot | Record<string, JsonValue> | null;
};

export type RunRecorderConfigurationOptions = {
  endpointConfig: Endpoints;
  scenarioCollection: { scenarios: Scenario[] };
  personaCollection: { personas: Persona[] };
  rubricCollection: { rubrics: Rubric[] };
  selectedScenarios: Scenario[];
  scenarioFilter?: string;
  tags?: string;
};

export interface RunRecorder {
  readonly runId?: string;
  recordRunStarted(options: RunRecorderStartOptions): Promise<string>;
  recordRunConfiguration(
    options: RunRecorderConfigurationOptions,
  ): Promise<void>;
  recordRunFinished(result: RunResult): Promise<void>;
  recordRunCancelled(result?: RunResult): Promise<void>;
  recordRunError(error: Error, options: { exitCode: number }): Promise<void>;
  recordScenarioStarted(options: {
    scenario: Scenario;
    persona: Persona;
    rubric: Rubric;
    ordinal?: number;
    userId?: string;
  }): Promise<number>;
  recordTurn(
    scenarioRunId: number,
    options: {
      turnIndex: number;
      turn: { role: string; content?: string | null };
      source: string;
      generatorModel?: string;
    },
  ): Promise<void>;
  recordAssistantReply(
    scenarioRunId: number,
    options: { turnIndex: number; reply: AdapterReply },
  ): Promise<void>;
  recordCheckpoint(
    scenarioRunId: number,
    options: {
      checkpointIndex: number;
      precedingTurnIndex?: number;
      assertions: CheckpointAssertion[];
      result: CheckpointResult;
    },
  ): Promise<void>;
  recordJudgeResult(
    scenarioRunId: number,
    options: {
      rubric: Rubric;
      score: RubricScore;
      overallScore: number;
    },
  ): Promise<void>;
  recordScenarioFinished(
    scenarioRunId: number,
    options: { result: ScenarioRunResult },
  ): Promise<void>;
  recordScenarioError(scenarioRunId: number, error: Error): Promise<void>;
}

/**
 * Encrypted secret stored at rest. Encryption/decryption is the caller's
 * responsibility; the repository only holds the ciphertext envelope.
 */
export type StoredSecretEnvelope = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

/**
 * A persisted set of overrides for a single endpoint YAML file. Applied
 * automatically whenever that endpoint is used by the dashboard server.
 */
export type StoredEndpointOverride = {
  endpointPath: string;
  overrides: Record<string, unknown>;
  updatedAt: string;
};

/**
 * Filters applied to list/count queries over the `runs` table. Each field is
 * an exact-match filter; `null`/`undefined`/empty string mean "no filter".
 */
export type RunFilters = {
  status?: string | null;
  preset?: string | null;
  presetId?: string | null;
  trigger?: string | null;
  suiteFingerprint?: string | null;
};

export type ListRunsOptions = RunFilters & {
  limit?: number;
  offset?: number;
};

export interface RepositoryLifecycle {
  readonly kind: PersistenceBackendKind;
  readonly dbUrl: string;

  initialize(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Optional shape narrowing for `getRun`. When `summary` is true the per-scenario
 * child arrays (turns, target events, tool calls, checkpoints, judge dimension
 * scores) are returned empty so the caller pays for the run+scenarios head only.
 * When `ordinal` is set the result is restricted to that single scenario, with
 * its children fully populated. Defaults remain a full payload for every caller
 * that does not pass options.
 */
export interface GetRunOptions {
  summary?: boolean;
  ordinal?: number;
}

export interface RunHistoryReader extends RepositoryLifecycle {
  listRuns(options?: ListRunsOptions): Promise<RunSummary[]>;
  countRuns(filters?: RunFilters): Promise<number>;
  listRunsForPreset(presetId: string): Promise<RunSummary[]>;
  getRun(
    runId: string,
    options?: GetRunOptions,
  ): Promise<RunRecord | undefined>;
  latestRunForSuite(
    suiteFingerprint: string,
    options?: { beforeStartedAt?: string },
  ): Promise<RunRecord | undefined>;
}

/**
 * Read-only repository surface for historical run views and comparisons.
 */
export type ReadableRepository = RunHistoryReader;

export interface PresetRepository {
  createPreset(input: PresetWriteInput): Promise<PresetRecord>;
  upsertPresetByName(input: PresetWriteInput): Promise<PresetRecord>;
  getPreset(
    presetId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<PresetRecord | undefined>;
  listPresets(options?: { includeDeleted?: boolean }): Promise<PresetRecord[]>;
  updatePreset(
    presetId: string,
    input: Partial<PresetWriteInput>,
  ): Promise<PresetRecord | undefined>;
  softDeletePreset(presetId: string): Promise<PresetRecord | undefined>;
}

export interface RunMutationRepository {
  markRunCancelled(
    runId: string,
    options?: { exitCode?: number },
  ): Promise<RunRecord | undefined>;
  updateRunMetadata(
    runId: string,
    patch: { label?: string | null; notes?: string | null },
  ): Promise<RunRecord | undefined>;
}

export interface SecretRepository {
  getSecret(key: string): Promise<StoredSecretEnvelope | undefined>;
  putSecret(key: string, secret: StoredSecretEnvelope): Promise<void>;
  deleteSecret(key: string): Promise<boolean>;
}

export interface EndpointOverrideRepository {
  getEndpointOverride(
    endpointPath: string,
  ): Promise<StoredEndpointOverride | undefined>;
  listEndpointOverrides(): Promise<StoredEndpointOverride[]>;
  putEndpointOverride(
    endpointPath: string,
    overrides: Record<string, unknown>,
  ): Promise<StoredEndpointOverride>;
  deleteEndpointOverride(endpointPath: string): Promise<boolean>;
}

/**
 * Async-first persistence repository. SQLite and Postgres both implement this
 * surface; existing sync free-function callers keep working through compat
 * wrappers in `sqlite-run-history.ts`.
 */
export type PersistenceRepository = ReadableRepository &
  PresetRepository &
  RunMutationRepository &
  SecretRepository &
  EndpointOverrideRepository;

/**
 * Repository surface required by callers that create run recorders. Postgres is
 * intentionally excluded until it has an async/buffered recorder.
 */
export interface RecordingRepository extends PersistenceRepository {
  createRecorder(): RunRecorder;
}
