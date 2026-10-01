import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupOldBackups,
  createBackup,
  getBackupDir,
  listBackups,
  restoreBackup,
} from "../../../../scripts/lib/bootstrap/backup.ts"

describe("getBackupDir", () => {
  it("creates timestamped dir", () => {
    const dir = getBackupDir("/tmp")
    expect(dir.includes(".bootstrap-backup")).toBe(true)
    expect(dir.includes("T")).toBe(true)
  })
})

describe("createBackup and restoreBackup", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `backup-vitest-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("backs up file", () => {
    const testFile = join(tempRoot, "test.txt")
    writeFileSync(testFile, "original", "utf8")
    const backupDir = join(tempRoot, "backup")
    const { backupDir: createdDir, entries } = createBackup(["test.txt"], tempRoot, backupDir)
    expect(existsSync(join(createdDir, "test.txt"))).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it("backs up package.json automatically", () => {
    writeFileSync(join(tempRoot, "package.json"), JSON.stringify({ name: "test" }), "utf8")
    const backupDir = join(tempRoot, "backup")
    const { entries } = createBackup([], tempRoot, backupDir)
    expect(entries.some((e) => e.originalPath === "package.json")).toBe(true)
  })

  it("restores backup", () => {
    const testFile = join(tempRoot, "test.txt")
    writeFileSync(testFile, "original", "utf8")
    const backupDir = join(tempRoot, "backup")
    const { backupDir: createdDir } = createBackup(["test.txt"], tempRoot, backupDir)
    writeFileSync(testFile, "modified", "utf8")
    restoreBackup(createdDir, tempRoot)
    expect(readFileSync(testFile, "utf8")).toBe("original")
  })

  it("throws if manifest not found", () => {
    expect(() => restoreBackup(join(tempRoot, "nonexistent"), tempRoot)).toThrow()
  })

  it("handles missing files gracefully", () => {
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["nonexistent.txt"], tempRoot, backupDir)
    // No package.json exists, so entries should be 0 for missing file
    expect(result.entries.filter((e) => e.originalPath === "nonexistent.txt").length).toBe(0)
    expect(result.entries.length).toBe(0)
  })
})

describe("listBackups and cleanupOldBackups", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `backup-list-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("lists backups", () => {
    for (let i = 0; i < 3; i++) {
      const d = join(tempRoot, ".bootstrap-backup", `2026-01-0${i}T00-00-00`)
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, "manifest.json"), JSON.stringify({ files: [] }), "utf8")
    }
    const list = listBackups(tempRoot)
    expect(list.length).toBe(3)
  })

  it("returns empty if no backups", () => {
    expect(listBackups(tempRoot).length).toBe(0)
  })

  it("cleanup keeps N newest", () => {
    for (let i = 0; i < 5; i++) {
      const d = join(tempRoot, ".bootstrap-backup", `2026-01-0${i}T00-00-00`)
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, "manifest.json"), JSON.stringify({ files: [] }), "utf8")
    }
    cleanupOldBackups(tempRoot, 2)
    expect(listBackups(tempRoot).length).toBe(2)
  })

  it("handles missing backup dir", () => {
    expect(() => cleanupOldBackups(tempRoot, 5)).not.toThrow()
    expect(listBackups(join(tempRoot, "nonexistent")).length).toBe(0)
  })
})
