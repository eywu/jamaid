import type { McpDiagramPayload } from "./diagram-source.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export const MCP_ENDPOINT_URL_ENV = "JAMAID_MCP_ENDPOINT_URL";
export const MCP_AUTH_TOKEN_ENV = "JAMAID_MCP_AUTH_TOKEN";
export const MCP_TIMEOUT_MS_ENV = "JAMAID_MCP_TIMEOUT_MS";

export const MCP_ENDPOINT_NOT_CONFIGURED = `MCP endpoint is not configured. Set ${MCP_ENDPOINT_URL_ENV} or pass endpointUrl in the MCP client options.`;

export interface McpTransportRequest {
  fileKey: string;
  figmaToken?: string;
}

export interface McpTransport {
  getDiagramPayload(request: McpTransportRequest): Promise<McpDiagramPayload>;
}

export interface McpHttpClientOptions {
  endpointUrl?: string;
  authToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function resolveOptionalConfig(
  optionValue: string | undefined,
  envName: string,
): string | undefined {
  const fromOption = optionValue?.trim();
  if (fromOption) {
    return fromOption;
  }
  const fromEnv = process.env[envName]?.trim();
  return fromEnv || undefined;
}

function resolveTimeoutMs(optionTimeoutMs: number | undefined): number {
  if (typeof optionTimeoutMs === "number") {
    if (!Number.isFinite(optionTimeoutMs) || optionTimeoutMs <= 0) {
      throw new Error("Invalid MCP timeout. timeoutMs must be a positive number.");
    }
    return optionTimeoutMs;
  }

  const timeoutFromEnvRaw = process.env[MCP_TIMEOUT_MS_ENV]?.trim();
  if (!timeoutFromEnvRaw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(timeoutFromEnvRaw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid ${MCP_TIMEOUT_MS_ENV} value "${timeoutFromEnvRaw}". Expected a positive integer.`,
    );
  }
  return parsed;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))
  );
}

export class McpHttpClient implements McpTransport {
  private readonly fetchImpl: typeof fetch;
  private readonly endpointUrl?: string;
  private readonly authToken?: string;
  private readonly timeoutMs?: number;

  public constructor(options: McpHttpClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpointUrl = options.endpointUrl;
    this.authToken = options.authToken;
    this.timeoutMs = options.timeoutMs;
  }

  public async getDiagramPayload(request: McpTransportRequest): Promise<McpDiagramPayload> {
    const endpointUrl = resolveOptionalConfig(this.endpointUrl, MCP_ENDPOINT_URL_ENV);
    if (!endpointUrl) {
      throw new Error(MCP_ENDPOINT_NOT_CONFIGURED);
    }

    const timeoutMs = resolveTimeoutMs(this.timeoutMs);
    const authToken = resolveOptionalConfig(this.authToken, MCP_AUTH_TOKEN_ENV);
    const body: Record<string, string> = { fileKey: request.fileKey };
    if (request.figmaToken?.trim()) {
      body.figmaToken = request.figmaToken.trim();
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (authToken) {
        headers.authorization = `Bearer ${authToken}`;
      }

      const response = await this.fetchImpl(endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseText = await response.text();
        const detail = responseText.trim() || "Empty response body";
        throw new Error(`MCP endpoint request failed (${response.status}): ${detail}`);
      }

      try {
        return (await response.json()) as McpDiagramPayload;
      } catch {
        throw new Error("MCP endpoint returned invalid JSON.");
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw new Error(
          `MCP endpoint request timed out after ${timeoutMs}ms. Increase ${MCP_TIMEOUT_MS_ENV} if needed.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
