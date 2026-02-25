import { readFile, stat } from "node:fs/promises";
import type { DiagramSourceMode } from "./types.js";

export type DirectMermaidInput =
  | { kind: "file"; path: string }
  | { kind: "stdin" };

export interface DetectDirectMermaidInputOptions {
  input?: string;
  source: DiagramSourceMode;
  sourceWasExplicit: boolean;
  stdinIsTty: boolean;
  fileExistsFn?: (path: string) => Promise<boolean>;
}

export interface ReadDirectMermaidInputDependencies {
  readFileFn?: (path: string) => Promise<string>;
  readStdinFn?: () => Promise<string>;
}

export function hasMermaidFileExtension(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  return normalized.endsWith(".mmd") || normalized.endsWith(".mermaid");
}

async function defaultFileExists(path: string): Promise<boolean> {
  try {
    const fileStat = await stat(path);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function readStdinText(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function detectDirectMermaidInput(
  options: DetectDirectMermaidInputOptions,
): Promise<DirectMermaidInput | null> {
  const isJsonSourceOverride =
    options.sourceWasExplicit && (options.source === "file" || options.source === "stdin");
  if (isJsonSourceOverride) {
    return null;
  }

  const input = options.input?.trim() ?? "";
  const fileExistsFn = options.fileExistsFn ?? defaultFileExists;

  if (input) {
    if (hasMermaidFileExtension(input)) {
      return {
        kind: "file",
        path: input,
      };
    }

    if (await fileExistsFn(input)) {
      return {
        kind: "file",
        path: input,
      };
    }

    return null;
  }

  if (!options.stdinIsTty) {
    return {
      kind: "stdin",
    };
  }

  return null;
}

export async function readDirectMermaidInput(
  input: DirectMermaidInput,
  dependencies: ReadDirectMermaidInputDependencies = {},
): Promise<string> {
  const readFileFn = dependencies.readFileFn ?? (async (path: string) => readFile(path, "utf8"));
  const readStdinFn = dependencies.readStdinFn ?? readStdinText;

  if (input.kind === "file") {
    return readFileFn(input.path);
  }

  return readStdinFn();
}
