import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createBackup } from "../../../../scripts/lib/bootstrap/backup.ts"

describe("backup 100% branches", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `backup-100b-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("existsSync false branch", () => {
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["nonexistent.txt"], tempRoot, backupDir)
    expect(result.entries.length).toBe(0)
  })

  it("mixed exists true and false", () => {
    writeFileSync(join(tempRoot, "exists.txt"), "hello", "utf8")
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["exists.txt", "nonexistent.txt"], tempRoot, backupDir)
    expect(result.entries.some((e) => e.originalPath === "exists.txt")).toBe(true)
    expect(result.entries.some((e) => e.originalPath === "nonexistent.txt")).toBe(false)
  })

  it("existsSync true branch", () => {
    writeFileSync(join(tempRoot, "test.txt"), "hello", "utf8")
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["test.txt"], tempRoot, backupDir)
    expect(result.entries.some((e) => e.originalPath === "test.txt")).toBe(true)
  })

  it("pkg exists and files includes package.json false branch", () => {
    writeFileSync(join(tempRoot, "package.json"), JSON.stringify({ name: "test" }), "utf8")
    writeFileSync(join(tempRoot, "test.txt"), "hello", "utf8")
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["package.json", "test.txt"], tempRoot, backupDir)
    // package.json should be backed up as part of files, not auto
    expect(result.entries.filter((e) => e.originalPath === "package.json").length).toBe(1)
  })

  it("pkg exists and files not includes true branch", () => {
    writeFileSync(join(tempRoot, "package.json"), JSON.stringify({ name: "test" }), "utf8")
    const backupDir = join(tempRoot, "backup")
    const result = createBackup([], tempRoot, backupDir)
    expect(result.entries.some((e) => e.originalPath === "package.json")).toBe(true)
  })

  it("pkg not exists false branch", () => {
    const backupDir = join(tempRoot, "backup")
    const result = createBackup([], tempRoot, backupDir)
    expect(result.entries.some((e) => e.originalPath === "package.json")).toBe(false)
  })

  it("pkg not exists and files includes package.json", () => {
    const backupDir = join(tempRoot, "backup")
    const result = createBackup(["package.json"], tempRoot, backupDir)
    expect(result.entries.some((e) => e.originalPath === "package.json")).toBe(false)
  })

  it("without backupDir uses getBackupDir", () => {
    writeFileSync(join(tempRoot, "test.txt"), "hello", "utf8")
    const result = createBackup(["test.txt"], tempRoot)
    expect(result.backupDir.includes(".bootstrap-backup")).toBe(true)
    expect(result.entries.length).toBe(1)
  })
})
