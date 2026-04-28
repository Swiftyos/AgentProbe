#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { Pair, parseDocument, YAMLMap, YAMLSeq } from "yaml";

const YAML_PATH = "data/baseline-scenarios.yaml";
const OUT_PATH = process.argv.includes("--in-place")
  ? YAML_PATH
  : "data/baseline-scenarios.patched.yaml";

const FILE_EXT_RE =
  /\.(csv|json|xlsx|txt|pdf|tsv|xml|html|zip|png|jpg|jpeg|docx|doc|xls|md|ics|sql|log|ipynb|yaml|yml|mp4|wav|mp3|srt|pcap|geojson)\b/i;

const PAIR_RE =
  /"([A-Za-z0-9_/.-]+\.(?:csv|json|xlsx|txt|pdf|tsv|xml|html|zip|png|jpg|jpeg|docx|doc|xls|md|ics|sql|log|ipynb|yaml|yml|mp4|wav|mp3|srt|pcap|geojson))":\s*"((?:[^"\\]|\\.)*)"/gi;

const BARE_RE =
  /(?<![A-Za-z0-9_/.-])(?:fixtures\/)?([A-Za-z0-9_/.-]+\.(?:csv|json|xlsx|txt|pdf|tsv|xml|html|zip|png|jpg|jpeg|docx|doc|xls|md|ics|sql|log|ipynb|yaml|yml|mp4|wav|mp3|srt|pcap|geojson))(?![A-Za-z0-9_/.-])/gi;

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

function extractFixtureNames(content: string): string[] {
  const names = new Set<string>();
  for (const m of content.matchAll(PAIR_RE)) {
    const n = normalizeName(m[1]);
    if (n) names.add(n);
  }
  for (const m of content.matchAll(BARE_RE)) {
    const n = normalizeName(m[1]);
    if (n) names.add(n);
  }
  return [...names].sort();
}

const src = readFileSync(YAML_PATH, "utf-8");
const doc = parseDocument(src);

const scenariosNode = doc.get("scenarios", true);
if (!(scenariosNode instanceof YAMLSeq)) {
  throw new Error("scenarios is not a YAMLSeq");
}

let patched = 0;
let skippedNoFixtures = 0;
let skippedAlreadyHas = 0;
let skippedNoUserTurn = 0;

for (const scenarioNode of scenariosNode.items) {
  if (!(scenarioNode instanceof YAMLMap)) continue;
  const turnsNode = scenarioNode.get("turns", true);
  if (!(turnsNode instanceof YAMLSeq)) continue;

  const firstUserTurn = turnsNode.items.find((item) => {
    if (!(item instanceof YAMLMap)) return false;
    const role = item.get("role");
    return role === "user";
  }) as YAMLMap | undefined;
  if (!firstUserTurn) {
    skippedNoUserTurn += 1;
    continue;
  }

  if (firstUserTurn.has("attachments")) {
    skippedAlreadyHas += 1;
    continue;
  }

  const content = firstUserTurn.get("content");
  if (typeof content !== "string" || !content) {
    skippedNoFixtures += 1;
    continue;
  }

  const fixtures = extractFixtureNames(content);
  if (fixtures.length === 0) {
    skippedNoFixtures += 1;
    continue;
  }

  const attachments = new YAMLSeq();
  for (const name of fixtures) {
    const entry = new YAMLMap();
    entry.set("path", `fixtures/${name}`);
    attachments.add(entry);
  }

  const existingKeys = firstUserTurn.items.map((i) => {
    const k = i.key as { value?: unknown };
    return k?.value;
  });
  const contentIdx = existingKeys.indexOf("content");
  if (contentIdx >= 0) {
    firstUserTurn.items.splice(
      contentIdx,
      0,
      new Pair(doc.createNode("attachments"), attachments),
    );
  } else {
    firstUserTurn.set("attachments", attachments);
  }

  patched += 1;
}

const rendered = doc.toString({
  lineWidth: 0,
  blockQuote: "literal",
});
writeFileSync(OUT_PATH, rendered);

console.log(`Wrote ${OUT_PATH}`);
console.log(`  patched: ${patched}`);
console.log(`  skipped (already had attachments): ${skippedAlreadyHas}`);
console.log(`  skipped (no fixture refs): ${skippedNoFixtures}`);
console.log(`  skipped (no user turn): ${skippedNoUserTurn}`);
