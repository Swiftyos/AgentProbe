import { AgentProbeConfigError } from "../../shared/utils/errors.ts";
import type { ParsedDbUrl, PersistenceBackendKind } from "./types.ts";

const POSTGRES_USERINFO_RE = /^(postgres(?:ql)?:\/\/)([^@/]+)@/;

/** Redact `user:password@host` to `user:***@host` for logging. */
export function redactDbUrl(dbUrl: string): string {
  if (!dbUrl) {
    return dbUrl;
  }
  return dbUrl.replace(POSTGRES_USERINFO_RE, (_match, scheme, userinfo) => {
    const [user] = String(userinfo).split(":");
    return `${scheme}${user}:***@`;
  });
}

/** Parse a db URL into a normalized descriptor with backend kind and redacted display URL. */
export function parseDbUrl(rawUrl: string): ParsedDbUrl {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    throw new AgentProbeConfigError("Database URL must be a non-empty string.");
  }
  const trimmed = rawUrl.trim();
  let kind: PersistenceBackendKind;
  if (trimmed.startsWith("sqlite://")) {
    kind = "sqlite";
  } else if (
    trimmed.startsWith("postgres://") ||
    trimmed.startsWith("postgresql://")
  ) {
    kind = "postgres";
  } else {
    throw new AgentProbeConfigError(
      `Unsupported database URL scheme: ${redactDbUrl(trimmed)}. ` +
        "Expected `sqlite:///path/to.db`, `postgres://…`, or `postgresql://…`.",
    );
  }
  return {
    kind,
    displayUrl: redactDbUrl(trimmed),
    rawUrl: trimmed,
  };
}

/** Return `true` if the URL points to Postgres. Used when only the scheme matters. */
export function isPostgresUrl(rawUrl: string): boolean {
  return rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://");
}
