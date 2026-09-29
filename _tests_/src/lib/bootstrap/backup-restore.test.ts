import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("backup restore directory and file", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `backup-restore-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("restore directory", async () => {
    const { createBackup, restoreBackup } = await import(
      "../../../../scripts/lib/bootstrap/backup.ts"
    )
    const dir = join(tempRoot, "test-dir")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "file.txt"), "hello", "utf8")
    const backupDir = join(tempRoot, "backup")
    const { backupDir: created } = createBackup(["test-dir"], tempRoot, backupDir)
    rmSync(dir, { recursive: true, force: true })
    restoreBackup(created, tempRoot)
    expect(existsSync(join(tempRoot, "test-dir", "file.txt"))).toBe(true)
  })

  it("restore file", async () => {
    const { createBackup, restoreBackup } = await import(
      "../../../../scripts/lib/bootstrap/backup.ts"
    )
    writeFileSync(join(tempRoot, "test.txt"), "original", "utf8")
    const backupDir = join(tempRoot, "backup")
    const { backupDir: created } = createBackup(["test.txt"], tempRoot, backupDir)
    writeFileSync(join(tempRoot, "test.txt"), "modified", "utf8")
    restoreBackup(created, tempRoot)
    expect(existsSync(join(tempRoot, "test.txt"))).toBe(true)
  })
})
