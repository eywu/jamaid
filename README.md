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
│   ├── parser.ts     # Figma JSON → intermediate representation
│   ├── mermaid.ts    # Intermediate repr → Mermaid syntax
│   └── types.ts      # TypeScript types
├── tests/
│   ├── parser.test.ts
│   └── mermaid.test.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```
