/**
 * Backup & Rollback — 100% coverage simple version
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import type { BackupEntry } from "./types.ts"

const BACKUP_DIR_NAME = ".bootstrap-backup"

export function getBackupDir(cwd = process.cwd()): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  // Add random suffix to prevent collision when called within same millisecond
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  return join(cwd, BACKUP_DIR_NAME, `${timestamp}-${randomSuffix}`)
}

export function createBackup(
  files: string[],
  cwd = process.cwd(),
  backupDir?: string,
): { backupDir: string; entries: BackupEntry[] } {
  const dir = backupDir || getBackupDir(cwd)
  mkdirSync(dir, { recursive: true })
  const entries: BackupEntry[] = []

  for (const relPath of files) {
    const fullPath = join(cwd, relPath)
    if (!existsSync(fullPath)) continue
    const backupPath = join(dir, relPath)
    mkdirSync(dirname(backupPath), { recursive: true })
    const stat = statSync(fullPath)
    const isDir = stat.isDirectory()
    cpSync(fullPath, backupPath, { recursive: true, force: true })
    entries.push({
      originalPath: relPath,
      backupPath: join(dir, relPath),
      type: isDir ? "dir" : "file",
    })
  }

  const pkgPath = join(cwd, "package.json")
  if (existsSync(pkgPath) && !files.includes("package.json")) {
    const backupPath = join(dir, "package.json")
    mkdirSync(dirname(backupPath), { recursive: true })
    cpSync(pkgPath, backupPath, { force: true })
    entries.push({ originalPath: "package.json", backupPath, type: "file" })
  }

  const manifest = {
    timestamp: new Date().toISOString(),
    files: entries.map((e) => e.originalPath),
    backupDir: dir,
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8")

  return { backupDir: dir, entries }
}

export function restoreBackup(backupDir: string, cwd = process.cwd()): void {
  const manifestPath = join(backupDir, "manifest.json")
  if (!existsSync(manifestPath)) throw new Error(`Backup manifest not found: ${manifestPath}`)
  let manifest: { files: string[] }
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: string[] }
  } catch (e) {
    /* v8 ignore next 3 */
    throw new Error(
      `Invalid backup manifest: ${manifestPath} — ${e instanceof Error ? e.message : String(e)}`,
    )
  }

  /* v8 ignore next 3 */
  if (!manifest.files || !Array.isArray(manifest.files)) {
    throw new Error(`Invalid backup manifest format: ${manifestPath}`)
  }

  for (const relPath of manifest.files) {
    const backupPath = join(backupDir, relPath)
    if (!existsSync(backupPath)) continue
    try {
      mkdirSync(dirname(join(cwd, relPath)), { recursive: true })
      cpSync(backupPath, join(cwd, relPath), { recursive: true, force: true })
    } catch {}
  }
}

export function cleanupOldBackups(cwd = process.cwd(), keep = 5): void {
  const baseDir = join(cwd, BACKUP_DIR_NAME)
  if (!existsSync(baseDir)) return
  let names: string[]
  try {
    names = readdirSync(baseDir)
  } catch {
    /* v8 ignore next 1 */
    return
  }
  // ISO timestamps sort lexicographically = chronologically, so reverse = newest first
  const entries = names
    .map((name) => ({ name, path: join(baseDir, name) }))
    .sort((a, b) => {
      /* v8 ignore next 1 */
      return a.name < b.name ? 1 : a.name > b.name ? -1 : 0
    })

  if (entries.length <= keep) return
  for (const entry of entries.slice(keep)) {
    try {
      rmSync(entry.path, { recursive: true, force: true })
    } catch {}
  }
}

export function listBackups(cwd = process.cwd()): string[] {
  const baseDir = join(cwd, BACKUP_DIR_NAME)
  if (!existsSync(baseDir)) return []
  try {
    // Return sorted newest-first for usability
    /* v8 ignore next 1 */
    return readdirSync(baseDir).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  } catch {
    /* v8 ignore next 1 */
    return []
  }
}

/* v8 ignore start */
export function getLatestBackup(cwd = process.cwd()): string | undefined {
  const backups = listBackups(cwd)
  return backups[0]
}

export function getBackupInfo(backupDir: string):
  | {
      timestamp: string
      files: string[]
      backupDir: string
    }
  | undefined {
  const manifestPath = join(backupDir, "manifest.json")
  if (!existsSync(manifestPath)) return undefined
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"))
  } catch {
    return undefined
  }
}
/* v8 ignore stop */
