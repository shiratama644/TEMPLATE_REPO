import { lstatSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import iconv from "iconv-lite"
import { display, files } from "./walk.ts"

type Issue = {
  line: number
  level: "error" | "warn"
  character: string
  reason: string
  excerpt: string
}
const scripts = [
  "Hangul",
  "Cyrillic",
  "Greek",
  "Arabic",
  "Hebrew",
  "Thai",
  "Lao",
  "Khmer",
  "Myanmar",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Sinhala",
  "Georgian",
  "Armenian",
  "Ethiopic",
  "Devanagari",
  "Bengali",
  "Gurmukhi",
  "Gujarati",
  "Oriya",
  "Tibetan",
  "Mongolian",
  "Bopomofo",
  "Cherokee",
  "Canadian_Aboriginal",
  "Runic",
  "Ogham",
] as const
const otherScripts = scripts.map((name) => ({ name, test: new RegExp(`\\p{Script=${name}}`, "u") }))
const ignored = /(^|\/)(\.git|node_modules|dist|build|coverage|__pycache__|\.setup-backup)(\/|$)/
const permitted = (cp: number): boolean =>
  [
    [0x1f000, 0x1faff],
    [0x2600, 0x27bf],
    [0x2190, 0x21ff],
    [0x2500, 0x257f],
    [0x2000, 0x206f],
    [0x3000, 0x303f],
    [0xfe00, 0xfe0f],
    [0xff00, 0xffef],
    [0x2460, 0x24ff],
  ].some(([a, b]) => cp >= a && cp <= b)
const japan = (ch: string) =>
  ["euc-jp", "cp932"].some((encoding) => iconv.decode(iconv.encode(ch, encoding), encoding) === ch)

export function classify(ch: string): { level: "error" | "warn"; reason: string } | null {
  const cp = ch.codePointAt(0) ?? 0
  if (cp < 128 || /\s/u.test(ch) || permitted(cp) || /[\p{P}\p{N}\p{S}\p{Z}\p{C}]/u.test(ch))
    return null
  for (const { name, test } of otherScripts)
    if (test.test(ch)) return { level: "error", reason: `${name.toLowerCase()} 系の文字` }
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(ch)) return null
  if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff))
    return japan(ch) ? null : { level: "error", reason: "日本語で使わない漢字（簡体字など）" }
  if ((cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x20000 && cp <= 0x2ffff))
    return japan(ch) ? null : { level: "warn", reason: "拡張領域の漢字（表外字か他言語か要確認）" }
  if (/\p{Script=Latin}/u.test(ch)) return null
  if (/\p{L}/u.test(ch))
    return japan(ch) ? null : { level: "error", reason: "日本語でも英語でもない文字" }
  return null
}
export function stripCommit(text: string): string {
  const lines: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (/^-{8,}\s*>8\s*-{8,}$/.test(line)) break
    if (/^\s*(#|\/\/)/.test(line)) continue
    lines.push(line)
  }
  return lines.join("\n")
}
export function findIssues(text: string): Issue[] {
  const issues: Issue[] = []
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    const seen = new Set<string>()
    for (const ch of line) {
      if (seen.has(ch)) continue
      seen.add(ch)
      const result = classify(ch)
      if (result)
        issues.push({
          line: i + 1,
          level: result.level,
          character: ch,
          reason: result.reason,
          excerpt: Array.from(line.trim()).slice(0, 80).join(""),
        })
    }
  }
  return issues
}
function selfTest(): boolean {
  const fixtures: Array<[string, number, number]> = [
    ["日本語の文章です。English is allowed. 髙﨑 德 禮 ✅ → ①", 0, 0],
    [`手${String.fromCodePoint(0x52a8)}で実行`, 1, 0],
    [String.fromCodePoint(0xd55c), 1, 0],
    [String.fromCodePoint(0x41f), 1, 0],
    [String.fromCodePoint(0x20b9f), 0, 1],
  ]
  for (const [text, errors, warnings] of fixtures) {
    const found = findIssues(text)
    if (
      found.filter((i) => i.level === "error").length !== errors ||
      found.filter((i) => i.level === "warn").length !== warnings
    ) {
      console.error("NG: 言語判定の自己検査に失敗", text)
      return false
    }
  }
  return true
}
export function checkLanguage(args: string[] = [], base = process.cwd()): number {
  if (!selfTest()) return 1
  const commit = args.includes("--commit-msg")
  const paths = args.filter((a) => a !== "--all" && a !== "--commit-msg")
  const targets = paths.length ? paths.map((p) => resolve(base, p)) : [...files(base)]
  let checked = 0,
    errors = 0,
    warns = 0
  for (const path of targets) {
    try {
      if (!statSync(path).isFile() || lstatSync(path).isSymbolicLink()) continue
      const rel = display(path, base)
      if (!commit && ignored.test(rel)) continue
      const bytes = readFileSync(path)
      if (bytes.includes(0)) continue
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      checked++
      for (const issue of findIssues(commit ? stripCommit(text) : text)) {
        const cp = `U+${(issue.character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`
        const msg = `${rel}:${issue.line}: ${issue.level === "error" ? "日本語・英語以外の文字" : "要確認の文字"} ${cp} ${issue.reason} | ${issue.excerpt}`
        if (issue.level === "error") {
          errors++
          console.error(msg)
        } else {
          warns++
          console.log(msg)
        }
      }
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !["ENOENT", "EISDIR", "ERR_ENCODING_INVALID_ENCODED_DATA"].some(
          (code) => error.message.includes(code) || ("code" in error && error.code === code),
        )
      )
        throw error
    }
  }
  if (errors) {
    console.error(`NG: ${errors} 件の違反文字（${checked} ファイル中、要確認 ${warns} 件）`)
    return 1
  }
  console.log(
    `OK: ${commit ? "コミットメッセージ" : "ファイル"} ${checked} 件を検査、日本語と英語以外の文字はありません${warns ? `、要確認 ${warns} 件` : ""}`,
  )
  return 0
}
if (import.meta.main) process.exit(checkLanguage(process.argv.slice(2)))
