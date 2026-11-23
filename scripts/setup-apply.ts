/** 計画したファイルの書き込みと、失敗時のロールバック（既存ファイルは削除しない）。 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join } from "node:path"
import { safe } from "./safe-path.ts"
import type { Resolved } from "./setup-options.ts"
import { json } from "./setup-package.ts"

export type Applied = { backup?: string; changed: string[]; created: string[] }
export function applyPlan(
  o: Resolved,
  create: [string, string][],
  pkg: Record<string, unknown>,
  pkgPath: string,
  pkgChanged: boolean,
  configDest: string | undefined,
): Applied {
  const backupRoot = safe(o.dir, ".setup-backup")
  let backup: string | undefined
  if (pkgChanged && existsSync(pkgPath)) {
    mkdirSync(backupRoot, { recursive: true })
    backup = mkdtempSync(join(backupRoot, "manifest-"))
  }
  const created: string[] = []
  const changed: string[] = []
  try {
    for (const [path, content] of create) {
      const target = safe(o.dir, path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content, { flag: "wx" })
      created.push(target)
    }
    if (pkgChanged) {
      if (existsSync(pkgPath)) {
        if (!backup) throw new Error("バックアップの作成に失敗しました")
        copyFileSync(pkgPath, join(backup, "package.json"))
        changed.push(pkgPath)
      }
      const tmp = join(o.dir, `.setup-pkg-${process.pid}.tmp`)
      writeFileSync(tmp, json(pkg), { flag: "wx" })
      renameSync(tmp, pkgPath)
      if (!changed.length) created.push(pkgPath)
    }
    if (configDest) {
      mkdirSync(dirname(configDest), { recursive: true })
      writeFileSync(
        configDest,
        json({
          name: o.name,
          description: o.description,
          language: o.language,
          template: o.template,
          preset: o.preset,
          features: o.features,
        }),
        { flag: "wx" },
      )
      created.push(configDest)
    }
  } catch (e) {
    for (const path of created) rmSync(path, { force: true })
    for (const path of changed) if (backup) copyFileSync(join(backup, basename(path)), path)
    throw e
  }
  return { backup, changed, created }
}
