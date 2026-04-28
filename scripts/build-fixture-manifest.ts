#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

type Scenario = {
  id: string;
  name: string;
  persona?: string;
  turns?: Array<{ content?: string }>;
};

const YAML_PATH = "data/baseline-scenarios.yaml";
const OUT_PATH = "data/fixture-manifest.json";

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
  if (name.startsWith("//") || name.startsWith("http")) return null;
  if (!FILE_EXT_RE.test(name)) return null;
  if (name.startsWith(".")) return null;
  return name;
}

const doc = parseYaml(readFileSync(YAML_PATH, "utf-8")) as {
  scenarios: Scenario[];
};

type Manifest = {
  file: string;
  description: string;
  scenarioId: string;
  scenarioName: string;
  persona?: string;
  context: string;
  userRequest: string;
};

const manifest = new Map<string, Manifest>();

for (const sc of doc.scenarios ?? []) {
  for (const turn of sc.turns ?? []) {
    const text = turn.content ?? "";
    if (!text) continue;

    const userRequest = text.split(/\n\s*Context:/)[0]?.trim() ?? text;
    const contextMatch = text.match(/Context:\s*([\s\S]+)$/);
    const context = contextMatch?.[1]?.trim() ?? "";

    const seen = new Set<string>();

    for (const m of text.matchAll(PAIR_RE)) {
      const name = normalizeName(m[1]);
      if (!name) continue;
      seen.add(name);
      const desc = m[2].trim();
      const existing = manifest.get(name);
      if (!existing || desc.length > existing.description.length) {
        manifest.set(name, {
          file: name,
          description: desc,
          scenarioId: sc.id,
          scenarioName: sc.name,
          persona: sc.persona,
          context,
          userRequest,
        });
      }
    }
    for (const m of text.matchAll(BARE_RE)) {
      const name = normalizeName(m[1]);
      if (!name) continue;
      if (seen.has(name)) continue;
      if (!manifest.has(name)) {
        manifest.set(name, {
          file: name,
          description: "",
          scenarioId: sc.id,
          scenarioName: sc.name,
          persona: sc.persona,
          context,
          userRequest,
        });
      }
    }
  }
}

const entries = [...manifest.values()].sort((a, b) =>
  a.file.localeCompare(b.file),
);
writeFileSync(OUT_PATH, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Wrote ${OUT_PATH} with ${entries.length} entries`);
