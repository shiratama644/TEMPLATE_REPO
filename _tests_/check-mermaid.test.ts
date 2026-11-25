import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  blocks,
  checkBlock,
  checkMermaid,
  selfCheck,
  selfFixtures,
} from "../scripts/check-mermaid.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function fixture(docs: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), "check-mermaid-"))
  dirs.push(base)
  for (const [name, body] of Object.entries(docs)) {
    mkdirSync(join(base, name, ".."), { recursive: true })
    writeFileSync(join(base, name), body)
  }
  return base
}

test("checkBlock explains every way a diagram declaration can be wrong", () => {
  expect(checkBlock(["flowchart TD", "  A --> B"])).toEqual([])
  expect(checkBlock(["gitGraph", "  commit"])).toEqual([])
  expect(checkBlock([""])[0]).toContain("Mermaid ブロックが空です")
  expect(checkBlock(["  ", "\t"])[0]).toContain("空です")
  expect(checkBlock(["classDef ok fill:#fff", "  A --> B"])[0]).toContain(
    "1 行目が図の宣言ではありません",
  )
  expect(checkBlock(["  A --> B", "flowchart TD"])[0]).toContain(
    "図の宣言が先頭にありません（2 行目）",
  )
  expect(checkBlock(["flowchart TD", "sequenceDiagram"])[0]).toContain("図の宣言が 2 回あります")
  // 空行は数えないので、宣言が 2 行目でも先頭あつかいになる
  expect(checkBlock(["", "flowchart TD", "  A --> B"])).toEqual([])
})

test("blocks reports the start line and whether the fence was closed", () => {
  expect(blocks("# title\n\n```mermaid\nflowchart TD\n```\n")).toEqual([
    [3, ["flowchart TD"], true],
  ])
  // 閉じられていないブロックは、末尾の空行も本文に含まれる
  expect(blocks("```mermaid\nflowchart TD\n")).toEqual([[1, ["flowchart TD", ""], false]])
  // mermaid 以外のフェンスは数えない
  expect(blocks("```ts\nconst a = 1\n```\n")).toEqual([])
  expect(blocks("```mermaid   \nflowchart TD\n```  \n")).toEqual([[1, ["flowchart TD"], true]])
})

test("selfCheck passes with the real judge and names every mismatch of a broken judge", () => {
  expect(selfCheck()).toEqual([])
  const alwaysEmpty = selfCheck(() => [])
  expect(alwaysEmpty).toHaveLength(selfFixtures.filter(([, expected]) => expected > 0).length)
  expect(alwaysEmpty[0]).toContain("期待 1 件")
  const alwaysOne = selfCheck(() => ["問題"])
  expect(alwaysOne).toHaveLength(selfFixtures.filter(([, expected]) => expected === 0).length)
  expect(alwaysOne[0]).toContain("期待 0 件")
})

test("checkMermaid reports each issue with its file and line, and passes on a clean tree", () => {
  const bad = fixture({
    "docs/a.md": "# a\n\n```mermaid\n  A --> B\nflowchart TD\n```\n",
    "docs/b.md": "# b\n\n```mermaid\n```\n",
    "docs/c.md": "# c\n\n```mermaid\nflowchart TD\n  A --> B\n",
    "docs/not-markdown.txt": "```mermaid\nbroken\n",
  })
  const errors: string[] = []
  const originalError = console.error
  console.error = (message: string) => errors.push(message)
  try {
    expect(checkMermaid(bad)).toBe(1)
  } finally {
    console.error = originalError
  }
  const text = errors.join("\n")
  expect(text).toContain("docs/a.md:3: 図の宣言が先頭にありません（2 行目）")
  expect(text).toContain("docs/b.md:3: Mermaid ブロックが空です")
  expect(text).toContain("docs/c.md:3: Mermaid ブロックが閉じられていません")
  expect(text).toContain("NG: 3 件の不備（3 ファイル / 3 ブロック中）")

  const clean = fixture({ "docs/ok.md": "# ok\n\n```mermaid\nflowchart TD\n  A --> B\n```\n" })
  const logs: string[] = []
  const originalLog = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(checkMermaid(clean)).toBe(0)
  } finally {
    console.log = originalLog
  }
  expect(logs.join("\n")).toContain("OK: Mermaid 1 ブロック（1 ファイル）を検査")

  const broken = fixture({ "docs/x.md": "```mermaid\nflowchart TD\n```\n" })
  const selfErrors: string[] = []
  console.error = (message: string) => selfErrors.push(message)
  try {
    expect(checkMermaid(broken, () => ["常に失敗"])).toBe(1)
  } finally {
    console.error = originalError
  }
  expect(selfErrors.join("\n")).toContain("NG: Mermaid 自己検査に失敗")
  expect(selfErrors.join("\n")).toContain("期待 0 件")
})

test("the repository itself satisfies the Mermaid gate", () => {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(checkMermaid()).toBe(0)
  } finally {
    console.log = original
  }
  expect(logs.join("\n")).toContain("OK: Mermaid")
})
