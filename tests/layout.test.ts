import { describe, expect, it } from "vitest";
import {
  detectLayout,
  layoutToMermaidConfig,
  resolveLayout,
} from "../src/layout.js";
import type { CanonicalGraph } from "../src/types.js";

function makeNodes(count: number): CanonicalGraph["nodes"] {
  return Array.from({ length: count }, (_, index) => ({
    sourceId: `n${index}`,
    label: `Node ${index}`,
  }));
}

function graphWith(
  nodeCount: number,
  edges: Array<{ sourceId: string; targetId: string }>,
  sectionNodeIds: string[][] = [],
): CanonicalGraph {
  return {
    nodes: makeNodes(nodeCount),
    edges: edges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      kind: "arrow",
    })),
    sections: sectionNodeIds.map((nodeIds, index) => ({
      sourceId: `s${index}`,
      label: `Section ${index}`,
      nodeIds,
    })),
    stickyNotes: [],
  };
}

describe("detectLayout", () => {
  it("returns default for small simple graphs", () => {
    const graph = graphWith(3, [
      { sourceId: "n0", targetId: "n1" },
      { sourceId: "n1", targetId: "n2" },
    ]);

    expect(detectLayout(graph)).toBe("default");
  });

  it("returns tree for tree-shaped graphs", () => {
    const graph = graphWith(10, [
      { sourceId: "n0", targetId: "n1" },
      { sourceId: "n1", targetId: "n2" },
      { sourceId: "n1", targetId: "n3" },
      { sourceId: "n2", targetId: "n4" },
      { sourceId: "n2", targetId: "n5" },
      { sourceId: "n3", targetId: "n6" },
      { sourceId: "n3", targetId: "n7" },
      { sourceId: "n4", targetId: "n8" },
      { sourceId: "n4", targetId: "n9" },
    ]);

    expect(detectLayout(graph)).toBe("tree");
  });

  it("returns organic for dense graphs", () => {
    const edges: Array<{ sourceId: string; targetId: string }> = [];
    for (let index = 0; index < 10; index += 1) {
      edges.push(
        { sourceId: `n${index}`, targetId: `n${(index + 1) % 10}` },
        { sourceId: `n${index}`, targetId: `n${(index + 2) % 10}` },
      );
    }

    const graph = graphWith(10, edges);
    expect(detectLayout(graph)).toBe("organic");
  });

  it("returns elk when graph has at least three sections", () => {
    const graph = graphWith(
      12,
      [
        { sourceId: "n0", targetId: "n1" },
        { sourceId: "n2", targetId: "n1" },
        { sourceId: "n3", targetId: "n4" },
        { sourceId: "n5", targetId: "n6" },
        { sourceId: "n7", targetId: "n8" },
        { sourceId: "n9", targetId: "n10" },
      ],
      [
        ["n0", "n1", "n2", "n3"],
        ["n4", "n5", "n6", "n7"],
        ["n8", "n9", "n10", "n11"],
      ],
    );

    expect(detectLayout(graph)).toBe("elk");
  });

  it("returns compact for large sparse graphs", () => {
    const graph = graphWith(30, [
      { sourceId: "n0", targetId: "n1" },
      { sourceId: "n2", targetId: "n1" },
      { sourceId: "n3", targetId: "n4" },
      { sourceId: "n5", targetId: "n6" },
      { sourceId: "n7", targetId: "n8" },
      { sourceId: "n9", targetId: "n10" },
      { sourceId: "n11", targetId: "n12" },
      { sourceId: "n13", targetId: "n14" },
      { sourceId: "n15", targetId: "n16" },
      { sourceId: "n17", targetId: "n18" },
    ]);

    expect(detectLayout(graph)).toBe("compact");
  });
});

describe("layoutToMermaidConfig", () => {
  it("returns expected config values", () => {
    expect(layoutToMermaidConfig("default")).toBeNull();
    expect(layoutToMermaidConfig("auto")).toBeNull();
    expect(layoutToMermaidConfig("compact")).toEqual({
      flowchart: {
        nodeSpacing: 30,
        rankSpacing: 30,
        curve: "basis",
      },
    });
    expect(layoutToMermaidConfig("elk")).toEqual({
      flowchart: {
        defaultRenderer: "elk",
      },
    });
    expect(layoutToMermaidConfig("organic")).toEqual({
      flowchart: {
        defaultRenderer: "elk",
      },
      elk: {
        mergeEdges: true,
        nodePlacementStrategy: "SIMPLE",
      },
    });
    expect(layoutToMermaidConfig("tree")).toEqual({
      flowchart: {
        defaultRenderer: "elk",
      },
      elk: {
        algorithm: "mrtree",
        mergeEdges: true,
      },
    });
  });
});

describe("resolveLayout", () => {
  it("passes through non-auto presets", () => {
    const graph = graphWith(10, [{ sourceId: "n0", targetId: "n1" }]);
    expect(resolveLayout("elk", graph)).toBe("elk");
  });

  it("uses detection when preset is auto", () => {
    const graph = graphWith(10, [
      { sourceId: "n0", targetId: "n1" },
      { sourceId: "n1", targetId: "n2" },
      { sourceId: "n1", targetId: "n3" },
      { sourceId: "n2", targetId: "n4" },
      { sourceId: "n2", targetId: "n5" },
      { sourceId: "n3", targetId: "n6" },
      { sourceId: "n3", targetId: "n7" },
      { sourceId: "n4", targetId: "n8" },
      { sourceId: "n4", targetId: "n9" },
    ]);

    expect(resolveLayout("auto", graph)).toBe("tree");
  });
});
