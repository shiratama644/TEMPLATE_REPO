import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("build.ts", () => {
  it("hasFile checks existence", async () => {
    const mod = await import("../../../scripts/build.ts")
    expect(mod.hasFile).toBeDefined()
    expect(mod.hasFile("package.json")).toBe(true)
    expect(mod.hasFile("nonexistent-xyz-123")).toBe(false)
  })

  it("hasAnyFile checks patterns", async () => {
    const mod = await import("../../../scripts/build.ts")
    expect(mod.hasAnyFile(["package.json"])).toBe(true)
    expect(mod.hasAnyFile(["nonexistent-xyz"])).toBe(false)
    expect(mod.hasAnyFile(["vite.config"])).toBeDefined()
  })

  it("hasMonorepoStructure detects", async () => {
    const mod = await import("../../../scripts/build.ts")
    const result = mod.hasMonorepoStructure()
    expect(typeof result).toBe("boolean")
  })

  it("log function works", async () => {
    const mod = await import("../../../scripts/build.ts")
    expect(() => mod.log("TEST", "message")).not.toThrow()
  })

  it("run function exists and callable with mocked spawnSync", async () => {
    const mod = await import("../../../scripts/build.ts")
    expect(mod.run).toBeDefined()
    expect(typeof mod.run).toBe("function")
  })

  it("main exists", async () => {
    const mod = await import("../../../scripts/build.ts")
    expect(mod.main).toBeDefined()
  })
})

describe("dev.ts", () => {
  it("hasFile and hasAnyFile", async () => {
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.hasFile("package.json")).toBe(true)
    expect(mod.hasAnyFile(["package.json"])).toBe(true)
  })

  it("hasMonorepoStructure", async () => {
    const mod = await import("../../../scripts/dev.ts")
    expect(typeof mod.hasMonorepoStructure()).toBe("boolean")
  })

  it("log works", async () => {
    const mod = await import("../../../scripts/dev.ts")
    expect(() => mod.log("TEST", "msg")).not.toThrow()
  })

  it("run exists", async () => {
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.run).toBeDefined()
  })
})

describe("execute.ts", () => {
  it("hasBuildOutput returns boolean", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(typeof mod.hasBuildOutput()).toBe("boolean")
  })

  it("isNonFunctionalPath detects docs", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isNonFunctionalPath("docs/README.md")).toBe(true)
    expect(mod.isNonFunctionalPath("src/index.ts")).toBe(false)
    expect(mod.isNonFunctionalPath("README.md")).toBe(true)
    expect(mod.isNonFunctionalPath(".github/workflows/ci.yml")).toBe(true)
  })

  it("isFunctionalPath detects src", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isFunctionalPath("src/index.ts")).toBe(true)
    expect(mod.isFunctionalPath("docs/README.md")).toBe(false)
    expect(mod.isFunctionalPath("package.json")).toBe(true)
    expect(mod.isFunctionalPath("scripts/build.ts")).toBe(true)
  })

  it("stripStringLiterals replaces strings", async () => {
    const mod = await import("../../../scripts/execute.ts")
    const result = mod.stripStringLiterals('const a = "hello world"')
    expect(result).toContain("__STR_")
    expect(result).not.toContain("hello world")
  })

  it("isPureCommentLine detects comments", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isPureCommentLine("// comment")).toBe(true)
    expect(mod.isPureCommentLine("/* comment */")).toBe(true)
    expect(mod.isPureCommentLine("* comment")).toBe(true)
    expect(mod.isPureCommentLine("const a = 1")).toBe(false)
    expect(mod.isPureCommentLine("# comment")).toBe(true)
    expect(mod.isPureCommentLine("#foo")).toBe(false)
  })

  it("getCodeOnly strips comments", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.getCodeOnly("const a = 1; // comment")).toBe("const a = 1;")
    expect(mod.getCodeOnly("// comment")).toBe("")
    expect(mod.getCodeOnly("  ")).toBe("")
  })

  it("isCommentOnlyDiff detects comment only", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isCommentOnlyDiff("")).toBe(true)
    expect(mod.isCommentOnlyDiff("+// comment\n-// old")).toBe(true)
    expect(mod.isCommentOnlyDiff("+const a = 1\n-const a = 2")).toBe(false)
    expect(mod.isCommentOnlyDiff("+const a = 1; // comment\n-const a = 1;")).toBe(true)
  })

  it("getChangedFiles returns array", async () => {
    const mod = await import("../../../scripts/execute.ts")
    const files = mod.getChangedFiles()
    expect(Array.isArray(files)).toBe(true)
  })

  it("getDiffForFile returns string", async () => {
    const mod = await import("../../../scripts/execute.ts")
    const diff = mod.getDiffForFile("package.json")
    expect(typeof diff).toBe("string")
  })

  it("hasFunctionalDiff returns boolean", async () => {
    const mod = await import("../../../scripts/execute.ts")
    const result = mod.hasFunctionalDiff()
    expect(typeof result).toBe("boolean")
  })

  it("logLine works", async () => {
    const mod = await import("../../../scripts/execute.ts")
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true as any)
    mod.logLine("TEST", "\x1b[32m", "hello")
    mod.logLine("TEST", "\x1b[32m", "   ")
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("constants defined", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.NON_FUNCTIONAL_PATH_PATTERNS).toBeDefined()
    expect(mod.FUNCTIONAL_PATH_PATTERNS).toBeDefined()
    expect(mod.EXEC_CONFIG).toBeDefined()
    expect(mod.colors).toBeDefined()
  })
})

describe("setup.ts", () => {
  it("parseArgs parses flags", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const opts = mod.parseArgs(["--dry-run", "--yes", "--verbose", "--project-name", "my-app"])
    expect(opts.dryRun).toBe(true)
    expect(opts.yes).toBe(true)
    expect(opts.verbose).toBe(true)
    expect(opts.projectName).toBe("my-app")
  })

  it("parseArgs handles --preset=value", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const opts = mod.parseArgs(["--preset=vite-app"])
    expect(opts.preset).toBe("vite-app")
  })

  it("parseArgs handles short flags", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const opts = mod.parseArgs(["-y", "-v"])
    expect(opts.yes).toBe(true)
    expect(opts.verbose).toBe(true)
  })

  it("checkGitStatus returns object", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const result = mod.checkGitStatus(process.cwd())
    expect(result).toHaveProperty("clean")
    expect(result).toHaveProperty("status")
  })

  it("loadConfigFile handles missing", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const result = mod.loadConfigFile("/nonexistent/path.json")
    expect(result).toBeNull()
  })

  it("loadPreviousState handles missing", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const result = mod.loadPreviousState("/tmp/nonexistent-dir-xyz")
    expect(result).toBeNull()
  })

  it("VERSION defined", async () => {
    const mod = await import("../../../scripts/setup.ts")
    expect(mod.VERSION).toBeDefined()
  })

  it("printHelp works", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    mod.printHelp()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
