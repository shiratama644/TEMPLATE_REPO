import { expect, test } from "bun:test"
import { type Gate, gates, runGates } from "../scripts/check.ts"
import { checkAgents, lintCli } from "../scripts/check-agents.ts"

function captured(run: () => number): { code: number; out: string; err: string } {
  const logs: string[] = []
  const errors: string[] = []
  const originalLog = console.log
  const originalError = console.error
  console.log = (message: string) => logs.push(String(message))
  console.error = (message: string) => errors.push(String(message))
  try {
    return { code: run(), out: logs.join("\n"), err: errors.join("\n") }
  } finally {
    console.log = originalLog
    console.error = originalError
  }
}

test("the gate list is the documented set of ten checks", () => {
  expect(gates.map(([name]) => name)).toEqual([
    "内部リンク",
    "Mermaid 宣言",
    "日本語・英語ゲート",
    "AGENTS.md",
    "入口整合",
    "POSIX sh",
    "関数長",
    "Biome",
    "型検査",
    "テストとカバレッジ",
  ])
  for (const [, run] of gates) expect(typeof run).toBe("function")
})

test("runGates reports every gate it ran and counts them in the success line", () => {
  const ran: string[] = []
  const gate = (name: string, code: number): Gate => [
    name,
    () => {
      ran.push(name)
      return code
    },
  ]
  const ok = captured(() => runGates([gate("一つ目", 0), gate("二つ目", 0)]))
  expect(ok.code).toBe(0)
  expect(ok.err).toBe("")
  // 実行した順に見出しを出し、最後に登録件数を報告する
  expect(ok.out).toBe("== 一つ目\n== 二つ目\nOK: 2 ゲートが通りました")
  expect(ran).toEqual(["一つ目", "二つ目"])

  // ゲートを渡さなければ 0 件で成功（空の一覧は失敗ではない）
  expect(captured(() => runGates([])).out).toBe("OK: 0 ゲートが通りました")
})

test("runGates stops at the first failing gate and names it on stderr", () => {
  const ran: string[] = []
  const gate = (name: string, code: number): Gate => [
    name,
    () => {
      ran.push(name)
      return code
    },
  ]
  const result = captured(() => runGates([gate("通る", 0), gate("落ちる", 2), gate("未実行", 0)]))
  expect(result.code).toBe(1)
  expect(result.err).toBe("NG: 落ちる")
  expect(ran).toEqual(["通る", "落ちる"])
  expect(result.out).not.toContain("未実行")
})

test("the instruction lint is started from the patched CLI with the repository as root", () => {
  const seen: string[][] = []
  expect(
    checkAgents((args) => {
      seen.push(args)
      return 0
    }),
  ).toBe(0)
  expect(seen).toEqual([["--root", ".", "AGENTS.md"]])
  // 検査が失敗したら 0 を装わない（ゲートの終了コードはそのまま返る）
  expect(checkAgents(() => 1)).toBe(1)
  expect(typeof lintCli).toBe("function")
})

test("this repository passes its own instruction lint", () => {
  expect(checkAgents()).toBe(0)
})
