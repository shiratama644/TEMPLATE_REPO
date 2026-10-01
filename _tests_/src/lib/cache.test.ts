import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
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

describe("getCacheDir", () => {
  it("returns cache dir", () => {
    const dir = getCacheDir()
    expect(typeof dir).toBe("string")
    expect(dir.length).toBeGreaterThan(0)
    expect(dir.includes(".cache")).toBe(true)
  })
})

describe("hashFile", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `cache-hash-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("hashes file", () => {
    const file = join(tempRoot, "test.txt")
    writeFileSync(file, "hello", "utf8")
    const hash = hashFile(file)
    expect(typeof hash).toBe("string")
    expect(hash.length).toBeGreaterThan(0)
  })

  it("returns empty for nonexistent", () => {
    const hash = hashFile(join(tempRoot, "nonexistent.txt"))
    expect(hash).toBe("")
  })

  it("same content same hash", () => {
    const file1 = join(tempRoot, "a.txt")
    const file2 = join(tempRoot, "b.txt")
    writeFileSync(file1, "same", "utf8")
    writeFileSync(file2, "same", "utf8")
    expect(hashFile(file1)).toBe(hashFile(file2))
  })
})

describe("hashFiles", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `cache-hash-files-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("hashes multiple files", () => {
    const file1 = join(tempRoot, "a.txt")
    const file2 = join(tempRoot, "b.txt")
    writeFileSync(file1, "hello", "utf8")
    writeFileSync(file2, "world", "utf8")
    const hash = hashFiles([file1, file2])
    expect(typeof hash).toBe("string")
    expect(hash.length).toBeGreaterThan(0)
  })

  it("excludes nonexistent files", () => {
    const file1 = join(tempRoot, "a.txt")
    writeFileSync(file1, "hello", "utf8")
    const hash = hashFiles([file1, join(tempRoot, "nonexistent.txt")])
    expect(hash.length).toBeGreaterThan(0)
  })

  it("returns empty for empty array", () => {
    const hash = hashFiles([])
    expect(hash).toBe("")
  })

  it("returns empty for all nonexistent", () => {
    const hash = hashFiles([join(tempRoot, "no1.txt"), join(tempRoot, "no2.txt")])
    expect(hash).toBe("")
  })
})

describe("getFilesInDir", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `cache-files-in-dir-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("gets source files in dir", () => {
    writeFileSync(join(tempRoot, "a.ts"), "hello", "utf8")
    writeFileSync(join(tempRoot, "b.js"), "world", "utf8")
    writeFileSync(join(tempRoot, "c.txt"), "ignored", "utf8") // .txt should be ignored
    const files = getFilesInDir(tempRoot)
    expect(files.length).toBe(2)
    expect(files.some((f) => f.endsWith("a.ts"))).toBe(true)
    expect(files.some((f) => f.endsWith("b.js"))).toBe(true)
  })

  it("returns empty for nonexistent dir", () => {
    const files = getFilesInDir(join(tempRoot, "nonexistent"))
    expect(files.length).toBe(0)
  })

  it("respects maxDepth", () => {
    mkdirSync(join(tempRoot, "sub", "deep"), { recursive: true })
    writeFileSync(join(tempRoot, "a.ts"), "", "utf8")
    writeFileSync(join(tempRoot, "sub", "b.ts"), "", "utf8")
    writeFileSync(join(tempRoot, "sub", "deep", "c.ts"), "", "utf8")
    const shallow = getFilesInDir(tempRoot, 0)
    expect(shallow.length).toBe(1) // only root
    const deep = getFilesInDir(tempRoot, 3)
    expect(deep.length).toBe(3)
  })

  it("excludes node_modules", () => {
    mkdirSync(join(tempRoot, "node_modules"), { recursive: true })
    writeFileSync(join(tempRoot, "node_modules", "a.ts"), "", "utf8")
    writeFileSync(join(tempRoot, "b.ts"), "", "utf8")
    const files = getFilesInDir(tempRoot)
    expect(files.length).toBe(1)
    expect(files[0].endsWith("b.ts")).toBe(true)
  })
})

describe("getProjectSourceHash", () => {
  it("returns hash string", () => {
    const hash = getProjectSourceHash()
    expect(typeof hash).toBe("string")
    expect(hash.length).toBeGreaterThan(0)
  })
})

describe("isBuildCacheValid and saveBuildCache", () => {
  it("saves and validates cache", () => {
    // save cache with a build type
    const buildType = `test-${Date.now()}`
    saveBuildCache(buildType, 100)
    // Immediately after saving, cache should be valid (same hash)
    expect(isBuildCacheValid(buildType)).toBe(true)
    // Different build type should be invalid
    expect(isBuildCacheValid(`nonexistent-${Date.now()}`)).toBe(false)
    // Cleanup
    clearCache(buildType)
  })

  it("returns false if no cache", () => {
    expect(isBuildCacheValid(`no-cache-${Date.now()}`)).toBe(false)
  })
})

describe("getCacheConfig", () => {
  it("returns cache config", () => {
    const config = getCacheConfig()
    expect(config).toBeDefined()
    expect(typeof config).toBe("object")
    expect(config.vite).toBeDefined()
    expect(config.next).toBeDefined()
    expect(config.turbo).toBeDefined()
    expect(config.generic).toBeDefined()
  })
})

describe("logCacheStats and clearCache", () => {
  it("logs without throwing", () => {
    expect(() => logCacheStats()).not.toThrow()
  })

  it("clearCache specific build type without throwing", () => {
    const buildType = `clear-test-${Date.now()}`
    saveBuildCache(buildType)
    expect(() => clearCache(buildType)).not.toThrow()
    expect(isBuildCacheValid(buildType)).toBe(false)
  })

  it("clearCache all without throwing", () => {
    expect(() => clearCache()).not.toThrow()
  })
})
