import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { biomeJson } from "../scripts/setup-manifest.ts"
import { root } from "../scripts/walk.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

const biome = join(root, "node_modules/.bin/biome")

/** 生成物だけを Biome の設定で検査する（依存は install しないので本体の bin を直接使う）。 */
function generate(args: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "setup-format-"))
  dirs.push(dir)
  copyFileSync(join(root, "biome.json"), join(dir, "biome.json"))
  const setup = spawnSync(
    process.execPath,
    [join(root, "scripts/setup.ts"), "--dir", dir, "--yes", "--apply", "--no-install", ...args],
    { encoding: "utf8" },
  )
  expect(setup.status).toBe(0)
  return dir
}

function biomeErrors(dir: string): string[] {
  const run = spawnSync(biome, ["check", "--vcs-enabled=false", "."], {
    cwd: dir,
    encoding: "utf8",
  })
  const out = `${run.stdout}${run.stderr}`
  return out
    .split("\n")
    .filter((line) => line.includes("format ━") || line.includes("assist/source/organizeImports"))
}

// Biome のゲートは error だけで落ちる。生成した直後のプロジェクトが
// `biome check --write` を要求する状態だと、利用者が手で直すファイルが増える。
test("generated projects are Biome clean without a manual format pass", () => {
  if (!existsSync(biome)) return
  const cases: Array<[string, string[]]> = [
    ["vite-app (Web / TypeScript)", ["--preset", "vite-app", "--name", "fmt-vite"]],
    [
      "vite-app (Web / JavaScript)",
      ["--preset", "vite-app", "--language", "javascript", "--name", "fmt-vite-js"],
    ],
    ["next-app (Web / TypeScript)", ["--preset", "next-app", "--name", "fmt-next"]],
    ["monorepo (workspace)", ["--preset", "monorepo", "--name", "fmt-mono"]],
    ["library (publishable)", ["--preset", "library", "--name", "fmt-lib"]],
    ["full (every feature)", ["--preset", "full", "--name", "fmt-full"]],
    ["minimal", ["--preset", "minimal", "--name", "fmt-min"]],
  ]
  for (const [label, args] of cases) {
    const offenders = biomeErrors(generate(args))
    expect(offenders, `${label} needs a format pass: ${offenders.join(", ")}`).toEqual([])
  }
})

// 行幅に収まる値だけの配列は 1 行、収まらない配列とオブジェクトを含む配列は展開したままにする。
test("biomeJson matches the Biome JSON formatter", () => {
  expect(biomeJson({ extends: ["config:recommended"] })).toBe(
    '{\n  "extends": ["config:recommended"]\n}\n',
  )
  expect(biomeJson({ rules: [{ matchManagers: ["bun"], groupName: "Bun" }] })).toBe(
    [
      "{",
      '  "rules": [',
      "    {",
      '      "matchManagers": ["bun"],',
      '      "groupName": "Bun"',
      "    }",
      "  ]",
      "}",
      "",
    ].join("\n"),
  )
  const wide = biomeJson({ items: Array.from({ length: 12 }, (_, i) => `item-number-${i}`) }, 100)
  expect(wide).toContain('"item-number-0",\n')
  expect(biomeJson({ items: ["a", "b"] }, 10)).toContain('"items": [\n')
})
