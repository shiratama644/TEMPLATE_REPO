import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  checkCoverage,
  MIN_TOTAL_PERCENT,
  parseLcov,
  percent,
  type Runner,
  runTests,
} from "../scripts/check-coverage.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function dir() {
  const d = mkdtempSync(join(tmpdir(), "coverage-gate-"))
  dirs.push(d)
  return d
}
function captured(run: () => number): { code: number; errors: string; logs: string } {
  const errors: string[] = []
  const logs: string[] = []
  const originalError = console.error
  const originalLog = console.log
  console.error = (...args: unknown[]) => errors.push(args.join(" "))
  console.log = (...args: unknown[]) => logs.push(args.join(" "))
  try {
    return { code: run(), errors: errors.join("\n"), logs: logs.join("\n") }
  } finally {
    console.error = originalError
    console.log = originalLog
  }
}
const record = (file: string, lines: number, hit: number) =>
  `TN:\nSF:${file}\nLF:${lines}\nLH:${hit}\nend_of_record\n`
/** `--coverage-dir` に lcov を書く（あるいは書かない）偽のテスト実行。 */
function fakeRun(status = 0, write?: (target: string) => void): Runner {
  const prefix = "--coverage-dir="
  return (_command, args) => {
    const target = args.find((a) => a.startsWith(prefix))?.slice(prefix.length)
    if (target && write) write(target)
    return { status }
  }
}
const writeLcov = (body: string) => (target: string) => {
  mkdirSync(target, { recursive: true })
  writeFileSync(join(target, "lcov.info"), body)
}

const lcov = [
  "TN:",
  "SF:scripts/a.ts",
  "FN:2,1",
  "LF:10",
  "LH:5",
  "end_of_record",
  "TN:",
  "SF:scripts/b.ts",
  "LF:30",
  "LH:30",
  "end_of_record",
  "",
].join("\n")

test("lcov is parsed into per-file line coverage", () => {
  const rows = parseLcov(lcov)
  expect(rows).toEqual([
    { file: "scripts/a.ts", lines: 10, hit: 5 },
    { file: "scripts/b.ts", lines: 30, hit: 30 },
  ])
  expect(percent(rows)).toBe(87.5)
})

test("an empty report is zero percent instead of a division error", () => {
  expect(parseLcov("")).toEqual([])
  expect(percent([])).toBe(0)
})

test("the gate refuses to judge when the test run itself failed", () => {
  const run = captured(() => checkCoverage(fakeRun(1), dir()))
  expect(run.code).toBe(1)
  expect(run.errors).toContain("NG: テストが失敗したためカバレッジは判定しません")
})

test("a missing or empty lcov report is an error, not a pass", () => {
  const missing = captured(() => checkCoverage(fakeRun(0), dir()))
  expect(missing.code).toBe(1)
  expect(missing.errors).toContain("lcov.info がありません")

  const empty = captured(() => checkCoverage(fakeRun(0, writeLcov("")), dir()))
  expect(empty.code).toBe(1)
  expect(empty.errors).toContain("NG: lcov に計測結果がありません")
})

test("coverage below the floor names the weakest files", () => {
  const body = `${record("scripts/weak.ts", 100, 10)}${record("scripts/strong.ts", 10, 10)}`
  const run = captured(() => checkCoverage(fakeRun(0, writeLcov(body)), dir()))
  expect(run.code).toBe(1)
  expect(run.errors).toContain(
    `NG: 行カバレッジ 18.18% が下限 ${MIN_TOTAL_PERCENT}% を下回りました`,
  )
  expect(run.errors).toContain("scripts/weak.ts 10%")
})

test("every line covered passes, and a single missed line does not", () => {
  const full = `${record("scripts/a.ts", 10, 10)}${record("scripts/b.ts", 5, 5)}`
  const run = captured(() => checkCoverage(fakeRun(0, writeLcov(full)), dir()))
  expect(run.code).toBe(0)
  expect(run.logs).toContain(
    `OK: 行カバレッジ 100.00%（下限 ${MIN_TOTAL_PERCENT}%）・計測 2 ファイル`,
  )
  expect(run.logs).toContain("scripts/a.ts 100%")

  // 1 行でも取りこぼすと下限（100%）を割る
  const oneMissed = `${record("scripts/a.ts", 10, 10)}${record("scripts/b.ts", 5, 4)}`
  const failed = captured(() => checkCoverage(fakeRun(0, writeLcov(oneMissed)), dir()))
  expect(failed.code).toBe(1)
  expect(failed.errors).toContain(
    `NG: 行カバレッジ 93.33% が下限 ${MIN_TOTAL_PERCENT}% を下回りました`,
  )
  expect(failed.errors).toContain("scripts/b.ts 80%")
})

test("the default runner starts a child process and reports its exit status", () => {
  expect(runTests(process.execPath, ["-e", ""], { stdio: "inherit" }).status).toBe(0)
  expect(runTests(process.execPath, ["-e", "process.exit(3)"], { stdio: "inherit" }).status).toBe(3)
})
