/**
 * Generates a self-contained HTML file with animated SVG styling.
 *
 * The HTML wraps a Mermaid-generated SVG and adds:
 * - Theme-aware background and element styles
 * - Animated marching-ant dashed connectors
 * - Glowing balls that travel along each connector path
 * - Cluster or random node color assignment
 */

type PaletteColor = {
  name: string;
  hex: string;
  rgb: string;
};

type ThemeConfig = {
  palette: PaletteColor[];
  background: string;
  nodeFill: string;
  nodeTextColor: string;
  edgeLabelTextColor: string;
  edgeLabelRectFill: string;
  edgeLabelRectStroke: string;
  clusterLabelColor: string;
  glowScale: number;
  textGlowScale: number;
  ballOpacity: number;
};

type BallSizeConfig = {
  radius: number;
  glowStdDeviation: number;
};

export type NeonBallSize = "small" | "medium" | "large";
export type NeonTheme = "neon" | "pastel" | "ocean" | "sunset" | "spectrum" | "vivid" | "candy" | "forest";
export type NeonColorMode = "cluster" | "random";

const NEON_PALETTE: PaletteColor[] = [
  { name: "green", hex: "#00ff88", rgb: "0,255,136" },
  { name: "blue", hex: "#0099ff", rgb: "0,153,255" },
  { name: "amber", hex: "#ffaa00", rgb: "255,170,0" },
  { name: "cyan", hex: "#00cccc", rgb: "0,204,204" },
  { name: "purple", hex: "#aa55ff", rgb: "170,85,255" },
  { name: "red", hex: "#ff4466", rgb: "255,68,102" },
  { name: "pink", hex: "#ff44cc", rgb: "255,68,204" },
  { name: "lime", hex: "#88ff00", rgb: "136,255,0" },
];

const PASTEL_PALETTE: PaletteColor[] = [
  { name: "soft pink", hex: "#f4a7b9", rgb: "244,167,185" },
  { name: "lavender", hex: "#c7b3ff", rgb: "199,179,255" },
  { name: "mint", hex: "#9edfc4", rgb: "158,223,196" },
  { name: "peach", hex: "#f8c6a6", rgb: "248,198,166" },
  { name: "sky", hex: "#9fc9ff", rgb: "159,201,255" },
  { name: "coral", hex: "#f29c96", rgb: "242,156,150" },
  { name: "sage", hex: "#b8d4ad", rgb: "184,212,173" },
  { name: "lilac", hex: "#d8b4e2", rgb: "216,180,226" },
];

const OCEAN_PALETTE: PaletteColor[] = [
  { name: "deep blue", hex: "#1f6fae", rgb: "31,111,174" },
  { name: "teal", hex: "#2f9c95", rgb: "47,156,149" },
  { name: "aqua", hex: "#4db7c5", rgb: "77,183,197" },
  { name: "seafoam", hex: "#7fd3cf", rgb: "127,211,207" },
  { name: "indigo", hex: "#3f6db2", rgb: "63,109,178" },
  { name: "cerulean", hex: "#2e8fd4", rgb: "46,143,212" },
  { name: "turquoise", hex: "#2aa8a1", rgb: "42,168,161" },
  { name: "slate", hex: "#4e6f8f", rgb: "78,111,143" },
];

const SUNSET_PALETTE: PaletteColor[] = [
  { name: "amber", hex: "#f5a623", rgb: "245,166,35" },
  { name: "coral", hex: "#f28b5b", rgb: "242,139,91" },
  { name: "rose", hex: "#e46c8c", rgb: "228,108,140" },
  { name: "gold", hex: "#f2c14e", rgb: "242,193,78" },
  { name: "apricot", hex: "#f4a261", rgb: "244,162,97" },
  { name: "salmon", hex: "#e98973", rgb: "233,137,115" },
  { name: "tangerine", hex: "#f08a24", rgb: "240,138,36" },
  { name: "terracotta", hex: "#c96a4a", rgb: "201,106,74" },
];

const SPECTRUM_PALETTE: PaletteColor[] = [
  { name: "red", hex: "#ff3333", rgb: "255,51,51" },
  { name: "orange", hex: "#ff8800", rgb: "255,136,0" },
  { name: "yellow", hex: "#ffdd00", rgb: "255,221,0" },
  { name: "green", hex: "#33cc33", rgb: "51,204,51" },
  { name: "cyan", hex: "#00ccdd", rgb: "0,204,221" },
  { name: "blue", hex: "#3366ff", rgb: "51,102,255" },
  { name: "purple", hex: "#9933ff", rgb: "153,51,255" },
  { name: "magenta", hex: "#ff33aa", rgb: "255,51,170" },
];

