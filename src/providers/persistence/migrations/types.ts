import type { PersistenceBackendKind } from "../types.ts";

export type MigrationReport = {
  backend: PersistenceBackendKind;
  dbUrl: string;
  currentVersion: number;
  targetVersion: number;
  applied: number[];
};

export interface MigrationRunner {
  readonly backend: PersistenceBackendKind;
  readonly displayUrl: string;
  readonly targetVersion: number;
  /** Return current applied version (0 if no meta table). */
  currentVersion(): Promise<number> | number;
  /** Apply all missing migrations and return the list of applied versions. */
  migrate(): Promise<number[]> | number[];
}
