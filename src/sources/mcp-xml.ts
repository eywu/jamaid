import { XMLParser } from "fast-xml-parser";
import type {
  McpDiagramPayload,
  McpDiagramEdgePayload,
  McpDiagramNodePayload,
  McpDiagramStickyNotePayload,
  McpDiagramSectionPayload,
} from "./diagram-source.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  textNodeName: "text",
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseNum(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseConnectorKind(startCap?: string, endCap?: string): McpDiagramEdgePayload["kind"] {
  const hasStartArrow = typeof startCap === "string" && startCap.includes("ARROW");
  const hasEndArrow = typeof endCap === "string" && endCap.includes("ARROW");
  if (hasStartArrow && hasEndArrow) return "bidirectional";
  if (hasStartArrow || hasEndArrow) return "arrow";
  return "line";
}

function toNode(value: Record<string, unknown>): McpDiagramNodePayload | undefined {
  const sourceId = typeof value.id === "string" ? value.id : undefined;
  if (!sourceId) return undefined;

  const text = typeof value.text === "string" ? value.text.trim() : "";
  const name = typeof value.name === "string" ? value.name : undefined;

  return {
    sourceId,
    label: text || name || sourceId,
    shapeType: name,
    x: parseNum(value.x),
    y: parseNum(value.y),
  };
}

function toEdge(value: Record<string, unknown>): McpDiagramEdgePayload | undefined {
  const sourceId = typeof value.connectorStart === "string" ? value.connectorStart : undefined;
  const targetId = typeof value.connectorEnd === "string" ? value.connectorEnd : undefined;
  if (!sourceId || !targetId) return undefined;

  const labelText = typeof value.text === "string" ? value.text.trim() : "";
  return {
    sourceId,
    targetId,
    label: labelText || undefined,
    kind: parseConnectorKind(
      typeof value.connectorStartCap === "string" ? value.connectorStartCap : undefined,
      typeof value.connectorEndCap === "string" ? value.connectorEndCap : undefined,
    ),
  };
}

function toSticky(value: Record<string, unknown>): McpDiagramStickyNotePayload | undefined {
  const sourceId = typeof value.id === "string" ? value.id : undefined;
  const text = typeof value.text === "string" ? value.text.trim() : undefined;
  if (!sourceId || !text) return undefined;
  return { sourceId, text };
}

function extractSections(canvas: Record<string, unknown>): McpDiagramSectionPayload[] {
  const sections = asArray(canvas.section as Record<string, unknown> | Record<string, unknown>[]);
  return sections
    .map((section) => {
      const sourceId = typeof section.id === "string" ? section.id : undefined;
      const label = typeof section.name === "string" ? section.name : undefined;
      if (!sourceId || !label) return undefined;

      const rawNodeIds = asArray(section["section-node"] as string | string[] | undefined).filter(
        (nodeId): nodeId is string => typeof nodeId === "string" && nodeId.length > 0,
      );

      return {
        sourceId,
        label,
        nodeIds: rawNodeIds,
      };
    })
    .filter((item): item is McpDiagramSectionPayload => Boolean(item));
}

export function parseMcpXmlPayload(xml: string): McpDiagramPayload {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const canvasesRaw = asArray(
    parsed.canvas as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );

  if (canvasesRaw.length === 0) {
    throw new Error("MCP endpoint returned XML without <canvas> root.");
  }

  const pages = canvasesRaw.map((canvas, index) => {
    const nodes = asArray(
      canvas["shape-with-text"] as Record<string, unknown> | Record<string, unknown>[] | undefined,
    )
      .map((node) => toNode(node))
      .filter((node): node is McpDiagramNodePayload => Boolean(node));

    const edges = asArray(
      canvas.connector as Record<string, unknown> | Record<string, unknown>[] | undefined,
    )
      .map((edge) => toEdge(edge))
      .filter((edge): edge is McpDiagramEdgePayload => Boolean(edge));

    const stickyNotes = asArray(
      canvas.sticky as Record<string, unknown> | Record<string, unknown>[] | undefined,
    )
      .map((sticky) => toSticky(sticky))
      .filter((sticky): sticky is McpDiagramStickyNotePayload => Boolean(sticky));

    return {
      pageId: typeof canvas.id === "string" ? canvas.id : `canvas-${index + 1}`,
      pageName:
        typeof canvas.name === "string" && canvas.name.length > 0
          ? canvas.name
          : `Canvas ${index + 1}`,
      diagram: {
        nodes,
        edges,
        sections: extractSections(canvas),
        stickyNotes,
      },
    };
  });

  return {
    fileName:
      pages.length === 1 ? pages[0]?.pageName : `FigJam MCP (${pages.length} canvases)`,
    pages,
  };
}
