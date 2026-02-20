import type {
  DiagramInputFormat,
  DiagramInputSourceKind,
  FigmaFileResponse,
} from "../types.js";

export interface DiagramSourceRequest {
  input: string;
  token: string;
  format?: DiagramInputFormat;
}

export interface RestIngestedDiagramDocument {
  sourceKind: "rest";
  fileKey: string;
  file: FigmaFileResponse;
}

export interface McpDiagramNodePayload {
  sourceId: string;
  label: string;
  shapeType?: string;
  x?: number;
  y?: number;
  sectionId?: string;
}

export interface McpDiagramEdgePayload {
  sourceId: string;
  targetId: string;
  label?: string;
  kind: "arrow" | "line" | "bidirectional";
}

export interface McpDiagramSectionPayload {
  sourceId: string;
  label: string;
  nodeIds: string[];
}

export interface McpDiagramStickyNotePayload {
  sourceId: string;
  text: string;
}

export interface McpPageDiagramPayload {
  nodes: McpDiagramNodePayload[];
  edges: McpDiagramEdgePayload[];
  sections: McpDiagramSectionPayload[];
  stickyNotes: McpDiagramStickyNotePayload[];
}

export interface McpPagePayload {
  pageId: string;
  pageName: string;
  diagram: McpPageDiagramPayload;
}

export interface McpDiagramPayload {
  fileName?: string;
  pages: McpPagePayload[];
}

export interface McpIngestedDiagramDocument {
  sourceKind: "mcp";
  fileKey: string;
  document: McpDiagramPayload;
}

export type IngestedDiagramDocument =
  | RestIngestedDiagramDocument
  | McpIngestedDiagramDocument;

export interface DiagramSource {
  readonly kind: DiagramInputSourceKind;
  ingest(request: DiagramSourceRequest): Promise<IngestedDiagramDocument>;
}
