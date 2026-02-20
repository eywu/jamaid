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
    throw new Error(`Figma API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as FigmaFileResponse;
}
