import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  generateTermuxNextConfigOverride,
  getNextBuildCommandForTermux,
  isNextJsProject,
  logNextTermuxInfo,
  shouldPatchNextConfigForTermux,
} from "../../../scripts/lib/next-termux.ts"

describe("next-termux 100% coverage", () => {
  let tempRoot: string
  let originalCwd: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `next-termux-100-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
    originalCwd = process.cwd()
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it("isNextJsProject false", () => {
    expect(isNextJsProject(tempRoot)).toBe(false)
  })

  it("isNextJsProject true", () => {
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    expect(isNextJsProject(tempRoot)).toBe(true)
  })

  it("isNextJsProject true with different extensions", () => {
    const exts = ["next.config.js", "next.config.cjs", "next.config.ts", "next.config.mts"]
    for (const ext of exts) {
      rmSync(tempRoot, { recursive: true, force: true })
      mkdirSync(tempRoot, { recursive: true })
      writeFileSync(join(tempRoot, ext), "", "utf8")
      expect(isNextJsProject(tempRoot)).toBe(true)
    }
  })

  it("getNextBuildCommandForTermux not termux", () => {
    vi.stubEnv("TERMUX_VERSION", "")
    vi.stubEnv("PREFIX", "/usr")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    const result = getNextBuildCommandForTermux(["next", "build"], tempRoot)
    expect(result.isTermux).toBe(false)
  })

  it("getNextBuildCommandForTermux termux and next (dev adds webpack, build does not)", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    const buildResult = getNextBuildCommandForTermux(["next", "build", "--turbopack"], tempRoot)
    expect(buildResult.isTermux).toBe(true)
    expect(buildResult.cmd.includes("--webpack")).toBe(false)
    expect(buildResult.cmd.includes("--turbopack")).toBe(false)

    const devResult = getNextBuildCommandForTermux(["next", "dev", "--turbopack"], tempRoot)
    expect(devResult.isTermux).toBe(true)
    expect(devResult.cmd.includes("--webpack")).toBe(true)
    expect(devResult.cmd.includes("--turbopack")).toBe(false)
  })

  it("getNextBuildCommandForTermux termux already has webpack (dev)", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    const result = getNextBuildCommandForTermux(["next", "dev", "--webpack"], tempRoot)
    expect(result.isTermux).toBe(true)
    expect(result.cmd.filter((c) => c === "--webpack").length).toBe(1)
  })

  it("getNextBuildCommandForTermux filters turbo and no-turbopack", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    const result = getNextBuildCommandForTermux(
      ["next", "build", "--turbo", "--no-turbopack"],
      tempRoot,
    )
    expect(result.cmd.includes("--turbo")).toBe(false)
    expect(result.cmd.includes("--no-turbopack")).toBe(false)
  })

  it("shouldPatchNextConfigForTermux not termux", () => {
    vi.stubEnv("TERMUX_VERSION", "")
    vi.stubEnv("PREFIX", "/usr")
    expect(shouldPatchNextConfigForTermux()).toBe(false)
  })

  it("shouldPatchNextConfigForTermux termux with config", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    expect(shouldPatchNextConfigForTermux()).toBe(true)
  })

  it("shouldPatchNextConfigForTermux termux without config", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    expect(shouldPatchNextConfigForTermux()).toBe(false)
  })

  it("shouldPatchNextConfigForTermux with explicit path", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    const configPath = join(tempRoot, "custom.config.js")
    writeFileSync(configPath, "", "utf8")
    expect(shouldPatchNextConfigForTermux(configPath)).toBe(true)
  })

  it("shouldPatchNextConfigForTermux explicit path not exists", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    expect(shouldPatchNextConfigForTermux(join(tempRoot, "nonexistent.js"))).toBe(false)
  })

  it("generateTermuxNextConfigOverride", () => {
    const override = generateTermuxNextConfigOverride()
    expect(override.includes("Termux")).toBe(true)
  })

  it("logNextTermuxInfo not next", () => {
    logNextTermuxInfo(tempRoot)
  })

  it("logNextTermuxInfo next not termux", () => {
    vi.stubEnv("TERMUX_VERSION", "")
    vi.stubEnv("PREFIX", "/usr")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    logNextTermuxInfo(tempRoot)
  })

  it("logNextTermuxInfo termux and next", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    logNextTermuxInfo(tempRoot)
  })
})
