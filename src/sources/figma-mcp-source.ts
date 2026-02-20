import { extractFileKey } from "../figma.js";
import type {
  DiagramSource,
  DiagramSourceRequest,
  McpIngestedDiagramDocument,
} from "./diagram-source.js";
import {
  MCP_ENDPOINT_NOT_CONFIGURED,
  McpHttpClient,
  type McpTransport,
} from "./mcp-http-client.js";

export class FigmaMcpSource implements DiagramSource {
  public readonly kind = "mcp" as const;

  public constructor(private readonly transport: McpTransport = new McpHttpClient()) {}

  public async ingest(request: DiagramSourceRequest): Promise<McpIngestedDiagramDocument> {
    const fileKey = extractFileKey(request.input);
    const document = await this.transport.getDiagramPayload({
      fileKey,
      figmaToken: request.token,
    });
    return {
      sourceKind: "mcp",
      fileKey,
      document,
    };
  }
}

export function isMcpSourceUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(MCP_ENDPOINT_NOT_CONFIGURED);
}
