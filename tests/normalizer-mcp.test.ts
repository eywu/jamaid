import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { toMermaid } from "../src/mermaid.js";
import { normalizeDiagramDocument } from "../src/normalizer.js";
import type {
  McpDiagramPayload,
  McpIngestedDiagramDocument,
} from "../src/sources/diagram-source.js";

async function loadFixture(): Promise<McpDiagramPayload> {
  const fixturePath = new URL("./fixtures/mcp-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as McpDiagramPayload;
}

function toMcpIngested(document: McpDiagramPayload): McpIngestedDiagramDocument {
  return {
    sourceKind: "mcp",
    fileKey: "abc123",
    document,
  };
}

describe("normalizeDiagramDocument (mcp)", () => {
  it("maps a valid MCP payload to canonical document shape", async () => {
    const payload = await loadFixture();
    const normalized = normalizeDiagramDocument(toMcpIngested(payload));

    expect(normalized.sourceKind).toBe("mcp");
    expect(normalized.fileKey).toBe("abc123");
    expect(normalized.fileName).toBe("MCP Fixture File");
    expect(normalized.pages).toHaveLength(1);
    expect(normalized.pages[0]?.pageName).toBe("Main Flow");
    expect(normalized.pages[0]?.diagram.nodes).toHaveLength(3);
    expect(normalized.pages[0]?.diagram.edges).toHaveLength(2);
    expect(normalized.pages[0]?.diagram.sections).toHaveLength(1);
    expect(normalized.pages[0]?.diagram.stickyNotes).toHaveLength(1);
  });

  it("rejects malformed payload when pages is not an array", () => {
    const malformed = {
      fileName: "Broken",
      pages: {},
    } as unknown as McpDiagramPayload;

    expect(() => normalizeDiagramDocument(toMcpIngested(malformed))).toThrow(
      "Invalid MCP payload at document.pages: expected an array.",
    );
  });

  it("rejects malformed payload when edge kind is invalid", async () => {
    const payload = await loadFixture();
    const malformed = structuredClone(payload);
    if (!malformed.pages[0]) {
      throw new Error("Expected fixture to include first page.");
    }

    malformed.pages[0].diagram.edges = [
      {
        sourceId: "n-start",
        targetId: "n-check",
        kind: "invalid-kind" as "arrow",
      },
    ];

    expect(() => normalizeDiagramDocument(toMcpIngested(malformed))).toThrow(
      "Invalid MCP payload at document.pages[0].diagram.edges[0].kind: expected one of: arrow, line, bidirectional.",
    );
  });

  it("supports mermaid rendering for normalized MCP diagrams", async () => {
    const payload = await loadFixture();
    const normalized = normalizeDiagramDocument(toMcpIngested(payload));
    const firstPage = normalized.pages[0];
    if (!firstPage) {
      throw new Error("Expected first page in normalized payload.");
    }

    const mermaid = toMermaid(firstPage.diagram);
    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain('subgraph s1["Core"]');
    expect(mermaid).toContain("-->|begin|");
    expect(mermaid).toContain("%% Note: Manual verification");
  });
});
