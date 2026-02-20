import { toMermaid } from "./mermaid.js";
import { normalizeDiagramDocument } from "./normalizer.js";
import type { DiagramSource, IngestedDiagramDocument } from "./sources/diagram-source.js";
import {
  isMcpSourceUnavailableError,
} from "./sources/figma-mcp-source.js";
import { createSourcesForMode } from "./sources/select-source.js";
import type {
  CanonicalDiagramDocument,
  DiagramSourceKind,
  DiagramSourceMode,
  MermaidDirection,
} from "./types.js";

export interface IngestPipelineOptions {
  input: string;
  token: string;
  source: DiagramSourceMode;
  sources?: DiagramSource[];
}

export interface IngestResult {
  selectedSource: DiagramSourceKind;
  fallbackUsed: boolean;
  ingested: IngestedDiagramDocument;
}

export interface TransformedDiagramDocument extends CanonicalDiagramDocument {}

export interface RenderedPageDiagram {
  pageId: string;
  pageName: string;
  diagram: CanonicalDiagramDocument["pages"][number]["diagram"];
  mermaid: string;
}

export interface RunPipelineOptions extends IngestPipelineOptions {
  direction?: MermaidDirection;
}

export interface RunPipelineResult {
  requestedSource: DiagramSourceMode;
  selectedSource: DiagramSourceKind;
  fallbackUsed: boolean;
  fileKey: string;
  fileName?: string;
  pages: RenderedPageDiagram[];
}

const MCP_HTTP_FAILURE_PATTERN = /^MCP endpoint request failed \((\d{3})\):/;
const MCP_TIMEOUT_MESSAGE_PREFIX = "MCP endpoint request timed out after";

function mcpErrorStatusCode(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const match = error.message.match(MCP_HTTP_FAILURE_PATTERN);
  if (!match?.[1]) {
    return undefined;
  }
  const status = Number.parseInt(match[1], 10);
  if (!Number.isFinite(status)) {
    return undefined;
  }
  return status;
}

function isMcpAutoFallbackError(error: unknown): boolean {
  if (isMcpSourceUnavailableError(error)) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (
    error instanceof Error &&
    error.message.startsWith(MCP_TIMEOUT_MESSAGE_PREFIX)
  ) {
    return true;
  }
  const status = mcpErrorStatusCode(error);
  return typeof status === "number" && status >= 500 && status < 600;
}

export async function ingestDiagram(options: IngestPipelineOptions): Promise<IngestResult> {
  const sources = options.sources ?? createSourcesForMode(options.source);
  let lastError: unknown;

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    if (!source) {
      continue;
    }

    try {
      const ingested = await source.ingest({
        input: options.input,
        token: options.token,
      });
      return {
        selectedSource: source.kind,
        fallbackUsed: options.source === "auto" && source.kind === "rest" && index > 0,
        ingested,
      };
    } catch (error: unknown) {
      lastError = error;
      const canFallback =
        options.source === "auto" &&
        source.kind === "mcp" &&
        isMcpAutoFallbackError(error);
      if (canFallback) {
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("No source is available for ingestion.");
}

export function normalizeIngested(ingested: IngestedDiagramDocument): CanonicalDiagramDocument {
  return normalizeDiagramDocument(ingested);
}

export function transformNormalized(
  normalized: CanonicalDiagramDocument,
): TransformedDiagramDocument {
  // Reserved for graph-level transforms in v0.4.x.
  return normalized;
}

export function renderTransformed(
  transformed: TransformedDiagramDocument,
  direction?: MermaidDirection,
): RenderedPageDiagram[] {
  return transformed.pages.map((page) => ({
    pageId: page.pageId,
    pageName: page.pageName,
    diagram: page.diagram,
    mermaid: toMermaid(page.diagram, { direction }),
  }));
}

export async function runDiagramPipeline(
  options: RunPipelineOptions,
): Promise<RunPipelineResult> {
  const ingested = await ingestDiagram(options);
  const normalized = normalizeIngested(ingested.ingested);
  const transformed = transformNormalized(normalized);
  const pages = renderTransformed(transformed, options.direction);

  return {
    requestedSource: options.source,
    selectedSource: ingested.selectedSource,
    fallbackUsed: ingested.fallbackUsed,
    fileKey: transformed.fileKey,
    fileName: transformed.fileName,
    pages,
  };
}
