#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

type Scenario = {
  id: string;
  name: string;
  turns?: Array<{ content?: string }>;
};

const YAML_PATH = "data/baseline-scenarios.yaml";
const OUT_PATH = "data/fixtures-checklist.md";

const FILE_EXT_RE =
  /\.(csv|json|xlsx|txt|pdf|tsv|xml|html|zip|png|jpg|jpeg|docx|doc|xls|md|ics|sql|log|ipynb|yaml|yml|mp4|wav|mp3|srt|pcap|geojson)\b/i;

const PAIR_RE =
  /"([A-Za-z0-9_/.-]+\.(?:csv|json|xlsx|txt|pdf|tsv|xml|html|zip|png|jpg|jpeg|docx|doc|xls|md|ics|sql|log|ipynb|yaml|yml|mp4|wav|mp3|srt|pcap|geojson))":\s*"((?:[^"\\]|\\.)*)"/gi;

const BARE_RE =
  /([A-Za-z0-9_/.-]+\.(?:csv|json|xlsx|txt|pdf|tsv|xml|html|zip|png|jpg|jpeg|docx|doc|xls|md|ics|sql|log|ipynb|yaml|yml|mp4|wav|mp3|srt|pcap|geojson))/gi;

function normalizeName(raw: string): string | null {
  let name = raw.trim();
  name = name.replace(/^\.?\//, "");
  name = name.replace(/^(fixtures|Fixtures)\//, "");
  if (!name) return null;
  if (name.includes("YYYY-MM-DD")) return null;
  if (name.includes(" ")) return null;
  if (name.startsWith("//")) return null;
  if (name.startsWith("http://") || name.startsWith("https://")) return null;
  if (!FILE_EXT_RE.test(name)) return null;
  if (name.startsWith(".")) return null;
  return name;
}

const doc = parseYaml(readFileSync(YAML_PATH, "utf-8")) as {
  scenarios: Scenario[];
};

type Entry = { file: string; description: string };
const byScenario = new Map<string, { name: string; entries: Entry[] }>();
const globalDescriptions = new Map<string, string>();

for (const sc of doc.scenarios ?? []) {
  const entriesMap = new Map<string, string>();
  for (const turn of sc.turns ?? []) {
    const text = turn.content ?? "";
    if (!text) continue;
    for (const m of text.matchAll(PAIR_RE)) {
      const name = normalizeName(m[1]);
      if (!name) continue;
      const desc = m[2].trim();
      const existingEntry = entriesMap.get(name);
      if (existingEntry === undefined || existingEntry.length < desc.length) {
        entriesMap.set(name, desc);
      }
      const existingGlobal = globalDescriptions.get(name);
      if (existingGlobal === undefined || existingGlobal.length < desc.length) {
        globalDescriptions.set(name, desc);
      }
    }
    for (const m of text.matchAll(BARE_RE)) {
      const name = normalizeName(m[1]);
      if (!name) continue;
      if (!entriesMap.has(name)) entriesMap.set(name, "");
      if (!globalDescriptions.has(name)) globalDescriptions.set(name, "");
    }
  }
  if (entriesMap.size > 0) {
    byScenario.set(sc.id, {
      name: sc.name,
      entries: [...entriesMap].map(([file, description]) => ({
        file,
        description,
      })),
    });
  }
}

const lines: string[] = [];
lines.push("# Fixtures checklist — baseline-scenarios.yaml");
lines.push("");
lines.push(`Total unique files: **${globalDescriptions.size}**`);
lines.push(`Scenarios referencing fixtures: **${byScenario.size}**`);
lines.push("");

for (const [id, { name, entries }] of byScenario) {
  lines.push(`## ${id} — ${name}`);
  lines.push("");
  entries.sort((a, b) => a.file.localeCompare(b.file));
  for (const entry of entries) {
    const desc = entry.description
      ? ` — ${entry.description.replace(/\|/g, "\\|")}`
      : "";
    lines.push(`- [ ] \`${entry.file}\`${desc}`);
  }
  lines.push("");
}

lines.push("## Unique files summary");
lines.push("");
const sorted = [...globalDescriptions].sort(([a], [b]) => a.localeCompare(b));
for (const [file, desc] of sorted) {
  lines.push(
    `- [ ] \`${file}\`${desc ? ` — ${desc.replace(/\|/g, "\\|")}` : ""}`,
  );
}

writeFileSync(OUT_PATH, `${lines.join("\n")}\n`);
console.log(`Wrote ${OUT_PATH}`);
console.log(`Unique files: ${globalDescriptions.size}`);
console.log(`Scenarios with fixtures: ${byScenario.size}`);
