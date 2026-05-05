import { resolve } from "node:path";

import {
  DEFAULT_DB_DIRNAME,
  DEFAULT_DB_FILENAME,
} from "../providers/persistence/sqlite-run-history.ts";
import { parseDbUrl } from "../providers/persistence/url.ts";
import { AgentProbeConfigError } from "../shared/utils/errors.ts";

export type GlobalCliOptions = {
  args: string[];
  dataPath?: string;
  verbosity: 0 | 1 | 2;
};

const URL_SCHEME_RE = /^[A-Za-z][A-Za-z\d+.-]*:\/\//;

export function parseFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function parseIntegerValue(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || String(parsed) !== value.trim()) {
    throw new AgentProbeConfigError(`${name} requires an integer value.`);
  }
  return parsed;
}

export function parseOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

export function parseIntegerOption(
  args: string[],
  name: string,
): number | undefined {
  const value = parseOption(args, name);
  if (value === undefined) {
    return undefined;
  }
  return parseIntegerValue(name, value);
}

export function parseParallelOption(args: string[]): {
  enabled: boolean;
  limit?: number;
} {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== "--parallel" && arg !== "--parrallel") {
      continue;
    }

    const rawLimit = args[index + 1];
    if (rawLimit === undefined || rawLimit.startsWith("--")) {
      return { enabled: true };
    }

    const limit = parseIntegerValue("--parallel", rawLimit);
    if (limit < 1) {
      throw new AgentProbeConfigError(
        "--parallel must be at least 1 when a limit is provided.",
      );
    }
    return { enabled: true, limit };
  }

  return { enabled: false };
}

export function normalizeGlobalArgs(argv: string[]): GlobalCliOptions {
  const args: string[] = [];
  let dataPath: string | undefined;
  let verbosity = 0;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--data-path") {
      dataPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "-vv") {
      verbosity = Math.max(verbosity, 2);
      continue;
    }
    if (arg === "-v" || arg === "--verbose") {
      verbosity = Math.min(2, verbosity + 1);
      continue;
    }
    args.push(arg);
  }

  return {
    args,
    dataPath,
    verbosity: verbosity >= 2 ? 2 : verbosity === 1 ? 1 : 0,
  };
}

export function resolveMigrationDbUrl(options: {
  dbFlag?: string;
  envUrl?: string;
}): string {
  let resolvedUrl: string;
  if (options.dbFlag) {
    if (
      options.dbFlag.startsWith("sqlite://") ||
      options.dbFlag.startsWith("postgres://") ||
      options.dbFlag.startsWith("postgresql://") ||
      URL_SCHEME_RE.test(options.dbFlag)
    ) {
      resolvedUrl = options.dbFlag;
    } else {
      resolvedUrl = `sqlite:///${resolve(options.dbFlag)}`;
    }
  } else if (options.envUrl) {
    resolvedUrl = options.envUrl;
  } else {
    resolvedUrl = `sqlite:///${resolve(DEFAULT_DB_DIRNAME, DEFAULT_DB_FILENAME)}`;
  }

  parseDbUrl(resolvedUrl);
  return resolvedUrl;
}
