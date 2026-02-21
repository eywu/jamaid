import type {
  DiagramInputFormat,
  DiagramSourceKind,
  FigmaAbsoluteBoundingBox,
  FigmaEndpoint,
  FigmaFileResponse,
  FigmaNode,
} from "../types.js";
import type {
  IngestedDiagramDocument,
  McpDiagramEdgePayload,
  McpDiagramNodePayload,
  McpDiagramPayload,
  McpDiagramSectionPayload,
  McpDiagramStickyNotePayload,
  McpPagePayload,
} from "./diagram-source.js";
import { parseMcpXmlPayload } from "./mcp-xml.js";

const XML_PAYLOAD_MARKER = "__jamaid_mcp_xml";

const VALID_EDGE_KINDS = new Set<McpDiagramEdgePayload["kind"]>([
  "arrow",
  "line",
  "bidirectional",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidRestPayload(path: string, message: string): never {
  throw new Error(`Invalid REST payload at ${path}: ${message}`);
}

function invalidMcpPayload(path: string, message: string): never {
  throw new Error(`Invalid MCP payload at ${path}: ${message}`);
}

function expectRecord(
  value: unknown,
  path: string,
  onInvalid: (path: string, message: string) => never,
): Record<string, unknown> {
  if (!isRecord(value)) {
    onInvalid(path, "expected an object.");
  }
  return value;
}

function expectArray(
  value: unknown,
  path: string,
  onInvalid: (path: string, message: string) => never,
): unknown[] {
  if (!Array.isArray(value)) {
    onInvalid(path, "expected an array.");
  }
  return value;
}

function expectString(
  value: unknown,
  path: string,
  onInvalid: (path: string, message: string) => never,
): string {
  if (typeof value !== "string") {
    onInvalid(path, "expected a string.");
  }
  return value;
}

function optionalString(
  value: unknown,
  path: string,
  onInvalid: (path: string, message: string) => never,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return expectString(value, path, onInvalid);
}

function expectFiniteNumber(
  value: unknown,
  path: string,
  onInvalid: (path: string, message: string) => never,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    onInvalid(path, "expected a finite number.");
  }
  return value;
}

function optionalFiniteNumber(
  value: unknown,
  path: string,
  onInvalid: (path: string, message: string) => never,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return expectFiniteNumber(value, path, onInvalid);
}

function normalizeEndpoint(value: unknown, path: string): FigmaEndpoint {
  const endpoint = expectRecord(value, path, invalidRestPayload);
  return {
    endpointNodeId: optionalString(
      endpoint.endpointNodeId,
      `${path}.endpointNodeId`,
      invalidRestPayload,
    ),
  };
}

function optionalEndpoint(value: unknown, path: string): FigmaEndpoint | undefined {
  if (value === undefined) {
    return undefined;
  }
  return normalizeEndpoint(value, path);
}

function normalizeAbsoluteBoundingBox(value: unknown, path: string): FigmaAbsoluteBoundingBox {
  const box = expectRecord(value, path, invalidRestPayload);
  return {
    x: expectFiniteNumber(box.x, `${path}.x`, invalidRestPayload),
    y: expectFiniteNumber(box.y, `${path}.y`, invalidRestPayload),
    width: expectFiniteNumber(box.width, `${path}.width`, invalidRestPayload),
    height: expectFiniteNumber(box.height, `${path}.height`, invalidRestPayload),
  };
}

function optionalAbsoluteBoundingBox(
  value: unknown,
  path: string,
): FigmaAbsoluteBoundingBox | undefined {
  if (value === undefined) {
    return undefined;
  }
  return normalizeAbsoluteBoundingBox(value, path);
}

function normalizeRestNode(value: unknown, path: string): FigmaNode {
  const node = expectRecord(value, path, invalidRestPayload);
  const children =
    node.children === undefined
      ? undefined
      : expectArray(node.children, `${path}.children`, invalidRestPayload).map((child, index) =>
          normalizeRestNode(child, `${path}.children[${index}]`),
        );

  return {
    id: expectString(node.id, `${path}.id`, invalidRestPayload),
    type: expectString(node.type, `${path}.type`, invalidRestPayload),
    name: optionalString(node.name, `${path}.name`, invalidRestPayload),
    children,
    characters: optionalString(node.characters, `${path}.characters`, invalidRestPayload),
    shapeType: optionalString(node.shapeType, `${path}.shapeType`, invalidRestPayload),
    connectorStart: optionalEndpoint(node.connectorStart, `${path}.connectorStart`),
    connectorEnd: optionalEndpoint(node.connectorEnd, `${path}.connectorEnd`),
    connectorStartStrokeCap: optionalString(
      node.connectorStartStrokeCap,
      `${path}.connectorStartStrokeCap`,
      invalidRestPayload,
    ),
    connectorEndStrokeCap: optionalString(
      node.connectorEndStrokeCap,
      `${path}.connectorEndStrokeCap`,
      invalidRestPayload,
    ),
    absoluteBoundingBox: optionalAbsoluteBoundingBox(
      node.absoluteBoundingBox,
      `${path}.absoluteBoundingBox`,
    ),
  };
}

export function validateRestPayload(value: unknown, path = "file"): FigmaFileResponse {
  const file = expectRecord(value, path, invalidRestPayload);
  return {
    name: optionalString(file.name, `${path}.name`, invalidRestPayload),
    document: normalizeRestNode(file.document, `${path}.document`),
  };
}

function normalizeMcpNode(value: unknown, path: string): McpDiagramNodePayload {
  const node = expectRecord(value, path, invalidMcpPayload);
  return {
    sourceId: expectString(node.sourceId, `${path}.sourceId`, invalidMcpPayload),
    label: expectString(node.label, `${path}.label`, invalidMcpPayload),
    shapeType: optionalString(node.shapeType, `${path}.shapeType`, invalidMcpPayload),
    x: optionalFiniteNumber(node.x, `${path}.x`, invalidMcpPayload),
    y: optionalFiniteNumber(node.y, `${path}.y`, invalidMcpPayload),
    sectionId: optionalString(node.sectionId, `${path}.sectionId`, invalidMcpPayload),
  };
}

function normalizeMcpEdge(value: unknown, path: string): McpDiagramEdgePayload {
  const edge = expectRecord(value, path, invalidMcpPayload);
  const kind = expectString(edge.kind, `${path}.kind`, invalidMcpPayload);
  if (!VALID_EDGE_KINDS.has(kind as McpDiagramEdgePayload["kind"])) {
    invalidMcpPayload(
      `${path}.kind`,
      `expected one of: ${Array.from(VALID_EDGE_KINDS).join(", ")}.`,
    );
  }

  return {
    sourceId: expectString(edge.sourceId, `${path}.sourceId`, invalidMcpPayload),
    targetId: expectString(edge.targetId, `${path}.targetId`, invalidMcpPayload),
    label: optionalString(edge.label, `${path}.label`, invalidMcpPayload),
    kind: kind as McpDiagramEdgePayload["kind"],
  };
}

function normalizeMcpSection(value: unknown, path: string): McpDiagramSectionPayload {
  const section = expectRecord(value, path, invalidMcpPayload);
  const nodeIds = expectArray(section.nodeIds, `${path}.nodeIds`, invalidMcpPayload);

  return {
    sourceId: expectString(section.sourceId, `${path}.sourceId`, invalidMcpPayload),
    label: expectString(section.label, `${path}.label`, invalidMcpPayload),
    nodeIds: nodeIds.map((nodeId, index) =>
      expectString(nodeId, `${path}.nodeIds[${index}]`, invalidMcpPayload),
    ),
  };
}

function normalizeMcpStickyNote(value: unknown, path: string): McpDiagramStickyNotePayload {
  const sticky = expectRecord(value, path, invalidMcpPayload);
  return {
    sourceId: expectString(sticky.sourceId, `${path}.sourceId`, invalidMcpPayload),
    text: expectString(sticky.text, `${path}.text`, invalidMcpPayload),
  };
}

function normalizeMcpPage(value: unknown, path: string): McpPagePayload {
  const page = expectRecord(value, path, invalidMcpPayload);
  const diagram = expectRecord(page.diagram, `${path}.diagram`, invalidMcpPayload);
  const nodes = expectArray(diagram.nodes, `${path}.diagram.nodes`, invalidMcpPayload);
  const edges = expectArray(diagram.edges, `${path}.diagram.edges`, invalidMcpPayload);
  const sections = expectArray(diagram.sections, `${path}.diagram.sections`, invalidMcpPayload);
  const stickyNotes = expectArray(
    diagram.stickyNotes,
    `${path}.diagram.stickyNotes`,
    invalidMcpPayload,
  );

  return {
    pageId: expectString(page.pageId, `${path}.pageId`, invalidMcpPayload),
    pageName: expectString(page.pageName, `${path}.pageName`, invalidMcpPayload),
    diagram: {
      nodes: nodes.map((node, index) => normalizeMcpNode(node, `${path}.diagram.nodes[${index}]`)),
      edges: edges.map((edge, index) => normalizeMcpEdge(edge, `${path}.diagram.edges[${index}]`)),
      sections: sections.map((section, index) =>
        normalizeMcpSection(section, `${path}.diagram.sections[${index}]`),
      ),
      stickyNotes: stickyNotes.map((sticky, index) =>
        normalizeMcpStickyNote(sticky, `${path}.diagram.stickyNotes[${index}]`),
      ),
    },
  };
}

export function validateMcpPayload(value: unknown, path = "document"): McpDiagramPayload {
  const document = expectRecord(value, path, invalidMcpPayload);
  const pages = expectArray(document.pages, `${path}.pages`, invalidMcpPayload);

  return {
    fileName: optionalString(document.fileName, `${path}.fileName`, invalidMcpPayload),
    pages: pages.map((page, index) => normalizeMcpPage(page, `${path}.pages[${index}]`)),
  };
}

export function looksLikeRestPayload(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (!isRecord(value.document)) {
    return false;
  }

  const document = value.document;
  return typeof document.id === "string" && typeof document.type === "string";
}

export function resolveJsonPayloadFormat(
  payload: unknown,
  requestedFormat: DiagramInputFormat,
): DiagramSourceKind {
  if (requestedFormat === "rest" || requestedFormat === "mcp") {
    return requestedFormat;
  }

  if (looksLikeRestPayload(payload)) {
    return "rest";
  }

  throw new Error(
    "Unable to auto-detect JSON payload format. Expected REST payload with `document` object. For MCP, provide XML (`get_figjam`) and use --format mcp or --format auto.",
  );
}

export function parsePayloadText(
  raw: string,
  sourceLabel: string,
  format: DiagramInputFormat = "auto",
): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`No input received from ${sourceLabel}.`);
  }

  const looksLikeXml = trimmed.startsWith("<");
  if (looksLikeXml) {
    if (format === "rest") {
      throw new Error(`Invalid REST payload from ${sourceLabel}: XML is not supported for --format rest.`);
    }
    try {
      const parsed = parseMcpXmlPayload(raw) as McpDiagramPayload & { [XML_PAYLOAD_MARKER]?: true };
      parsed[XML_PAYLOAD_MARKER] = true;
      return parsed;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid XML from ${sourceLabel}: ${detail}`);
    }
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON from ${sourceLabel}: ${detail}`);
  }

  if (format === "mcp") {
    throw new Error(`Invalid MCP payload from ${sourceLabel}: MCP input must be XML (get_figjam), not JSON.`);
  }

  return parsedJson;
}

export interface IngestJsonPayloadOptions {
  fileKey: string;
  format?: DiagramInputFormat;
}

export function ingestJsonPayload(
  payload: unknown,
  options: IngestJsonPayloadOptions,
): IngestedDiagramDocument {
  const hasXmlMarker =
    isRecord(payload) && (payload as Record<string, unknown>)[XML_PAYLOAD_MARKER] === true;
  const format = hasXmlMarker
    ? "mcp"
    : resolveJsonPayloadFormat(payload, options.format ?? "auto");
  if (format === "rest") {
    return {
      sourceKind: "rest",
      fileKey: options.fileKey,
      file: validateRestPayload(payload, "file"),
    };
  }

  return {
    sourceKind: "mcp",
    fileKey: options.fileKey,
    document: validateMcpPayload(payload, "document"),
  };
}
