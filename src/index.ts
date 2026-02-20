#!/usr/bin/env node

import { InvalidArgumentError, Command } from "commander";
import dotenv from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extractFileKey, fetchFigmaFile } from "./figma.js";
import { toMermaid } from "./mermaid.js";
import { parseFigmaFile } from "./parser.js";
import type { MermaidDirection } from "./types.js";

const execFileAsync = promisify(execFile);

type CliOptions = {
  output?: string;
  token?: string;
  direction?: MermaidDirection;
  markdown?: boolean;
  png?: boolean;
  svg?: boolean;
  html?: boolean;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "output";
}

async function renderWithMmdc(mermaid: string, outPath: string, format: "png" | "svg" | "html") {
  const tmpMmd = join((await import("node:os")).tmpdir(), `jamaid-${Date.now()}.mmd`);
  await writeFile(tmpMmd, `${mermaid}\n`, "utf8");
  try {
    await execFileAsync("mmdc", ["-i", tmpMmd, "-o", outPath, "-e", format, "-b", "transparent"]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      throw new Error("mmdc (mermaid-cli) not found. Install it with: npm i -g @mermaid-js/mermaid-cli");
    }
    throw new Error(`${format.toUpperCase()} rendering failed: ${msg}`);
  } finally {
    await import("node:fs/promises").then((fs) => fs.unlink(tmpMmd).catch(() => {}));
  }
}

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
  .option("--markdown", "Output as Markdown with fenced mermaid code block (<filename>.md)")
  .option("--png", "Output as PNG image (<filename>.png, requires mmdc/mermaid-cli)")
  .option("--svg", "Output as SVG image (<filename>.svg, requires mmdc/mermaid-cli)")
  .option("--html", "Output as HTML with embedded interactive SVG (<filename>.html, requires mmdc/mermaid-cli)")
  .action(async (input: string, options: CliOptions) => {
    const fileKey = extractFileKey(input);
    const token = await resolveToken(options.token);
    const figmaFile = await fetchFigmaFile(fileKey, token);
    const diagram = parseFigmaFile(figmaFile);
    const mermaid = toMermaid(diagram, { direction: options.direction });

    const baseName = sanitizeFilename(figmaFile.name ?? fileKey);

    const formatFlags = [options.markdown, options.png, options.svg, options.html].filter(Boolean).length;
    if (formatFlags > 1) {
      throw new Error("Use only one output format flag at a time: --markdown, --png, --svg, or --html.");
    }

    if (options.markdown) {
      const mdContent = `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
      const mdPath = options.output ?? `${baseName}.md`;
      await writeFile(mdPath, mdContent, "utf8");
      process.stderr.write(`Written to ${mdPath}\n`);
      return;
    }

    if (options.png) {
      const outPath = options.output ?? `${baseName}.png`;
      await renderWithMmdc(mermaid, outPath, "png");
      process.stderr.write(`Written to ${outPath}\n`);
      return;
    }

    if (options.svg) {
      const outPath = options.output ?? `${baseName}.svg`;
      await renderWithMmdc(mermaid, outPath, "svg");
      process.stderr.write(`Written to ${outPath}\n`);
      return;
    }

    if (options.html) {
      const outPath = options.output ?? `${baseName}.html`;
      await renderWithMmdc(mermaid, outPath, "html");
      process.stderr.write(`Written to ${outPath}\n`);
      return;
    }

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
