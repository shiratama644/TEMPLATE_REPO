import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  checkFunctionLength,
  type LongFunction,
  MAX_LINES,
} from "../scripts/check-function-length.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function fixture(sources: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), "check-length-"))
  dirs.push(base)
  mkdirSync(join(base, "scripts"), { recursive: true })
  for (const [name, body] of Object.entries(sources))
    writeFileSync(join(base, "scripts", name), body)
  return base
}

test("a function longer than the limit is reported with its line count", () => {
  const long = `export function big() {\n${"  const a = 1\n".repeat(MAX_LINES + 5)}}\n`
  const base = fixture({ "long.ts": long, "short.ts": "export const small = () => 1\n" })
  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(message)
  try {
    expect(checkFunctionLength(base)).toBe(1)
  } finally {
    console.error = original
  }
  expect(errors.join("\n")).toContain("big")
  expect(errors.join("\n")).toContain(`${MAX_LINES + 7} 行`)
})

test("short functions and non-function files pass", () => {
  const base = fixture({
    "ok.ts": 'export const a = (x: number) => x + 1\nconst obj = { run() { return "x" } }\n',
    "data.json": '{"a":1}',
  })
  expect(checkFunctionLength(base)).toBe(0)
})

test("the repository scripts satisfy the limit", () => {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(checkFunctionLength()).toBe(0)
  } finally {
    console.log = original
  }
  expect(logs.join("\n")).toContain(`上限 ${MAX_LINES} 行`)
})

test("arrow functions and object methods are measured", async () => {
  const { functionLengths } = await import("../scripts/check-function-length.ts")
  const base = fixture({
    "arrow.ts":
      "const f = (x: number) =>\n  // 1\n  // 2\n  x\nconst o = {\n  m() {\n    return 1\n  },\n}\n",
  })
  const names = functionLengths(base).map((f: LongFunction) => f.name)
  expect(names).toContain("f")
  expect(names).toContain("m")
})
