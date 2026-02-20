import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FigmaFileResponse } from "../src/types.js";
import type { McpDiagramPayload } from "../src/sources/diagram-source.js";
import { FileJsonSource } from "../src/sources/file-json-source.js";
import { resolveJsonPayloadFormat } from "../src/sources/json-payload.js";
import { StdinJsonSource } from "../src/sources/stdin-json-source.js";

async function loadRestFixture(): Promise<FigmaFileResponse> {
  const fixturePath = new URL("./fixtures/figma-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as FigmaFileResponse;
}

async function loadMcpFixture(): Promise<McpDiagramPayload> {
  const fixturePath = new URL("./fixtures/mcp-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as McpDiagramPayload;
}

async function writeTempJson(payload: unknown): Promise<{ dir: string; filePath: string }> {
  const dir = await mkdtemp(join(tmpdir(), "jamaid-json-"));
  const filePath = join(dir, "payload.json");
  await writeFile(filePath, JSON.stringify(payload), "utf8");
  return { dir, filePath };
}

describe("file/stdin JSON sources", () => {
  it("ingests REST payload from --source file", async () => {
    const restPayload = await loadRestFixture();
    const { dir, filePath } = await writeTempJson(restPayload);
    try {
      const source = new FileJsonSource();
      const ingested = await source.ingest({
        input: filePath,
        token: "",
        format: "rest",
      });

      expect(ingested.sourceKind).toBe("rest");
      if (ingested.sourceKind !== "rest") {
        throw new Error("Expected REST ingested payload.");
      }
      expect(ingested.file.document.id).toBe(restPayload.document.id);
      expect(ingested.file.document.type).toBe(restPayload.document.type);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ingests MCP payload from --source file", async () => {
    const mcpPayload = await loadMcpFixture();
    const { dir, filePath } = await writeTempJson(mcpPayload);
    try {
      const source = new FileJsonSource();
      const ingested = await source.ingest({
        input: filePath,
        token: "",
        format: "mcp",
      });

      expect(ingested.sourceKind).toBe("mcp");
      if (ingested.sourceKind !== "mcp") {
        throw new Error("Expected MCP ingested payload.");
      }
      expect(ingested.document.pages[0]?.pageName).toBe(mcpPayload.pages[0]?.pageName);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("auto-detects REST payload format for --source file", async () => {
    const restPayload = await loadRestFixture();
    const { dir, filePath } = await writeTempJson(restPayload);
    try {
      const source = new FileJsonSource();
      const ingested = await source.ingest({
        input: filePath,
        token: "",
        format: "auto",
      });

      expect(ingested.sourceKind).toBe("rest");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ingests REST payload from --source stdin", async () => {
    const restPayload = await loadRestFixture();
    const source = new StdinJsonSource(async () => JSON.stringify(restPayload));

    const ingested = await source.ingest({
      input: "ignored",
      token: "",
      format: "rest",
    });

    expect(ingested.sourceKind).toBe("rest");
    if (ingested.sourceKind !== "rest") {
      throw new Error("Expected REST ingested payload.");
    }
    expect(ingested.file.document.id).toBe(restPayload.document.id);
  });

  it("ingests MCP payload from --source stdin", async () => {
    const mcpPayload = await loadMcpFixture();
    const source = new StdinJsonSource(async () => JSON.stringify(mcpPayload));

    const ingested = await source.ingest({
      input: "ignored",
      token: "",
      format: "mcp",
    });

    expect(ingested.sourceKind).toBe("mcp");
    if (ingested.sourceKind !== "mcp") {
      throw new Error("Expected MCP ingested payload.");
    }
    expect(ingested.document.pages[0]?.pageId).toBe(mcpPayload.pages[0]?.pageId);
  });

  it("auto-detects MCP payload format for --source stdin", async () => {
    const mcpPayload = await loadMcpFixture();
    const source = new StdinJsonSource(async () => JSON.stringify(mcpPayload));

    const ingested = await source.ingest({
      input: "",
      token: "",
      format: "auto",
    });

    expect(ingested.sourceKind).toBe("mcp");
  });
});

describe("JSON format auto-detection", () => {
  it("detects REST payload shape", async () => {
    const restPayload = await loadRestFixture();
    expect(resolveJsonPayloadFormat(restPayload, "auto")).toBe("rest");
  });

  it("detects MCP payload shape", async () => {
    const mcpPayload = await loadMcpFixture();
    expect(resolveJsonPayloadFormat(mcpPayload, "auto")).toBe("mcp");
  });

  it("fails with actionable message when format cannot be auto-detected", () => {
    expect(() => resolveJsonPayloadFormat({ hello: "world" }, "auto")).toThrow(
      "Unable to auto-detect JSON payload format. Expected REST payload with `document` object or MCP payload with `pages[].diagram` arrays. Pass --format rest or --format mcp.",
    );
  });
});
