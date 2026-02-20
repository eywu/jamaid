import type { DiagramSourceKind, DiagramSourceMode } from "../types.js";
import type { DiagramSource } from "./diagram-source.js";
import { FigmaMcpSource } from "./figma-mcp-source.js";
import { FigmaRestSource } from "./figma-rest-source.js";

const SOURCE_MODE_ORDER: Record<DiagramSourceMode, readonly DiagramSourceKind[]> = {
  rest: ["rest"],
  mcp: ["mcp"],
  auto: ["mcp", "rest"],
};

export function sourceModeOrder(mode: DiagramSourceMode): readonly DiagramSourceKind[] {
  return SOURCE_MODE_ORDER[mode];
}

export function createSource(kind: DiagramSourceKind): DiagramSource {
  return kind === "rest" ? new FigmaRestSource() : new FigmaMcpSource();
}

export function createSourcesForMode(mode: DiagramSourceMode): DiagramSource[] {
  return sourceModeOrder(mode).map((kind) => createSource(kind));
}
