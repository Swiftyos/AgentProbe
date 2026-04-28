#!/usr/bin/env bun
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { parse as parseYaml } from "yaml";

type Scenario = {
  id: string;
  name: string;
  turns?: Array<{ content?: string }>;
};

const YAML_PATH = "data/baseline-scenarios.yaml";
const FIXTURES_DIR = "data/fixtures";

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

function extractColumns(desc: string): string[] | undefined {
  const m = desc.match(/columns?:\s*([A-Za-z0-9_,\s]+?)(?:[.)\]]|\s*$)/i);
  if (m) {
    return m[1]
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  const m2 = desc.match(/\beach with:\s*([A-Za-z0-9_,\s]+?)(?:[.)\]]|\s*$)/i);
  if (m2) {
    return m2[1]
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  const m3 = desc.match(/\bfields?:\s*([A-Za-z0-9_,\s]+?)(?:[.)\]]|\s*$)/i);
  if (m3) {
    return m3[1]
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return undefined;
}

function extractCount(desc: string): number {
  const m = desc.match(/\b(\d+)\b/);
  if (m) {
    const n = Number.parseInt(m[1] ?? "", 10);
    if (Number.isFinite(n) && n > 0 && n <= 50) return n;
    if (Number.isFinite(n) && n > 50) return 5;
  }
  return 3;
}

