import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import os from "os";
import LRUCache from "./LRUCache";
import type { Snippet, HeavyDutySnippet } from "../types";
import loadMarkdown from "./loaders/MarkdownLoader";
import loadYaml from "./loaders/YamlLoader";

const supportedExtensions = [".md", ".txt", ".yaml", ".yml"];
const previewCache = new LRUCache<string>(50); // Cache up to 50 previews
async function loadAllSnippets(startPath: string): Promise<{ snippets: Snippet[]; errors: Error[] }> {
  const snippets: Snippet[] = [];
  const errors: Error[] = [];

  async function readDirectory(directoryPath: string): Promise<void> {
    const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

    // Array to store promises for file processing
    const filePromises: Promise<void>[] = [];

    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);

      if (!entry.name.startsWith(".")) {
        const extension = path.extname(entry.name);
        if (entry.isDirectory()) {
          // Queue directory processing concurrently
          filePromises.push(readDirectory(fullPath));
        } else if (supportedExtensions.includes(extension)) {
          // Queue file processing concurrently
          filePromises.push(processFile(fullPath, extension));
        }
      }
    }

    // Wait for all files and directories to be processed
    await Promise.all(filePromises);
  }

  async function processFile(fullPath: string, extension: string): Promise<void> {
    const relativePath = path.relative(startPath, fullPath);
    if ([".yml", ".yaml"].includes(extension)) {
      const res = await loadYaml(relativePath, fullPath);
      snippets.push(...res.snippets);
      errors.push(...res.errors);
    } else {
      const { snippet, error } = await loadMarkdown(relativePath, fullPath);
      snippets.push(snippet);
      if (error) {
        errors.push(error);
      }
    }
  }

  await readDirectory(startPath);
  return { snippets, errors };
}

function expandHomeDirectory(dirPath: string): string {
  if (dirPath.startsWith("~")) {
    return path.join(os.homedir(), dirPath.slice(1));
  } else {
    return dirPath;
  }
}

function getPastableContent(content: string): string {
  if (!content) {
    return "";
  }

  let pastableContent = content;
  if (content.startsWith("```") && content.endsWith("```")) {
    const tmp = content.split("\n");
    const extractedLines = tmp.slice(1, tmp.length - 1);
    pastableContent = extractedLines.join("\n");
  }
  return pastableContent;
}

// HeavyDutySnippet: Discovery-only loading (zero memory for content)
async function discoverAllSnippets(startPath: string): Promise<{ snippets: HeavyDutySnippet[]; errors: Error[] }> {
  const snippets: HeavyDutySnippet[] = [];
  const errors: Error[] = [];

  async function readDirectory(directoryPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

      // Array to store promises for file processing
      const filePromises: Promise<void>[] = [];

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        if (!entry.name.startsWith(".")) {
          const extension = path.extname(entry.name);
          if (entry.isDirectory()) {
            // Queue directory processing concurrently
            filePromises.push(readDirectory(fullPath));
          } else if (supportedExtensions.includes(extension)) {
            // Queue file processing concurrently
            filePromises.push(processFile(fullPath));
          }
        }
      }

      // Wait for all files and directories to be processed
      await Promise.all(filePromises);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(`Failed to read directory ${directoryPath}`));
    }
  }

  async function processFile(fullPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(fullPath);
      const relativePath = path.relative(startPath, fullPath);

      // Create HeavyDutySnippet with metadata only
      const hash = crypto.createHash("md5");
      hash.update(fullPath);
      const id = hash.digest("hex");

      const snippet: HeavyDutySnippet = {
        id: id,
        folder: path.dirname(relativePath),
        name: path.parse(fullPath).name,
        fullPath: fullPath,
        fileSize: stats.size,
        modifiedTime: stats.mtime,
      };

      snippets.push(snippet);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(`Failed to process file ${fullPath}`));
    }
  }

  await readDirectory(startPath);
  return { snippets, errors };
}

// Lazy preview loading for HeavyDutySnippet with LRU cache
async function loadSnippetPreview(snippet: HeavyDutySnippet): Promise<string> {
  // Check cache first
  const cached = previewCache.get(snippet.id);
  if (cached) {
    return cached;
  }

  try {
    // Read first ~2KB (approximately 50 lines)
    const stream = fs.createReadStream(snippet.fullPath, {
      encoding: "utf8",
      start: 0,
      end: 2048, // Limit to 2KB to prevent loading huge files
    });

    let content = "";
    for await (const chunk of stream) {
      content += chunk;
    }

    // Split into lines and take first 50
    const lines = content.split("\n").slice(0, 50);
    let preview = lines.join("\n");

    // Add truncation indicator for large files
    if (snippet.fileSize > 1024 * 1024) {
      // 1MB+
      preview += "\n\n[... Large file - use copy action for full content ...]";
    }

    // Cache the result
    previewCache.set(snippet.id, preview);
    return preview;
  } catch (error) {
    const errorMessage = `Error loading preview: ${error instanceof Error ? error.message : "Unknown error"}`;
    previewCache.set(snippet.id, errorMessage);
    return errorMessage;
  }
}

export { loadAllSnippets, getPastableContent, expandHomeDirectory, discoverAllSnippets, loadSnippetPreview };
