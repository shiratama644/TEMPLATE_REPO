import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check-determinism extra coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("detects L1 type branch violation", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const coreDir = "src/core"
    const hadCore = existsSync(coreDir)
    const testFile = join(coreDir, `testL1-${Date.now()}.ts`)
    try {
      mkdirSync(coreDir, { recursive: true })
      writeFileSync(testFile, `if (type === 'foo') { console.log('x') }`)
      const violations = await mod.check()
      // Should contain at least one L1 violation
      const hasL1 = violations.some((v) => v.file.includes("testL1"))
      expect(hasL1).toBe(true)
    } finally {
      if (existsSync(testFile)) rmSync(testFile, { force: true })
      try {
        if (!hadCore) {
          if (readdirSync(coreDir).length === 0) rmSync(coreDir, { recursive: true, force: true })
        }
      } catch {}
    }
  })

  it("ignores comments and biome-ignore in pure files", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const coreDir = "src/core"
    const hadCore = existsSync(coreDir)
    const testFile = join(coreDir, `testIgnore-${Date.now()}.ts`)
    try {
      mkdirSync(coreDir, { recursive: true })
      writeFileSync(
        testFile,
        `// Math.random()\n/* Date.now() */\nconst a = 1 // biome-ignore\nconst b = 2 // eslint-disable\n* comment line\n`,
      )
      const violations = await mod.check()
      // Should not have violations from this file
      const hasThis = violations.some((v) => v.file.includes("testIgnore"))
      expect(hasThis).toBe(false)
    } finally {
      if (existsSync(testFile)) rmSync(testFile, { force: true })
      try {
        if (!hadCore) {
          if (readdirSync(coreDir).length === 0) rmSync(coreDir, { recursive: true, force: true })
        }
      } catch {}
    }
  })

  it("collectFilesFromDir handles statSync throwing via doMock", async () => {
    const tmp = join(tmpdir(), `testStat-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    writeFileSync(join(tmp, "ok.ts"), "const a=1")
    writeFileSync(join(tmp, "bad.ts"), "const b=1")
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: actual.existsSync,
        readdirSync: actual.readdirSync,
        statSync: (p: string) => {
          if (String(p).includes("bad.ts")) throw new Error("stat fail")
          return actual.statSync(p as any)
        },
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/check-determinism.ts")
    const files = mod.collectFilesFromDir(tmp)
    expect(Array.isArray(files)).toBe(true)
    rmSync(tmp, { recursive: true, force: true })
  })

  it("collectFilesFromDir ignores non-matching extensions", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const tmp = join(tmpdir(), `test-ext-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    writeFileSync(join(tmp, "a.txt"), "text")
    writeFileSync(join(tmp, "b.ts"), "code")
    const files = mod.collectFilesFromDir(tmp)
    expect(files.some((f) => f.endsWith(".txt"))).toBe(false)
    expect(files.some((f) => f.endsWith("b.ts"))).toBe(true)
    rmSync(tmp, { recursive: true, force: true })
  })

  it("check handles L1 comment line", async () => {
    const mod = await import("../../../scripts/check-determinism.ts")
    const coreDir = "src/core"
    const hadCore = existsSync(coreDir)
    const testFile = join(coreDir, `testL1Comment-${Date.now()}.ts`)
    try {
      mkdirSync(coreDir, { recursive: true })
      writeFileSync(testFile, `// if (type === 'foo')\nconst x = 1`)
      const violations = await mod.check()
      const hasThis = violations.some((v) => v.file.includes("testL1Comment"))
      expect(hasThis).toBe(false)
    } finally {
      if (existsSync(testFile)) rmSync(testFile, { force: true })
      try {
        if (!hadCore) {
          if (readdirSync(coreDir).length === 0) rmSync(coreDir, { recursive: true, force: true })
        }
      } catch {}
    }
  })

  it("check skips nonexistent pure file", async () => {
    // Mock collectFilesFromDir to return nonexistent file, and existsSync false for that file
    const mod = await import("../../../scripts/check-determinism.ts")
    const originalCollect = mod.collectFilesFromDir
    vi.spyOn(mod, "collectFilesFromDir").mockImplementation((dir: string) => {
      if (dir.includes("core")) return ["/nonexistent/file.ts"]
      return originalCollect(dir)
    })
    const violations = await mod.check()
    expect(Array.isArray(violations)).toBe(true)
  })

  it("covers existsSync false branches via fs mock", async () => {
    const { mkdirSync, rmSync, existsSync: realExists } = await import("node:fs")
    const coreDir = "src/core"
    const hadCore = realExists(coreDir)
    if (!hadCore) mkdirSync(coreDir, { recursive: true })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (String(p).includes("fake.ts")) return false
          return actual.existsSync(p as any)
        },
        readdirSync: (p: string) => {
          if (String(p).includes("src/core") && !String(p).includes("node_modules")) {
            return ["fake.ts", "real.ts"] as any
          }
          return actual.readdirSync(p as any)
        },
        readFileSync: (p: string) => {
          if (String(p).includes("fake.ts")) throw new Error("should not read fake")
          return actual.readFileSync(p as any)
        },
        statSync: (p: string) => {
          if (String(p).includes("fake.ts")) {
            return { isDirectory: () => false, isFile: () => true } as any
          }
          if (String(p).includes("real.ts")) {
            return { isDirectory: () => false, isFile: () => true } as any
          }
          return actual.statSync(p as any)
        },
      }
    })
    const mod = await import("../../../scripts/check-determinism.ts")
    const violations = await mod.check()
    expect(Array.isArray(violations)).toBe(true)
    if (!hadCore) {
      try {
        rmSync(coreDir, { recursive: true, force: true })
      } catch {}
    }
  })

  it("covers stat is neither file nor directory", async () => {
    const tmp = join(tmpdir(), `test-neither-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    writeFileSync(join(tmp, "a.ts"), "const a=1")
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: actual.existsSync,
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
        statSync: () =>
          ({
            isDirectory: () => false,
            isFile: () => false,
            isSymbolicLink: () => true,
          }) as any,
      }
    })
    const mod = await import("../../../scripts/check-determinism.ts")
    const files = mod.collectFilesFromDir(tmp)
    expect(files).toEqual([])
    rmSync(tmp, { recursive: true, force: true })
  })
})
