import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brokenLinks, checkLinks } from "../scripts/check-doc-links.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function fixture(docs: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), "check-links-"))
  dirs.push(base)
  for (const [name, body] of Object.entries(docs)) {
    mkdirSync(join(base, name, ".."), { recursive: true })
    writeFileSync(join(base, name), body)
  }
  return base
}

test("a link whose percent escape is broken is reported instead of throwing", () => {
  const base = fixture({ "docs/page.md": "[bad](%E0%A4%A.md) [ok](./page.md)\n" })
  expect(brokenLinks(join(base, "docs/page.md"), base)).toEqual([[1, "%E0%A4%A.md"]])
})

test("links inside fenced code and inline code are not checked", () => {
  const base = fixture({
    "docs/page.md": [
      "# page",
      "",
      "```md",
      "[fenced](./missing.md)",
      "```",
      "",
      "`[inline](./missing.md)`",
      "",
      "[anchor](#section) [external](https://example.com/x.md) [mail](mailto:a@example.com)",
      "",
    ].join("\n"),
  })
  expect(brokenLinks(join(base, "docs/page.md"), base)).toEqual([])
})

test("checkLinks names every broken link and fails, and passes on a clean tree", () => {
  const bad = fixture({
    "docs/a.md": "[x](./missing.md)\n[y](../also-missing.md)\n",
    "docs/b.md": "[ok](./a.md)\n",
  })
  const errors: string[] = []
  const originalError = console.error
  console.error = (message: string) => errors.push(message)
  try {
    expect(checkLinks(bad)).toBe(1)
  } finally {
    console.error = originalError
  }
  const text = errors.join("\n")
  expect(text).toContain("docs/a.md:1: 切れたリンク -> ./missing.md")
  expect(text).toContain("docs/a.md:2: 切れたリンク -> ../also-missing.md")
  expect(text).toContain("NG: 2 件の切れたリンク（2 ファイル中）")

  const clean = fixture({ "docs/a.md": "[ok](./a.md)\n", "notes.txt": "[not markdown](./x.md)\n" })
  const logs: string[] = []
  const originalLog = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(checkLinks(clean)).toBe(0)
  } finally {
    console.log = originalLog
  }
  expect(logs.join("\n")).toContain("OK: 内部リンク 1 ファイルを検査")
})

test("the repository itself satisfies the link gate", () => {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(checkLinks()).toBe(0)
  } finally {
    console.log = original
  }
  expect(logs.join("\n")).toContain("切れたリンクはありません")
})
