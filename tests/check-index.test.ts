import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { checkIndex } from "../scripts/check-index.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function fixture() {
  const base = mkdtempSync(join(tmpdir(), "check-index-"))
  dirs.push(base)
  const write = (path: string, text = "# index\n") => {
    mkdirSync(dirname(join(base, path)), { recursive: true })
    writeFileSync(join(base, path), text)
  }
  return { base, write }
}

test("entry indexes must list every skill, rule and hook", () => {
  const { base, write } = fixture()
  write(".agent/skills/alpha/SKILL.md")
  write(".agent/skills/beta/SKILL.md")
  write(".agent/skills/index.md", "- [alpha](./alpha/SKILL.md)\n")
  write(".agent/rules/01_one.md")
  write(".agent/rules/common/two.md")
  write(".agent/rules/index.md", "- [one](./01_one.md)\n- [two](./common/two.md)\n")
  write(".agent/hooks/first.sh")
  write(".agent/hooks/index.md", "- [first](./first.sh)\n")
  expect(checkIndex(base)).toBe(1)
  write(".agent/skills/index.md", "- [alpha](./alpha/SKILL.md)\n- [beta](./beta/SKILL.md)\n")
  expect(checkIndex(base)).toBe(0)
})

test("a skill directory without SKILL.md and a missing index are reported", () => {
  const { base } = fixture()
  mkdirSync(join(base, ".agent/skills/empty"), { recursive: true })
  expect(checkIndex(base)).toBe(1)
})

test("the repository itself satisfies the entry-index gate", () => {
  expect(checkIndex()).toBe(0)
})