const VIVID_PALETTE: PaletteColor[] = [
  { name: "magenta", hex: "#ff2288", rgb: "255,34,136" },
  { name: "green", hex: "#22dd44", rgb: "34,221,68" },
  { name: "orange", hex: "#ff8811", rgb: "255,136,17" },
  { name: "blue", hex: "#2266ff", rgb: "34,102,255" },
  { name: "yellow", hex: "#ffcc00", rgb: "255,204,0" },
  { name: "purple", hex: "#9922ff", rgb: "153,34,255" },
  { name: "cyan", hex: "#00ddcc", rgb: "0,221,204" },
  { name: "red", hex: "#ff2222", rgb: "255,34,34" },
];

const CANDY_PALETTE: PaletteColor[] = [
  { name: "hot pink", hex: "#ff1493", rgb: "255,20,147" },
  { name: "electric teal", hex: "#00e5cc", rgb: "0,229,204" },
  { name: "bright purple", hex: "#bb33ff", rgb: "187,51,255" },
  { name: "neon yellow", hex: "#eeff00", rgb: "238,255,0" },
  { name: "fuchsia", hex: "#ff44ff", rgb: "255,68,255" },
  { name: "aqua blue", hex: "#00aaff", rgb: "0,170,255" },
  { name: "lime punch", hex: "#aaff00", rgb: "170,255,0" },
  { name: "tangerine", hex: "#ff6622", rgb: "255,102,34" },
];

const FOREST_PALETTE: PaletteColor[] = [
  { name: "emerald", hex: "#2ecc71", rgb: "46,204,113" },
  { name: "moss", hex: "#7fb069", rgb: "127,176,105" },
  { name: "bark", hex: "#a0855b", rgb: "160,133,91" },
  { name: "fern", hex: "#55a868", rgb: "85,168,104" },
  { name: "amber sap", hex: "#d4a44c", rgb: "212,164,76" },
  { name: "lichen", hex: "#88b89a", rgb: "136,184,154" },
  { name: "copper", hex: "#b87333", rgb: "184,115,51" },
  { name: "sage", hex: "#6b8f5e", rgb: "107,143,94" },
];

