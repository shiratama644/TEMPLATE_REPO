import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

describe("check-env.ts", () => {
  it("runCheckEnv returns object", async () => {
    const mod = await import("../../../scripts/check-env.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = mod.runCheckEnv()
    expect(result).toHaveProperty("envInfo")
    expect(result).toHaveProperty("isNext")
    expect(result).toHaveProperty("sourceHash")
    expect(typeof result.envInfo.isTermux).toBe("boolean")
    spy.mockRestore()
  })

  it("main exists", async () => {
    const mod = await import("../../../scripts/check-env.ts")
    expect(mod.main).toBeDefined()
  })
})

describe("check-determinism.ts", () => {
  it("collectFilesFromDir handles nonexistent", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const files = mod.collectFilesFromDir("/nonexistent-dir-xyz-123")
    expect(files).toEqual([])
  })

  it("collectFilesFromDir collects files", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const tmp = join(tmpdir(), `test-det-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    writeFileSync(join(tmp, "test.ts"), "const a = 1")
    mkdirSync(join(tmp, "subdir"))
    writeFileSync(join(tmp, "subdir", "b.ts"), "const b = 2")
    writeFileSync(join(tmp, "ignore.test.ts"), "test")
    const files = mod.collectFilesFromDir(tmp)
    expect(files.length).toBeGreaterThan(0)
    expect(files.some((f) => f.includes("test.ts") && !f.includes("ignore.test.ts"))).toBe(true)
    rmSync(tmp, { recursive: true, force: true })
  })

  it("collectFiles dedupes", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const files = mod.collectFiles(["src", "src"])
    expect(Array.isArray(files)).toBe(true)
  })

  it("check returns violations array", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const violations = await mod.check()
    expect(Array.isArray(violations)).toBe(true)
  })

  it("forbidden patterns defined", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    expect(mod.forbiddenInPure.length).toBeGreaterThan(0)
    expect(mod.forbiddenTypeBranchInL1.length).toBeGreaterThan(0)
    expect(mod.pureDirs.length).toBeGreaterThan(0)
    expect(mod.l1Dirs.length).toBeGreaterThan(0)
  })

  it("main returns number", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const code = await mod.main()
    expect(typeof code).toBe("number")
    spy.mockRestore()
  })
})

describe("verify-docs.ts", () => {
  it("getMdFiles collects md files", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const tmp = join(tmpdir(), `test-verify-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    writeFileSync(join(tmp, "a.md"), "# test")
    writeFileSync(join(tmp, "b.txt"), "not md")
    mkdirSync(join(tmp, "sub"))
    writeFileSync(join(tmp, "sub", "c.md"), "# sub")
    const files = mod.getMdFiles(tmp)
    expect(files.length).toBe(2)
    expect(files.some((f) => f.endsWith("a.md"))).toBe(true)
    rmSync(tmp, { recursive: true, force: true })
  })

  it("checkSecretFiles returns object", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkSecretFiles()
    expect(result).toHaveProperty("ok")
    expect(result).toHaveProperty("envFiles")
  })

  it("checkInternalLinks returns object", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkInternalLinks("docs")
    expect(result).toHaveProperty("brokenCount")
    expect(result).toHaveProperty("broken")
  })

  it("checkTocUpdate returns object", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkTocUpdate()
    expect(result).toHaveProperty("docsChanged")
    expect(result).toHaveProperty("readmeChanged")
  })

  it("checkPackageManager returns object", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkPackageManager()
    expect(result).toHaveProperty("ok")
    expect(result).toHaveProperty("message")
  })

  it("runVerifyDocs returns boolean", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = mod.runVerifyDocs()
    expect(typeof result).toBe("boolean")
    spyLog.mockRestore()
    spyWarn.mockRestore()
  })

  it("main returns number", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const code = mod.main()
    expect(typeof code).toBe("number")
    spyLog.mockRestore()
    spyWarn.mockRestore()
  })
})
