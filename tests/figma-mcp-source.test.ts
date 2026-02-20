import { describe, expect, it } from "vitest";
import type { McpDiagramPayload } from "../src/sources/diagram-source.js";
import { FigmaMcpSource } from "../src/sources/figma-mcp-source.js";
import {
  MCP_ENDPOINT_NOT_CONFIGURED,
  MCP_ENDPOINT_URL_ENV,
  McpHttpClient,
} from "../src/sources/mcp-http-client.js";

const SAMPLE_MCP_PAYLOAD: McpDiagramPayload = {
  fileName: "MCP Flow",
  pages: [
    {
      pageId: "p1",
      pageName: "Page 1",
      diagram: {
        nodes: [{ sourceId: "n1", label: "Start", shapeType: "RECTANGLE" }],
        edges: [],
        sections: [],
        stickyNotes: [],
      },
    },
  ],
};

describe("FigmaMcpSource", () => {
  it("throws a clear error when endpoint is not configured", async () => {
    const previousEndpoint = process.env[MCP_ENDPOINT_URL_ENV];
    delete process.env[MCP_ENDPOINT_URL_ENV];

    try {
      const source = new FigmaMcpSource();
      await expect(
        source.ingest({
          input: "abc123",
          token: "figd_token",
        }),
      ).rejects.toThrow(MCP_ENDPOINT_NOT_CONFIGURED);
    } finally {
      if (previousEndpoint === undefined) {
        delete process.env[MCP_ENDPOINT_URL_ENV];
      } else {
        process.env[MCP_ENDPOINT_URL_ENV] = previousEndpoint;
      }
    }
  });

  it("calls configured endpoint and returns typed ingested payload", async () => {
    const fetchMock: typeof fetch = async (input, init) => {
      expect(input).toBe("https://mcp.example.test/diagram");
      expect(init?.method).toBe("POST");

      const headers = new Headers(init?.headers);
      expect(headers.get("content-type")).toBe("application/json");
      expect(headers.get("authorization")).toBe("Bearer mcp-secret");

      expect(JSON.parse(String(init?.body))).toEqual({
        fileKey: "abc123",
        figmaToken: "figd_token",
      });

      return new Response(JSON.stringify(SAMPLE_MCP_PAYLOAD), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    };

    const source = new FigmaMcpSource(
      new McpHttpClient({
        endpointUrl: "https://mcp.example.test/diagram",
        authToken: "mcp-secret",
        timeoutMs: 5_000,
        fetchImpl: fetchMock,
      }),
    );

    const ingested = await source.ingest({
      input: "https://www.figma.com/board/abc123/Flow",
      token: "figd_token",
    });

    expect(ingested.sourceKind).toBe("mcp");
    expect(ingested.fileKey).toBe("abc123");
    expect(ingested.document).toEqual(SAMPLE_MCP_PAYLOAD);
  });
});
