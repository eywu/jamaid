import { parseFigmaPages } from "./parser.js";
import type {
  CanonicalDiagramDocument,
  CanonicalGraphEdge,
  CanonicalGraphNode,
  CanonicalPageGraph,
  ParsedEdgeKind,
} from "./types.js";
import type {
  IngestedDiagramDocument,
  McpDiagramPayload,
  McpDiagramStickyNotePayload,
  McpIngestedDiagramDocument,
  McpPagePayload,
  RestIngestedDiagramDocument,
} from "./sources/diagram-source.js";

export interface FigmaMcpNormalizedDocumentContract extends McpDiagramPayload {}

const VALID_EDGE_KINDS = new Set<ParsedEdgeKind>(["arrow", "line", "bidirectional"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidMcpPayload(path: string, message: string): never {
  throw new Error(`Invalid MCP payload at ${path}: ${message}`);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    invalidMcpPayload(path, "expected an object.");
  }
  return value;
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    invalidMcpPayload(path, "expected an array.");
  }
  return value;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    invalidMcpPayload(path, "expected a string.");
  }
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return expectString(value, path);
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalidMcpPayload(path, "expected a finite number.");
  }
  return value;
}

function normalizeMcpNode(value: unknown, path: string): CanonicalGraphNode {
  const node = expectRecord(value, path);
  return {
    sourceId: expectString(node.sourceId, `${path}.sourceId`),
    label: expectString(node.label, `${path}.label`),
    shapeType: optionalString(node.shapeType, `${path}.shapeType`),
    x: optionalNumber(node.x, `${path}.x`),
    y: optionalNumber(node.y, `${path}.y`),
    sectionId: optionalString(node.sectionId, `${path}.sectionId`),
  };
}

function normalizeMcpEdge(value: unknown, path: string): CanonicalGraphEdge {
  const edge = expectRecord(value, path);
  const kind = expectString(edge.kind, `${path}.kind`);
  if (!VALID_EDGE_KINDS.has(kind as ParsedEdgeKind)) {
    invalidMcpPayload(
      `${path}.kind`,
      `expected one of: ${Array.from(VALID_EDGE_KINDS).join(", ")}.`,
    );
  }

  return {
    sourceId: expectString(edge.sourceId, `${path}.sourceId`),
    targetId: expectString(edge.targetId, `${path}.targetId`),
    label: optionalString(edge.label, `${path}.label`),
    kind: kind as ParsedEdgeKind,
  };
}

function normalizeMcpSection(
  value: unknown,
  path: string,
): CanonicalPageGraph["diagram"]["sections"][number] {
  const section = expectRecord(value, path);
  const rawNodeIds = expectArray(section.nodeIds, `${path}.nodeIds`);

  return {
    sourceId: expectString(section.sourceId, `${path}.sourceId`),
    label: expectString(section.label, `${path}.label`),
    nodeIds: rawNodeIds.map((nodeId, index) => expectString(nodeId, `${path}.nodeIds[${index}]`)),
  };
}

function normalizeMcpStickyNote(
  value: unknown,
  path: string,
): McpDiagramStickyNotePayload {
  const sticky = expectRecord(value, path);
  return {
    sourceId: expectString(sticky.sourceId, `${path}.sourceId`),
    text: expectString(sticky.text, `${path}.text`),
  };
}

function normalizeMcpPage(value: unknown, path: string): CanonicalPageGraph {
  const page = expectRecord(value, path);
  const diagram = expectRecord(page.diagram, `${path}.diagram`);
  const rawNodes = expectArray(diagram.nodes, `${path}.diagram.nodes`);
  const rawEdges = expectArray(diagram.edges, `${path}.diagram.edges`);
  const rawSections = expectArray(diagram.sections, `${path}.diagram.sections`);
  const rawStickyNotes = expectArray(diagram.stickyNotes, `${path}.diagram.stickyNotes`);

  return {
    pageId: expectString(page.pageId, `${path}.pageId`),
    pageName: expectString(page.pageName, `${path}.pageName`),
    diagram: {
      nodes: rawNodes.map((node, index) => normalizeMcpNode(node, `${path}.diagram.nodes[${index}]`)),
      edges: rawEdges.map((edge, index) => normalizeMcpEdge(edge, `${path}.diagram.edges[${index}]`)),
      sections: rawSections.map((section, index) =>
        normalizeMcpSection(section, `${path}.diagram.sections[${index}]`),
      ),
      stickyNotes: rawStickyNotes.map((sticky, index) =>
        normalizeMcpStickyNote(sticky, `${path}.diagram.stickyNotes[${index}]`),
      ),
    },
  };
}

function normalizeRestDocument(
  ingested: RestIngestedDiagramDocument,
): CanonicalDiagramDocument {
  return {
    sourceKind: "rest",
    fileKey: ingested.fileKey,
    fileName: ingested.file.name,
    pages: parseFigmaPages(ingested.file),
  };
}

function normalizeMcpDocument(
  ingested: McpIngestedDiagramDocument,
): CanonicalDiagramDocument {
  const raw = ingested.document as unknown;
  const document = expectRecord(raw, "document");
  const fileName = optionalString(document.fileName, "document.fileName");
  const rawPages = expectArray(document.pages, "document.pages");
  const pages = rawPages.map((page, index) => normalizeMcpPage(page, `document.pages[${index}]`));

  return {
    sourceKind: "mcp",
    fileKey: ingested.fileKey,
    fileName,
    pages,
  };
}

export function normalizeDiagramDocument(
  ingested: IngestedDiagramDocument,
): CanonicalDiagramDocument {
  if (ingested.sourceKind === "rest") {
    return normalizeRestDocument(ingested);
  }
  return normalizeMcpDocument(ingested);
}