const THEME_CONFIGS: Record<NeonTheme, ThemeConfig> = {
  neon: {
    palette: NEON_PALETTE,
    background: "radial-gradient(ellipse at center, #0f1729 0%, #0a0e1a 60%, #060910 100%)",
    nodeFill: "rgba(10, 14, 26, 0.9)",
    nodeTextColor: "#e8e8e8",
    edgeLabelTextColor: "rgba(180, 200, 230, 0.9)",
    edgeLabelRectFill: "rgba(10, 14, 26, 0.9)",
    edgeLabelRectStroke: "rgba(100, 130, 180, 0.3)",
    clusterLabelColor: "#d9ecff",
    glowScale: 1,
    textGlowScale: 1,
    ballOpacity: 0.95,
  },
  pastel: {
    palette: PASTEL_PALETTE,
    background: "radial-gradient(ellipse at top, #1f2236 0%, #15172a 55%, #0c0e19 100%)",
    nodeFill: "rgba(26, 28, 46, 0.88)",
    nodeTextColor: "#f3f0ff",
    edgeLabelTextColor: "rgba(223, 216, 245, 0.95)",
    edgeLabelRectFill: "rgba(28, 31, 48, 0.9)",
    edgeLabelRectStroke: "rgba(170, 160, 210, 0.45)",
    clusterLabelColor: "#f2e9ff",
    glowScale: 0.8,
    textGlowScale: 0.8,
    ballOpacity: 0.9,
  },
  ocean: {
    palette: OCEAN_PALETTE,
    background: "linear-gradient(160deg, #f2fbff 0%, #dff2fa 45%, #e8f7ff 100%)",
    nodeFill: "rgba(255, 255, 255, 0.92)",
    nodeTextColor: "#1f3244",
    edgeLabelTextColor: "rgba(39, 73, 96, 0.92)",
    edgeLabelRectFill: "rgba(248, 253, 255, 0.95)",
    edgeLabelRectStroke: "rgba(120, 164, 190, 0.5)",
    clusterLabelColor: "#285170",
    glowScale: 0.5,
    textGlowScale: 0.45,
    ballOpacity: 0.75,
  },
  sunset: {
    palette: SUNSET_PALETTE,
    background: "linear-gradient(155deg, #fff8ef 0%, #ffe9d6 48%, #ffe2e8 100%)",
    nodeFill: "rgba(255, 250, 245, 0.92)",
    nodeTextColor: "#472b1c",
    edgeLabelTextColor: "rgba(89, 48, 33, 0.92)",
    edgeLabelRectFill: "rgba(255, 248, 240, 0.95)",
    edgeLabelRectStroke: "rgba(206, 156, 120, 0.55)",
    clusterLabelColor: "#6e3f2d",
    glowScale: 0.52,
    textGlowScale: 0.45,
    ballOpacity: 0.78,
  },
  spectrum: {
    palette: SPECTRUM_PALETTE,
    background: "radial-gradient(ellipse at center, #111118 0%, #0a0a10 60%, #050508 100%)",
    nodeFill: "rgba(12, 12, 20, 0.92)",
    nodeTextColor: "#e8e8e8",
    edgeLabelTextColor: "rgba(200, 200, 220, 0.9)",
    edgeLabelRectFill: "rgba(12, 12, 20, 0.9)",
    edgeLabelRectStroke: "rgba(120, 120, 160, 0.35)",
    clusterLabelColor: "#dddde8",
    glowScale: 0.9,
    textGlowScale: 0.9,
    ballOpacity: 0.92,
  },
  vivid: {
    palette: VIVID_PALETTE,
    background: "radial-gradient(ellipse at center, #0e0e1c 0%, #08081a 60%, #040410 100%)",
    nodeFill: "rgba(10, 10, 22, 0.92)",
    nodeTextColor: "#ebebeb",
    edgeLabelTextColor: "rgba(200, 200, 230, 0.92)",
    edgeLabelRectFill: "rgba(10, 10, 22, 0.9)",
    edgeLabelRectStroke: "rgba(110, 110, 170, 0.35)",
    clusterLabelColor: "#e0e0f0",
    glowScale: 0.95,
    textGlowScale: 0.95,
    ballOpacity: 0.93,
  },
  candy: {
    palette: CANDY_PALETTE,
    background: "radial-gradient(ellipse at center, #1a0a22 0%, #120818 60%, #0a0410 100%)",
    nodeFill: "rgba(18, 8, 28, 0.9)",
    nodeTextColor: "#f0e8ff",
    edgeLabelTextColor: "rgba(220, 200, 245, 0.92)",
    edgeLabelRectFill: "rgba(18, 8, 28, 0.9)",
    edgeLabelRectStroke: "rgba(180, 120, 220, 0.4)",
    clusterLabelColor: "#f0e0ff",
    glowScale: 1,
    textGlowScale: 1,
    ballOpacity: 0.95,
  },
  forest: {
    palette: FOREST_PALETTE,
    background: "radial-gradient(ellipse at center, #0f1a12 0%, #0a120c 60%, #060d08 100%)",
    nodeFill: "rgba(10, 18, 12, 0.9)",
    nodeTextColor: "#dde8dd",
    edgeLabelTextColor: "rgba(180, 200, 180, 0.9)",
    edgeLabelRectFill: "rgba(10, 18, 12, 0.9)",
    edgeLabelRectStroke: "rgba(100, 140, 100, 0.4)",
    clusterLabelColor: "#c8dcc8",
    glowScale: 0.7,
    textGlowScale: 0.65,
    ballOpacity: 0.85,
  },
};

const BALL_SIZE_CONFIGS: Record<NeonBallSize, BallSizeConfig> = {
  small: { radius: 3, glowStdDeviation: 3 },
  medium: { radius: 5, glowStdDeviation: 5 },
  large: { radius: 6, glowStdDeviation: 6 },
};

export type GenerateNeonHtmlOptions = {
  title?: string;
  ballSize?: NeonBallSize;
  theme?: NeonTheme;
  colorMode?: NeonColorMode;
  glow?: boolean;
};

