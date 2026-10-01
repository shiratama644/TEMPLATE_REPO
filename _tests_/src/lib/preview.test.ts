import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("preview.ts", () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "preview-test-"))
    originalCwd = process.cwd()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  it("buildPreviewInfo detects framework", async () => {
    writeFileSync(join(tmpDir, "vite.config.ts"), "export default {}")
    const mod = await import("../../../scripts/lib/preview.ts")
    const info = mod.buildPreviewInfo()
    expect(info.config.framework).toBe("vite")
  })

  it("createPreviewPlaceholder creates file", async () => {
    const mod = await import("../../../scripts/lib/preview.ts")
    mod.createPreviewPlaceholder(join(tmpDir, "preview"))
    expect(existsSync(join(tmpDir, "preview", "index.html"))).toBe(true)
  })

  it("copyPreview copies dir", async () => {
    mkdirSync(join(tmpDir, "dist"))
    writeFileSync(join(tmpDir, "dist", "index.html"), "<html>test</html>")
    const mod = await import("../../../scripts/lib/preview.ts")
    const ok = mod.copyPreview(join(tmpDir, "dist"), join(tmpDir, "preview"))
    expect(ok).toBe(true)
    expect(existsSync(join(tmpDir, "preview", "index.html"))).toBe(true)
  })

  it("copyPreview handles missing dir", async () => {
    const mod = await import("../../../scripts/lib/preview.ts")
    const ok = mod.copyPreview(join(tmpDir, "nonexistent"), join(tmpDir, "preview2"))
    expect(ok).toBe(false)
    expect(existsSync(join(tmpDir, "preview2", "index.html"))).toBe(true)
  })
})
