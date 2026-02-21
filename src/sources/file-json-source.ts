import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type {
  DiagramSource,
  DiagramSourceRequest,
  IngestedDiagramDocument,
} from "./diagram-source.js";
import { ingestJsonPayload, parsePayloadText } from "./json-payload.js";

function inferFileKey(pathValue: string): string {
  const trimmed = pathValue.trim();
  if (!trimmed) {
    return "file-input";
  }

  const filename = basename(trimmed);
  if (!filename) {
    return "file-input";
  }
  return filename;
}

export class FileJsonSource implements DiagramSource {
  public readonly kind = "file" as const;

  public async ingest(request: DiagramSourceRequest): Promise<IngestedDiagramDocument> {
    const inputPath = request.input.trim();
    if (!inputPath) {
      throw new Error("Missing input file path. Provide <input> when using --source file.");
    }

    let raw: string;
    try {
      raw = await readFile(inputPath, "utf8");
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read JSON file "${inputPath}": ${detail}`);
    }

    const payload = parsePayloadText(raw, `file "${inputPath}"`, request.format ?? "auto");
    return ingestJsonPayload(payload, {
      fileKey: inferFileKey(inputPath),
      format: request.format,
    });
  }
}
