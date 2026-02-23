import { describe, expect, it } from "vitest";
import { toMermaid } from "../src/mermaid.js";
import { parseFigmaFile } from "../src/parser.js";
import type { FigmaFileResponse } from "../src/types.js";

/**
 * FigJam connectors can have the arrowhead on the start cap only,
 * meaning the visual arrow points AT connectorStart (flow: end → start).
 * The parser must swap source/target so Mermaid renders correctly.
 */
describe("backward arrow (arrow on start cap only)", () => {
  const fixture: FigmaFileResponse = {
    name: "Backward Arrow Test",
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
              absoluteBoundingBox: { x: 100, y: 100, width: 100, height: 50 },
              children: [{ id: "A:t", type: "TEXT", characters: "NodeA" }],
            },
            {
              id: "B",
              type: "SHAPE_WITH_TEXT",
              shapeType: "RECTANGLE",
              absoluteBoundingBox: { x: 400, y: 100, width: 100, height: 50 },
              children: [{ id: "B:t", type: "TEXT", characters: "NodeB" }],
            },
            {
              id: "C:1",
              type: "CONNECTOR",
              connectorStart: { endpointNodeId: "A" },
              connectorEnd: { endpointNodeId: "B" },
              connectorStartStrokeCap: "ARROW_LINES",
              // no end cap — arrow points AT node A, so flow is B → A
            },
          ],
        },
      ],
    },
  } as unknown as FigmaFileResponse;

  it("detects edge kind as arrow", () => {
    const parsed = parseFigmaFile(fixture);
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.edges[0]!.kind).toBe("arrow");
  });

  it("swaps source/target so arrow follows visual direction (B → A)", () => {
    const parsed = parseFigmaFile(fixture);
    const edge = parsed.edges[0]!;
    // connectorStart=A, connectorEnd=B, arrow on start → swap
    expect(edge.sourceId).toBe("B");
    expect(edge.targetId).toBe("A");

    const mermaid = toMermaid(parsed, { direction: "LR" });
    // n1=NodeA, n2=NodeB — should render n2 --> n1
    expect(mermaid).toMatch(/n2[^-]*-->.*n1/);
  });
});
