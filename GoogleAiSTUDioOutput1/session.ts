import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const STORAGE_DIR = path.resolve("./src/storage");
export const INDEX_JSON_PATH = path.join(STORAGE_DIR, "corpus-index.json");
export const INDEX_MD_PATH = path.join(STORAGE_DIR, "corpus-index.md");

export interface OriginalEntry {
  id: string;
  type: "ORIGINAL";
  filename: string;
  path: string;
  dateAdded: string;
  addedBy: string;
  description: string;
  inNotebook: boolean;
}

export interface LinkEntry {
  id: string;
  type: "LINK";
  url: string;
  title: string;
  dateAccessed: string;
  addedBy: string;
  notes: string;
  generatedFile: string;
  inNotebook: boolean;
}

export interface ImageEntry {
  id: string;
  type: "IMAGE";
  filename: string;
  path: string;
  metadataFile: string;
  dateAdded: string;
  addedBy: string;
  caption: string;
  linkedEntry: string;
  inNotebook: boolean;
}

export type IndexEntry = OriginalEntry | LinkEntry | ImageEntry;

export function loadIndex(): IndexEntry[] {
  if (!fs.existsSync(INDEX_JSON_PATH)) {
    saveIndex([]);
    return [];
  }
  try {
    const data = fs.readFileSync(INDEX_JSON_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error parsing corpus-index.json", err);
    return [];
  }
}

export function saveIndex(entries: IndexEntry[]) {
  // Ensure storage dir exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  
  // Save JSON
  fs.writeFileSync(INDEX_JSON_PATH, JSON.stringify(entries, null, 2), "utf-8");
  
  // Re-generate markdown index (corpus-index.md)
  syncMarkdownIndex(entries);
}

export function addEntry(entry: Omit<IndexEntry, "id" | "dateAdded" | "inNotebook">): IndexEntry {
  const entries = loadIndex();
  const now = new Date().toISOString().split("T")[0];
  
  const newEntry: IndexEntry = {
    ...entry,
    id: uuidv4(),
    dateAdded: now,
    inNotebook: false
  } as IndexEntry;
  
  // Handle specific generation requirements
  if (newEntry.type === "LINK") {
    generateLinkMarkdown(newEntry);
  } else if (newEntry.type === "IMAGE") {
    generateImageMetadata(newEntry);
  }
  
  entries.push(newEntry);
  saveIndex(entries);
  return newEntry;
}

export function deleteEntry(id: string): void {
  const entries = loadIndex();
  const entryToDelete = entries.find(e => e.id === id);
  if (!entryToDelete) return;
  
  // Delete physical files
  try {
    if (entryToDelete.type === "ORIGINAL") {
      const fullPath = path.resolve(entryToDelete.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } else if (entryToDelete.type === "LINK") {
      const fullPath = path.resolve(entryToDelete.generatedFile);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } else if (entryToDelete.type === "IMAGE") {
      const fullPath = path.resolve(entryToDelete.path);
      const metaPath = path.resolve(entryToDelete.metadataFile);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    }
  } catch (err) {
    console.error(`Error deleting files for entry ${id}`, err);
  }
  
  const filtered = entries.filter(e => e.id !== id);
  saveIndex(filtered);
}

export function toggleInNotebook(id: string): IndexEntry {
  const entries = loadIndex();
  const index = entries.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error(`Entry ${id} not found`);
  }
  
  entries[index].inNotebook = !entries[index].inNotebook;
  saveIndex(entries);
  return entries[index];
}

function generateLinkMarkdown(entry: LinkEntry) {
  const linkDir = path.resolve("./src/storage/links");
  if (!fs.existsSync(linkDir)) {
    fs.mkdirSync(linkDir, { recursive: true });
  }
  
  const filename = `${entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
  const relativeFile = path.join("src/storage/links", filename);
  const fullPath = path.resolve(relativeFile);
  
  const content = `# LINK SOURCE: ${entry.title}
- **URL:** ${entry.url}
- **Date Accessed:** ${entry.dateAccessed}
- **Added By:** ${entry.addedBy}
- **Notes:** ${entry.notes}

---

## Content Summary Placeholder
[The user has aggregated this link for NotebookLM archival purposes. Full content can be retrieved directly from the URL or pasted below during active synthesis runs.]
`;
  
  fs.writeFileSync(fullPath, content, "utf-8");
  entry.generatedFile = relativeFile;
}

function generateImageMetadata(entry: ImageEntry) {
  const metadataDir = path.resolve("./src/storage/images");
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir, { recursive: true });
  }
  
  const metaFilename = `${entry.filename}.json`;
  const relativeFile = path.join("src/storage/images", metaFilename);
  const fullPath = path.resolve(relativeFile);
  
  const metaContent = {
    id: entry.id,
    filename: entry.filename,
    caption: entry.caption,
    linkedEntry: entry.linkedEntry,
    dateAdded: entry.dateAdded,
    addedBy: entry.addedBy
  };
  
  fs.writeFileSync(fullPath, JSON.stringify(metaContent, null, 2), "utf-8");
  entry.metadataFile = relativeFile;
}

export function syncMarkdownIndex(entries: IndexEntry[]) {
  const now = new Date().toISOString().split("T")[0];
  const originals = entries.filter(e => e.type === "ORIGINAL") as OriginalEntry[];
  const links = entries.filter(e => e.type === "LINK") as LinkEntry[];
  const images = entries.filter(e => e.type === "IMAGE") as ImageEntry[];
  
  let md = `# Ala-Alab — Corpus Index
**Last updated:** ${now} | **Total entries:** ${entries.length}

## ORIGINAL Files
| ID | Filename | Date Added | Added By | In Notebook | Description |
|---|---|---|---|---|---|
`;

  if (originals.length === 0) {
    md += "| - | - | - | - | - | - |\n";
  } else {
    originals.forEach(e => {
      md += `| ${e.id.slice(0, 8)}... | ${e.filename} | ${e.dateAdded} | ${e.addedBy} | ${e.inNotebook ? "✓" : "✗"} | ${e.description} |\n`;
    });
  }

  md += `
## LINKS
| ID | Title | URL | Date Accessed | Added By | In Notebook | Generated File |
|---|---|---|---|---|---|---|
`;

  if (links.length === 0) {
    md += "| - | - | - | - | - | - | - |\n";
  } else {
    links.forEach(e => {
      md += `| ${e.id.slice(0, 8)}... | ${e.title} | [Link](${e.url}) | ${e.dateAccessed} | ${e.addedBy} | ${e.inNotebook ? "✓" : "✗"} | ${e.generatedFile} |\n`;
    });
  }

  md += `
## IMAGES
| ID | Filename | Date Added | Added By | In Notebook | Caption |
|---|---|---|---|---|---|
`;

  if (images.length === 0) {
    md += "| - | - | - | - | - | - |\n";
  } else {
    images.forEach(e => {
      md += `| ${e.id.slice(0, 8)}... | ${e.filename} | ${e.dateAdded} | ${e.addedBy} | ${e.inNotebook ? "✓" : "✗"} | ${e.caption} |\n`;
    });
  }

  fs.writeFileSync(INDEX_MD_PATH, md, "utf-8");
}
