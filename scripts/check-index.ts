import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { root } from "./walk.ts"

// 各入口 index が実物のファイルを取りこぼしていないかを確認する（AGENTS.md §8.6）。
const show = (base: string, path: string) => relative(base, path).replaceAll("\\", "/")
const names = (dir: string, accept: (name: string) => boolean) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && accept(entry.name))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b))
    : []
const dirs = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b))
    : []

// index 内の相対リンクを、リポジトリ基準のパスへ正規化する。
function linked(index: string, base: string): Set<string> {
  const found = new Set<string>()
  const dir = dirname(index)
  for (const match of readFileSync(index, "utf8").matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0]
    if (target && !/^[a-z][a-z0-9+.-]*:/i.test(target)) found.add(show(base, join(dir, target)))
  }
  return found
}

export function checkIndex(base = root): number {
  const problems: string[] = []
  const groups: Array<[string, string, string[]]> = [
    [
      ".agent/skills/index.md",
      join(base, ".agent/skills/index.md"),
      dirs(join(base, ".agent/skills")).map((name) => `.agent/skills/${name}/SKILL.md`),
    ],
    [
      ".agent/rules/index.md",
      join(base, ".agent/rules/index.md"),
      [
        ...names(join(base, ".agent/rules"), (n) => n.endsWith(".md") && n !== "index.md").map(
          (n) => `.agent/rules/${n}`,
        ),
        ...names(join(base, ".agent/rules/common"), (n) => n.endsWith(".md")).map(
          (n) => `.agent/rules/common/${n}`,
        ),
      ],
    ],
    [
      ".agent/hooks/index.md",
      join(base, ".agent/hooks/index.md"),
      names(join(base, ".agent/hooks"), (n) => n !== "index.md").map((n) => `.agent/hooks/${n}`),
    ],
  ]
  for (const [label, index, expected] of groups) {
    if (!existsSync(index)) {
      problems.push(`${label} がありません`)
      continue
    }
    const found = linked(index, base)
    for (const entry of expected) {
      if (!existsSync(join(base, entry))) problems.push(`${entry} がありません`)
      else if (!found.has(entry)) problems.push(`${label} に ${entry} の記載がありません`)
    }
  }
  if (problems.length) {
    for (const problem of problems) console.error(`NG: ${problem}`)
    return 1
  }
  const total = groups.reduce((sum, [, , expected]) => sum + expected.length, 0)
  console.log(`OK: 入口 index と実物の整合を確認しました（skills / rules / hooks、${total} 件）`)
  return 0
}

if (import.meta.main) process.exit(checkIndex())
