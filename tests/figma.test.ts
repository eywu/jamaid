import { describe, expect, it } from "vitest";
import { fetchFigmaFile } from "../src/figma.js";

describe("fetchFigmaFile", () => {
  it("includes relevant rate-limit headers for 429 responses", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response("Too Many Requests", {
        status: 429,
        headers: {
          "retry-after": "30",
          "x-figma-rate-limit-type": "file_read",
          "x-figma-plan-tier": "professional",
        },
      });

    await expect(fetchFigmaFile("abc123", "token", fetchMock)).rejects.toThrow(
      "Figma API request failed (429): Too Many Requests\nRate-limit headers: retry-after: 30, x-figma-rate-limit-type: file_read, x-figma-plan-tier: professional",
    );
  });

  it("still returns the original error shape for non-429 responses", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response("Unauthorized", {
        status: 401,
      });

    await expect(fetchFigmaFile("abc123", "token", fetchMock)).rejects.toThrow(
      "Figma API request failed (401): Unauthorized",
    );
  });
});
