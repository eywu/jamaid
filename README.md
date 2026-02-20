# jamaid

Convert FigJam flow diagrams into Mermaid 🧜‍♀️ flowchart markdown.

## Requirements

- Node.js 18+
- A Figma API token with `file_content:read` scope

## Install

```bash
npm install
```

## Usage

```bash
# Output mermaid to stdout (single-page files)
npx tsx src/index.ts https://www.figma.com/board/ABC123/My-Board

# Explicit REST source (default behavior)
npx tsx src/index.ts ABC123 --source rest

# Auto source mode: tries MCP first, then falls back to REST
npx tsx src/index.ts ABC123 --source auto

# MCP source mode (requires MCP endpoint env var)
npx tsx src/index.ts ABC123 --source mcp

# Multi-page files auto-export one output per page
npx tsx src/index.ts https://www.figma.com/board/ABC123/My-Board

# Save one selected page as .mmd file
npx tsx src/index.ts ABC123 --page 2 -o output.mmd

# Pass token inline (overrides FIGMA_API_TOKEN)
npx tsx src/index.ts ABC123 --token figd_xxx -o output.mmd

# Save as Markdown with fenced mermaid code block
npx tsx src/index.ts ABC123 --markdown

# Render as PNG image (requires mermaid-cli)
npx tsx src/index.ts ABC123 --png

# Render as SVG image (requires mermaid-cli)
npx tsx src/index.ts ABC123 --svg

```

## CLI

```
jamaid <input> [options]

Arguments:
  input                    FigJam URL or file key

Options:
  -o, --output <path>      Write output to file (overrides default filename)
  --token <token>          Figma API token (overrides FIGMA_API_TOKEN)
  --source <mode>          Source mode: rest, mcp, auto (default: rest)
  --page <name-or-index>   Export only one page by name or 1-based index
  -d, --direction <dir>    Override direction: TD, LR, TB, BT, RL
  --markdown               Output as Markdown (.md) with fenced mermaid code block
  --png                    Output as PNG image (.png, requires mmdc)
  --svg                    Output as SVG image (.svg, requires mmdc)
  -h, --help               Display help
```

### Output Formats

| Flag         | Output          | Default Filename         |
| ------------ | --------------- | ------------------------ |
| _(none)_     | Raw mermaid to stdout | —                  |
| `-o <path>`  | Raw mermaid to file   | As specified       |
| `--markdown` | Fenced mermaid in Markdown | `<figjam-name>.md` |
| `--png`      | PNG image                  | `<figjam-name>.png` |
| `--svg`      | SVG image                  | `<figjam-name>.svg` |

For `--markdown`, `--png`, and `--svg`, the filename is derived from the FigJam file/page name (`<figjam-name>-<page-name>.<ext>`).
Use `-o custom.ext` only when exporting a single page (`--page ...`).

### Source Modes

- `--source rest`: Use Figma REST API ingestion (default).
- `--source mcp`: Use MCP HTTP transport ingestion.
- `--source auto`: Try MCP first; if MCP is unavailable, fallback to REST automatically.

If `--source` is omitted, jamaid behaves exactly like prior versions and uses REST only.

### MCP Configuration

Set these env vars to enable `--source mcp` (or `--source auto` MCP-first behavior):

- `JAMAID_MCP_ENDPOINT_URL` (required): HTTP endpoint that returns MCP diagram payload.
- `JAMAID_MCP_AUTH_TOKEN` (optional): bearer token sent as `Authorization: Bearer <token>`.
- `JAMAID_MCP_TIMEOUT_MS` (optional): request timeout in milliseconds (default: `10000`).

If `JAMAID_MCP_ENDPOINT_URL` is not set, `--source mcp` fails with an actionable error and `--source auto` falls back to REST.

MCP response payload contract (minimal shape):

```json
{
  "fileName": "Optional file name",
  "pages": [
    {
      "pageId": "page-1",
      "pageName": "Main Flow",
      "diagram": {
        "nodes": [{ "sourceId": "n1", "label": "Start" }],
        "edges": [{ "sourceId": "n1", "targetId": "n2", "kind": "arrow" }],
        "sections": [{ "sourceId": "s1", "label": "Core", "nodeIds": ["n1"] }],
        "stickyNotes": [{ "sourceId": "st1", "text": "Optional note" }]
      }
    }
  ]
}
```

### Multi-page behavior

- If a file has multiple pages and you do **not** pass `--page`, jamaid writes one output file per page.
- If you pass `--page`, jamaid exports only that page (and supports `-o`).
- `--page` accepts either a 1-based index (`--page 2`) or exact page name (`--page "Discovery Flow"`).

**PNG/SVG rendering** requires [mermaid-cli](https://github.com/mermaid-js/mermaid-cli):

```bash
npm i -g @mermaid-js/mermaid-cli
```


### Token Lookup

Precedence:

1. `--token` flag
2. `FIGMA_API_TOKEN` from process env (includes local `.env` via dotenv)
3. `~/code/_secret/.env`

See `.env.example` for reference.

## Development

```bash
npm run test
npm run typecheck
npm run build
```

## Project Structure

```
jamaid/
├── src/
│   ├── index.ts      # CLI entry point
│   ├── figma.ts      # Figma API client
│   ├── pipeline.ts   # ingest/normalize/transform/render pipeline
│   ├── normalizer.ts # source payload -> canonical graph document
│   ├── parser.ts     # Figma JSON → intermediate representation
│   ├── mermaid.ts    # Intermediate repr → Mermaid syntax
│   ├── types.ts      # TypeScript + canonical graph types
│   └── sources/
│       ├── diagram-source.ts
│       ├── mcp-http-client.ts
│       ├── figma-rest-source.ts
│       ├── figma-mcp-source.ts
│       └── select-source.ts
├── tests/
│   ├── parser.test.ts
│   ├── mermaid.test.ts
│   ├── source-selection.test.ts
│   ├── figma-mcp-source.test.ts
│   └── normalizer-mcp.test.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```
