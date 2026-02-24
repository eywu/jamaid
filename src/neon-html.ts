/**
 * Generates a self-contained HTML file with neon-themed animated SVG.
 *
 * The HTML wraps a Mermaid-generated SVG and adds:
 * - Dark background with neon glow effects on nodes/edges/clusters
 * - Animated marching-ant dashed connectors
 * - Glowing balls that travel along each connector path
 * - Auto-detected color assignment per subgraph
 */

const NEON_PALETTE = [
  { name: "green", hex: "#00ff88", rgb: "0,255,136" },
  { name: "blue", hex: "#0099ff", rgb: "0,153,255" },
  { name: "amber", hex: "#ffaa00", rgb: "255,170,0" },
  { name: "cyan", hex: "#00cccc", rgb: "0,204,204" },
  { name: "purple", hex: "#aa55ff", rgb: "170,85,255" },
  { name: "red", hex: "#ff4466", rgb: "255,68,102" },
  { name: "pink", hex: "#ff44cc", rgb: "255,68,204" },
  { name: "lime", hex: "#88ff00", rgb: "136,255,0" },
];

export function generateNeonHtml(svgContent: string, title?: string): string {
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
    background: radial-gradient(ellipse at center, #0f1729 0%, #0a0e1a 60%, #060910 100%);
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
    fill: rgba(10, 14, 26, 0.9) !important;
    stroke-width: 1.5px !important;
  }

  svg .node .label text, svg .nodeLabel p {
    fill: #e8e8e8 !important;
    color: #e8e8e8 !important;
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
  }

  /* ── Edge labels ── */
  svg .edgeLabel { background-color: transparent !important; }
  svg .edgeLabel rect {
    fill: rgba(10, 14, 26, 0.9) !important;
    stroke: rgba(100, 130, 180, 0.3) !important;
    stroke-width: 1px !important;
    rx: 4 !important; ry: 4 !important;
    opacity: 1 !important;
  }
  svg .edgeLabel .labelBkg { background-color: transparent !important; }
  svg .edgeLabel span, svg .edgeLabel p {
    color: rgba(180, 200, 230, 0.9) !important;
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
  // Neon color palette
  var PALETTE = ${JSON.stringify(NEON_PALETTE)};

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

  // ── Auto-detect subgraphs and assign colors ──
  var clusters = svgEl.querySelectorAll('.cluster');
  var clusterColorMap = {}; // clusterId → palette entry
  var nodeClusterMap = {};  // nodeId (e.g. "flowchart-n1-0") → clusterId

  clusters.forEach(function(cluster, idx) {
    var cid = cluster.id;
    var color = PALETTE[idx % PALETTE.length];
    clusterColorMap[cid] = color;

    // Style cluster border
    var rect = cluster.querySelector(':scope > rect');
    if (rect) {
      rect.style.stroke = color.hex;
      rect.style.filter = 'drop-shadow(0 0 4px rgba(' + color.rgb + ',0.6)) drop-shadow(0 0 12px rgba(' + color.rgb + ',0.35)) drop-shadow(0 0 24px rgba(' + color.rgb + ',0.15))';
    }

    // Style cluster label
    var label = cluster.querySelector('.cluster-label span');
    if (label) label.style.color = color.hex;

    // Find nodes inside this cluster
    cluster.querySelectorAll('.node').forEach(function(node) {
      nodeClusterMap[node.id] = cid;

      // Style node shapes
      node.querySelectorAll('rect, path, circle, ellipse').forEach(function(shape) {
        if (shape.closest('.label')) return; // skip label internals
        shape.style.stroke = color.hex;
        shape.style.filter = 'drop-shadow(0 0 3px rgba(' + color.rgb + ',0.8)) drop-shadow(0 0 8px rgba(' + color.rgb + ',0.6)) drop-shadow(0 0 18px rgba(' + color.rgb + ',0.35)) drop-shadow(0 0 35px rgba(' + color.rgb + ',0.15))';
      });

      // Style node text
      node.querySelectorAll('.nodeLabel p').forEach(function(p) {
        p.style.textShadow = '0 0 8px rgba(' + color.rgb + ',0.4), 0 0 16px rgba(' + color.rgb + ',0.2)';
      });
    });
  });

  // Nodes not in any cluster get a default color (first unused or white)
  var defaultColor = PALETTE[clusters.length % PALETTE.length] || PALETTE[0];
  svgEl.querySelectorAll('.node').forEach(function(node) {
    if (nodeClusterMap[node.id]) return;
    node.querySelectorAll('rect, path, circle, ellipse').forEach(function(shape) {
      if (shape.closest('.label')) return;
      shape.style.stroke = defaultColor.hex;
      shape.style.filter = 'drop-shadow(0 0 3px rgba(' + defaultColor.rgb + ',0.8)) drop-shadow(0 0 8px rgba(' + defaultColor.rgb + ',0.6)) drop-shadow(0 0 18px rgba(' + defaultColor.rgb + ',0.35))';
    });
  });

  // ── Color edges based on source node's cluster ──
  // Edge data-id format: L_<source>_<target>_0
  function edgeSourceId(dataId) {
    // e.g. "L_n1_n2_0" → find node with id starting with "flowchart-n1-"
    var parts = dataId.split('_');
    if (parts.length < 3) return null;
    return parts[1]; // e.g. "n1"
  }

  function getNodeColor(shortId) {
    // find node element whose id starts with "flowchart-<shortId>-"
    var node = svgEl.querySelector('[id^="flowchart-' + shortId + '-"]');
    if (!node) return defaultColor;
    var cid = nodeClusterMap[node.id];
    return cid ? clusterColorMap[cid] : defaultColor;
  }

  svgEl.querySelectorAll('path[data-id]').forEach(function(path) {
    var dataId = path.getAttribute('data-id');
    if (!dataId) return;
    var srcId = edgeSourceId(dataId);
    if (!srcId) return;
    var color = getNodeColor(srcId);
    path.style.stroke = color.hex;
    path.style.filter = 'drop-shadow(0 0 3px rgba(' + color.rgb + ',0.7)) drop-shadow(0 0 8px rgba(' + color.rgb + ',0.4)) drop-shadow(0 0 16px rgba(' + color.rgb + ',0.2))';
  });

  // ── Glow ball filter ──
  var defs = svgEl.querySelector('defs');
  if (!defs) { defs = document.createElementNS(ns, 'defs'); svgEl.insertBefore(defs, svgEl.firstChild); }
  var ballFilter = document.createElementNS(ns, 'filter');
  ballFilter.setAttribute('id', 'ball-glow');
  ballFilter.setAttribute('x', '-300%'); ballFilter.setAttribute('y', '-300%');
  ballFilter.setAttribute('width', '700%'); ballFilter.setAttribute('height', '700%');
  ballFilter.innerHTML = '<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
  defs.appendChild(ballFilter);

  // ── Create traveling balls ──
  var balls = [];
  var rootG = svgEl.querySelector('g.root');

  svgEl.querySelectorAll('path[data-id]').forEach(function(path) {
    var dataId = path.getAttribute('data-id');
    if (!dataId) return;
    var srcId = edgeSourceId(dataId);
    if (!srcId) return;
    var color = getNodeColor(srcId);

    var totalLen = path.getTotalLength();
    if (!totalLen) return;

    var duration = Math.max(2000, Math.min(5000, totalLen * 4));

    var circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', color.hex);
    circle.setAttribute('filter', 'url(#ball-glow)');

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
