import { describe, expect, it } from "vitest";
import { FigmaMcpSource } from "../src/sources/figma-mcp-source.js";
import {
  MCP_ENDPOINT_NOT_CONFIGURED,
  MCP_ENDPOINT_URL_ENV,
  McpHttpClient,
} from "../src/sources/mcp-http-client.js";

const SAMPLE_MCP_XML = `<canvas id="0:1" name="Unified" x="0" y="0" width="0" height="0">
  <shape-with-text id="1:2" x="-192" y="-112" width="176" height="176" name="SQUARE">AEO Visibility</shape-with-text>
  <shape-with-text id="1:12" x="64" y="-112" width="176" height="176" name="SQUARE">SERP Health</shape-with-text>
  <connector id="1:64" x="-104" y="72.5" connectorStart="1:2" connectorStartCap="NONE" connectorEnd="1:12" connectorEndCap="ARROW_LINES">Track</connector>
  <sticky id="12:1389" x="304" y="-1040" color="CUSTOM" author="Eric Wu" width="240" height="240">XFN Teams</sticky>
</canvas>`;

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

  it("rejects non-XML responses from MCP endpoint", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ hello: "world" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });

    const source = new FigmaMcpSource(
      new McpHttpClient({
        endpointUrl: "https://mcp.example.test/diagram",
        timeoutMs: 5_000,
        fetchImpl: fetchMock,
      }),
    );

    await expect(
      source.ingest({
        input: "https://www.figma.com/board/abc123/Flow",
        token: "figd_token",
      }),
    ).rejects.toThrow("MCP endpoint returned non-XML payload");
  });

  it("parses XML MCP responses into the normalized MCP payload shape", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(SAMPLE_MCP_XML, {
        status: 200,
        headers: {
          "content-type": "application/xml",
        },
      });

    const source = new FigmaMcpSource(
      new McpHttpClient({
        endpointUrl: "https://mcp.example.test/diagram",
        timeoutMs: 5_000,
        fetchImpl: fetchMock,
      }),
    );

    const ingested = await source.ingest({
      input: "https://www.figma.com/board/abc123/Flow",
      token: "figd_token",
    });

    expect(ingested.sourceKind).toBe("mcp");
    expect(ingested.document.pages).toHaveLength(1);
    expect(ingested.document.pages[0]?.pageName).toBe("Unified");
  });
});
