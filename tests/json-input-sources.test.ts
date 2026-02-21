import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FigmaFileResponse } from "../src/types.js";
import { FileJsonSource } from "../src/sources/file-json-source.js";
import { resolveJsonPayloadFormat } from "../src/sources/json-payload.js";
import { StdinJsonSource } from "../src/sources/stdin-json-source.js";

async function loadRestFixture(): Promise<FigmaFileResponse> {
  const fixturePath = new URL("./fixtures/figma-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as FigmaFileResponse;
}

async function writeTempJson(payload: unknown): Promise<{ dir: string; filePath: string }> {
  const dir = await mkdtemp(join(tmpdir(), "jamaid-json-"));
  const filePath = join(dir, "payload.json");
  await writeFile(filePath, JSON.stringify(payload), "utf8");
  return { dir, filePath };
}

const SAMPLE_MCP_XML = `<canvas id="0:1" name="Unified" x="0" y="0" width="0" height="0">
  <shape-with-text id="1:2" x="-192" y="-112" width="176" height="176" name="SQUARE">AEO Visibility</shape-with-text>
  <shape-with-text id="1:12" x="64" y="-112" width="176" height="176" name="SQUARE">SERP Health</shape-with-text>
  <connector id="1:64" x="-104" y="72.5" connectorStart="1:2" connectorStartCap="NONE" connectorEnd="1:12" connectorEndCap="ARROW_LINES">Track</connector>
</canvas>`;

describe("file/stdin structured sources", () => {
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
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects MCP JSON payload from --source file with --format mcp", async () => {
    const restPayload = await loadRestFixture();
    const { dir, filePath } = await writeTempJson(restPayload);
    try {
      const source = new FileJsonSource();
      await expect(
        source.ingest({
          input: filePath,
          token: "",
          format: "mcp",
        }),
      ).rejects.toThrow("MCP input must be XML");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ingests MCP XML payload from --source file with --format mcp", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jamaid-xml-"));
    const filePath = join(dir, "payload.xml");
    await writeFile(filePath, SAMPLE_MCP_XML, "utf8");

    try {
      const source = new FileJsonSource();
      const ingested = await source.ingest({
        input: filePath,
        token: "",
        format: "mcp",
      });

      expect(ingested.sourceKind).toBe("mcp");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("auto-detects MCP XML payload format for --source file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jamaid-xml-"));
    const filePath = join(dir, "payload.xml");
    await writeFile(filePath, SAMPLE_MCP_XML, "utf8");

    try {
      const source = new FileJsonSource();
      const ingested = await source.ingest({
        input: filePath,
        token: "",
        format: "auto",
      });

      expect(ingested.sourceKind).toBe("mcp");
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
  });

  it("rejects MCP JSON payload from --source stdin", async () => {
    const restPayload = await loadRestFixture();
    const source = new StdinJsonSource(async () => JSON.stringify(restPayload));

    await expect(
      source.ingest({
        input: "",
        token: "",
        format: "mcp",
      }),
    ).rejects.toThrow("MCP input must be XML");
  });

  it("ingests MCP XML payload from --source stdin", async () => {
    const source = new StdinJsonSource(async () => SAMPLE_MCP_XML);

    const ingested = await source.ingest({
      input: "",
      token: "",
      format: "mcp",
    });

    expect(ingested.sourceKind).toBe("mcp");
  });
});

describe("JSON format auto-detection", () => {
  it("detects REST payload shape", async () => {
    const restPayload = await loadRestFixture();
    expect(resolveJsonPayloadFormat(restPayload, "auto")).toBe("rest");
  });

  it("fails when JSON is not REST under auto format", () => {
    expect(() => resolveJsonPayloadFormat({ pages: [] }, "auto")).toThrow(
      "Unable to auto-detect JSON payload format",
    );
  });
});
