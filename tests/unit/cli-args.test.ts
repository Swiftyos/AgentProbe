import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

import {
  normalizeGlobalArgs,
  parseIntegerOption,
  parseParallelOption,
  resolveMigrationDbUrl,
} from "../../src/cli/args.ts";
import { executeCli } from "../../src/cli/main.ts";
import { makeTempDir } from "./support.ts";

describe("CLI argument parsing", () => {
  test("normalizes global data path and verbosity without changing command args", () => {
    expect(
      normalizeGlobalArgs([
        "--data-path",
        "fixtures",
        "-v",
        "list",
        "--tags",
        "smoke",
      ]),
    ).toEqual({
      args: ["list", "--tags", "smoke"],
      dataPath: "fixtures",
      verbosity: 1,
    });

    expect(normalizeGlobalArgs(["-vv", "validate"]).verbosity).toBe(2);
  });

  test("parses parallel limits and keeps the legacy misspelled flag compatible", () => {
    expect(parseParallelOption(["run"])).toEqual({ enabled: false });
    expect(parseParallelOption(["run", "--parallel"])).toEqual({
      enabled: true,
    });
    expect(parseParallelOption(["run", "--parallel", "3"])).toEqual({
      enabled: true,
      limit: 3,
    });
    expect(parseParallelOption(["run", "--parrallel", "2"])).toEqual({
      enabled: true,
      limit: 2,
    });
    expect(() => parseParallelOption(["run", "--parallel", "0"])).toThrow(
      /at least 1/,
    );
  });

  test("integer options reject partial and non-integer values", () => {
    expect(parseIntegerOption(["--repeat", "3"], "--repeat")).toBe(3);
    expect(() => parseIntegerOption(["--repeat", "3.5"], "--repeat")).toThrow(
      /integer/,
    );
    expect(() => parseIntegerOption(["--repeat", "3x"], "--repeat")).toThrow(
      /integer/,
    );
  });

  test("resolves db:migrate URLs from flags, env, paths, and defaults", () => {
    const root = makeTempDir("cli-db-url");
    const sqlitePath = join(root, "runs.sqlite3");
    expect(resolveMigrationDbUrl({ dbFlag: sqlitePath })).toBe(
      `sqlite:///${resolve(sqlitePath)}`,
    );
    expect(
      resolveMigrationDbUrl({
        dbFlag: "postgresql://user:secret@localhost/agentprobe",
      }),
    ).toBe("postgresql://user:secret@localhost/agentprobe");
    expect(
      resolveMigrationDbUrl({ envUrl: "sqlite:///tmp/agentprobe.sqlite3" }),
    ).toBe("sqlite:///tmp/agentprobe.sqlite3");
    expect(resolveMigrationDbUrl({})).toMatch(/sqlite:\/\/\/.*runs\.sqlite3$/);
    expect(() => resolveMigrationDbUrl({ dbFlag: "mysql://h/db" })).toThrow(
      /Unsupported database URL/,
    );
  });

  test("maps configuration errors to exit code 2 without throwing", async () => {
    const previousError = console.error;
    const lines: string[] = [];
    console.error = (...args: unknown[]) => {
      lines.push(args.join(" "));
    };
    try {
      await expect(executeCli(["not-a-command"])).resolves.toBe(2);
      expect(lines.join("\n")).toContain("Unknown command: not-a-command");
    } finally {
      console.error = previousError;
    }
  });
});
