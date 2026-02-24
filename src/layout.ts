import type { CanonicalGraph } from "./types.js";

export type LayoutPreset = "auto" | "default" | "compact" | "elk" | "organic" | "tree";

export function detectLayout(diagram: CanonicalGraph): LayoutPreset {
  const nodeCount = diagram.nodes.length;
  const edgeCount = diagram.edges.length;
  const edgeDensity = nodeCount === 0 ? 0 : edgeCount / nodeCount;
  const sectionCount = diagram.sections.length;

  const outDegreeByNode = new Map<string, number>();
  const inDegreeByNode = new Map<string, number>();

  for (const node of diagram.nodes) {
    outDegreeByNode.set(node.sourceId, 0);
    inDegreeByNode.set(node.sourceId, 0);
  }

  for (const edge of diagram.edges) {
    outDegreeByNode.set(edge.sourceId, (outDegreeByNode.get(edge.sourceId) ?? 0) + 1);
    if (inDegreeByNode.has(edge.targetId)) {
      inDegreeByNode.set(edge.targetId, (inDegreeByNode.get(edge.targetId) ?? 0) + 1);
    }
  }

  const maxFanOut = Math.max(0, ...outDegreeByNode.values());
  const isTreeShaped = Array.from(inDegreeByNode.values()).every((incoming) => incoming <= 1);

  if (nodeCount < 10 && edgeDensity < 1.5) {
    return "default";
  }
  if (isTreeShaped) {
    return "tree";
  }
  if (edgeDensity >= 2.0 || maxFanOut >= 5) {
    return "organic";
  }
  if (sectionCount >= 3) {
    return "elk";
  }
  if (nodeCount >= 30) {
    return "compact";
  }
  return "default";
}

export function layoutToMermaidConfig(
  preset: LayoutPreset,
): Record<string, unknown> | null {
  switch (preset) {
    case "compact":
      return {
        flowchart: {
          nodeSpacing: 30,
          rankSpacing: 30,
          curve: "basis",
        },
      };
    case "elk":
      return {
        flowchart: {
          defaultRenderer: "elk",
        },
      };
    case "organic":
      return {
        flowchart: {
          defaultRenderer: "elk",
        },
        elk: {
          mergeEdges: true,
          nodePlacementStrategy: "SIMPLE",
        },
      };
    case "tree":
      return {
        flowchart: {
          defaultRenderer: "elk",
        },
        elk: {
          algorithm: "mrtree",
          mergeEdges: true,
        },
      };
    case "auto":
    case "default":
    default:
      return null;
  }
}

export function resolveLayout(
  preset: LayoutPreset,
  diagram: CanonicalGraph,
): LayoutPreset {
  if (preset === "auto") {
    return detectLayout(diagram);
  }
  return preset;
}
