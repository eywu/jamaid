#!/usr/bin/env node

import { InvalidArgumentError, Command } from "commander";
import dotenv from "dotenv";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  isJsonInputSource,
  parseInputFormat,
  parseSourceMode,
  resolveCliIngestOptions,
} from "./cli-options.js";
import type {
  GenerateNeonHtmlOptions,
  NeonBallSize,
  NeonColorMode,
  NeonTheme,
} from "./neon-html.js";
import { runDiagramPipeline, type RenderedPageDiagram } from "./pipeline.js";
import type { LayoutPreset } from "./layout.js";
import type {
  DiagramInputFormat,
  DiagramSourceMode,
  MermaidDirection,
} from "./types.js";

const execFileAsync = promisify(execFile);

type CliOptions = {
  output?: string;
  token?: string;
  source?: DiagramSourceMode;
  format?: DiagramInputFormat;
  direction?: MermaidDirection;
  layout?: LayoutPreset;
  markdown?: boolean;
  png?: boolean;
  svg?: boolean;
  html?: boolean;
  page?: string;
  ballSize?: NeonBallSize;
  theme?: NeonTheme;
  colorMode?: NeonColorMode;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "output";
}

function createTempBasePath(): string {
  return join(tmpdir(), `jamaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

async function renderWithMmdc(
  mermaid: string,
  outPath: string,
  format: "png" | "svg",
  mermaidConfig: Record<string, unknown> | null = null,
) {
  const tempBasePath = createTempBasePath();
  const tmpMmd = `${tempBasePath}.mmd`;
  const tmpConfig = mermaidConfig ? `${tempBasePath}.config.json` : null;
  await writeFile(tmpMmd, `${mermaid}\n`, "utf8");
  if (tmpConfig) {
    await writeFile(tmpConfig, `${JSON.stringify(mermaidConfig)}\n`, "utf8");
  }

  const args = ["-i", tmpMmd, "-o", outPath, "-e", format, "-b", "transparent"];
  if (tmpConfig) {
    args.push("-c", tmpConfig);
  }

  try {
    await execFileAsync("mmdc", args);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      throw new Error("mmdc (mermaid-cli) not found. Install it with: npm i -g @mermaid-js/mermaid-cli");
    }
    throw new Error(`${format.toUpperCase()} rendering failed: ${msg}`);
  } finally {
    await unlink(tmpMmd).catch(() => {});
    if (tmpConfig) {
      await unlink(tmpConfig).catch(() => {});
    }
  }
}

const VALID_DIRECTIONS = new Set<MermaidDirection>(["TD", "LR", "TB", "BT", "RL"]);
const VALID_LAYOUTS = new Set<LayoutPreset>([
  "auto",
  "default",
  "compact",
  "elk",
  "organic",
  "tree",
]);
const VALID_BALL_SIZES = new Set<NeonBallSize>(["small", "medium", "large"]);
const VALID_THEMES = new Set<NeonTheme>(["neon", "pastel", "ocean", "sunset"]);
const VALID_COLOR_MODES = new Set<NeonColorMode>(["cluster", "random"]);

function parseDirection(value: string): MermaidDirection {
  const normalized = value.trim().toUpperCase() as MermaidDirection;
  if (!VALID_DIRECTIONS.has(normalized)) {
    throw new InvalidArgumentError("Direction must be one of: TD, LR, TB, BT, RL.");
  }
  return normalized;
}

function parseLayout(value: string): LayoutPreset {
  const normalized = value.trim().toLowerCase() as LayoutPreset;
  if (!VALID_LAYOUTS.has(normalized)) {
    throw new InvalidArgumentError("Layout must be one of: auto, default, compact, elk, organic, tree.");
  }
  return normalized;
}

function parseBallSize(value: string): NeonBallSize {
  const normalized = value.trim().toLowerCase() as NeonBallSize;
  if (!VALID_BALL_SIZES.has(normalized)) {
    throw new InvalidArgumentError("Ball size must be one of: small, medium, large.");
  }
  return normalized;
}

function parseTheme(value: string): NeonTheme {
  const normalized = value.trim().toLowerCase() as NeonTheme;
  if (!VALID_THEMES.has(normalized)) {
    throw new InvalidArgumentError("Theme must be one of: neon, pastel, ocean, sunset.");
  }
  return normalized;
}

function parseColorMode(value: string): NeonColorMode {
  const normalized = value.trim().toLowerCase() as NeonColorMode;
  if (!VALID_COLOR_MODES.has(normalized)) {
    throw new InvalidArgumentError("Color mode must be one of: cluster, random.");
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

function selectPages<T extends { pageName: string }>(pages: T[], requested?: string): T[] {
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
  if (options.html) return ".html";
  return ".mmd";
}

function defaultContent(mermaid: string, options: CliOptions): string {
  if (options.markdown) {
    return `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
  }
  return `${mermaid}\n`;
}

