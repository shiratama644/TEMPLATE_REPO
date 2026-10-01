import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("bundle.ts", () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "bundle-test-"))
    originalCwd = process.cwd()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  it("analyzeSrcSize returns files", async () => {
    mkdirSync(join(tmpDir, "src"))
    writeFileSync(join(tmpDir, "src", "index.ts"), "const x=1;")
    writeFileSync(join(tmpDir, "src", "utils.ts"), "const y=2;".repeat(100))
    const mod = await import("../../../scripts/lib/bundle.ts")
    const files = mod.analyzeSrcSize(join(tmpDir, "src"))
    expect(files.length).toBe(2)
    expect(files[0].size).toBeGreaterThanOrEqual(files[1].size)
  })

  it("analyzeSrcSize handles missing dir", async () => {
    const mod = await import("../../../scripts/lib/bundle.ts")
    const files = mod.analyzeSrcSize(join(tmpDir, "nonexistent"))
    expect(files).toHaveLength(0)
  })

  it("printBundleAnalysis does not throw", async () => {
    mkdirSync(join(tmpDir, "src"))
    writeFileSync(join(tmpDir, "src", "index.ts"), "const x=1;")
    const mod = await import("../../../scripts/lib/bundle.ts")
    expect(() => mod.printBundleAnalysis()).not.toThrow()
  })
})
