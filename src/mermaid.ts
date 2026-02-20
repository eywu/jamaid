import type {
  MermaidDirection,
  MermaidRenderOptions,
  ParsedEdge,
  ParsedFlowDiagram,
  ParsedNode,
} from "./types.js";

const DEFAULT_DIRECTION: MermaidDirection = "TD";

function sanitizeText(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/["`]/g, "'")
    .replace(/\|/g, "/")
    .replace(/[\[\]{}]/g, "")
    .trim();
}

function detectDirection(nodes: ParsedNode[]): MermaidDirection {
  const positionedNodes = nodes.filter(
    (node): node is ParsedNode & { x: number; y: number } =>
      typeof node.x === "number" && typeof node.y === "number",
  );

  if (positionedNodes.length < 2) {
    return DEFAULT_DIRECTION;
  }

  const xs = positionedNodes.map((node) => node.x);
  const ys = positionedNodes.map((node) => node.y);
  const widthSpread = Math.max(...xs) - Math.min(...xs);
  const heightSpread = Math.max(...ys) - Math.min(...ys);

  return widthSpread >= heightSpread ? "LR" : "TD";
}

function nodeShape(label: string, shapeType: string | undefined): string {
  switch (shapeType) {
    case "ROUNDED_RECTANGLE":
      return `(${label})`;
    case "DIAMOND":
      return `{${label}}`;
    case "SQUARE":
    case "RECTANGLE":
      return `[${label}]`;
    case "ELLIPSE":
      return `([${label}])`;
    case "PARALLELOGRAM_RIGHT":
      return `[/${label}/]`;
    case "PARALLELOGRAM_LEFT":
      return `[\\${label}\\]`;
    case "ENG_DATABASE":
      return `[(${label})]`;
    case "HEXAGON":
      return `{{${label}}}`;
    case "TRAPEZOID":
      return `[/${label}\\]`;
    case "DOCUMENT_SINGLE":
      return `>${label}]`;
    default:
      return `[${label}]`;
  }
}

function edgeOperator(edge: ParsedEdge): string {
  switch (edge.kind) {
    case "bidirectional":
      return "<-->";
    case "line":
      return "---";
    case "arrow":
    default:
      return "-->";
  }
}

function renderNode(mermaidId: string, node: ParsedNode): string {
  const label = sanitizeText(node.label || node.sourceId);
  return `${mermaidId}${nodeShape(label, node.shapeType)}`;
}

export function toMermaid(
  diagram: ParsedFlowDiagram,
  options: MermaidRenderOptions = {},
): string {
  const direction = options.direction ?? detectDirection(diagram.nodes);
  const lines: string[] = [`flowchart ${direction}`];
  const nodeIdMap = new Map<string, string>();

  diagram.nodes.forEach((node, idx) => {
    nodeIdMap.set(node.sourceId, `n${idx + 1}`);
  });

  for (const sticky of diagram.stickyNotes) {
    const clean = sanitizeText(sticky.text);
    if (clean) {
      lines.push(`  %% Note: ${clean}`);
    }
  }

  const renderedInsideSection = new Set<string>();
  diagram.sections.forEach((section, index) => {
    const sectionNodes = section.nodeIds
      .map((nodeId) => diagram.nodes.find((node) => node.sourceId === nodeId))
      .filter((node): node is ParsedNode => Boolean(node));

    if (sectionNodes.length === 0) {
      return;
    }

    const sectionTitle = sanitizeText(section.label || `Section ${index + 1}`);
    const sectionMermaidId = `s${index + 1}`;
    lines.push(`  subgraph ${sectionMermaidId}["${sectionTitle}"]`);
    for (const node of sectionNodes) {
      const mermaidId = nodeIdMap.get(node.sourceId);
      if (!mermaidId) {
        continue;
      }
      lines.push(`    ${renderNode(mermaidId, node)}`);
      renderedInsideSection.add(node.sourceId);
    }
    lines.push("  end");
  });

  for (const node of diagram.nodes) {
    if (renderedInsideSection.has(node.sourceId)) {
      continue;
    }
    const mermaidId = nodeIdMap.get(node.sourceId);
    if (!mermaidId) {
      continue;
    }
    lines.push(`  ${renderNode(mermaidId, node)}`);
  }

  for (const edge of diagram.edges) {
    const source = nodeIdMap.get(edge.sourceId);
    const target = nodeIdMap.get(edge.targetId);
    if (!source || !target) {
      continue;
    }

    const label = edge.label ? sanitizeText(edge.label) : "";
    const op = edgeOperator(edge);
    if (label) {
      lines.push(`  ${source} ${op}|${label}| ${target}`);
    } else {
      lines.push(`  ${source} ${op} ${target}`);
    }
  }

  return lines.join("\n");
}