async function renderSvgString(
  mermaid: string,
  mermaidConfig: Record<string, unknown> | null = null,
): Promise<string> {
  const tempBasePath = createTempBasePath();
  const tmpMmd = `${tempBasePath}.mmd`;
  const tmpSvg = `${tempBasePath}.svg`;
  const tmpConfig = mermaidConfig ? `${tempBasePath}.config.json` : null;
  await writeFile(tmpMmd, `${mermaid}\n`, "utf8");
  if (tmpConfig) {
    await writeFile(tmpConfig, `${JSON.stringify(mermaidConfig)}\n`, "utf8");
  }

  const args = ["-i", tmpMmd, "-o", tmpSvg, "-e", "svg", "-t", "dark", "-b", "transparent"];
  if (tmpConfig) {
    args.push("-c", tmpConfig);
  }

  try {
    await execFileAsync("mmdc", args);
    return await readFile(tmpSvg, "utf8");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      throw new Error("mmdc (mermaid-cli) not found. Install it with: npm i -g @mermaid-js/mermaid-cli");
    }
    throw new Error(`SVG rendering failed: ${msg}`);
  } finally {
    await unlink(tmpMmd).catch(() => {});
    await unlink(tmpSvg).catch(() => {});
    if (tmpConfig) {
      await unlink(tmpConfig).catch(() => {});
    }
  }
}

async function writeDiagramOutput(
  mermaid: string,
  outPath: string,
  options: CliOptions,
  mermaidConfig: Record<string, unknown> | null,
  pageTitle?: string,
  htmlOptions: Pick<GenerateNeonHtmlOptions, "ballSize" | "theme" | "colorMode"> = {},
) {
  if (options.png) {
    await renderWithMmdc(mermaid, outPath, "png", mermaidConfig);
    return;
  }
  if (options.svg) {
    await renderWithMmdc(mermaid, outPath, "svg", mermaidConfig);
    return;
  }
  if (options.html) {
    const { generateNeonHtml } = await import("./neon-html.js");
    const svgString = await renderSvgString(mermaid, mermaidConfig);
    await writeFile(
      outPath,
      generateNeonHtml(svgString, { title: pageTitle, ...htmlOptions }),
      "utf8",
    );
    return;
  }

  await writeFile(outPath, defaultContent(mermaid, options), "utf8");
}

const program = new Command();

