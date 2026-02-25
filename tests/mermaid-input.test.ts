import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectDirectMermaidInput,
  hasMermaidFileExtension,
  readDirectMermaidInput,
} from "../src/mermaid-input.js";
import { writeDiagramOutput } from "../src/output.js";

describe("detectDirectMermaidInput", () => {
  it("detects .mmd and .mermaid paths as direct Mermaid inputs", async () => {
    await expect(
      detectDirectMermaidInput({
        input: "./diagram.mmd",
        source: "rest",
        sourceWasExplicit: false,
        stdinIsTty: true,
      }),
    ).resolves.toEqual({ kind: "file", path: "./diagram.mmd" });

    await expect(
      detectDirectMermaidInput({
        input: "./diagram.mermaid",
        source: "rest",
        sourceWasExplicit: false,
        stdinIsTty: true,
      }),
    ).resolves.toEqual({ kind: "file", path: "./diagram.mermaid" });
  });

  it("does not misclassify FigJam URLs as Mermaid files", async () => {
    await expect(
      detectDirectMermaidInput({
        input: "https://www.figma.com/board/AbCdEf123456/Example-Flow",
        source: "rest",
        sourceWasExplicit: false,
        stdinIsTty: true,
        fileExistsFn: async () => false,
      }),
    ).resolves.toBeNull();
  });

  it("treats existing local files as Mermaid input even without extension", async () => {
    await expect(
      detectDirectMermaidInput({
        input: "./local-diagram",
        source: "rest",
        sourceWasExplicit: false,
        stdinIsTty: true,
        fileExistsFn: async () => true,
      }),
    ).resolves.toEqual({ kind: "file", path: "./local-diagram" });
  });

  it("prefers explicit --source file/stdin JSON modes over auto Mermaid detection", async () => {
    await expect(
      detectDirectMermaidInput({
        input: "./diagram.mmd",
        source: "file",
        sourceWasExplicit: true,
        stdinIsTty: true,
      }),
    ).resolves.toBeNull();

    await expect(
      detectDirectMermaidInput({
        source: "stdin",
        sourceWasExplicit: true,
        stdinIsTty: false,
      }),
    ).resolves.toBeNull();
  });

  it("uses Mermaid stdin mode when no input is provided and stdin is piped", async () => {
    await expect(
      detectDirectMermaidInput({
        source: "rest",
        sourceWasExplicit: false,
        stdinIsTty: false,
      }),
    ).resolves.toEqual({ kind: "stdin" });
  });

  it("recognizes Mermaid file extensions case-insensitively", () => {
    expect(hasMermaidFileExtension("diagram.MMD")).toBe(true);
    expect(hasMermaidFileExtension("diagram.MERMAID")).toBe(true);
    expect(hasMermaidFileExtension("https://figma.com/board/abc123")).toBe(false);
  });
});

describe("direct Mermaid file rendering", () => {
  it("reads a sample .mmd file and renders HTML with all HTML options", async () => {
    const fixtureDir = await mkdtemp(join(tmpdir(), "jamaid-mermaid-input-"));
    const inputPath = join(fixtureDir, "sample.mmd");
    const outputPath = join(fixtureDir, "sample.html");
    const sampleMermaid = "flowchart LR\\nA-->B";
    await writeFile(inputPath, sampleMermaid, "utf8");

    const directInput = await detectDirectMermaidInput({
      input: inputPath,
      source: "rest",
      sourceWasExplicit: false,
      stdinIsTty: true,
    });
    expect(directInput).toEqual({ kind: "file", path: inputPath });

    if (!directInput) {
      throw new Error("Expected direct Mermaid file input.");
    }

    const mermaid = await readDirectMermaidInput(directInput);
    expect(mermaid).toBe(sampleMermaid);

    let capturedHtmlOptions: Record<string, unknown> | null = null;

    await writeDiagramOutput(
      mermaid,
      outputPath,
      { html: true },
      { flowchart: { defaultRenderer: "elk" } },
      "Sample Title",
      {
        ballSize: "small",
        theme: "neon",
        colorMode: "random",
        glow: false,
      },
      {
        renderSvgStringFn: async (sourceMermaid, mermaidConfig) => {
          expect(sourceMermaid).toBe(sampleMermaid);
          expect(mermaidConfig).toEqual({ flowchart: { defaultRenderer: "elk" } });
          return "<svg><g id='demo'></g></svg>";
        },
        generateNeonHtmlFn: (svg, options) => {
          capturedHtmlOptions = options as Record<string, unknown>;
          return `<html>${svg}</html>`;
        },
      },
    );

    const html = await readFile(outputPath, "utf8");
    expect(html).toBe("<html><svg><g id='demo'></g></svg></html>");
    expect(capturedHtmlOptions).toEqual({
      title: "Sample Title",
      ballSize: "small",
      theme: "neon",
      colorMode: "random",
      glow: false,
    });
  });
});
