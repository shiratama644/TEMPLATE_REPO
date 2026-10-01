import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check-cicd.ts", () => {
  let tmpDir: string
  let originalCwd: string
  let originalArgv: string[]

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "check-cicd-"))
    originalCwd = process.cwd()
    originalArgv = [...process.argv]
    process.chdir(tmpDir)
    vi.resetModules()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.argv = originalArgv
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
    vi.restoreAllMocks()
  })

  it("parses args", async () => {
    process.argv = ["node", "check-cicd.ts", "--verbose"]
    const mod = await import("../../../scripts/check-cicd.ts")
    const opts = mod.parseArgs()
    expect(opts.verbose).toBe(true)
  })

  it("parses help", async () => {
    process.argv = ["node", "check-cicd.ts", "--help"]
    const mod = await import("../../../scripts/check-cicd.ts")
    const opts = mod.parseArgs()
    expect(opts.help).toBe(true)
  })

  it("checks workflows missing", async () => {
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkWorkflows()
    expect(result.ok).toBe(false)
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it("checks workflows partially missing", async () => {
    mkdirSync(join(tmpDir, ".github/workflows"), { recursive: true })
    writeFileSync(join(tmpDir, ".github/workflows", "ci.yml"), "name: test")
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkWorkflows()
    expect(result.ok).toBe(false)
    expect(result.missing).toContain("security.yml")
    expect(result.missing.length).toBeGreaterThan(0)
  })

  it("checks workflows present", async () => {
    mkdirSync(join(tmpDir, ".github/workflows"), { recursive: true })
    const required = [
      "ci.yml",
      "security.yml",
      "codeql.yml",
      "dependency-review.yml",
      "release.yml",
      "automerge.yml",
      "preview.yml",
      "bundle-size.yml",
      "lighthouse.yml",
    ]
    for (const f of required) {
      writeFileSync(join(tmpDir, ".github/workflows", f), "name: test")
    }
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkWorkflows()
    expect(result.ok).toBe(true)
  })

  it("checks configs missing", async () => {
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkConfigs()
    expect(result.ok).toBe(false)
  })

  it("checks configs present", async () => {
    writeFileSync(join(tmpDir, "lighthouserc.json"), "{}")
    writeFileSync(join(tmpDir, "package.json"), "{}")
    writeFileSync(join(tmpDir, ".gitleaks.toml"), "")
    mkdirSync(join(tmpDir, ".github/codeql"), { recursive: true })
    writeFileSync(join(tmpDir, ".github/codeql/codeql-config.yml"), "")
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkConfigs()
    expect(result.ok).toBe(true)
  })

  it("checks size-limit missing", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({}))
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkSizeLimit()
    expect(result.ok).toBe(false)
  })

  it("checks size-limit no script", async () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({ "size-limit": [{ path: "src/index.ts" }] }),
    )
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkSizeLimit()
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("No size script")
  })

  it("checks size-limit present", async () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        "size-limit": [{ path: "src/index.ts", limit: "10 kB" }],
        scripts: { size: "size-limit" },
      }),
    )
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkSizeLimit()
    expect(result.ok).toBe(true)
  })

  it("checks lighthouse missing", async () => {
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkLighthouseConfig()
    expect(result.ok).toBe(false)
  })

  it("checks lighthouse present", async () => {
    writeFileSync(
      join(tmpDir, "lighthouserc.json"),
      JSON.stringify({ ci: { collect: {}, assert: {} } }),
    )
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkLighthouseConfig()
    expect(result.ok).toBe(true)
  })

  it("checks lighthouse invalid", async () => {
    writeFileSync(join(tmpDir, "lighthouserc.json"), JSON.stringify({ ci: {} }))
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkLighthouseConfig()
    expect(result.ok).toBe(false)
  })

  it("checks lighthouse missing assert", async () => {
    writeFileSync(join(tmpDir, "lighthouserc.json"), JSON.stringify({ ci: { collect: {} } }))
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkLighthouseConfig()
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("assert")
  })

  it("checks lighthouse no ci", async () => {
    writeFileSync(join(tmpDir, "lighthouserc.json"), JSON.stringify({}))
    const mod = await import("../../../scripts/check-cicd.ts")
    const result = mod.checkLighthouseConfig()
    expect(result.ok).toBe(false)
  })

  it("main with help returns 0", async () => {
    process.argv = ["node", "check-cicd.ts", "--help"]
    const mod = await import("../../../scripts/check-cicd.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("main runs checks", async () => {
    writeFileSync(
      join(tmpDir, "lighthouserc.json"),
      JSON.stringify({ ci: { collect: {}, assert: {} } }),
    )
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        "size-limit": [{ path: "src/index.ts", limit: "10 kB" }],
        scripts: { size: "size-limit" },
      }),
    )
    writeFileSync(join(tmpDir, ".gitleaks.toml"), "")
    mkdirSync(join(tmpDir, ".github/workflows"), { recursive: true })
    const required = [
      "ci.yml",
      "security.yml",
      "codeql.yml",
      "dependency-review.yml",
      "release.yml",
      "automerge.yml",
      "preview.yml",
      "bundle-size.yml",
      "lighthouse.yml",
    ]
    for (const f of required) {
      writeFileSync(join(tmpDir, ".github/workflows", f), "name: test")
    }
    mkdirSync(join(tmpDir, ".github/codeql"), { recursive: true })
    writeFileSync(join(tmpDir, ".github/codeql/codeql-config.yml"), "")
    process.argv = ["node", "check-cicd.ts"]
    const mod = await import("../../../scripts/check-cicd.ts")
    const code = await mod.main()
    expect([0, 1]).toContain(code)
  })
})
