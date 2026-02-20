import { describe, expect, it } from "vitest";
import { ingestDiagram } from "../src/pipeline.js";
import type {
  DiagramSource,
  DiagramSourceRequest,
  RestIngestedDiagramDocument,
} from "../src/sources/diagram-source.js";
import { MCP_ENDPOINT_NOT_CONFIGURED } from "../src/sources/mcp-http-client.js";
import { sourceModeOrder } from "../src/sources/select-source.js";
import type { FigmaFileResponse } from "../src/types.js";

const MOCK_FILE: FigmaFileResponse = {
  name: "Example File",
  document: {
    id: "0:0",
    type: "DOCUMENT",
    children: [],
  },
};

function restSource(): DiagramSource {
  return {
    kind: "rest",
    async ingest(_request: DiagramSourceRequest): Promise<RestIngestedDiagramDocument> {
      return {
        sourceKind: "rest",
        fileKey: "abc123",
        file: MOCK_FILE,
      };
    },
  };
}

function mcpSourceWithError(message: string): DiagramSource {
  return mcpSourceThatThrows(new Error(message));
}

function mcpSourceThatThrows(error: unknown): DiagramSource {
  return {
    kind: "mcp",
    async ingest(_request: DiagramSourceRequest): Promise<never> {
      throw error;
    },
  };
}

describe("sourceModeOrder", () => {
  it("returns expected source order for each mode", () => {
    expect(sourceModeOrder("rest")).toEqual(["rest"]);
    expect(sourceModeOrder("mcp")).toEqual(["mcp"]);
    expect(sourceModeOrder("auto")).toEqual(["mcp", "rest"]);
    expect(sourceModeOrder("file")).toEqual(["file"]);
    expect(sourceModeOrder("stdin")).toEqual(["stdin"]);
  });
});

describe("ingestDiagram source fallback", () => {
  it("falls back from mcp to rest in auto mode when mcp endpoint is not configured", async () => {
    const result = await ingestDiagram({
      input: "abc123",
      token: "token",
      source: "auto",
      sources: [
        mcpSourceWithError(MCP_ENDPOINT_NOT_CONFIGURED),
        restSource(),
      ],
    });

    expect(result.selectedSource).toBe("rest");
    expect(result.fallbackUsed).toBe(true);
    expect(result.ingested.sourceKind).toBe("rest");
  });

  it("falls back from mcp to rest in auto mode on network TypeError", async () => {
    const result = await ingestDiagram({
      input: "abc123",
      token: "token",
      source: "auto",
      sources: [
        mcpSourceThatThrows(new TypeError("fetch failed")),
        restSource(),
      ],
    });

    expect(result.selectedSource).toBe("rest");
    expect(result.fallbackUsed).toBe(true);
    expect(result.ingested.sourceKind).toBe("rest");
  });

  it("falls back from mcp to rest in auto mode on MCP 5xx endpoint errors", async () => {
    const result = await ingestDiagram({
      input: "abc123",
      token: "token",
      source: "auto",
      sources: [
        mcpSourceWithError("MCP endpoint request failed (503): service unavailable"),
        restSource(),
      ],
    });

    expect(result.selectedSource).toBe("rest");
    expect(result.fallbackUsed).toBe(true);
    expect(result.ingested.sourceKind).toBe("rest");
  });

  it("falls back from mcp to rest in auto mode on MCP timeout errors", async () => {
    const result = await ingestDiagram({
      input: "abc123",
      token: "token",
      source: "auto",
      sources: [
        mcpSourceWithError(
          "MCP endpoint request timed out after 10000ms. Increase JAMAID_MCP_TIMEOUT_MS if needed.",
        ),
        restSource(),
      ],
    });

    expect(result.selectedSource).toBe("rest");
    expect(result.fallbackUsed).toBe(true);
    expect(result.ingested.sourceKind).toBe("rest");
  });

  it("does not fallback for explicit mcp mode", async () => {
    await expect(
      ingestDiagram({
        input: "abc123",
        token: "token",
        source: "mcp",
        sources: [mcpSourceWithError(MCP_ENDPOINT_NOT_CONFIGURED), restSource()],
      }),
    ).rejects.toThrow(MCP_ENDPOINT_NOT_CONFIGURED);
  });

  it("does not fallback for explicit mcp mode on network errors", async () => {
    await expect(
      ingestDiagram({
        input: "abc123",
        token: "token",
        source: "mcp",
        sources: [mcpSourceThatThrows(new TypeError("fetch failed")), restSource()],
      }),
    ).rejects.toThrow("fetch failed");
  });

  it("does not hide unexpected mcp errors in auto mode", async () => {
    await expect(
      ingestDiagram({
        input: "abc123",
        token: "token",
        source: "auto",
        sources: [mcpSourceWithError("mcp transport failed"), restSource()],
      }),
    ).rejects.toThrow("mcp transport failed");
  });
});
