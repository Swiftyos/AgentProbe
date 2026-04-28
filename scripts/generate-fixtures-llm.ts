#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

const MANIFEST_PATH = "data/fixture-manifest.json";
const FIXTURES_DIR = "data/fixtures";
const MODEL = Bun.env.FIXTURE_GEN_MODEL ?? "openai/gpt-4o-mini";
const CONCURRENCY = Number.parseInt(Bun.env.FIXTURE_GEN_CONCURRENCY ?? "8", 10);
const API_KEY = Bun.env.OPEN_ROUTER_API_KEY;
if (!API_KEY) {
  console.error("OPEN_ROUTER_API_KEY is required");
  process.exit(1);
}

type ManifestEntry = {
  file: string;
  description: string;
  scenarioId: string;
  scenarioName: string;
  persona?: string;
  context: string;
  userRequest: string;
};

const entries = JSON.parse(
  readFileSync(MANIFEST_PATH, "utf-8"),
) as ManifestEntry[];

const args = new Set(process.argv.slice(2));
const onlyMissing = args.has("--only-missing");
const dryRun = args.has("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "0", 10) : 0;

function fileKindForExtension(ext: string): {
  kind: "text" | "pdf" | "docx" | "xlsx" | "zip";
  wireFormat: string;
} {
  switch (ext) {
    case ".pdf":
      return {
        kind: "pdf",
        wireFormat: "plain text (multi-paragraph narrative)",
      };
    case ".docx":
    case ".doc":
      return {
        kind: "docx",
        wireFormat: "plain text (paragraphs separated by blank lines)",
      };
    case ".xlsx":
    case ".xls":
      return { kind: "xlsx", wireFormat: "CSV with header row" };
    case ".zip":
      return {
        kind: "zip",
        wireFormat:
          "CSV with header row (will be placed as data.csv inside the zip alongside a README.txt)",
      };
    case ".csv":
    case ".tsv":
      return {
        kind: "text",
        wireFormat: "CSV (comma-separated, header row first)",
      };
    case ".json":
    case ".geojson":
      return { kind: "text", wireFormat: "valid JSON" };
    case ".yaml":
    case ".yml":
      return { kind: "text", wireFormat: "valid YAML" };
    case ".md":
      return { kind: "text", wireFormat: "GitHub-flavored Markdown" };
    case ".html":
      return { kind: "text", wireFormat: "valid HTML5 document" };
    case ".sql":
      return { kind: "text", wireFormat: "SQL (CREATE + INSERT statements)" };
    case ".ics":
      return {
        kind: "text",
        wireFormat: "iCalendar (BEGIN:VCALENDAR ... END:VCALENDAR)",
      };
    case ".xml":
      return { kind: "text", wireFormat: "valid XML" };
    case ".log":
      return { kind: "text", wireFormat: "structured log lines (timestamped)" };
    case ".ipynb":
      return { kind: "text", wireFormat: "Jupyter notebook JSON (nbformat 4)" };
    default:
      return { kind: "text", wireFormat: "plain text" };
  }
}

function buildPrompt(entry: ManifestEntry): { system: string; user: string } {
  const ext = extname(entry.file).toLowerCase();
  const { wireFormat } = fileKindForExtension(ext);
  const system = [
    "You generate realistic fixture files for an AI agent evaluation harness.",
    "The fixture will be handed to an agent as context to solve a scenario.",
    "Produce content that is believable, internally consistent, and directly relevant to the scenario's persona, company, domain, and task.",
    "Do NOT include explanatory prose, code fences, markdown wrappers, or commentary ABOUT the file.",
    "Output ONLY the raw file content.",
    "Keep the total output under 12,000 characters.",
  ].join("\n");

  const user = [
    `SCENARIO ID: ${entry.scenarioId}`,
    `SCENARIO NAME: ${entry.scenarioName}`,
    entry.persona ? `PERSONA: ${entry.persona}` : "",
    "",
    "USER REQUEST:",
    entry.userRequest,
    "",
    "FULL CONTEXT BLOCK:",
    entry.context,
    "",
    `FILE TO GENERATE: ${entry.file}`,
    `FILE DESCRIPTION: ${entry.description || "(inferred from scenario context)"}`,
    `WIRE FORMAT: ${wireFormat}`,
    "",
    "Generate the file content now. Output ONLY the file content, no preamble.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

async function callOpenRouter(system: string, user: string): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": "https://github.com/agentprobe/fixture-generation",
        "X-Title": "AgentProbe fixture generation",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 400)}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

function stripCodeFences(text: string): string {
  let out = text.trim();
  if (out.startsWith("```")) {
    const firstNewline = out.indexOf("\n");
    if (firstNewline !== -1) {
      out = out.slice(firstNewline + 1);
    }
    if (out.endsWith("```")) {
      out = out.slice(0, -3);
    }
  }
  return out.trim();
}

// --- Binary wrappers (reused from generate-fixtures.ts) ---
function pdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.length <= maxChars) {
      out.push(line);
      continue;
    }
    const words = line.split(" ");
    let current = "";
    for (const word of words) {
      if ((current + (current ? " " : "") + word).length > maxChars) {
        if (current) out.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

function buildPdf(title: string, bodyText: string): Buffer {
  const lines = [title, "", ...wrapText(bodyText, 88)];
  const MAX_LINES_PER_PAGE = 48;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += MAX_LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + MAX_LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([title]);

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageIds: number[] = [];
  let nextObj = 3;
  const contentStreams: string[] = [];
  for (const pageLines of pages) {
    const ops: string[] = [];
    ops.push("BT", "/F1 12 Tf", "50 750 Td", "15 TL");
    let first = true;
    for (const line of pageLines) {
      if (!first) ops.push("T*");
      ops.push(`(${pdfString(line)}) Tj`);
      first = false;
    }
    ops.push("ET");
    const stream = ops.join("\n");
    const pageId = nextObj++;
    const contentId = nextObj++;
    pageIds.push(pageId);
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${pageIds.length === 1 ? "" : ""}FONTREF 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentId} 0 R >>`;
    contentStreams.push(stream);
    objects[contentId] =
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  }
  const fontId = nextObj++;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  for (const pid of pageIds) {
    const obj = objects[pid];
    if (obj) {
      objects[pid] = obj.replace("FONTREF", String(fontId));
    }
  }
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [0];
  const totalObjects = nextObj - 1;
  for (let i = 1; i <= totalObjects; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjects; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c ^= data[i] ?? 0;
    for (let j = 0; j < 8; j += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(
  entries: Array<{ path: string; data: Buffer }>,
): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.path, "utf-8");
    const crc = crc32(e.data);
    const size = e.data.length;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    local.push(lh, nameBuf, e.data);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(size, 20);
    ch.writeUInt32LE(size, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + e.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const localBuf = Buffer.concat(local);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

function buildDocx(paragraphs: string[]): Buffer {
  const paras = paragraphs
    .map(
      (p) =>
        `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`,
    )
    .join("\n    ");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paras}
    <w:sectPr/>
  </w:body>
</w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  return buildZipBuffer([
    { path: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf-8") },
    { path: "_rels/.rels", data: Buffer.from(rels, "utf-8") },
    { path: "word/document.xml", data: Buffer.from(documentXml, "utf-8") },
  ]);
}

function colLetter(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      current.push(cell);
      cell = "";
    } else if (ch === "\n") {
      current.push(cell);
      rows.push(current);
      current = [];
      cell = "";
    } else if (ch === "\r") {
      // skip
    } else {
      cell += ch;
    }
  }
  if (cell || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows.filter((r) => r.some((c) => c.length > 0));
}

function buildXlsx(csvText: string): Buffer {
  const rows = parseCsv(csvText);
  if (rows.length === 0) rows.push(["(empty)"]);
  const xmlRows = rows
    .map((row, r) => {
      const cells = row
        .map(
          (v, c) =>
            `<c r="${colLetter(c + 1)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`,
        )
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("\n    ");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${xmlRows}
  </sheetData>
</worksheet>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  return buildZipBuffer([
    { path: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf-8") },
    { path: "_rels/.rels", data: Buffer.from(rootRels, "utf-8") },
    { path: "xl/workbook.xml", data: Buffer.from(workbookXml, "utf-8") },
    {
      path: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(workbookRels, "utf-8"),
    },
    { path: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml, "utf-8") },
  ]);
}

function buildZip(csvText: string, readme: string): Buffer {
  return buildZipBuffer([
    { path: "README.txt", data: Buffer.from(readme, "utf-8") },
    { path: "data.csv", data: Buffer.from(csvText, "utf-8") },
  ]);
}

async function processEntry(entry: ManifestEntry): Promise<{
  file: string;
  status: "wrote" | "skipped" | "error";
  error?: string;
}> {
  const outPath = join(FIXTURES_DIR, entry.file);
  if (onlyMissing && existsSync(outPath)) {
    return { file: entry.file, status: "skipped" };
  }
  const ext = extname(entry.file).toLowerCase();
  const { kind } = fileKindForExtension(ext);
  const { system, user } = buildPrompt(entry);
  if (dryRun) {
    return { file: entry.file, status: "skipped" };
  }
  let content: string;
  try {
    content = await callOpenRouter(system, user);
  } catch (err) {
    return {
      file: entry.file,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
  content = stripCodeFences(content);
  if (!content) {
    return { file: entry.file, status: "error", error: "empty LLM response" };
  }
  mkdirSync(dirname(outPath), { recursive: true });
  try {
    if (kind === "text") {
      writeFileSync(outPath, content.endsWith("\n") ? content : `${content}\n`);
    } else if (kind === "pdf") {
      writeFileSync(outPath, buildPdf(entry.file, content));
    } else if (kind === "docx") {
      const paragraphs = content
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      writeFileSync(
        outPath,
        buildDocx(paragraphs.length > 0 ? paragraphs : [content]),
      );
    } else if (kind === "xlsx") {
      writeFileSync(outPath, buildXlsx(content));
    } else if (kind === "zip") {
      writeFileSync(
        outPath,
        buildZip(
          content,
          `${entry.file}\n${entry.description}\n\nScenario: ${entry.scenarioName}\n`,
        ),
      );
    }
    return { file: entry.file, status: "wrote" };
  } catch (err) {
    return {
      file: entry.file,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  let queue = [...entries];
  if (onlyMissing) {
    queue = queue.filter(
      (e) => !existsSync(join(FIXTURES_DIR, e.file)) || true,
    );
  }
  if (limit > 0) {
    queue = queue.slice(0, limit);
  }

  console.log(
    `Generating ${queue.length} fixtures with ${MODEL} @ concurrency=${CONCURRENCY}`,
  );
  mkdirSync(FIXTURES_DIR, { recursive: true });

  let index = 0;
  let wrote = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: Array<{ file: string; error?: string }> = [];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const myIndex = index++;
      if (myIndex >= queue.length) return;
      const entry = queue[myIndex];
      if (!entry) return;
      const started = Date.now();
      const result = await processEntry(entry);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      if (result.status === "wrote") {
        wrote += 1;
        console.log(
          `[${myIndex + 1}/${queue.length}] ✓ ${entry.file} (${elapsed}s)`,
        );
      } else if (result.status === "skipped") {
        skipped += 1;
      } else {
        errors += 1;
        errorList.push({ file: entry.file, error: result.error });
        console.log(
          `[${myIndex + 1}/${queue.length}] ✗ ${entry.file} — ${result.error}`,
        );
      }
    }
  });

  await Promise.all(workers);
  console.log(`\nDone: wrote=${wrote}, skipped=${skipped}, errors=${errors}`);
  if (errorList.length > 0) {
    writeFileSync(
      "data/fixture-errors.json",
      JSON.stringify(errorList, null, 2),
    );
    console.log("Errors written to data/fixture-errors.json");
  }
}

await main();