program
  .name("jamaid")
  .description("Convert FigJam flow diagrams into Mermaid markdown")
  .argument("[input]", "FigJam URL/file key or JSON file path (depends on --source)")
  .option("-o, --output <path>", "Write Mermaid output to file")
  .option("--token <token>", "Figma API token (overrides FIGMA_API_TOKEN)")
  .option(
    "--source <mode>",
    "Source mode: rest, mcp, auto, file, stdin",
    parseSourceMode,
    "rest",
  )
  .option(
    "--format <format>",
    "Input JSON format for --source file|stdin: rest, mcp, auto",
    parseInputFormat,
    "auto",
  )
  .option("--page <name-or-index>", "Export only one page by name or 1-based index")
  .option(
    "-d, --direction <direction>",
    "Mermaid flow direction override (TD, LR, TB, BT, RL)",
    parseDirection,
  )
  .option(
    "--layout <preset>",
    "Layout preset: auto, default, compact, elk, organic, tree",
    parseLayout,
    "auto",
  )
  .option("--markdown", "Output as Markdown with fenced mermaid code block (<filename>.md)")
  .option("--png", "Output as PNG image (<filename>.png, requires mmdc/mermaid-cli)")
  .option("--svg", "Output as SVG image (<filename>.svg, requires mmdc/mermaid-cli)")
  .option("--html", "Output as animated neon-themed HTML (<filename>.html, requires mmdc)")
  .option(
    "--ball-size <size>",
    "HTML ball size: small, medium, large",
    parseBallSize,
    "medium",
  )
  .option(
    "--theme <theme>",
    "HTML theme: neon, pastel, ocean, sunset",
    parseTheme,
    "neon",
  )
  .option(
    "--color-mode <mode>",
    "HTML color mode: cluster, random",
    parseColorMode,
    "cluster",
  )
  .action(async (input: string | undefined, options: CliOptions) => {
    const formatFlags = [options.markdown, options.png, options.svg, options.html].filter(Boolean).length;
    if (formatFlags > 1) {
      throw new Error("Use only one output format flag at a time: --markdown, --png, --svg, or --html.");
    }

    const source = options.source ?? "rest";
    const ingestOptions = resolveCliIngestOptions(source, input);
    const token = ingestOptions.requiresToken ? await resolveToken(options.token) : "";
    const format = options.format ?? "auto";
    const pipeline = await runDiagramPipeline({
      input: ingestOptions.input,
      token,
      source,
      format: isJsonInputSource(source) ? format : undefined,
      direction: options.direction,
      layout: options.layout,
    });
    const pages = selectPages<RenderedPageDiagram>(pipeline.pages, options.page);

    if (pages.length === 0) {
      throw new Error("No pages found to export.");
    }

    if (pipeline.fallbackUsed && source === "auto") {
      process.stderr.write("Source auto fallback: MCP failed, using REST.\n");
    }

    const fileBaseName = sanitizeFilename(pipeline.fileName ?? pipeline.fileKey);
    const htmlOptions: Pick<GenerateNeonHtmlOptions, "ballSize" | "theme" | "colorMode"> = {
      ballSize: options.ballSize,
      theme: options.theme,
      colorMode: options.colorMode,
    };

    if (pages.length === 1) {
      const [page] = pages;
      if (!page) {
        throw new Error("No page found to export.");
      }

      const mermaid = page.mermaid;

      if (!options.output && !options.markdown && !options.png && !options.svg && !options.html) {
        process.stdout.write(`${mermaid}\n`);
        return;
      }

      const defaultName = `${fileBaseName}-${sanitizeFilename(page.pageName)}${extensionFor(options)}`;
      const outPath = options.output ?? defaultName;
      await writeDiagramOutput(
        mermaid,
        outPath,
        options,
        page.mermaidConfig,
        page.pageName,
        htmlOptions,
      );
      process.stderr.write(`Written to ${outPath}\n`);
      return;
    }

    if (options.output) {
      throw new Error("--output can only be used with a single page. Use --page to select one page, or omit --output to export all pages automatically.");
    }

    for (const page of pages) {
      const mermaid = page.mermaid;
      const outPath = `${fileBaseName}-${sanitizeFilename(page.pageName)}${extensionFor(options)}`;
      await writeDiagramOutput(
        mermaid,
        outPath,
        options,
        page.mermaidConfig,
        page.pageName,
        htmlOptions,
      );
      process.stderr.write(`Written to ${outPath}\n`);
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
