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
import { parseFigmaPages } from "./parser.js";
import type { MermaidDirection, ParsedPageDiagram } from "./types.js";

const execFileAsync = promisify(execFile);

type CliOptions = {
  output?: string;
  token?: string;
  direction?: MermaidDirection;
  markdown?: boolean;
  png?: boolean;
  svg?: boolean;
  page?: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "output";
}

async function renderWithMmdc(mermaid: string, outPath: string, format: "png" | "svg") {
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

function selectPages(pages: ParsedPageDiagram[], requested?: string): ParsedPageDiagram[] {
  if (!requested?.trim()) {
    return pages;
  }

  const selector = requested.trim();
  if (/^\d+$/.test(selector)) {
    const index = Number.parseInt(selector, 10);
    const page = pages[index - 1];
    if (!page) {
      throw new Error(`Page index ${index} is out of range. Found ${pages.length} page(s).`);
    }
    return [page];
  }

  const lowered = selector.toLowerCase();
  const byName = pages.find((page) => page.pageName.toLowerCase() === lowered);
  if (!byName) {
    throw new Error(`Page \"${selector}\" not found. Available pages: ${pages.map((p, i) => `${i + 1}:${p.pageName}`).join(", ")}`);
  }
  return [byName];
}

function extensionFor(options: CliOptions): string {
  if (options.markdown) return ".md";
  if (options.png) return ".png";
  if (options.svg) return ".svg";
  return ".mmd";
}

function defaultContent(mermaid: string, options: CliOptions): string {
  if (options.markdown) {
    return `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
  }
  return `${mermaid}\n`;
}

async function writeDiagramOutput(mermaid: string, outPath: string, options: CliOptions) {
  if (options.png) {
    await renderWithMmdc(mermaid, outPath, "png");
    return;
  }
  if (options.svg) {
    await renderWithMmdc(mermaid, outPath, "svg");
    return;
  }

  await writeFile(outPath, defaultContent(mermaid, options), "utf8");
}

const program = new Command();

program
  .name("jamaid")
  .description("Convert FigJam flow diagrams into Mermaid markdown")
  .argument("<input>", "FigJam URL or file key")
  .option("-o, --output <path>", "Write Mermaid output to file")
  .option("--token <token>", "Figma API token (overrides FIGMA_API_TOKEN)")
  .option("--page <name-or-index>", "Export only one page by name or 1-based index")
  .option(
    "-d, --direction <direction>",
    "Mermaid flow direction override (TD, LR, TB, BT, RL)",
    parseDirection,
  )
  .option("--markdown", "Output as Markdown with fenced mermaid code block (<filename>.md)")
  .option("--png", "Output as PNG image (<filename>.png, requires mmdc/mermaid-cli)")
  .option("--svg", "Output as SVG image (<filename>.svg, requires mmdc/mermaid-cli)")
  .action(async (input: string, options: CliOptions) => {
    const fileKey = extractFileKey(input);
    const token = await resolveToken(options.token);
    const figmaFile = await fetchFigmaFile(fileKey, token);
    const allPages = parseFigmaPages(figmaFile);
    const pages = selectPages(allPages, options.page);

    const formatFlags = [options.markdown, options.png, options.svg].filter(Boolean).length;
    if (formatFlags > 1) {
      throw new Error("Use only one output format flag at a time: --markdown, --png, or --svg.");
    }

    if (pages.length === 0) {
      throw new Error("No pages found to export.");
    }

    const fileBaseName = sanitizeFilename(figmaFile.name ?? fileKey);

    if (pages.length === 1) {
      const [page] = pages;
      if (!page) {
        throw new Error("No page found to export.");
      }

      const mermaid = toMermaid(page.diagram, { direction: options.direction });

      if (!options.output && !options.markdown && !options.png && !options.svg) {
        process.stdout.write(`${mermaid}\n`);
        return;
      }

      const defaultName = `${fileBaseName}-${sanitizeFilename(page.pageName)}${extensionFor(options)}`;
      const outPath = options.output ?? defaultName;
      await writeDiagramOutput(mermaid, outPath, options);
      process.stderr.write(`Written to ${outPath}\n`);
      return;
    }

    if (options.output) {
      throw new Error("--output can only be used with a single page. Use --page to select one page, or omit --output to export all pages automatically.");
    }

    for (const page of pages) {
      const mermaid = toMermaid(page.diagram, { direction: options.direction });
      const outPath = `${fileBaseName}-${sanitizeFilename(page.pageName)}${extensionFor(options)}`;
      await writeDiagramOutput(mermaid, outPath, options);
      process.stderr.write(`Written to ${outPath}\n`);
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
