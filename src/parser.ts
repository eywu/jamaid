import type {
  FigmaFileResponse,
  FigmaNode,
  ParsedEdge,
  ParsedEdgeKind,
  ParsedFlowDiagram,
  ParsedNode,
  ParsedSection,
  ParsedStickyNote,
} from "./types.js";

const ARROW_CAPS = new Set(["ARROW_LINES", "ARROW_EQUILATERAL"]);

function cleanText(value: string | undefined): string {
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function firstTextFromNode(node: FigmaNode): string {
  if (typeof node.characters === "string") {
    const chars = cleanText(node.characters);
    if (chars) {
      return chars;
    }
  }

  if (!Array.isArray(node.children)) {
    return "";
  }

  for (const child of node.children) {
    const chars = firstTextFromNode(child);
    if (chars) {
      return chars;
    }
  }

  return "";
}

function isArrowCap(strokeCap: string | undefined): boolean {
  if (!strokeCap) {
    return false;
  }
  return ARROW_CAPS.has(strokeCap);
}

function connectorKind(node: FigmaNode): ParsedEdgeKind {
  const hasArrowStart = isArrowCap(node.connectorStartStrokeCap);
  const hasArrowEnd = isArrowCap(node.connectorEndStrokeCap);

  if (hasArrowStart && hasArrowEnd) {
    return "bidirectional";
  }
  if (hasArrowEnd || hasArrowStart) {
    return "arrow";
  }
  return "line";
}

function parseShapeNode(node: FigmaNode, sectionId?: string): ParsedNode {
  const label =
    firstTextFromNode(node) ||
    cleanText(node.name) ||
    `Node ${cleanText(node.id) || "unknown"}`;

  return {
    sourceId: node.id,
    label,
    shapeType: node.shapeType,
    x: node.absoluteBoundingBox?.x,
    y: node.absoluteBoundingBox?.y,
    sectionId,
  };
}

function parseConnectorNode(node: FigmaNode): ParsedEdge | null {
  const sourceId = node.connectorStart?.endpointNodeId;
  const targetId = node.connectorEnd?.endpointNodeId;

  if (!sourceId || !targetId) {
    return null;
  }

  const label = firstTextFromNode(node);
  return {
    sourceId,
    targetId,
    label: label || undefined,
    kind: connectorKind(node),
  };
}

function parseStickyNode(node: FigmaNode): ParsedStickyNote | null {
  const text = firstTextFromNode(node) || cleanText(node.name);
  if (!text) {
    return null;
  }
  return {
    sourceId: node.id,
    text,
  };
}

export function parseFigmaFile(file: FigmaFileResponse): ParsedFlowDiagram {
  const nodesById = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const stickyNotes: ParsedStickyNote[] = [];
  const sectionsById = new Map<string, ParsedSection>();

  function visit(node: FigmaNode, currentSectionId?: string): void {
    let activeSectionId = currentSectionId;

    if (node.type === "SECTION") {
      activeSectionId = node.id;
      const section: ParsedSection = {
        sourceId: node.id,
        label: cleanText(node.name) || `Section ${sectionsById.size + 1}`,
        nodeIds: [],
      };
      sectionsById.set(node.id, section);
    }

    if (node.type === "SHAPE_WITH_TEXT") {
      const parsedNode = parseShapeNode(node, activeSectionId);
      nodesById.set(parsedNode.sourceId, parsedNode);
      if (activeSectionId) {
        const section = sectionsById.get(activeSectionId);
        if (section) {
          section.nodeIds.push(parsedNode.sourceId);
        }
      }
    } else if (node.type === "CONNECTOR") {
      const parsedEdge = parseConnectorNode(node);
      if (parsedEdge) {
        edges.push(parsedEdge);
      }
    } else if (node.type === "STICKY") {
      const sticky = parseStickyNode(node);
      if (sticky) {
        stickyNotes.push(sticky);
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child, activeSectionId);
      }
    }
  }

  visit(file.document);

  const validEdges = edges.filter(
    (edge) => nodesById.has(edge.sourceId) && nodesById.has(edge.targetId),
  );

  return {
    nodes: Array.from(nodesById.values()),
    edges: validEdges,
    sections: Array.from(sectionsById.values()).filter((section) => section.nodeIds.length > 0),
    stickyNotes,
  };
}
