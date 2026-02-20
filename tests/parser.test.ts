import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseFigmaFile, parseFigmaPages } from "../src/parser.js";
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

describe("parseFigmaPages", () => {
  it("splits a figma file into page-scoped diagrams", async () => {
    const file = await loadFixture();
    const firstCanvas = file.document.children?.[0];
    if (!firstCanvas?.children) {
      throw new Error("Expected fixture to contain first canvas");
    }

    const cloned = structuredClone(file);
    cloned.document.children = [
      cloned.document.children?.[0],
      {
        id: "9:9",
        type: "CANVAS",
        name: "Page 2",
        children: [
          {
            id: "9:10",
            type: "SHAPE_WITH_TEXT",
            shapeType: "RECTANGLE",
            children: [{ id: "9:10:1", type: "TEXT", characters: "Second Page Node" }],
          },
        ],
      },
    ].filter(Boolean) as FigmaFileResponse["document"]["children"];

    const pages = parseFigmaPages(cloned);

    expect(pages).toHaveLength(2);
    expect(pages[0]?.pageName).toBe("Page 1");
    expect(pages[1]?.pageName).toBe("Page 2");
    expect(pages[0]?.diagram.nodes).toHaveLength(4);
    expect(pages[1]?.diagram.nodes.map((n) => n.label)).toEqual(["Second Page Node"]);
  });
});
