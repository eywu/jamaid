import { InvalidArgumentError } from "commander";
import type { DiagramInputFormat, DiagramSourceMode } from "./types.js";

const VALID_SOURCES = new Set<DiagramSourceMode>([
  "rest",
  "mcp",
  "auto",
  "file",
  "stdin",
]);
const VALID_FORMATS = new Set<DiagramInputFormat>(["rest", "mcp", "auto"]);

export function parseSourceMode(value: string): DiagramSourceMode {
  const normalized = value.trim().toLowerCase() as DiagramSourceMode;
  if (!VALID_SOURCES.has(normalized)) {
    throw new InvalidArgumentError("Source must be one of: rest, mcp, auto, file, stdin.");
  }
  return normalized;
}

export function parseInputFormat(value: string): DiagramInputFormat {
  const normalized = value.trim().toLowerCase() as DiagramInputFormat;
  if (!VALID_FORMATS.has(normalized)) {
    throw new InvalidArgumentError("Format must be one of: rest, mcp, auto.");
  }
  return normalized;
}

export function isJsonInputSource(source: DiagramSourceMode): boolean {
  return source === "file" || source === "stdin";
}

export interface ResolvedCliIngestOptions {
  input: string;
  requiresToken: boolean;
}

export function resolveCliIngestOptions(
  source: DiagramSourceMode,
  input: string | undefined,
): ResolvedCliIngestOptions {
  if (source === "stdin") {
    return {
      input: "",
      requiresToken: false,
    };
  }

  const trimmed = input?.trim() ?? "";
  if (!trimmed) {
    if (source === "file") {
      throw new Error("Missing JSON file path. Provide <input> when using --source file.");
    }
    throw new Error("Missing FigJam URL or file key.");
  }

  return {
    input: trimmed,
    requiresToken: source === "rest" || source === "mcp" || source === "auto",
  };
}
