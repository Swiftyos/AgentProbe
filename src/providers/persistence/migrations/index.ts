import { parseDbUrl } from "../url.ts";
import {
  createPostgresMigrationRunner,
  POSTGRES_TARGET_VERSION,
} from "./postgres.ts";
import {
  createSqliteMigrationRunner,
  SQLITE_TARGET_VERSION,
} from "./sqlite.ts";
import type { MigrationReport, MigrationRunner } from "./types.ts";

export type { MigrationReport, MigrationRunner };
export { POSTGRES_TARGET_VERSION, SQLITE_TARGET_VERSION };

/** Build the correct migration runner for the given URL. */
export function getMigrationRunner(dbUrl: string): MigrationRunner {
  const parsed = parseDbUrl(dbUrl);
  if (parsed.kind === "sqlite") {
    return createSqliteMigrationRunner(parsed.rawUrl, parsed.displayUrl);
  }
  return createPostgresMigrationRunner(parsed.rawUrl, parsed.displayUrl);
}

/** Run migrations and return a structured report. */
export async function runMigrations(dbUrl: string): Promise<MigrationReport> {
  const runner = getMigrationRunner(dbUrl);
  const currentVersion = await runner.currentVersion();
  const applied = await runner.migrate();
  return {
    backend: runner.backend,
    dbUrl: runner.displayUrl,
    currentVersion,
    targetVersion: runner.targetVersion,
    applied,
  };
}

/** Read version without mutating — used for Postgres boot-time checks. */
export async function checkSchemaVersion(
  dbUrl: string,
): Promise<MigrationReport> {
  const runner = getMigrationRunner(dbUrl);
  const currentVersion = await runner.currentVersion();
  return {
    backend: runner.backend,
    dbUrl: runner.displayUrl,
    currentVersion,
    targetVersion: runner.targetVersion,
    applied: [],
  };
}
