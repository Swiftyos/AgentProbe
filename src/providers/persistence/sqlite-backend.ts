import {
  initDb,
  SqliteRunRecorder,
  createPreset as sqliteCreatePreset,
  deleteEndpointOverride as sqliteDeleteEndpointOverride,
  deleteStoredSecret as sqliteDeleteStoredSecret,
  getEndpointOverride as sqliteGetEndpointOverride,
  getPreset as sqliteGetPreset,
  getRun as sqliteGetRun,
  getStoredSecret as sqliteGetStoredSecret,
  latestRunForSuite as sqliteLatestRunForSuite,
  listEndpointOverrides as sqliteListEndpointOverrides,
  listPresets as sqliteListPresets,
  listRuns as sqliteListRuns,
  listRunsForPreset as sqliteListRunsForPreset,
  markRunCancelled as sqliteMarkRunCancelled,
  putEndpointOverride as sqlitePutEndpointOverride,
  putStoredSecret as sqlitePutStoredSecret,
  softDeletePreset as sqliteSoftDeletePreset,
  updatePreset as sqliteUpdatePreset,
  updateRunMetadata as sqliteUpdateRunMetadata,
} from "./sqlite-run-history.ts";
import type {
  PresetWriteInput,
  RecordingRepository,
  RunRecorder,
  StoredEndpointOverride,
  StoredSecretEnvelope,
} from "./types.ts";

/** SQLite-backed repository; wraps the existing synchronous free-function API. */
export class SqliteRepository implements RecordingRepository {
  readonly kind = "sqlite" as const;
  readonly dbUrl: string;

  constructor(dbUrl: string) {
    this.dbUrl = dbUrl;
  }

  async initialize(): Promise<void> {
    initDb(this.dbUrl);
  }

  createRecorder(): RunRecorder {
    return new SqliteRunRecorder(this.dbUrl);
  }

  async createPreset(input: PresetWriteInput) {
    return sqliteCreatePreset(input, { dbUrl: this.dbUrl });
  }

  async getPreset(
    presetId: string,
    options: { includeDeleted?: boolean } = {},
  ) {
    return sqliteGetPreset(presetId, {
      dbUrl: this.dbUrl,
      includeDeleted: options.includeDeleted,
    });
  }

  async listPresets(options: { includeDeleted?: boolean } = {}) {
    return sqliteListPresets({
      dbUrl: this.dbUrl,
      includeDeleted: options.includeDeleted,
    });
  }

  async updatePreset(presetId: string, input: Partial<PresetWriteInput>) {
    return sqliteUpdatePreset(presetId, input, { dbUrl: this.dbUrl });
  }

  async softDeletePreset(presetId: string) {
    return sqliteSoftDeletePreset(presetId, { dbUrl: this.dbUrl });
  }

  async listRuns() {
    return sqliteListRuns({ dbUrl: this.dbUrl });
  }

  async listRunsForPreset(presetId: string) {
    return sqliteListRunsForPreset(presetId, { dbUrl: this.dbUrl });
  }

  async getRun(runId: string) {
    return sqliteGetRun(runId, { dbUrl: this.dbUrl });
  }

  async latestRunForSuite(
    suiteFingerprint: string,
    options: { beforeStartedAt?: string } = {},
  ) {
    return sqliteLatestRunForSuite(suiteFingerprint, {
      dbUrl: this.dbUrl,
      beforeStartedAt: options.beforeStartedAt,
    });
  }

  async markRunCancelled(runId: string, options: { exitCode?: number } = {}) {
    return sqliteMarkRunCancelled(runId, {
      dbUrl: this.dbUrl,
      exitCode: options.exitCode,
    });
  }

  async updateRunMetadata(
    runId: string,
    patch: { label?: string | null; notes?: string | null },
  ) {
    return sqliteUpdateRunMetadata(runId, patch, { dbUrl: this.dbUrl });
  }

  async getSecret(key: string): Promise<StoredSecretEnvelope | undefined> {
    return sqliteGetStoredSecret(key, { dbUrl: this.dbUrl });
  }

  async putSecret(key: string, secret: StoredSecretEnvelope): Promise<void> {
    sqlitePutStoredSecret(key, secret, { dbUrl: this.dbUrl });
  }

  async deleteSecret(key: string): Promise<boolean> {
    return sqliteDeleteStoredSecret(key, { dbUrl: this.dbUrl });
  }

  async getEndpointOverride(
    endpointPath: string,
  ): Promise<StoredEndpointOverride | undefined> {
    return sqliteGetEndpointOverride(endpointPath, { dbUrl: this.dbUrl });
  }

  async listEndpointOverrides(): Promise<StoredEndpointOverride[]> {
    return sqliteListEndpointOverrides({ dbUrl: this.dbUrl });
  }

  async putEndpointOverride(
    endpointPath: string,
    overrides: Record<string, unknown>,
  ): Promise<StoredEndpointOverride> {
    sqlitePutEndpointOverride(endpointPath, overrides, { dbUrl: this.dbUrl });
    const stored = sqliteGetEndpointOverride(endpointPath, {
      dbUrl: this.dbUrl,
    });
    if (!stored) {
      throw new Error(
        `Endpoint override for \`${endpointPath}\` was not found after insert.`,
      );
    }
    return stored;
  }

  async deleteEndpointOverride(endpointPath: string): Promise<boolean> {
    return sqliteDeleteEndpointOverride(endpointPath, { dbUrl: this.dbUrl });
  }
}
