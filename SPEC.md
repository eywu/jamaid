# Jamaid — FigJam to Mermaid Converter

## Overview
CLI tool that converts FigJam flow diagrams to Mermaid diagram markdown using the Figma REST API.

## Input
- A FigJam file URL (e.g. `https://www.figma.com/board/ABC123/My-Board`) or just the file key
- Figma API token (via `FIGMA_API_TOKEN` env var or `--token` flag)

## Output
- A `.mmd` file containing valid Mermaid flowchart syntax

## CLI Interface
```bash
# Basic usage
jamaid https://www.figma.com/board/ABC123/My-Board -o output.mmd

# With file key directly
jamaid ABC123 -o output.mmd

# With token flag
jamaid ABC123 --token figd_xxx -o output.mmd

# Default output: stdout (so you can pipe)
jamaid ABC123 > flow.mmd
```

## Architecture

### 1. Parse Input
- Extract file key from FigJam URL or use raw key
- Resolve API token from `--token` flag or `FIGMA_API_TOKEN` env var

### 2. Fetch File via Figma REST API
- `GET https://api.figma.com/v1/files/:key`
- Auth: `X-Figma-Token: <token>` header
- This returns JSON with all nodes in the document

### 3. Extract Flow Diagram Elements
From the Figma file JSON, extract:

**Shapes (nodes in the flowchart):**
- Node type `SHAPE_WITH_TEXT` — these are the flow diagram shapes
- `shapeType` property determines the Mermaid node shape:
  - `ROUNDED_RECTANGLE` → `(text)` (rounded)
  - `DIAMOND` → `{text}` (decision/rhombus)
  - `SQUARE` / `RECTANGLE` → `[text]` (rectangle)
  - `ELLIPSE` → `([text])` (stadium/pill) or `((text))` (circle)
  - `PARALLELOGRAM_RIGHT` / `PARALLELOGRAM_LEFT` → `[/text/]` or `[\text\]`
  - `ENG_DATABASE` → `[(text)]` (cylinder)
  - `HEXAGON` → `{{text}}` (hexagon)
  - `TRAPEZOID` → `[/text\]` (trapezoid)
  - `DOCUMENT_SINGLE` → `>text]` or custom
  - Other shapes → default to `[text]`
- Text content from the `text` sublayer (`.characters` property)
- Node `id` for connection mapping

**Connectors (edges in the flowchart):**
- Node type `CONNECTOR`
- `connectorStart` → source node (has `endpointNodeId`)
- `connectorEnd` → target node (has `endpointNodeId`)
- `connectorEndStrokeCap` → arrow type:
  - `ARROW_LINES` or `ARROW_EQUILATERAL` → `-->` (arrow)
  - `NONE` → `---` (no arrow)
- `text` sublayer → edge label text
- `connectorStartStrokeCap` → if arrow on start side too, could be bidirectional

**Sticky Notes (optional, as comments):**
- Node type `STICKY` — could be included as notes or ignored

**Sections (optional, as subgraphs):**
- Node type `SECTION` — map to mermaid `subgraph`

### 4. Build Mermaid Graph
- Generate `flowchart TD` (top-down) or `flowchart LR` (left-right)
  - Auto-detect direction based on layout analysis of node positions
  - Flag `--direction TD|LR|TB|BT|RL` to override
- Create node definitions with appropriate shapes
- Create edge definitions with labels
- Wrap sections as `subgraph` blocks
- Sanitize text (escape special mermaid characters)
- Generate unique short IDs for nodes (e.g., `n1`, `n2`, etc.)

### 5. Output
- Write to file if `-o` specified, otherwise stdout

## Tech Stack
- TypeScript
- Node.js (ESM)
- No heavy frameworks — just `commander` for CLI, native `fetch` for API calls
- Build with `tsup` or `tsx` for execution
- `vitest` for tests

## Token Location
The Figma API token is stored in `~/code/_secret/.env` as `FIGMA_API_TOKEN`.
Load it with `dotenv` or manually parse the env file.
The CLI should also accept `--token` flag which takes precedence.

## Project Structure
```
jamaid/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── figma.ts          # Figma API client
│   ├── parser.ts         # Parse Figma JSON → intermediate representation
│   ├── mermaid.ts        # Convert intermediate repr → Mermaid markdown
│   └── types.ts          # TypeScript types
├── tests/
│   ├── parser.test.ts
│   └── mermaid.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## GitHub
- Create a **private** repo at `github.com/eywu/jamaid`
- Use `gh repo create eywu/jamaid --private --source=. --remote=origin`
- Commit regularly with meaningful messages
