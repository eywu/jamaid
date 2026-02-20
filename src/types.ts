export type MermaidDirection = "TD" | "LR" | "TB" | "BT" | "RL";

export interface FigmaEndpoint {
  endpointNodeId?: string;
}

export interface FigmaAbsoluteBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaNode {
  id: string;
  name?: string;
  type: string;
  children?: FigmaNode[];
  characters?: string;
  shapeType?: string;
  connectorStart?: FigmaEndpoint;
  connectorEnd?: FigmaEndpoint;
  connectorStartStrokeCap?: string;
  connectorEndStrokeCap?: string;
  absoluteBoundingBox?: FigmaAbsoluteBoundingBox;
}

export interface FigmaFileResponse {
  name?: string;
  document: FigmaNode;
}

export type ParsedEdgeKind = "arrow" | "line" | "bidirectional";

export interface ParsedNode {
  sourceId: string;
  label: string;
  shapeType?: string;
  x?: number;
  y?: number;
  sectionId?: string;
}

export interface ParsedEdge {
  sourceId: string;
  targetId: string;
  label?: string;
  kind: ParsedEdgeKind;
}

export interface ParsedStickyNote {
  sourceId: string;
  text: string;
}

export interface ParsedSection {
  sourceId: string;
  label: string;
  nodeIds: string[];
}

export interface ParsedFlowDiagram {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  sections: ParsedSection[];
  stickyNotes: ParsedStickyNote[];
}

export interface MermaidRenderOptions {
  direction?: MermaidDirection;
}
