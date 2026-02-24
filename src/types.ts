import type { LayoutPreset } from "./layout.js";

export type MermaidDirection = "TD" | "LR" | "TB" | "BT" | "RL";
export type DiagramSourceKind = "rest" | "mcp";
export type DiagramSourceMode = DiagramSourceKind | "auto" | "file" | "stdin";
export type DiagramInputSourceKind = DiagramSourceKind | "file" | "stdin";
export type DiagramInputFormat = DiagramSourceKind | "auto";

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

export interface CanonicalGraphNode {
  sourceId: string;
  label: string;
  shapeType?: string;
  x?: number;
  y?: number;
  sectionId?: string;
}

export interface CanonicalGraphEdge {
  sourceId: string;
  targetId: string;
  label?: string;
  kind: ParsedEdgeKind;
}

export interface CanonicalStickyNote {
  sourceId: string;
  text: string;
}

export interface CanonicalSection {
  sourceId: string;
  label: string;
  nodeIds: string[];
}

export interface CanonicalGraph {
  nodes: CanonicalGraphNode[];
  edges: CanonicalGraphEdge[];
  sections: CanonicalSection[];
  stickyNotes: CanonicalStickyNote[];
}

export interface CanonicalPageGraph {
  pageId: string;
  pageName: string;
  diagram: CanonicalGraph;
}

export interface CanonicalDiagramDocument {
  fileKey: string;
  fileName?: string;
  sourceKind: DiagramSourceKind;
  pages: CanonicalPageGraph[];
}

export interface MermaidRenderOptions {
  direction?: MermaidDirection;
  layout?: LayoutPreset;
}

// Backward-compatible aliases during v0.4 migration.
export type ParsedNode = CanonicalGraphNode;
export type ParsedEdge = CanonicalGraphEdge;
export type ParsedStickyNote = CanonicalStickyNote;
export type ParsedSection = CanonicalSection;
export type ParsedFlowDiagram = CanonicalGraph;
export type ParsedPageDiagram = CanonicalPageGraph;
