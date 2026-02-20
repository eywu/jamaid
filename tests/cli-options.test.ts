import { describe, expect, it } from "vitest";
import {
  parseInputFormat,
  parseSourceMode,
  resolveCliIngestOptions,
} from "../src/cli-options.js";

describe("CLI source/format parsing", () => {
  it("accepts rest/mcp/auto/file/stdin source modes", () => {
    expect(parseSourceMode("rest")).toBe("rest");
    expect(parseSourceMode("mcp")).toBe("mcp");
    expect(parseSourceMode("auto")).toBe("auto");
    expect(parseSourceMode("file")).toBe("file");
    expect(parseSourceMode("stdin")).toBe("stdin");
  });

  it("rejects unknown source modes", () => {
    expect(() => parseSourceMode("unknown")).toThrow(
      "Source must be one of: rest, mcp, auto, file, stdin.",
    );
  });

  it("accepts rest/mcp/auto formats", () => {
    expect(parseInputFormat("rest")).toBe("rest");
    expect(parseInputFormat("mcp")).toBe("mcp");
    expect(parseInputFormat("auto")).toBe("auto");
  });

  it("rejects unknown formats", () => {
    expect(() => parseInputFormat("xml")).toThrow(
      "Format must be one of: rest, mcp, auto.",
    );
  });
});

describe("resolveCliIngestOptions", () => {
  it("requires positional input for --source file", () => {
    expect(() => resolveCliIngestOptions("file", undefined)).toThrow(
      "Missing JSON file path. Provide <input> when using --source file.",
    );
  });

  it("accepts --source file with a file path and does not require token", () => {
    expect(resolveCliIngestOptions("file", " ./payload.json ")).toEqual({
      input: "./payload.json",
      requiresToken: false,
    });
  });

  it("allows missing positional input for --source stdin", () => {
    expect(resolveCliIngestOptions("stdin", undefined)).toEqual({
      input: "",
      requiresToken: false,
    });
  });

  it("ignores provided positional input for --source stdin", () => {
    expect(resolveCliIngestOptions("stdin", "ignored-value")).toEqual({
      input: "",
      requiresToken: false,
    });
  });

  it("requires positional input for existing rest/mcp/auto sources", () => {
    expect(() => resolveCliIngestOptions("rest", undefined)).toThrow(
      "Missing FigJam URL or file key.",
    );
    expect(() => resolveCliIngestOptions("mcp", undefined)).toThrow(
      "Missing FigJam URL or file key.",
    );
    expect(() => resolveCliIngestOptions("auto", undefined)).toThrow(
      "Missing FigJam URL or file key.",
    );
  });

  it("keeps backward-compatible token requirement for rest/mcp/auto", () => {
    expect(resolveCliIngestOptions("rest", "abc123")).toEqual({
      input: "abc123",
      requiresToken: true,
    });
    expect(resolveCliIngestOptions("mcp", "abc123")).toEqual({
      input: "abc123",
      requiresToken: true,
    });
    expect(resolveCliIngestOptions("auto", "abc123")).toEqual({
      input: "abc123",
      requiresToken: true,
    });
  });
});
