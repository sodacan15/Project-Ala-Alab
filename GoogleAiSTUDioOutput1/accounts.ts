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
    path.resolve("./src/storage/images")
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

export function listContexts(): ContextMetadata[] {
  ensureDirectories();
  const files = fs.readdirSync(CONTEXTS_DIR).filter(f => f.endsWith(".md"));
  return files.map(file => {
    const filePath = path.join(CONTEXTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    
    // Parse metadata from top of file
    const titleMatch = content.match(/^#\s+(.+?)\s+—/m);
    const scopeMatch = content.match(/^\*\*Scope:\*\*\s*(.+)$/m);
    const descMatch = content.match(/^\*\*Description:\*\*\s*(.+)$/m);
    const versionMatch = content.match(/^\*\*Version:\*\*\s*([\d.]+)/m);
    const createdMatch = content.match(/\*\*Created:\*\*\s*([^\s|]+)/);
    const updatedMatch = content.match(/\*\*Last updated:\*\*\s*([^\s|]+)/);

    return {
      name: titleMatch ? titleMatch[1] : file.replace(".md", ""),
      scope: scopeMatch ? scopeMatch[1] : "Barangay",
      description: descMatch ? descMatch[1] : "",
      filename: file,
      version: versionMatch ? versionMatch[1] : "1.0.0",
      created: createdMatch ? createdMatch[1] : new Date().toISOString().split("T")[0],
      lastUpdated: updatedMatch ? updatedMatch[1] : new Date().toISOString().split("T")[0]
    };
  });
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
