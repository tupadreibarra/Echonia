import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { contentItemSchema, itemSchema, questSchema, regionSchema } from "./schema.js";

// Compiled output lives at dist/loader.js; the authored data/ directory sits
// one level up, at the package root, alongside dist/.
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = join(PACKAGE_ROOT, "data");

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

async function loadAndValidate<T>(dir: string, schema: z.ZodType<T>): Promise<T[]> {
  const files = await listJsonFiles(dir);
  const results: T[] = [];
  for (const file of files) {
    const raw = await readFile(file, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new Error(`Invalid JSON in ${file}`, { cause });
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Content validation failed for ${file}: ${result.error.message}`,
      );
    }
    results.push(result.data);
  }
  return results;
}

export interface LoadedContent {
  regions: Awaited<ReturnType<typeof loadAndValidate<z.infer<typeof regionSchema>>>>;
  contentItems: Awaited<ReturnType<typeof loadAndValidate<z.infer<typeof contentItemSchema>>>>;
  quests: Awaited<ReturnType<typeof loadAndValidate<z.infer<typeof questSchema>>>>;
  items: Awaited<ReturnType<typeof loadAndValidate<z.infer<typeof itemSchema>>>>;
}

export async function loadContent(): Promise<LoadedContent> {
  const [regions, contentItems, quests, items] = await Promise.all([
    loadAndValidate(join(DATA_ROOT, "regions"), regionSchema),
    loadAndValidate(join(DATA_ROOT, "content-items"), contentItemSchema),
    loadAndValidate(join(DATA_ROOT, "quests"), questSchema),
    loadAndValidate(join(DATA_ROOT, "items"), itemSchema),
  ]);
  return { regions, contentItems, quests, items };
}
