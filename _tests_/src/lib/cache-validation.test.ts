import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearCache,
  getCacheConfig,
  getCacheDir,
  getFilesInDir,
  getProjectSourceHash,
  hashFile,
  hashFiles,
  isBuildCacheValid,
  logCacheStats,
  saveBuildCache,
} from "../../../scripts/lib/cache.ts"

describe("cache 100% coverage", () => {
  let tempRoot: string
  let originalCwd: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `cache-100-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
    originalCwd = process.cwd()
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("getCacheDir creates dir", () => {
    const dir = getCacheDir()
    expect(existsSync(dir)).toBe(true)
  })

  it("getCacheDir termux", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    const dir = getCacheDir()
    expect(dir.includes("termux")).toBe(true)
    vi.unstubAllEnvs()
  })

  it("hashFile non-existing returns empty", () => {
    expect(hashFile(join(tempRoot, "nonexistent.txt"))).toBe("")
  })

  it("hashFile existing", () => {
    const file = join(tempRoot, "test.txt")
    writeFileSync(file, "hello", "utf8")
    const hash = hashFile(file)
    expect(hash.length).toBeGreaterThan(0)
  })

  it("hashFiles empty", () => {
    expect(hashFiles([])).toBe("")
  })

  it("hashFiles with existing and non-existing", () => {
    const file = join(tempRoot, "test.txt")
    writeFileSync(file, "hello", "utf8")
    const hash = hashFiles([file, join(tempRoot, "nonexistent.txt")])
    expect(hash.length).toBeGreaterThan(0)
  })

  it("hashFiles with only non-existing", () => {
    const hash = hashFiles([join(tempRoot, "nonexistent.txt")])
    expect(hash).toBe("")
  })

  it("getFilesInDir non-existing returns empty", () => {
    expect(getFilesInDir(join(tempRoot, "nonexistent"))).toEqual([])
  })

  it("getFilesInDir maxDepth", () => {
    mkdirSync(join(tempRoot, "a", "b", "c", "d"), { recursive: true })
    writeFileSync(join(tempRoot, "a", "b", "c", "d", "file.ts"), "content", "utf8")
    const files = getFilesInDir(join(tempRoot, "a"), 1)
    expect(files.length).toBe(0)
  })

  it("getFilesInDir with files and ignored dirs", () => {
    mkdirSync(join(tempRoot, "src"), { recursive: true })
    writeFileSync(join(tempRoot, "src", "index.ts"), "content", "utf8")
    writeFileSync(join(tempRoot, "src", "style.css"), "content", "utf8")
    mkdirSync(join(tempRoot, "src", "node_modules"), { recursive: true })
    writeFileSync(join(tempRoot, "src", "node_modules", "pkg.ts"), "content", "utf8")
    mkdirSync(join(tempRoot, "src", ".git"), { recursive: true })
    const files = getFilesInDir(join(tempRoot, "src"))
    expect(files.some((f) => f.includes("index.ts"))).toBe(true)
    expect(files.some((f) => f.includes("style.css"))).toBe(false)
    expect(files.some((f) => f.includes("node_modules"))).toBe(false)
  })

  it("getProjectSourceHash returns hash", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    mkdirSync(join(tempRoot, "src"), { recursive: true })
    writeFileSync(join(tempRoot, "src", "index.ts"), "content", "utf8")
    const hash = getProjectSourceHash()
    expect(hash.length).toBeGreaterThan(0)
  })

  it("getProjectSourceHash termux true", () => {
    vi.stubEnv("TERMUX_VERSION", "1.0")
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    mkdirSync(join(tempRoot, "src"), { recursive: true })
    writeFileSync(join(tempRoot, "src", "index.ts"), "content", "utf8")
    const hash = getProjectSourceHash()
    expect(hash.length).toBeGreaterThan(0)
    vi.unstubAllEnvs()
  })

  it("saveBuildCache and isBuildCacheValid", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test", 100)
    expect(isBuildCacheValid("test")).toBe(true)
  })

  it("isBuildCacheValid non-existing", () => {
    expect(isBuildCacheValid("nonexistent")).toBe(false)
  })

  it("isBuildCacheValid with different hash", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test")
    writeFileSync(join(tempRoot, "package.json"), '{"changed": true}', "utf8")
    expect(isBuildCacheValid("test")).toBe(false)
  })

  it("isBuildCacheValid with different nodeVersion", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test")
    const cacheDir = getCacheDir()
    const cacheFile = join(cacheDir, "build-test.json")
    const content = JSON.parse(require("node:fs").readFileSync(cacheFile, "utf8"))
    content.nodeVersion = "v0.0.0"
    require("node:fs").writeFileSync(cacheFile, JSON.stringify(content), "utf8")
    expect(isBuildCacheValid("test")).toBe(false)
  })

  it("isBuildCacheValid with different isTermux", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test")
    const cacheDir = getCacheDir()
    const cacheFile = join(cacheDir, "build-test.json")
    const content = JSON.parse(require("node:fs").readFileSync(cacheFile, "utf8"))
    content.isTermux = !content.isTermux
    require("node:fs").writeFileSync(cacheFile, JSON.stringify(content), "utf8")
    expect(isBuildCacheValid("test")).toBe(false)
  })

  it("clearCache all when dir not exists", () => {
    clearCache()
    expect(existsSync(join(tempRoot, ".cache"))).toBe(false)
    clearCache()
  })

  it("getCacheConfig returns configs", () => {
    const configs = getCacheConfig()
    expect(configs.vite.name).toBe("vite")
    expect(configs.next.name).toBe("next")
    expect(configs.turbo.name).toBe("turbo")
    expect(configs.generic.name).toBe("generic")
  })

  it("logCacheStats", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test")
    logCacheStats()
  })

  it("clearCache specific", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test")
    clearCache("test")
    expect(isBuildCacheValid("test")).toBe(false)
  })

  it("clearCache all", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    saveBuildCache("test")
    clearCache()
    expect(existsSync(join(tempRoot, ".cache"))).toBe(false)
  })

  it("clearCache non-existing file", () => {
    clearCache("nonexistent")
  })
})
