import { describe, expect, it } from "vitest";
import { generateNeonHtml } from "../src/neon-html.js";

const SAMPLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg">
  <g class="root">
    <g class="cluster" id="flowchart-cluster-0">
      <rect x="0" y="0" width="100" height="80"></rect>
    </g>
    <g class="node" id="flowchart-n1-0">
      <rect x="8" y="8" width="40" height="20"></rect>
      <g class="nodeLabel"><p>Node 1</p></g>
    </g>
    <g class="node" id="flowchart-n2-0">
      <rect x="68" y="8" width="40" height="20"></rect>
      <g class="nodeLabel"><p>Node 2</p></g>
    </g>
    <path data-id="L_n1_n2_0" d="M48,18 L68,18"></path>
  </g>
</svg>
`;

describe("generateNeonHtml", () => {
  it("returns a valid HTML document wrapper", () => {
    const html = generateNeonHtml(SAMPLE_SVG, { title: "Flow Page" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("</html>");
    expect(html).toContain("<script>");
    expect(html).toContain("Jamaid — Flow Page");
  });

  it("updates traveling ball radius and glow filter based on ball size", () => {
    const small = generateNeonHtml(SAMPLE_SVG, { ballSize: "small" });
    const large = generateNeonHtml(SAMPLE_SVG, { ballSize: "large" });

    expect(small).toContain("circle.setAttribute('r', '3');");
    expect(small).toContain('stdDeviation="3"');
    expect(large).toContain("circle.setAttribute('r', '6');");
    expect(large).toContain('stdDeviation="6"');
  });

  it("changes background styling per selected theme", () => {
    const neon = generateNeonHtml(SAMPLE_SVG, { theme: "neon" });
    const ocean = generateNeonHtml(SAMPLE_SVG, { theme: "ocean" });

    expect(neon).toContain("radial-gradient(ellipse at center, #0f1729 0%, #0a0e1a 60%, #060910 100%)");
    expect(ocean).toContain("linear-gradient(160deg, #f2fbff 0%, #dff2fa 45%, #e8f7ff 100%)");
  });

  it("embeds color mode and random-mode branch into runtime JS", () => {
    const html = generateNeonHtml(SAMPLE_SVG, { colorMode: "random" });
    expect(html).toContain('var COLOR_MODE = "random";');
    expect(html).toContain("if (COLOR_MODE === 'random')");
  });
});
