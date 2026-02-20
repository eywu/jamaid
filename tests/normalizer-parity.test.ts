import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { toMermaid } from "../src/mermaid.js";
import { normalizeDiagramDocument } from "../src/normalizer.js";
import type {
  McpDiagramPayload,
  McpIngestedDiagramDocument,
  RestIngestedDiagramDocument,
} from "../src/sources/diagram-source.js";
import type { FigmaFileResponse } from "../src/types.js";

async function loadRestFixture(): Promise<FigmaFileResponse> {
  const fixturePath = new URL("./fixtures/figma-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as FigmaFileResponse;
}

async function loadMcpParityFixture(): Promise<McpDiagramPayload> {
  const fixturePath = new URL("./fixtures/mcp-flow-parity.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as McpDiagramPayload;
}

function toRestIngested(file: FigmaFileResponse): RestIngestedDiagramDocument {
  return {
    sourceKind: "rest",
    fileKey: "abc123",
    file,
  };
}

function toMcpIngested(document: McpDiagramPayload): McpIngestedDiagramDocument {
  return {
    sourceKind: "mcp",
    fileKey: "abc123",
    document,
  };
}

describe("normalizeDiagramDocument parity", () => {
  it("renders identical Mermaid for equivalent REST and MCP payloads", async () => {
    const [restFixture, mcpFixture] = await Promise.all([loadRestFixture(), loadMcpParityFixture()]);

    const restNormalized = normalizeDiagramDocument(toRestIngested(restFixture));
    const mcpNormalized = normalizeDiagramDocument(toMcpIngested(mcpFixture));

    const restPage = restNormalized.pages[0];
    const mcpPage = mcpNormalized.pages[0];
    if (!restPage || !mcpPage) {
      throw new Error("Expected both normalized documents to contain a first page.");
    }

    const restMermaid = toMermaid(restPage.diagram);
    const mcpMermaid = toMermaid(mcpPage.diagram);

    expect(mcpMermaid).toBe(restMermaid);
  });
});
