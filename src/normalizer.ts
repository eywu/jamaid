import { parseFigmaPages } from "./parser.js";
import type {
  CanonicalDiagramDocument,
  CanonicalPageGraph,
} from "./types.js";
import type {
  IngestedDiagramDocument,
  McpDiagramPayload,
  McpIngestedDiagramDocument,
  RestIngestedDiagramDocument,
} from "./sources/diagram-source.js";
import { validateMcpPayload, validateRestPayload } from "./sources/json-payload.js";

export interface FigmaMcpNormalizedDocumentContract extends McpDiagramPayload {}

function normalizeRestDocument(
  ingested: RestIngestedDiagramDocument,
): CanonicalDiagramDocument {
  const file = validateRestPayload(ingested.file, "file");
  return {
    sourceKind: "rest",
    fileKey: ingested.fileKey,
    fileName: file.name,
    pages: parseFigmaPages(file),
  };
}

function normalizeMcpPage(page: McpDiagramPayload["pages"][number]): CanonicalPageGraph {
  return {
    pageId: page.pageId,
    pageName: page.pageName,
    diagram: {
      nodes: page.diagram.nodes.map((node) => ({ ...node })),
      edges: page.diagram.edges.map((edge) => ({ ...edge })),
      sections: page.diagram.sections.map((section) => ({
        ...section,
        nodeIds: [...section.nodeIds],
      })),
      stickyNotes: page.diagram.stickyNotes.map((sticky) => ({ ...sticky })),
    },
  };
}

function normalizeMcpDocument(
  ingested: McpIngestedDiagramDocument,
): CanonicalDiagramDocument {
  const document = validateMcpPayload(ingested.document, "document");
  return {
    sourceKind: "mcp",
    fileKey: ingested.fileKey,
    fileName: document.fileName,
    pages: document.pages.map((page) => normalizeMcpPage(page)),
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
