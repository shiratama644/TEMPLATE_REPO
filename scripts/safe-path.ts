/** 生成先のパス検証。`..`・絶対パス・`.git`・symlink 経由の書き込みを拒む。 */
import { existsSync, lstatSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"

export function safe(root: string, p: string): string {
  const segments = p.split(/[\\/]/)
  if (
    isAbsolute(p) ||
    segments.includes("..") ||
    // Windows/macOS may alias case variants; Windows also ignores trailing dots/spaces.
    segments.some((segment) => segment.replace(/[. ]+$/g, "").toLowerCase() === ".git") ||
    !p
  )
    throw new Error(`不正な生成パス: ${p}`)
  const full = resolve(root, p)
  const rel = relative(root, full)
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error(`対象外のパス: ${p}`)
  for (let dir = dirname(full); dir !== root; dir = dirname(dir))
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink())
      throw new Error(`シンボリックリンク経由の書き込みはしません: ${p}`)
  return full
}
