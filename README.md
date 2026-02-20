# jamaid

Convert FigJam flow diagrams into Mermaid flowchart markdown.

## Requirements

- Node.js 18+
- A Figma API token with `file_content:read` scope

## Install

```bash
npm install
```

## Usage

```bash
# Output mermaid to stdout
npx tsx src/index.ts https://www.figma.com/board/ABC123/My-Board

# Save as .mmd file
npx tsx src/index.ts ABC123 -o output.mmd

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

For `--markdown`, `--png`, and `--svg`, the filename is derived from the FigJam file name. Override with `-o custom.ext`.

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