export function generateNeonHtml(svgContent: string, options: GenerateNeonHtmlOptions = {}): string {
  const {
    title,
    ballSize = "medium",
    theme = "neon",
    colorMode = "cluster",
    glow = true,
  } = options;
  const themeConfig = THEME_CONFIGS[theme];
  const ballConfig = BALL_SIZE_CONFIGS[ballSize];
  const pageTitle = title ? `Jamaid — ${title}` : "Jamaid — Neon Diagram";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(pageTitle)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: ${themeConfig.background};
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .diagram-container {
    width: 100%;
    max-width: 1600px;
  }

  /* ── Global SVG overrides ── */
  svg { font-family: 'Inter', system-ui, sans-serif !important; overflow: visible !important; }

  svg .node rect, svg .node path, svg .node circle, svg .node ellipse {
    fill: ${themeConfig.nodeFill} !important;
    stroke-width: 1.5px !important;
  }

  svg .node .label text, svg .nodeLabel p {
    fill: ${themeConfig.nodeTextColor} !important;
    color: ${themeConfig.nodeTextColor} !important;
    font-size: 14px !important;
  }

  /* ── Cluster styling ── */
  svg .cluster rect {
    fill: transparent !important;
    stroke-width: 1.5px !important;
    stroke-dasharray: 6 4 !important;
    rx: 14 !important; ry: 14 !important;
  }

  svg .cluster-label text, svg .cluster-label span {
    font-size: 11px !important;
    letter-spacing: 1.5px !important;
    text-transform: uppercase !important;
    font-weight: 600 !important;
    color: ${themeConfig.clusterLabelColor} !important;
  }

  /* ── Edge labels ── */
  svg .edgeLabel { background-color: transparent !important; }
  svg .edgeLabel rect {
    fill: ${themeConfig.edgeLabelRectFill} !important;
    stroke: ${themeConfig.edgeLabelRectStroke} !important;
    stroke-width: 1px !important;
    rx: 4 !important; ry: 4 !important;
    opacity: 1 !important;
  }
  svg .edgeLabel .labelBkg { background-color: transparent !important; }
  svg .edgeLabel span, svg .edgeLabel p {
    color: ${themeConfig.edgeLabelTextColor} !important;
    background-color: transparent !important;
    font-size: 11px !important;
  }

  /* ── Edges — animated dashes ── */
  svg .flowchart-link {
    stroke-width: 2px !important;
    stroke-dasharray: 8 5 !important;
    animation: flow-dash 1.2s linear infinite !important;
  }

  @keyframes flow-dash {
    to { stroke-dashoffset: -13; }
  }

  svg .marker path, svg .arrowMarkerPath {
    stroke: none !important;
  }
</style>
</head>
<body>
<div class="diagram-container" id="diagram"></div>
<script>
(function() {
  var THEME = ${JSON.stringify(themeConfig)};
  var PALETTE = THEME.palette;
  var COLOR_MODE = ${JSON.stringify(colorMode)};
  var GLOW_ENABLED = ${JSON.stringify(glow)};

  // Inject SVG
  var container = document.getElementById('diagram');
  container.innerHTML = ${JSON.stringify(svgContent)};

  // Fix cluster label truncation
  document.querySelectorAll('.cluster-label foreignObject').forEach(function(fo) {
    fo.setAttribute('width', '300');
  });

  var svgEl = document.querySelector('svg');
  if (!svgEl) return;
  var ns = 'http://www.w3.org/2000/svg';

  function clampOpacity(value) {
    return Math.max(0, Math.min(1, value));
  }

  function scaledOpacity(alpha) {
    return clampOpacity(alpha * THEME.glowScale);
  }

  function glowFilter(rgb, blurs, alphas) {
    if (!GLOW_ENABLED) return 'none';
    var shadows = [];
    for (var i = 0; i < blurs.length; i++) {
      var alpha = alphas[Math.min(i, alphas.length - 1)];
      shadows.push('drop-shadow(0 0 ' + blurs[i] + 'px rgba(' + rgb + ',' + scaledOpacity(alpha).toFixed(3) + '))');
    }
    return shadows.join(' ');
  }

  function textGlow(rgb, first, second) {
    if (!GLOW_ENABLED) return 'none';
    var firstOpacity = clampOpacity(first * THEME.textGlowScale).toFixed(3);
    var secondOpacity = clampOpacity(second * THEME.textGlowScale).toFixed(3);
    return '0 0 8px rgba(' + rgb + ',' + firstOpacity + '), 0 0 16px rgba(' + rgb + ',' + secondOpacity + ')';
  }

  function hashString(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  // ── Auto-detect subgraphs and build color maps ──
  var clusters = svgEl.querySelectorAll('.cluster');
  var clusterColorMap = {}; // clusterId → palette entry
  var nodeClusterMap = {};  // nodeId (e.g. "flowchart-n1-0") → clusterId
  var nodeColorMap = {};    // nodeId → palette entry

  clusters.forEach(function(cluster, idx) {
    var cid = cluster.id;
    var color = PALETTE[idx % PALETTE.length];
    clusterColorMap[cid] = color;

    // Style cluster border
    var rect = cluster.querySelector(':scope > rect');
    if (rect) {
      rect.style.stroke = color.hex;
      rect.style.filter = glowFilter(color.rgb, [4, 12, 24], [0.6, 0.35, 0.15]);
    }

    // Style cluster label
    var label = cluster.querySelector('.cluster-label span');
    if (label) {
      label.style.color = color.hex;
      label.style.textShadow = textGlow(color.rgb, 0.35, 0.15);
    }

    // Find nodes inside this cluster
    cluster.querySelectorAll('.node').forEach(function(node) {
      nodeClusterMap[node.id] = cid;
    });
  });

  // Nodes not in any cluster get a default color
  var defaultColor = PALETTE[clusters.length % PALETTE.length] || PALETTE[0];
  function applyNodeColor(node, color) {
    node.querySelectorAll('rect, path, circle, ellipse').forEach(function(shape) {
      if (shape.closest('.label')) return;
      shape.style.stroke = color.hex;
      shape.style.filter = glowFilter(color.rgb, [3, 8, 18, 35], [0.8, 0.6, 0.35, 0.15]);
    });

    node.querySelectorAll('.nodeLabel p').forEach(function(p) {
      p.style.textShadow = textGlow(color.rgb, 0.4, 0.2);
    });
  }

  svgEl.querySelectorAll('.node').forEach(function(node, idx) {
    var color;
    if (COLOR_MODE === 'random') {
      var paletteIndex = (hashString(node.id) + idx) % PALETTE.length;
      color = PALETTE[paletteIndex] || defaultColor;
    } else {
      var clusterId = nodeClusterMap[node.id];
      color = clusterId ? clusterColorMap[clusterId] || defaultColor : defaultColor;
    }
    nodeColorMap[node.id] = color;
    applyNodeColor(node, color);
  });

  // ── Color edges based on source node color ──
  // Edge data-id format: L_<source>_<target>_0
  function edgeSourceId(dataId) {
    // e.g. "L_n1_n2_0" → find node with id starting with "flowchart-n1-"
    var parts = dataId.split('_');
    if (parts.length < 3) return null;
    return parts[1]; // e.g. "n1"
  }

  function getNodeColorByShortId(shortId) {
    // find node element whose id starts with "flowchart-<shortId>-"
    var node = svgEl.querySelector('[id^="flowchart-' + shortId + '-"]');
    if (!node) return defaultColor;
    return nodeColorMap[node.id] || defaultColor;
  }

  svgEl.querySelectorAll('path[data-id]').forEach(function(path) {
    var dataId = path.getAttribute('data-id');
    if (!dataId) return;
    var srcId = edgeSourceId(dataId);
    if (!srcId) return;
    var color = getNodeColorByShortId(srcId);
    path.style.stroke = color.hex;
    path.style.filter = glowFilter(color.rgb, [3, 8, 16], [0.7, 0.4, 0.2]);
  });

  // ── Glow ball filter ──
  var defs = svgEl.querySelector('defs');
  if (!defs) { defs = document.createElementNS(ns, 'defs'); svgEl.insertBefore(defs, svgEl.firstChild); }
  var ballFilter = document.createElementNS(ns, 'filter');
  ballFilter.setAttribute('id', 'ball-glow');
  ballFilter.setAttribute('x', '-300%'); ballFilter.setAttribute('y', '-300%');
  ballFilter.setAttribute('width', '700%'); ballFilter.setAttribute('height', '700%');
  ballFilter.innerHTML = '<feGaussianBlur in="SourceGraphic" stdDeviation="${ballConfig.glowStdDeviation}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
  defs.appendChild(ballFilter);

  // ── Create traveling balls ──
  var balls = [];
  var rootG = svgEl.querySelector('g.root') || svgEl;

  svgEl.querySelectorAll('path[data-id]').forEach(function(path) {
    var dataId = path.getAttribute('data-id');
    if (!dataId) return;
    var srcId = edgeSourceId(dataId);
    if (!srcId) return;
    var color = getNodeColorByShortId(srcId);

    var totalLen = path.getTotalLength();
    if (!totalLen) return;

    var duration = Math.max(2000, Math.min(5000, totalLen * 4));

    var circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('r', '${ballConfig.radius}');
    circle.setAttribute('fill', color.hex);
    circle.setAttribute('fill-opacity', String(THEME.ballOpacity));
    if (GLOW_ENABLED) circle.setAttribute('filter', 'url(#ball-glow)');

    if (rootG) rootG.appendChild(circle);

    balls.push({ circle: circle, path: path, totalLen: totalLen, duration: duration, offset: Math.random() });
  });

  // ── Animate ──
  var startTime = null;
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;

    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      var progress = ((elapsed / b.duration) + b.offset) % 1;
      var point = b.path.getPointAtLength(progress * b.totalLen);
      b.circle.setAttribute('cx', point.x);
      b.circle.setAttribute('cy', point.y);
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
</script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
