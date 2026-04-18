#!/usr/bin/env bun
/**
 * Generates a workspace inventory for mechanical repo-map verification.
 * Output: docs/generated/workspace-inventory.md
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const OUTPUT = join(REPO_ROOT, "docs", "generated", "workspace-inventory.md");

interface Entry {
  path: string;
  type: "dir" | "file";
}

function trackedFiles(): string[] {
  const result = spawnSync("git", ["ls-files"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(`git ls-files failed${stderr ? `: ${stderr}` : ""}`);
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((path) => !path.split("/").some((part) => part.startsWith(".")))
    .sort();
}

function inventoryEntries(files: string[], maxDepth = 3): Entry[] {
  const entries = new Map<string, Entry>();

  for (const file of files) {
    const parts = file.split("/");
    const parentParts = parts.slice(0, -1);

    for (
      let depth = 1;
      depth <= Math.min(parentParts.length, maxDepth + 1);
      depth++
    ) {
      const dir = `${parentParts.slice(0, depth).join("/")}/`;
      entries.set(dir, { path: dir, type: "dir" });
    }

    if (parentParts.length <= maxDepth) {
      entries.set(file, { path: file, type: "file" });
    }
  }

  return [...entries.values()].sort((a, b) =>
    a.path === b.path ? 0 : a.path < b.path ? -1 : 1,
  );
}

const entries = inventoryEntries(trackedFiles());
const lines = [
  "# Workspace Inventory",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "```text",
  ...entries.map((e) => (e.type === "dir" ? e.path : `  ${e.path}`)),
  "```",
  "",
];

mkdirSync(join(REPO_ROOT, "docs", "generated"), { recursive: true });
writeFileSync(OUTPUT, lines.join("\n"));
console.log(`Wrote ${OUTPUT}`);
