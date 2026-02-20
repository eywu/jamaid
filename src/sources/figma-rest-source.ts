import { extractFileKey, fetchFigmaFile } from "../figma.js";
import type {
  DiagramSource,
  DiagramSourceRequest,
  RestIngestedDiagramDocument,
} from "./diagram-source.js";

export class FigmaRestSource implements DiagramSource {
  public readonly kind = "rest" as const;

  public constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  public async ingest(request: DiagramSourceRequest): Promise<RestIngestedDiagramDocument> {
    const fileKey = extractFileKey(request.input);
    const file = await fetchFigmaFile(fileKey, request.token, this.fetchImpl);
    return {
      sourceKind: "rest",
      fileKey,
      file,
    };
  }
}
