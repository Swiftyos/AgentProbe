import { runMigrations } from "../../../src/providers/persistence/migrations/index.ts";
import { createPostgresClient } from "../../../src/providers/persistence/postgres-client.ts";

const POSTGRES_TEST_LOCK_ID = 19_260_417;

export const postgresTestUrl = process.env.AGENTPROBE_POSTGRES_TEST_URL;

export async function withPostgresTestDatabase<T>(
  fn: (url: string) => Promise<T>,
): Promise<T | undefined> {
  if (!postgresTestUrl) {
    return undefined;
  }
  const sql = createPostgresClient(postgresTestUrl);
  await sql`select pg_advisory_lock(${POSTGRES_TEST_LOCK_ID})`;
  try {
    await sql.unsafe(`
      drop table if exists
        judge_dimension_scores,
        checkpoints,
        tool_calls,
        target_events,
        turns,
        scenario_runs,
        preset_scenarios,
        presets,
        endpoint_overrides,
        app_settings,
        runs,
        meta
      cascade
    `);
    await runMigrations(postgresTestUrl);
    return await fn(postgresTestUrl);
  } finally {
    await sql`select pg_advisory_unlock(${POSTGRES_TEST_LOCK_ID})`;
    await sql.end?.();
  }
}
