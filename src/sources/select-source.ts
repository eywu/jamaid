import type { DiagramInputSourceKind, DiagramSourceMode } from "../types.js";
import type { DiagramSource } from "./diagram-source.js";
import { FileJsonSource } from "./file-json-source.js";
import { FigmaMcpSource } from "./figma-mcp-source.js";
import { FigmaRestSource } from "./figma-rest-source.js";
import { StdinJsonSource } from "./stdin-json-source.js";

const SOURCE_MODE_ORDER: Record<DiagramSourceMode, readonly DiagramInputSourceKind[]> = {
  rest: ["rest"],
  mcp: ["mcp"],
  auto: ["mcp", "rest"],
  file: ["file"],
  stdin: ["stdin"],
};

export function sourceModeOrder(mode: DiagramSourceMode): readonly DiagramInputSourceKind[] {
  return SOURCE_MODE_ORDER[mode];
}

export function createSource(kind: DiagramInputSourceKind): DiagramSource {
  if (kind === "rest") {
    return new FigmaRestSource();
  }
  if (kind === "mcp") {
    return new FigmaMcpSource();
  }
  if (kind === "file") {
    return new FileJsonSource();
  }
  return new StdinJsonSource();
}

export function createSourcesForMode(mode: DiagramSourceMode): DiagramSource[] {
  return sourceModeOrder(mode).map((kind) => createSource(kind));
}
