import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve, sep } from "node:path"
import fc from "fast-check"
import { safe } from "../scripts/safe-path.ts"
import { nameSchema, validateChoices, validateConfig } from "../scripts/setup-schema.ts"

const root = resolve(tmpdir(), "setup-check-root")
const segment = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/)

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function dir(prefix: string) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(d)
  return d
}

test("safe() rejects the target itself and any write that goes through a symlink", () => {
  const base = dir("safe-base-")
  expect(() => safe(base, ".")).toThrow("対象外のパス")
  expect(() => safe(base, "./")).toThrow("対象外のパス")
  const outside = dir("safe-outside-")
  symlinkSync(outside, join(base, "link"), "dir")
  expect(() => safe(base, "link/generated.ts")).toThrow(
    "シンボリックリンク経由の書き込みはしません",
  )
  mkdirSync(join(base, "nested"), { recursive: true })
  expect(safe(base, "nested/generated.ts")).toBe(join(base, "nested/generated.ts"))
})

test("generated paths stay inside the target or reject traversal and Git metadata", () => {
  fc.assert(
    fc.property(fc.array(segment, { minLength: 1, maxLength: 5 }), (segments) => {
      const path = segments.join("/")
      expect(relative(root, safe(root, path))).toBe(segments.join(sep))
    }),
    { seed: 644, numRuns: 100 },
  )
  fc.assert(
    fc.property(
      fc.array(segment, { maxLength: 3 }),
      fc.constantFrom("..", ".git"),
      fc.constantFrom("/", "\\"),
      (prefix, blocked, separator) => {
        expect(() => safe(root, [...prefix, blocked, "file"].join(separator))).toThrow()
      },
    ),
    { seed: 644, numRuns: 100 },
  )
})

test("Zod choices reject invalid names, unknown fields and mismatched templates", () => {
  fc.assert(
    fc.property(fc.string(), (name) => {
      expect(nameSchema.safeParse(name).success).toBe(
        name.length <= 64 && /^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*$/.test(name),
      )
    }),
    { seed: 644, numRuns: 150 },
  )
  expect(() => validateChoices({ language: "go", template: "next" })).toThrow("対応しません")
  expect(() => validateChoices({ featues: ["vitest"] })).toThrow("featues")
  expect(() => validateChoices({ features: "vitest" })).toThrow("機能")
})

test("validateConfig accepts a full configuration and names each invalid key", () => {
  expect(() =>
    validateConfig({
      preset: "vite-app",
      name: "my-app",
      description: "説明",
      features: ["docker"],
      init: { owner: "octocat", licenseYear: "2026", sections: ["git"] },
      cleanup: ["tests", "gates"],
    }),
  ).not.toThrow()
  // 何も削除しない選択も正しい指定
  expect(() => validateConfig({ cleanup: [] })).not.toThrow()
  expect(() => validateChoices({ name: "Bad Name" })).toThrow(
    "プロジェクト名は英小文字で始まる kebab-case（最大 64 文字）にしてください",
  )
  expect(() => validateChoices({ description: 42 })).toThrow("説明は文字列で指定してください")
  expect(() => validateConfig({ init: { licenseYear: "26" } })).toThrow("init の指定が不正です")
  expect(() => validateConfig({ cleanup: ["agents"] })).toThrow(
    'cleanup は削除候補の id の配列で指定してください: ["agents"]（指定できる id: template-tools, tests, gates, repo-ops, ci, workspace。空配列 [] は何も削除しない）',
  )
  // CLI の --cleanup と違い、設定ファイルは none / all の文字列を受け付けない
  expect(() => validateConfig({ cleanup: "all" })).toThrow(
    'cleanup は削除候補の id の配列で指定してください: "all"',
  )
  // どの鍵にも当てはまらない不正（オブジェクトですらない）は一般のメッセージになる
  expect(() => validateConfig("not-an-object")).toThrow("設定ファイルが不正です")
  expect(() => validateConfig(null)).toThrow("設定ファイルが不正です")
})
