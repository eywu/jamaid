#!/usr/bin/env node

import { InvalidArgumentError, Command } from "commander";
import dotenv from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { extractFileKey, fetchFigmaFile } from "./figma.js";
import { toMermaid } from "./mermaid.js";
import { parseFigmaFile } from "./parser.js";
import type { MermaidDirection } from "./types.js";

type CliOptions = {
  output?: string;
  token?: string;
  direction?: MermaidDirection;
};

const VALID_DIRECTIONS = new Set<MermaidDirection>(["TD", "LR", "TB", "BT", "RL"]);

function parseDirection(value: string): MermaidDirection {
  const normalized = value.trim().toUpperCase() as MermaidDirection;
  if (!VALID_DIRECTIONS.has(normalized)) {
    throw new InvalidArgumentError("Direction must be one of: TD, LR, TB, BT, RL.");
  }
  return normalized;
}

async function tokenFromEnvFile(filePath: string): Promise<string | undefined> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = dotenv.parse(raw);
    const token = parsed.FIGMA_API_TOKEN?.trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

async function resolveToken(cliToken?: string): Promise<string> {
  if (cliToken?.trim()) {
    return cliToken.trim();
  }

  dotenv.config();

  const envToken = process.env.FIGMA_API_TOKEN?.trim();
  if (envToken) {
    return envToken;
  }

  const secretEnvPath = join(homedir(), "code", "_secret", ".env");
  const secretToken = await tokenFromEnvFile(secretEnvPath);
  if (secretToken) {
    return secretToken;
  }

  throw new Error("Figma API token not found. Pass --token or set FIGMA_API_TOKEN.");
}

const program = new Command();

program
  .name("jamaid")
  .description("Convert FigJam flow diagrams into Mermaid markdown")
  .argument("<input>", "FigJam URL or file key")
  .option("-o, --output <path>", "Write Mermaid output to file")
  .option("--token <token>", "Figma API token (overrides FIGMA_API_TOKEN)")
  .option(
    "-d, --direction <direction>",
    "Mermaid flow direction override (TD, LR, TB, BT, RL)",
    parseDirection,
  )
  .action(async (input: string, options: CliOptions) => {
    const fileKey = extractFileKey(input);
    const token = await resolveToken(options.token);
    const figmaFile = await fetchFigmaFile(fileKey, token);
    const diagram = parseFigmaFile(figmaFile);
    const mermaid = toMermaid(diagram, { direction: options.direction });

    if (options.output) {
      await writeFile(options.output, `${mermaid}\n`, "utf8");
      return;
    }

    process.stdout.write(`${mermaid}\n`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
