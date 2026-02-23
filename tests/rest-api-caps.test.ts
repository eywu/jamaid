import { describe, expect, it } from "vitest";
import { toMermaid } from "../src/mermaid.js";
import { parseFigmaFile } from "../src/parser.js";
import type { FigmaFileResponse } from "../src/types.js";

/**
 * The Figma REST API uses different stroke cap names than the Plugin API:
 *   REST: LINE_ARROW, TRIANGLE_ARROW, TRIANGLE_FILLED, DIAMOND_FILLED, CIRCLE_FILLED
 *   Plugin: ARROW_LINES, ARROW_EQUILATERAL
 * Both must be recognized as arrow caps.
 */
describe("REST API connector stroke caps", () => {
  const fixture: FigmaFileResponse = {
    name: "REST Cap Test",
    document: {
      id: "0:0",
      type: "DOCUMENT",
      name: "Document",
      children: [
        {
          id: "1:1",
          type: "CANVAS",
          name: "Page 1",
          children: [
            {
              id: "A",
              type: "SHAPE_WITH_TEXT",
              shapeType: "RECTANGLE",
              absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 50 },
              children: [{ id: "A:t", type: "TEXT", characters: "Start" }],
            },
            {
              id: "B",
              type: "SHAPE_WITH_TEXT",
              shapeType: "RECTANGLE",
              absoluteBoundingBox: { x: 300, y: 0, width: 100, height: 50 },
              children: [{ id: "B:t", type: "TEXT", characters: "End" }],
            },
            {
              id: "C",
              type: "SHAPE_WITH_TEXT",
              shapeType: "RECTANGLE",
              absoluteBoundingBox: { x: 600, y: 0, width: 100, height: 50 },
              children: [{ id: "C:t", type: "TEXT", characters: "Other" }],
            },
            {
              // REST API: LINE_ARROW on end → directed A --> B
              id: "e1",
              type: "CONNECTOR",
              connectorStart: { endpointNodeId: "A" },
              connectorEnd: { endpointNodeId: "B" },
              connectorEndStrokeCap: "LINE_ARROW",
            },
            {
              // REST API: TRIANGLE_ARROW on end → directed B --> C
              id: "e2",
              type: "CONNECTOR",
              connectorStart: { endpointNodeId: "B" },
              connectorEnd: { endpointNodeId: "C" },
              connectorEndStrokeCap: "TRIANGLE_ARROW",
            },
            {
              // REST API: TRIANGLE_FILLED on both → bidirectional
              id: "e3",
              type: "CONNECTOR",
              connectorStart: { endpointNodeId: "A" },
              connectorEnd: { endpointNodeId: "C" },
              connectorStartStrokeCap: "TRIANGLE_FILLED",
              connectorEndStrokeCap: "TRIANGLE_FILLED",
            },
          ],
        },
      ],
    },
  } as unknown as FigmaFileResponse;

  it("recognizes REST API cap names as arrows", () => {
    const parsed = parseFigmaFile(fixture);
    expect(parsed.edges).toHaveLength(3);

    const kinds = parsed.edges.map((e) => e.kind);
    expect(kinds).toContain("arrow");
    expect(kinds).toContain("bidirectional");
    expect(kinds.filter((k) => k === "arrow")).toHaveLength(2);
  });

  it("renders directed edges in Mermaid output", () => {
    const parsed = parseFigmaFile(fixture);
    const mermaid = toMermaid(parsed, { direction: "LR" });

    // Should have --> for directed edges, not ---
    expect(mermaid).toContain("-->");
    expect(mermaid).toContain("<-->");
    // Should NOT have undirected --- (all edges have caps)
    expect(mermaid).not.toMatch(/\s---\s/);
  });
});
