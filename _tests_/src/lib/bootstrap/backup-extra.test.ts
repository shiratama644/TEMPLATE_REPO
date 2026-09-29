import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
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

describe("backup extra coverage", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `backup-extra-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("backs up directory", () => {
    const dir = join(tempRoot, "test-dir")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "file.txt"), "hello", "utf8")
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["test-dir"], tempRoot, backupDir)
    expect(result.entries.length).toBe(1)
    expect(result.entries[0].type).toBe("dir")
  })

  it("handles restore with missing backup file", () => {
    writeFileSync(join(tempRoot, "test.txt"), "original", "utf8")
    const backupDir = join(tempRoot, "backup")
    const { backupDir: created } = createBackup(["test.txt"], tempRoot, backupDir)
    rmSync(join(created, "test.txt"), { force: true })
    expect(() => restoreBackup(created, tempRoot)).not.toThrow()
  })

  it("cleanup handles file entries (now includes files)", () => {
    const base = join(tempRoot, ".bootstrap-backup")
    mkdirSync(base, { recursive: true })
    writeFileSync(join(base, "not-a-dir.txt"), "hello", "utf8")
    mkdirSync(join(base, "2026-01-01T00-00-00"), { recursive: true })
    writeFileSync(
      join(base, "2026-01-01T00-00-00", "manifest.json"),
      JSON.stringify({ files: [] }),
      "utf8",
    )
    expect(() => cleanupOldBackups(tempRoot, 5)).not.toThrow()
    // Now listBackups returns all, including file
    expect(listBackups(tempRoot).length).toBe(2)
  })

  it("listBackups handles file entries (now includes files)", () => {
    const base = join(tempRoot, ".bootstrap-backup")
    mkdirSync(base, { recursive: true })
    writeFileSync(join(base, "file.txt"), "hello", "utf8")
    const list = listBackups(tempRoot)
    expect(list.length).toBe(1)
    expect(list[0]).toBe("file.txt")
  })

  it("getBackupDir format", () => {
    const dir = getBackupDir(tempRoot)
    expect(dir.includes(".bootstrap-backup")).toBe(true)
  })

  it("restore directory", () => {
    const dir = join(tempRoot, "test-dir")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "file.txt"), "hello", "utf8")
    const backupDir = join(tempRoot, "backup")
    const { backupDir: created } = createBackup(["test-dir"], tempRoot, backupDir)
    rmSync(dir, { recursive: true, force: true })
    restoreBackup(created, tempRoot)
    expect(existsSync(join(tempRoot, "test-dir", "file.txt"))).toBe(true)
  })
})
