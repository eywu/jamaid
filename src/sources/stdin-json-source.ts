import type {
  DiagramSource,
  DiagramSourceRequest,
  IngestedDiagramDocument,
} from "./diagram-source.js";
import { ingestJsonPayload, parsePayloadText } from "./json-payload.js";

export type ReadStdin = () => Promise<string>;

function readProcessStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new Error(
      "No stdin input detected. Pipe JSON or XML into stdin when using --source stdin.",
    );
  }

  return new Promise<string>((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", (error: Error) => reject(error));
  });
}

export class StdinJsonSource implements DiagramSource {
  public readonly kind = "stdin" as const;

  public constructor(private readonly readStdin: ReadStdin = readProcessStdin) {}

  public async ingest(request: DiagramSourceRequest): Promise<IngestedDiagramDocument> {
    const raw = await this.readStdin();
    const payload = parsePayloadText(raw, "stdin", request.format ?? "auto");
    return ingestJsonPayload(payload, {
      fileKey: "stdin",
      format: request.format,
    });
  }
}
