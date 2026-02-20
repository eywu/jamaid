import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseFigmaFile } from "../src/parser.js";
import type { FigmaFileResponse } from "../src/types.js";

async function loadFixture(): Promise<FigmaFileResponse> {
  const fixturePath = new URL("./fixtures/figma-flow.json", import.meta.url);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as FigmaFileResponse;
}

describe("parseFigmaFile", () => {
  it("extracts shapes, connectors, sections and sticky notes", async () => {
    const file = await loadFixture();
    const parsed = parseFigmaFile(file);

    expect(parsed.nodes).toHaveLength(4);
    expect(parsed.edges).toHaveLength(4);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.stickyNotes).toHaveLength(1);
  });

  it("maps connector stroke caps into edge kinds", async () => {
    const file = await loadFixture();
    const parsed = parseFigmaFile(file);

    const edgeKinds = parsed.edges.map((edge) => edge.kind);
    expect(edgeKinds).toContain("arrow");
    expect(edgeKinds).toContain("line");
    expect(edgeKinds).toContain("bidirectional");
  });

  it("assigns section membership to section nodes", async () => {
    const file = await loadFixture();
    const parsed = parseFigmaFile(file);

    const coreSection = parsed.sections[0];
    if (!coreSection) {
      throw new Error("Expected section to be present");
    }
    expect(coreSection.label).toBe("Core Flow");
    expect(coreSection.nodeIds).toEqual(["3:1", "3:2", "3:3"]);
  });
});