function placeholderValue(column: string, index: number): string {
  const col = column.toLowerCase();
  if (/id$/.test(col)) return `${col.replace(/_?id$/, "")}_${1000 + index}`;
  if (col.includes("email")) return `user${index}@example.com`;
  if (col.includes("date") || col.includes("at") || col.includes("time"))
    return `2026-03-${String((index % 28) + 1).padStart(2, "0")}T09:00:00Z`;
  if (col.includes("url")) return `https://example.com/${col}/${index}`;
  if (col.includes("name") || col === "customer" || col === "from")
    return `Sample ${col} ${index}`;
  if (col.includes("body") || col.includes("content"))
    return `Placeholder ${col} text ${index}`;
  if (col.includes("subject") || col.includes("title"))
    return `Sample ${col} ${index}`;
  if (col.includes("priority"))
    return ["low", "medium", "high"][index % 3] ?? "low";
  if (col.includes("status"))
    return ["open", "pending", "resolved"][index % 3] ?? "open";
  if (
    col.includes("amount") ||
    col.includes("price") ||
    col.includes("revenue")
  )
    return String(1000 + index * 250);
  if (col.includes("count") || col.includes("total") || col.includes("qty"))
    return String(10 + index);
  if (col.includes("rate") || col.includes("pct") || col.includes("percent"))
    return String(((index + 1) * 0.03).toFixed(3));
  return `value_${column}_${index}`;
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function genCsv(desc: string, sep = ","): string {
  const columns = extractColumns(desc) ?? ["id", "name", "value", "date"];
  const rows = extractCount(desc);
  const lines = [columns.map(csvEscape).join(sep)];
  for (let i = 0; i < rows; i += 1) {
    lines.push(
      columns.map((c) => csvEscape(placeholderValue(c, i + 1))).join(sep),
    );
  }
  if (desc) {
    return `# ${desc.replace(/\n/g, " ")}\n${lines.join("\n")}\n`;
  }
  return `${lines.join("\n")}\n`;
}

function genJson(desc: string): string {
  const columns = extractColumns(desc);
  const count = extractCount(desc);
  const records: Record<string, string>[] = [];
  const fieldSet = columns ?? ["id", "name", "description", "value"];
  for (let i = 0; i < count; i += 1) {
    const row: Record<string, string> = {};
    for (const f of fieldSet) row[f] = placeholderValue(f, i + 1);
    records.push(row);
  }
  return `${JSON.stringify(
    {
      description: desc || "placeholder fixture",
      generated: "2026-04-15",
      records,
    },
    null,
    2,
  )}\n`;
}

function genYaml(desc: string): string {
  const columns = extractColumns(desc);
  const count = extractCount(desc);
  const lines = [
    `# ${desc || "placeholder fixture"}`,
    `generated: "2026-04-15"`,
    `records:`,
  ];
  const fields = columns ?? ["id", "name", "value"];
  const [first, ...rest] = fields;
  if (first) {
    for (let i = 0; i < count; i += 1) {
      lines.push(`  - ${first}: ${placeholderValue(first, i + 1)}`);
      for (const f of rest) {
        lines.push(`    ${f}: ${placeholderValue(f, i + 1)}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

function genMarkdown(name: string, desc: string): string {
  return [
    `# ${name}`,
    "",
    `> ${desc || "placeholder fixture"}`,
    "",
    "## Overview",
    "",
    "This is a placeholder fixture generated for agent evaluation. Replace with real content as needed.",
    "",
    "## Section 1",
    "",
    "Content goes here.",
    "",
    "## Section 2",
    "",
    "- Item 1",
    "- Item 2",
    "- Item 3",
    "",
  ].join("\n");
}

function genText(name: string, desc: string): string {
  return [
    `# ${name}`,
    desc ? `# ${desc}` : "",
    "",
    "Placeholder fixture content for agent evaluation.",
    "Replace with real content as needed.",
    "",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function genHtml(name: string, desc: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${name}</title>
  </head>
  <body>
    <h1>${name}</h1>
    <p>${desc || "Placeholder fixture."}</p>
    <section>
      <h2>Section 1</h2>
      <p>Sample content.</p>
    </section>
  </body>
</html>
`;
}

function genSql(name: string, desc: string): string {
  return `-- ${name}
-- ${desc || "placeholder fixture"}

CREATE TABLE IF NOT EXISTS sample (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sample (id, name, value) VALUES
  (1, 'example_a', 'value_a'),
  (2, 'example_b', 'value_b'),
  (3, 'example_c', 'value_c');
`;
}

function genIcs(desc: string): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AgentProbe//Fixtures//EN
BEGIN:VEVENT
UID:fixture-001@agentprobe.local
DTSTAMP:20260415T090000Z
DTSTART:20260420T090000Z
DTEND:20260420T100000Z
SUMMARY:Placeholder event
DESCRIPTION:${desc.replace(/\n/g, "\\n") || "Placeholder fixture event"}
END:VEVENT
END:VCALENDAR
`;
}

function genXml(name: string, desc: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<fixture name="${name}">
  <description>${desc || "placeholder fixture"}</description>
  <records>
    <record id="1"><name>example_a</name><value>value_a</value></record>
    <record id="2"><name>example_b</name><value>value_b</value></record>
    <record id="3"><name>example_c</name><value>value_c</value></record>
  </records>
</fixture>
`;
}

function genLog(desc: string): string {
  const now = "2026-04-15T09:00:00Z";
  const entries = [
    `[${now}] INFO starting job`,
    `[${now}] INFO ${desc || "placeholder log entry"}`,
    `[${now}] WARN sample warning`,
    `[${now}] INFO completed`,
  ];
  return `${entries.join("\n")}\n`;
}

function genNotebook(name: string, desc: string): string {
  return `${JSON.stringify(
    {
      cells: [
        {
          cell_type: "markdown",
          metadata: {},
          source: [`# ${name}\n`, `> ${desc || "placeholder fixture"}\n`],
        },
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: ["print('placeholder notebook')\n"],
        },
      ],
      metadata: {
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3",
        },
      },
      nbformat: 4,
      nbformat_minor: 5,
    },
    null,
    1,
  )}\n`;
}

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

function genPdf(name: string, desc: string): Buffer {
  const title = name;
  const body = desc || "Placeholder fixture for agent evaluation.";
  const lines = [title, "", ...wrapText(body, 80)];
  const textOps: string[] = [];
  textOps.push("BT");
  textOps.push("/F1 14 Tf");
  textOps.push("50 750 Td");
  textOps.push("18 TL");
  let first = true;
  for (const line of lines) {
    if (!first) textOps.push("T*");
    textOps.push(`(${pdfString(line)}) Tj`);
    first = false;
  }
  textOps.push("ET");
  const stream = textOps.join("\n");
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[5] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;

  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
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

async function genDocx(name: string, desc: string): Promise<Buffer> {
  const paragraphs = [
    name,
    "",
    desc || "Placeholder fixture.",
    "",
    "Section 1",
    "Sample content.",
  ].map(
    (p) =>
      `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`,
  );
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n    ")}
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

async function genXlsx(_name: string, desc: string): Promise<Buffer> {
  const columns = extractColumns(desc) ?? ["id", "name", "value"];
  const count = extractCount(desc);
  const header = columns
    .map(
      (c, i) =>
        `<c r="${colLetter(i + 1)}1" t="inlineStr"><is><t>${xmlEscape(c)}</t></is></c>`,
    )
    .join("");
  const rows = [`<row r="1">${header}</row>`];
  for (let r = 0; r < count; r += 1) {
    const cells = columns
      .map((c, i) => {
        const v = placeholderValue(c, r + 1);
        return `<c r="${colLetter(i + 1)}${r + 2}" t="inlineStr"><is><t>${xmlEscape(v)}</t></is></c>`;
      })
      .join("");
    rows.push(`<row r="${r + 2}">${cells}</row>`);
  }
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows.join("\n    ")}
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

async function genZip(name: string, desc: string): Promise<Buffer> {
  return buildZipBuffer([
    {
      path: "README.txt",
      data: Buffer.from(`${name}\n${desc || "Placeholder fixture"}\n`, "utf-8"),
    },
    {
      path: "data.csv",
      data: Buffer.from(genCsv(desc), "utf-8"),
    },
  ]);
}

// --- Minimal ZIP writer (store method, no compression) ---
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
    lh.writeUInt16LE(20, 4); // version
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(0, 8); // method = store
    lh.writeUInt16LE(0, 10); // time
    lh.writeUInt16LE(0, 12); // date
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

// --- Driver ---
const doc = parseYaml(readFileSync(YAML_PATH, "utf-8")) as {
  scenarios: Scenario[];
};
const descriptions = new Map<string, string>();

for (const sc of doc.scenarios ?? []) {
  for (const turn of sc.turns ?? []) {
    const text = turn.content ?? "";
    if (!text) continue;
    for (const m of text.matchAll(PAIR_RE)) {
      const name = normalizeName(m[1]);
      if (!name) continue;
      const desc = m[2].trim();
      const prev = descriptions.get(name) ?? "";
      if (desc.length > prev.length) descriptions.set(name, desc);
    }
    for (const m of text.matchAll(BARE_RE)) {
      const name = normalizeName(m[1]);
      if (!name) continue;
      if (!descriptions.has(name)) descriptions.set(name, "");
    }
  }
}

mkdirSync(FIXTURES_DIR, { recursive: true });
let writtenCount = 0;
const skipped: string[] = [];

for (const [name, desc] of descriptions) {
  const outPath = join(FIXTURES_DIR, name);
  mkdirSync(dirname(outPath), { recursive: true });
  const ext = extname(name).toLowerCase();
  try {
    let content: string | Buffer;
    switch (ext) {
      case ".csv":
        content = genCsv(desc, ",");
        break;
      case ".tsv":
        content = genCsv(desc, "\t");
        break;
      case ".json":
      case ".geojson":
        content = genJson(desc);
        break;
      case ".yaml":
      case ".yml":
        content = genYaml(desc);
        break;
      case ".md":
        content = genMarkdown(name, desc);
        break;
      case ".txt":
      case ".srt":
        content = genText(name, desc);
        break;
      case ".html":
        content = genHtml(name, desc);
        break;
      case ".sql":
        content = genSql(name, desc);
        break;
      case ".ics":
        content = genIcs(desc);
        break;
      case ".xml":
        content = genXml(name, desc);
        break;
      case ".log":
        content = genLog(desc);
        break;
      case ".ipynb":
        content = genNotebook(name, desc);
        break;
      case ".pdf":
        content = genPdf(name, desc);
        break;
      case ".docx":
      case ".doc":
        content = await genDocx(name, desc);
        break;
      case ".xlsx":
      case ".xls":
        content = await genXlsx(name, desc);
        break;
      case ".zip":
        content = await genZip(name, desc);
        break;
      default:
        skipped.push(name);
        continue;
    }
    writeFileSync(outPath, content);
    writtenCount += 1;
  } catch (err) {
    skipped.push(`${name}: ${err}`);
  }
}

console.log(`Wrote ${writtenCount} fixtures to ${FIXTURES_DIR}/`);
if (skipped.length > 0) {
  console.log(`Skipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  - ${s}`);
}
