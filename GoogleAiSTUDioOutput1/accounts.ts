import fs from "fs";
import path from "path";

export const CONTEXTS_DIR = path.resolve("./src/contexts");
export const SEED_FILE = "canumay-east.md";

export interface ContextMetadata {
  name: string;
  scope: string;
  description: string;
  filename: string;
  version: string;
  created: string;
  lastUpdated: string;
}

export function ensureDirectories() {
  const dirs = [
    CONTEXTS_DIR,
    path.resolve("./src/storage"),
    path.resolve("./src/storage/files"),
    path.resolve("./src/storage/links"),
    path.resolve("./src/storage/images"),
    path.resolve("./src/storage/attachments")
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Create seed file if contexts folder is empty
  const files = fs.readdirSync(CONTEXTS_DIR);
  if (files.length === 0) {
    const filePath = path.join(CONTEXTS_DIR, SEED_FILE);
    const now = new Date().toISOString().split("T")[0];
    const content = `# Canumay East Flood Records — Ala-Alab Context Document
**Scope:** Barangay
**Description:** Reconstruction of the ecological history and flood records of Victoria Village, Canumay East, Valenzuela City.
**Version:** 1.0.0 | **Created:** ${now} | **Last updated:** ${now}

---

## Identity & Metadata

## Active Threads

## Ecological Records

## Community & Oral History

## Official Records

## Infrastructure & Policy Friction

## Cross-Reference Flags

## Human Annotations

## Erratum Log

## Session History
`;
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

export function listContexts(): string[] {
  ensureDirectories();
  const files = fs.readdirSync(CONTEXTS_DIR).filter(f => f.endsWith(".md"));
  return files;
}

export function readContextFile(filename: string): string {
  ensureDirectories();
  const filePath = path.join(CONTEXTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Context file ${filename} not found`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

export function createContextFile(name: string, scope: string, description: string, filename: string): string {
  ensureDirectories();
  const filePath = path.join(CONTEXTS_DIR, filename);
  const now = new Date().toISOString().split("T")[0];

  const content = `# ${name} — Ala-Alab Context Document
**Scope:** ${scope}
**Description:** ${description}
**Version:** 1.0.0 | **Created:** ${now} | **Last updated:** ${now}

---

## Identity & Metadata

## Active Threads

## Ecological Records

## Community & Oral History

## Official Records

## Infrastructure & Policy Friction

## Cross-Reference Flags

## Human Annotations

## Erratum Log

## Session History
`;

  fs.writeFileSync(filePath, content, "utf-8");
  return content;
}

export function appendEntryToContext(
  filename: string,
  sectionHeader: string, // e.g., "Community & Oral History"
  entryMarkdown: string
): void {
  const filePath = path.join(CONTEXTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Context file ${filename} not found`);
  }

  let content = fs.readFileSync(filePath, "utf-8");
  
  // Find the header, e.g., "## Community & Oral History"
  const targetHeader = `## ${sectionHeader}`;
  const headerIndex = content.indexOf(targetHeader);
  
  if (headerIndex === -1) {
    // If section not found, append to the end of file
    content += `\n\n${targetHeader}\n\n${entryMarkdown}`;
  } else {
    // Insert right after the header line
    const insertPos = headerIndex + targetHeader.length;
    content = 
      content.slice(0, insertPos) + 
      "\n\n" + 
      entryMarkdown + 
      content.slice(insertPos);
  }

  // Update "Last updated" date in the header
  const now = new Date().toISOString().split("T")[0];
  content = content.replace(/(\*\*Last updated:\*\*)\s*[^\s|]+/g, `$1 ${now}`);

  fs.writeFileSync(filePath, content, "utf-8");
}

export function appendSessionHistory(filename: string, historyMarkdown: string): void {
  appendEntryToContext(filename, "Session History", historyMarkdown);
}
