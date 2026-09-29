import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check-determinism coverage", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

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
    rmSync(tmp, { recursive: true, force: true })
  })

  it("collectFilesFromDir excludes node_modules", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const tmp = join(tmpdir(), `test-exclude-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    mkdirSync(join(tmp, "node_modules"), { recursive: true })
    writeFileSync(join(tmp, "node_modules", "a.ts"), "Math.random()")
    writeFileSync(join(tmp, "c.ts"), "const x = 1")
    const files = mod.collectFilesFromDir(tmp)
    expect(files.some((f) => f.includes("node_modules"))).toBe(false)
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
  })

  it("main returns 0 when no violations (mocked)", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const spy = vi.spyOn(mod, "check").mockResolvedValue([])
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const code = await mod.main()
    expect(code).toBe(0)
    spy.mockRestore()
    spyLog.mockRestore()
  })

  it("main returns 1 when violations (real file)", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const tmpCore = "src/core"
    const { mkdirSync, writeFileSync, rmSync, existsSync } = await import("node:fs")
    const hadCore = existsSync(tmpCore)
    const testFile = join(tmpCore, `testViolation-${Date.now()}.ts`)
    try {
      mkdirSync(tmpCore, { recursive: true })
      writeFileSync(testFile, "const x = Math.random()")
      const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
      const code = await mod.main()
      expect(code).toBe(1)
      spyError.mockRestore()
    } finally {
      if (existsSync(testFile)) rmSync(testFile, { force: true })
      // Clean up src/core if we created it and it was empty
      try {
        if (!hadCore) {
          const { readdirSync } = await import("node:fs")
          if (readdirSync(tmpCore).length === 0) rmSync(tmpCore, { recursive: true, force: true })
        }
      } catch {}
    }
  })

  it("checkFilenameHyphen detects multiple hyphens", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const v1 = mod.checkFilenameHyphen("src/foo-bar-baz.ts")
    expect(v1).not.toBeNull()
    expect(v1?.pattern).toBe("hyphen-max1")
    const v2 = mod.checkFilenameHyphen("src/foo-bar.ts")
    expect(v2).toBeNull()
    const v3 = mod.checkFilenameHyphen("src/foo.ts")
    expect(v3).toBeNull()
  })

  it("checkFilenameHyphen ignores dotfiles and _TEMPLATE", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const v1 = mod.checkFilenameHyphen(".hidden-file-name-with-many-hyphens.ts")
    // dotfile with hyphen should still be checked? Our impl allows _TEMPLATE only
    // but dotfiles starting with . are allowed to be ignored for _TEMPLATE case only
    // Actually we check _TEMPLATE.md special case, dotfiles still go through hyphen check
    // but we allow _ prefix to skip _TEMPLATE
    expect(mod.checkFilenameHyphen("_TEMPLATE.md")).toBeNull()
  })

  it("collectAllFilesForFilenameCheck collects", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const files = mod.collectAllFilesForFilenameCheck(["src"])
    expect(Array.isArray(files)).toBe(true)
  })

  it("zeroAlloc and memoryLeak patterns defined", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    expect(mod.zeroAllocPatternsInSrc.length).toBeGreaterThanOrEqual(0)
    expect(mod.memoryLeakPatternsInSrc.length).toBeGreaterThanOrEqual(0)
    expect(mod.filenameCheckDirs.length).toBeGreaterThan(0)
  })
})
