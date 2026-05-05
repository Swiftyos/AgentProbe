import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { PROJECT_ROOT } from "../support.ts";

function tsFiles(root: string): string[] {
  const entries = readdirSync(root);
  return entries.flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return tsFiles(path);
    }
    return path.endsWith(".ts") ? [path] : [];
  });
}

describe("architecture boundaries", () => {
  test("evaluation domain does not import concrete providers or runtime modules", () => {
    const root = join(PROJECT_ROOT, "src", "domains", "evaluation");
    const offenders = tsFiles(root).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const lines = source.split("\n");
      return lines.flatMap((line, index) => {
        if (
          /from\s+["'][^"']*(providers|runtime)\//.test(line) ||
          /import\s*\([^)]*(providers|runtime)\//.test(line)
        ) {
          return [`${relative(PROJECT_ROOT, path)}:${index + 1}: ${line}`];
        }
        return [];
      });
    });

    expect(offenders).toEqual([]);
  });
});
