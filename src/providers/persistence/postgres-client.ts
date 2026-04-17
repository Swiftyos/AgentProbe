import { AgentProbeConfigError } from "../../shared/utils/errors.ts";

/**
 * Tagged-template SQL function produced by Bun's built-in Postgres client.
 * We intentionally keep this typing narrow because Bun's SQL surface is
 * evolving and we want the rest of the codebase to use a simple facade.
 */
export interface SqlHelper {
  /** Tagged template form used for queries. */
  <Row = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Row[]>;
  /** Value-spread helper: `sql(['a','b'])` → sql-fragment for IN/VALUES clauses. */
  (values: readonly unknown[] | Record<string, unknown>): unknown;
}

export type SqlTag = SqlHelper & {
  /** Bun.sql exposes helpers like `sql.begin(fn)`. */
  begin: <T>(fn: (tx: SqlTag) => Promise<T>) => Promise<T>;
  /** Execute a raw SQL string (used for multi-statement DDL). */
  unsafe: <Row = Record<string, unknown>>(
    query: string,
    values?: unknown[],
  ) => Promise<Row[]>;
  end?: () => Promise<void>;
  close?: () => Promise<void>;
};

type BunWithSql = typeof Bun & {
  SQL?: new (url: string) => SqlTag;
};

/**
 * Resolve a Postgres client from `Bun.SQL`. Throws a clear ConfigError if the
 * runtime lacks Postgres support (e.g. an older Bun release).
 */
export function createPostgresClient(rawUrl: string): SqlTag {
  const runtime = Bun as BunWithSql;
  if (typeof runtime.SQL !== "function") {
    throw new AgentProbeConfigError(
      "Postgres backend requires Bun ≥ 1.2 (Bun.SQL). Upgrade Bun or switch to a `sqlite:///` URL.",
    );
  }
  try {
    return new runtime.SQL(rawUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AgentProbeConfigError(
      `Failed to open Postgres connection: ${reason}`,
    );
  }
}
