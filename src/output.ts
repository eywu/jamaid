import { execFile } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { GenerateNeonHtmlOptions } from "./neon-html.js";

const execFileAsync = promisify(execFile);

export interface OutputFormatOptions {
  markdown?: boolean;
  png?: boolean;
  svg?: boolean;
  html?: boolean;
}

export interface HtmlRenderOptions
  extends Pick<GenerateNeonHtmlOptions, "ballSize" | "theme" | "colorMode" | "glow"> {}

export interface WriteDiagramOutputDependencies {
  renderWithMmdcFn?: typeof renderWithMmdc;
  renderSvgStringFn?: typeof renderSvgString;
  generateNeonHtmlFn?: (svgString: string, options: GenerateNeonHtmlOptions) => string;
  writeTextFileFn?: (outPath: string, content: string) => Promise<void>;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "output";
}

export function extensionFor(options: OutputFormatOptions): string {
  if (options.markdown) return ".md";
  if (options.png) return ".png";
  if (options.svg) return ".svg";
  if (options.html) return ".html";
  return ".mmd";
}

export function defaultContent(mermaid: string, options: OutputFormatOptions): string {
  if (options.markdown) {
    return `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
  }
  return `${mermaid}\n`;
}

function createTempBasePath(): string {
  return join(tmpdir(), `jamaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

export async function renderWithMmdc(
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

export async function renderSvgString(
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

async function defaultGenerateNeonHtml(
  svgString: string,
  options: GenerateNeonHtmlOptions,
): Promise<string> {
  const { generateNeonHtml } = await import("./neon-html.js");
  return generateNeonHtml(svgString, options);
}

export async function writeDiagramOutput(
  mermaid: string,
  outPath: string,
  options: OutputFormatOptions,
  mermaidConfig: Record<string, unknown> | null,
  pageTitle?: string,
  htmlOptions: HtmlRenderOptions = {},
  dependencies: WriteDiagramOutputDependencies = {},
) {
  const renderWithMmdcFn = dependencies.renderWithMmdcFn ?? renderWithMmdc;
  const renderSvgStringFn = dependencies.renderSvgStringFn ?? renderSvgString;
  const generateNeonHtmlFn = dependencies.generateNeonHtmlFn;
  const writeTextFileFn = dependencies.writeTextFileFn ?? (async (path: string, content: string) => {
    await writeFile(path, content, "utf8");
  });

  if (options.png) {
    await renderWithMmdcFn(mermaid, outPath, "png", mermaidConfig);
    return;
  }
  if (options.svg) {
    await renderWithMmdcFn(mermaid, outPath, "svg", mermaidConfig);
    return;
  }
  if (options.html) {
    const svgString = await renderSvgStringFn(mermaid, mermaidConfig);
    const html = generateNeonHtmlFn
      ? generateNeonHtmlFn(svgString, { title: pageTitle, ...htmlOptions })
      : await defaultGenerateNeonHtml(svgString, { title: pageTitle, ...htmlOptions });
    await writeTextFileFn(outPath, html);
    return;
  }

  await writeTextFileFn(outPath, defaultContent(mermaid, options));
}
