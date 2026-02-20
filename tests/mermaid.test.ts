import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { toMermaid } from "../src/mermaid.js";
import { parseFigmaFile } from "../src/parser.js";
import type { FigmaFileResponse, ParsedFlowDiagram } from "../src/types.js";

async function loadFixture(): Promise<FigmaFileResponse> {
  const fixturePath = new URL("./fixtures/figma-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as FigmaFileResponse;
}

describe("toMermaid", () => {
  it("renders flowchart from parsed figjam data", async () => {
    const file = await loadFixture();
    const parsed = parseFigmaFile(file);
    const output = toMermaid(parsed);

    expect(output).toContain("flowchart LR");
    expect(output).toContain('subgraph s1["Core Flow"]');
    expect(output).toContain("-->|submit|");
    expect(output).toContain("---");
    expect(output).toContain("<-->|sync|");
    expect(output).toContain("%% Note: Manual verification");
  });

  it("supports explicit direction override", () => {
    const flow: ParsedFlowDiagram = {
      nodes: [{ sourceId: "a", label: "A", shapeType: "RECTANGLE" }],
      edges: [],
      sections: [],
      stickyNotes: [],
    };

    const output = toMermaid(flow, { direction: "BT" });
    expect(output).toContain("flowchart BT");
  });

  it("maps known figjam shapes to mermaid notation", () => {
    const flow: ParsedFlowDiagram = {
      nodes: [
        { sourceId: "r", label: "Rounded", shapeType: "ROUNDED_RECTANGLE" },
        { sourceId: "d", label: "Decision", shapeType: "DIAMOND" },
        { sourceId: "db", label: "Store", shapeType: "ENG_DATABASE" },
        { sourceId: "h", label: "Hex", shapeType: "HEXAGON" }
      ],
      edges: [],
      sections: [],
      stickyNotes: [],
    };

    const output = toMermaid(flow, { direction: "TD" });
    expect(output).toContain("n1(Rounded)");
    expect(output).toContain("n2{Decision}");
    expect(output).toContain("n3[(Store)]");
    expect(output).toContain("n4{{Hex}}");
  });
});
