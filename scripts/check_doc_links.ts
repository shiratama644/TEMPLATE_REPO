import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { display, files, root } from "./walk.ts"

export function brokenLinks(path: string): Array<[number, string]> {
  const errors: Array<[number, string]> = []
  let fenced = false
  for (const [index, line] of readFileSync(path, "utf8").split("\n").entries()) {
    if (line.trimStart().startsWith("```")) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const text = line.replace(/`[^`]*`/g, "")
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1]
      if (!target || /^(?:[a-z][a-z\d+.-]*:|#)/i.test(target)) continue
      const file = target.split("#", 1)[0]
      if (file && !existsSync(join(dirname(path), file))) errors.push([index + 1, target])
    }
  }
  return errors
}

export function checkLinks(base = root): number {
  let count = 0
  let errors = 0
  for (const path of files(base)) {
    if (!path.endsWith(".md")) continue
    count++
    for (const [line, target] of brokenLinks(path)) {
      console.error(`${display(path, base)}:${line}: 切れたリンク -> ${target}`)
      errors++
    }
  }
  if (errors) console.error(`NG: ${errors} 件の切れたリンク（${count} ファイル中）`)
  else console.log(`OK: 内部リンク ${count} ファイルを検査、切れたリンクはありません`)
  return errors ? 1 : 0
}
if (import.meta.main) process.exit(checkLinks(process.argv[2] ? resolve(process.argv[2]) : root))
