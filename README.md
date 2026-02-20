# jamaid

Convert FigJam flow diagrams into Mermaid flowchart markdown.

## Requirements

- Node.js 18+
- A Figma API token in `FIGMA_API_TOKEN` or passed with `--token`

## Install

```bash
npm install
```

## Usage

```bash
# Run directly with tsx
npx tsx src/index.ts https://www.figma.com/board/ABC123/My-Board -o output.mmd

# Or with a raw file key
npx tsx src/index.ts ABC123 --token figd_xxx > flow.mmd
```

## CLI

```bash
jamaid <input> [options]

Arguments:
  input                    FigJam URL or file key

Options:
  -o, --output <path>      Write Mermaid output to file
  --token <token>          Figma API token (overrides FIGMA_API_TOKEN)
  -d, --direction <dir>    Override direction: TD, LR, TB, BT, RL
```

Token lookup precedence:

1. `--token`
2. `FIGMA_API_TOKEN` from process env (includes local `.env` via dotenv)
3. `~/code/_secret/.env` (`FIGMA_API_TOKEN=...`)

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
│   ├── index.ts
│   ├── figma.ts
│   ├── parser.ts
│   ├── mermaid.ts
│   └── types.ts
├── tests/
│   ├── parser.test.ts
│   └── mermaid.test.ts
├── package.json
├── tsconfig.json
└── README.md
```
