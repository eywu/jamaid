import type { FigmaFileResponse } from "./types.js";

const FIGMA_API_BASE = "https://api.figma.com/v1";
const FIGMA_KEY_PATTERN = /^[A-Za-z0-9]{6,}$/;

export function extractFileKey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Missing FigJam URL or file key.");
  }

  if (trimmed.includes("figma.com")) {
    const match = trimmed.match(/\/(?:board|file|design|proto)\/([A-Za-z0-9]+)(?:\/|$)/);
    const fileKey = match?.[1];
    if (!fileKey) {
      throw new Error("Could not extract file key from FigJam URL.");
    }
    return fileKey;
  }

  if (!FIGMA_KEY_PATTERN.test(trimmed)) {
    throw new Error("Invalid Figma file key format.");
  }

  return trimmed;
}

function formatRateLimitHeaders(headers: Headers): string {
  const retryAfter = headers.get("retry-after");
  const rateLimitType = headers.get("x-figma-rate-limit-type");
  const planTier = headers.get("x-figma-plan-tier");

  const details = [
    ["retry-after", retryAfter],
    ["x-figma-rate-limit-type", rateLimitType],
    ["x-figma-plan-tier", planTier],
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}: ${value}`);

  if (details.length === 0) {
    return "";
  }

  return `\nRate-limit headers: ${details.join(", ")}`;
}

export async function fetchFigmaFile(
  fileKey: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FigmaFileResponse> {
  const response = await fetchImpl(`${FIGMA_API_BASE}/files/${fileKey}`, {
    method: "GET",
    headers: {
      "X-Figma-Token": token,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const rateLimitDetails = response.status === 429 ? formatRateLimitHeaders(response.headers) : "";
    throw new Error(`Figma API request failed (${response.status}): ${body}${rateLimitDetails}`);
  }

  return (await response.json()) as FigmaFileResponse;
}
