# Changelog

## 0.4.0 - 2026-02-20

### Added
- Source adapter scaffolding for pluggable ingestion:
  - Canonical graph/document typing for pipeline contracts.
  - `DiagramSource` interface.
  - `FigmaRestSource` for existing Figma REST ingestion.
  - `McpHttpClient` transport contract for MCP HTTP ingestion.
  - `FigmaMcpSource` wired to MCP transport and typed MCP payload ingestion.
- New `--source <mode>` CLI option supporting `rest`, `mcp`, and `auto`.
- MCP payload contract support for `fileName?` and `pages[].diagram`:
  - `nodes`
  - `edges`
  - `sections`
  - `stickyNotes`
- New MCP-focused tests:
  - Endpoint-missing errors.
  - Mocked MCP HTTP ingestion.
  - MCP normalization validation and Mermaid parity.
- MCP↔REST parity coverage using equivalent fixtures and Mermaid output assertions.
- v0.4.0 implementation plan at `docs/v0.4.0-plan.md`.

### Changed
- Introduced staged pipeline modules: `ingest -> normalize -> transform -> render`.
- Default source behavior remains REST for backward compatibility when `--source` is omitted.
- `--source auto` now attempts MCP and falls back to REST when MCP is unavailable, times out, returns 5xx, or fails with network `TypeError`.
- `--source mcp` now requires MCP endpoint configuration and returns actionable configuration errors.

## 0.3.1 - 2026-02-20

### Added
- Enhanced 429 error output from Figma API requests to include useful rate-limit headers:
  - `retry-after`
  - `x-figma-rate-limit-type`
  - `x-figma-plan-tier`
- Added unit tests for 429 header reporting and non-429 error behavior in `fetchFigmaFile`.

## 0.3.0 - 2026-02-20

### Added
- Page-aware export for multi-page FigJam files (CANVAS-level parsing).
- New `--page <name-or-index>` option to export a single page by exact name or 1-based index.
- Parser support for page-scoped diagrams via `parseFigmaPages`.
- Test coverage for multi-page splitting behavior.

### Changed
- Multi-page files now export one output per page by default, using `<figjam-name>-<page-name>.<ext>`.
- `-o/--output` is now single-page only (use `--page` when specifying custom output path).
- Updated README usage and CLI docs for page-selection and multi-file export behavior.

## 0.2.0 - 2026-02-19

### Changed
- Removed interactive HTML output mode (`--html`) from the CLI.
- Simplified supported output formats to: raw Mermaid, Markdown (`--markdown`), PNG (`--png`), and SVG (`--svg`).
- Updated README and CLI help text to reflect the supported output modes.

## 0.1.0 - 2026-02-19

### Added
- Initial TypeScript CLI to convert FigJam files to Mermaid flowcharts using the Figma REST API.
- Input support for FigJam URL or raw file key.
- Output modes:
  - Raw Mermaid (`.mmd`)
  - Markdown fenced Mermaid block (`--markdown`)
  - PNG (`--png`, via Mermaid CLI / `mmdc`)
  - SVG (`--svg`, via Mermaid CLI / `mmdc`)
  - Interactive HTML (`--html`)
- Direction override support (`--direction TD|LR|TB|BT|RL`).
- Token resolution via `--token`, environment variable, or `~/code/_secret/.env`.
- Tests for parser and mermaid generation.

### Notes
- This is an early alpha release; APIs and output behavior may evolve in upcoming versions.
