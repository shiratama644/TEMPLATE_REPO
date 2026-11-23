/** テストを実行し、行カバレッジの合計が下限を超えているかを確認する。 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { root } from "./walk.ts"

export const MIN_TOTAL_PERCENT = 55
export const coverageDir = join(root, ".tmp/coverage")
export type Coverage = { file: string; lines: number; hit: number }
export function parseLcov(text: string): Coverage[] {
  const rows: Coverage[] = []
  for (const record of text.split("end_of_record")) {
    const file = /^SF:(.+)$/m.exec(record)?.[1]
    if (!file) continue
    const lines = Number(/^LF:(\d+)$/m.exec(record)?.[1] ?? 0)
    const hit = Number(/^LH:(\d+)$/m.exec(record)?.[1] ?? 0)
    rows.push({ file, lines, hit })
  }
  return rows
}
export const percent = (rows: Coverage[]) => {
  const lines = rows.reduce((sum, r) => sum + r.lines, 0)
  return lines ? (100 * rows.reduce((sum, r) => sum + r.hit, 0)) / lines : 0
}
export function checkCoverage(): number {
  mkdirSync(coverageDir, { recursive: true })
  // text も出すのは、低下したときにどのファイルが弱いか人間が読めるようにするため。
  const run = spawnSync(
    "bun",
    [
      "test",
      "--coverage",
      "--coverage-reporter=text",
      "--coverage-reporter=lcov",
      `--coverage-dir=${coverageDir}`,
    ],
    { stdio: "inherit" },
  )
  if (run.status !== 0) {
    console.error("NG: テストが失敗したためカバレッジは判定しません")
    return 1
  }
  const lcov = join(coverageDir, "lcov.info")
  if (!existsSync(lcov)) {
    console.error(`NG: ${relative(root, lcov)} がありません`)
    return 1
  }
  const rows = parseLcov(readFileSync(lcov, "utf8"))
  if (!rows.length) {
    console.error("NG: lcov に計測結果がありません")
    return 1
  }
  const total = percent(rows)
  const worst = [...rows].sort((a, b) => a.hit / a.lines - b.hit / b.lines).slice(0, 3)
  const weakest = worst.map((r) => `${r.file} ${((100 * r.hit) / r.lines).toFixed(0)}%`).join(", ")
  if (total < MIN_TOTAL_PERCENT) {
    console.error(
      `NG: 行カバレッジ ${total.toFixed(2)}% が下限 ${MIN_TOTAL_PERCENT}% を下回りました（低位: ${weakest}）`,
    )
    return 1
  }
  console.log(
    `OK: 行カバレッジ ${total.toFixed(2)}%（下限 ${MIN_TOTAL_PERCENT}%）・計測 ${rows.length} ファイル。低位: ${weakest}`,
  )
  return 0
}
if (import.meta.main) process.exit(checkCoverage())
