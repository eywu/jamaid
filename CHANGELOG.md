# Changelog

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
