/**
 * 初期化の「選択的削除」（scripts/init-cleanup.ts）のテスト。
 * 実リポジトリの import 関係を縮めた偽物の上で、計画・適用・文書の追随を確かめる。
 */
import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
  renderAgentsSection,
  renderCommandsSection,
  renderProjectOverview,
  renderProjectTemplateRule,
} from "../scripts/init-agents.ts"
import { renderArchitecture, renderTree, treeRows } from "../scripts/init-arch.ts"
import {
  applyCleanup,
  type CleanupEdit,
  type CleanupGroup,
  type CleanupId,
  cleanupChoices,
  cleanupGroups,
  cleanupIds,
  defaultCleanupIds,
  editFor,
  editPlan,
  gone,
  importsOf,
  isDeleted,
  noCleanup,
  packageScriptsOf,
  parseCleanupIds,
  planCleanup,
  protectImported,
  pruneMakefile,
  referencesDependency,
  removeGateLines,
  removeImportLines,
  removePackageEntries,
  removeSteps,
  sourceFiles,
  unusedDependencies,
  withoutCleanup,
} from "../scripts/init-cleanup.ts"
import { detect, type InitAnswers } from "../scripts/init-detect.ts"
import {
  canonicalVerification,
  gettingStarted,
  renderReadme,
  verificationNote,
} from "../scripts/init-docs.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

const packageJson = `{
  "name": "demo",
  "packageManager": "bun@1.4.5",
  "scripts": {
    "check": "bun scripts/check.ts",
    "test": "bun test",
    "coverage": "bun scripts/check-coverage.ts",
    "knip": "knip",
    "setup": "bun scripts/setup.ts",
    "init": "bun scripts/setup.ts --init-only",
    "verify:generated": "bun scripts/verify-generated.ts",
    "github:settings": "bun scripts/github-settings.ts",
    "postinstall": "bun scripts/install-hooks.ts",
    "typecheck": "tsc --noEmit",
    "format": "biome check --write .",
    "build": "bun run typecheck"
  },
  "dependencies": {
    "@clack/prompts": "1.9.0",
    "iconv-lite": "0.6.3",
    "zod": "4.0.0"
  },
  "devDependencies": {
    "@octokit/rest": "22.0.0",
    "agents-md-lint": "1.0.0",
    "conventional-commits-parser": "6.0.0",
    "fast-check": "4.0.0",
    "knip": "5.0.0",
    "simple-git": "3.0.0",
    "typescript": "5.0.0"
  }
}
`

/**
 * 偽物のテストが書く相対 import。このテストファイル自身の import と誤認されると、
 * 実リポジトリで計画したときに無い保護が生まれるので、展開してから書き込む。
 */
const rel = (path: string): string => `../${path}`

/** 実リポジトリと同じ import 関係を持つ小さなリポジトリ。 */
const sources: Record<string, string> = {
  "scripts/check.ts": [
    'import { checkAgents } from "./check-agents.ts"',
    'import { checkCoverage } from "./check-coverage.ts"',
    'import { checkLinks } from "./check-doc-links.ts"',
    "",
    "export const gates: Array<[string, () => unknown]> = [",
    '  ["内部リンク", () => [checkAgents, checkLinks]],',
    '  ["テストとカバレッジ", () => checkCoverage()],',
    "]",
    "",
  ].join("\n"),
  "scripts/check-agents.ts":
    'import { lint } from "agents-md-lint"\nimport { files } from "./walk.ts"\n\nexport const checkAgents = () => [lint, files]\n',
  "scripts/check-coverage.ts":
    'import { root } from "./walk.ts"\n\nexport const checkCoverage = () => root\n',
  "scripts/check-doc-links.ts":
    'import { files } from "./walk.ts"\n\nexport const checkLinks = () => files\n',
  "scripts/check-language.ts":
    'import iconv from "iconv-lite"\n\nexport const checkLanguage = () => iconv\n',
  "scripts/conventional-commit.ts":
    'import { parse } from "conventional-commits-parser"\nimport { checkLanguage } from "./check-language.ts"\n\nexport const parseCommit = () => [parse, checkLanguage]\n',
  "scripts/walk.ts":
    'export const files = (dir: string): string[] => [dir]\nexport const root = "."\n',
  "scripts/safe-path.ts":
    'export const safe = (dir: string, path: string): string => [dir, path].join("/")\n',
  "scripts/github-settings.ts":
    'import { Octokit } from "@octokit/rest"\nimport { files } from "./walk.ts"\n\nexport const applySettings = () => [Octokit, files]\n',
  "scripts/git-report.ts":
    'import { simpleGit } from "simple-git"\nimport { parseCommit } from "./conventional-commit.ts"\n\nexport const report = () => [simpleGit, parseCommit]\n',
  "scripts/install-hooks.ts":
    'import { files } from "./walk.ts"\n\nexport const installHooks = () => files\n',
  "scripts/setup.ts":
    'import prompts from "@clack/prompts"\nimport { safe } from "./safe-path.ts"\nimport { configSchema } from "./setup-schema.ts"\n\nexport const setupEntry = () => [prompts, safe, configSchema]\n',
  "scripts/setup-init.ts":
    'import { planCleanup } from "./init-cleanup.ts"\nimport { safe } from "./safe-path.ts"\n\nexport const initPhase = () => [planCleanup, safe]\n',
  "scripts/setup-schema.ts":
    'import { z } from "zod"\nimport { safe } from "./safe-path.ts"\n\nexport const configSchema = () => [z, safe]\n',
  "scripts/init-cleanup.ts":
    'import { safe } from "./safe-path.ts"\nimport { files } from "./walk.ts"\n\nexport const planCleanup = () => [safe, files]\n',
  "scripts/init-detect.ts":
    'import { safe } from "./safe-path.ts"\n\nexport const detect = () => safe\n',
  "scripts/verify-generated.ts":
    'import { safe } from "./safe-path.ts"\n\nexport const verify = () => safe\n',
  "_tests_/check-gates.test.ts": `import ts from "typescript"\nimport { gates } from "${rel("scripts/check.ts")}"\n\nexport const t = () => [ts, gates]\n`,
  "_tests_/knip.test.ts":
    'import { property } from "fast-check"\nimport { knip } from "knip"\n\nexport const t = () => [property, knip]\n',
  "_tests_/setup.test.ts": `import { safe } from "${rel("scripts/safe-path.ts")}"\nimport { setupEntry } from "${rel("scripts/setup.ts")}"\n\nexport const t = () => [safe, setupEntry]\n`,
  "knip.jsonc":
    '{\n  "$schema": "https://unpkg.com/knip@5/schema.json",\n  "entry": ["scripts/*.ts"]\n}\n',
  ".github/workflows/ci.yml": [
    "name: CI",
    "on:",
    "  push:",
    "jobs:",
    "  check:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - name: Require native build toolchains (no skipped Go/Rust tests)",
    "        run: bun run verify:generated --build",
    "      - run: bun run check",
    "        env:",
    '          CI_REQUIRE_NATIVE: "1"',
    "      - run: bun run knip",
    "  secrets:",
    "    steps:",
    "      - name: gitleaks",
    "        run: gitleaks detect",
    "",
  ].join("\n"),
  Makefile: [
    ".DEFAULT_GOAL := help",
    ".PHONY: help check test coverage setup github-settings",
    "BUN ?= bun",
    "",
    "help:",
    '\t@echo "targets"',
    "",
    "check:",
    "\t$(BUN) run check",
    "",
    "test:",
    "\t$(BUN) test",
    "",
    "coverage:",
    "\t$(BUN) run coverage",
    "",
    "setup:",
    "\t$(BUN) run setup",
    "",
    "github-settings:",
    "\t$(BUN) run github:settings",
    "",
  ].join("\n"),
  "AGENTS.md": "# 作業規約\n\n## 6. プロジェクト固有\n\n（未記入）\n",
  "README.md": "# demo\n\nテンプレートの説明。\n",
  LICENSE: "MIT License\n\nCopyright (c) 2026 Shiratama\n",
  "docs/README.md": "# 文書の目次\n",
  "docs/task-list.md": "# タスクリスト\n\nなし。\n",
  "docs/arch/architecture.md": "# アーキテクチャ\n",
  "docs/ops/index.md": "# 運用\n\n`bun run check` が正本。\n",
  "docs/ops/GITHUB_SETTINGS.md": "# GitHub 側の設定\n",
  ".github/SECURITY.md": "# Security Policy / セキュリティポリシー\n",
  ".agent/commands/test.md": "# /test\n\n`bun run test` を実行する。\n",
  ".agent/agents/test-writer.md": "# test-writer\n",
  ".agent/rules/04_verification.md": "# 検証\n",
  ".githooks/pre-commit": "#!/bin/sh\nbun run check\n",
  ".tmp/coverage/lcov.info": "TN:\nend_of_record\n",
  ".setup-backup/package.json": "{}\n",
}

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "init-cleanup-"))
  dirs.push(dir)
  writeFileSync(join(dir, "package.json"), packageJson)
  for (const [path, text] of Object.entries(sources)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return dir
}

const group = (id: CleanupId): CleanupGroup[] => cleanupGroups.filter((g) => g.id === id)
const read = (dir: string, path: string): string => readFileSync(join(dir, path), "utf8")

const answers: InitAnswers = {
  name: "Demo App",
  slug: "demo-app",
  description: "社内問い合わせを自動化する",
  owner: "octocat",
  repo: "demo-app",
  licenseHolder: "Octocat",
  licenseYear: "2026",
  purpose: "対応時間を半分にする",
  audience: "社内のサポート担当",
  nonGoals: "",
  firstTask: "",
  sections: ["git"],
  sectionText: {
    sandbox: "",
    git: "main への直接 push は禁止",
    impl: "",
    style: "",
    output: "",
  },
}

test("parseCleanupIds reads none, all and a list, and rejects unknown ids", () => {
  expect(parseCleanupIds("none")).toEqual([])
  expect(parseCleanupIds("all")).toEqual(cleanupIds)
  expect(parseCleanupIds(" tests , gates ,tests ")).toEqual(["tests", "gates"])
  expect(parseCleanupIds("")).toEqual([])
  expect(() => parseCleanupIds("agents")).toThrow("不明な削除候補: agents")
  expect(() => parseCleanupIds("tests,agent")).toThrow("template-tools, tests, gates")
  expect(defaultCleanupIds()).toEqual(["template-tools", "tests", "workspace"])
})

test("no cleanup group touches the Agent assets or the AGENTS.md gate", () => {
  const paths = cleanupGroups.flatMap((g) => g.paths)
  expect(paths.some((p) => p === "AGENTS.md" || p === "CLAUDE.md")).toBe(false)
  expect(paths.some((p) => p.startsWith(".agent") || p.startsWith(".claude"))).toBe(false)
  expect(paths).not.toContain("scripts/check-agents.ts")
  expect(paths).not.toContain("patches")
  expect(cleanupGroups.flatMap((g) => g.packageScripts)).not.toContain("agents")
  expect(cleanupGroups.flatMap((g) => g.dependencies)).not.toContain("agents-md-lint")
  // 手の届かない物は候補にしない（選ぶ側が誤解する）
  expect(cleanupIds).toEqual(cleanupGroups.map((g) => g.id))
})

test("cleanupChoices offers only groups that have something to delete here", () => {
  const empty = mkdtempSync(join(tmpdir(), "init-cleanup-empty-"))
  dirs.push(empty)
  expect(cleanupChoices(empty)).toEqual([])

  const dir = fixture()
  expect(cleanupChoices(dir).map((g) => g.id)).toEqual(cleanupIds)
  rmSync(join(dir, "_tests_"), { recursive: true, force: true })
  rmSync(join(dir, "knip.jsonc"))
  rmSync(join(dir, "scripts/check-coverage.ts"))
  expect(cleanupChoices(dir).map((g) => g.id)).toEqual(cleanupIds.filter((id) => id !== "tests"))
})

test("isDeleted covers a directory and everything under it", () => {
  expect(isDeleted("_tests_", ["_tests_"])).toBe(true)
  expect(isDeleted("_tests_/setup.test.ts", ["_tests_"])).toBe(true)
  expect(isDeleted("_tests_x/a.test.ts", ["_tests_"])).toBe(false)
  expect(isDeleted("scripts/check.ts", ["_tests_"])).toBe(false)
  expect(isDeleted("scripts/check.ts", [])).toBe(false)
})

test("sourceFiles lists the TypeScript under scripts/ and _tests_/ only", () => {
  const dir = fixture()
  const files = sourceFiles(dir)
  expect(files).toContain("scripts/check.ts")
  expect(files).toContain("_tests_/knip.test.ts")
  expect(files.every((f) => f.endsWith(".ts"))).toBe(true)
  expect(files).toEqual([...files].sort())
  expect(sourceFiles(join(dir, "docs"))).toEqual([])
  expect(
    importsOf(
      'import { a } from "./x.ts"\nawait import("./y.ts")\nimport fs from "node:fs"\nimport { z } from "zod"\n',
    ),
  ).toEqual(["./x.ts", "./y.ts"])
})

test("referencesDependency counts imports, not prose", () => {
  expect(referencesDependency('import { z } from "zod"', "zod")).toBe(true)
  expect(referencesDependency('const p = await import("knip/config")', "knip")).toBe(true)
  expect(referencesDependency('const m = require("iconv-lite")', "iconv-lite")).toBe(true)
  expect(referencesDependency("see node_modules/knip/README.md", "knip")).toBe(true)
  expect(referencesDependency("`bun run knip` finds unused code", "knip")).toBe(false)
  expect(referencesDependency('import { z } from "zod-like"', "zod")).toBe(false)
  expect(referencesDependency('import { a } from "@scope/zod"', "zod")).toBe(false)
})

test("unusedDependencies drops a dependency only when every user is deleted", () => {
  const dir = fixture()
  expect(unusedDependencies(dir, [], [])).toEqual([])
  // knip は `bun run knip` が残る限り消せない（typescript も `tsc --noEmit` が残る）
  expect(unusedDependencies(dir, ["_tests_"], [])).toEqual(["fast-check"])
  expect(unusedDependencies(dir, ["_tests_"], ["knip"])).toEqual(["fast-check"])
  expect(unusedDependencies(dir, ["_tests_"], ["knip"], ["knip"])).toEqual(["fast-check", "knip"])
  // 残る package.json のスクリプトが叩く依存（typescript → tsc）は消さない
  expect(unusedDependencies(dir, ["_tests_"], [], ["typecheck"])).toEqual([
    "fast-check",
    "typescript",
  ])
  // 誰も import していない依存（bin として叩く物）は勝手に消さない
  expect(unusedDependencies(dir, ["scripts"], [])).toEqual([
    "@clack/prompts",
    "@octokit/rest",
    "agents-md-lint",
    "conventional-commits-parser",
    "iconv-lite",
    "simple-git",
    "zod",
  ])
  // 名前で指定した物は、package.json に実在し、残るスクリプトが使わないときだけ除く
  expect(unusedDependencies(dir, [], ["typescript", "not-in-package"])).toEqual([])
  expect(unusedDependencies(dir, [], ["typescript"], ["typecheck"])).toEqual(["typescript"])
  expect(unusedDependencies(join(dir, "docs"), [], ["knip"])).toEqual([])
})

test("protectImported keeps what the surviving scripts import, transitively", () => {
  const dir = fixture()
  const candidates = [
    "scripts/walk.ts",
    "scripts/conventional-commit.ts",
    "scripts/check-language.ts",
  ]
  const kept = protectImported(dir, candidates, [])
  expect(kept.deletable).toEqual([])
  expect(kept.protectedPaths).toEqual([
    "scripts/check-language.ts",
    "scripts/conventional-commit.ts",
    "scripts/walk.ts",
  ])
  // 削除すると宣言した import は保護の理由にならない
  const released = protectImported(dir, ["scripts/walk.ts"], ["./walk.ts"])
  expect(released.deletable).toEqual(["scripts/walk.ts"])
  expect(released.protectedPaths).toEqual([])
})

test("protectImported ignores the wishes of files inside deleted directories", () => {
  const dir = fixture()
  const machinery = group("template-tools")
    .flatMap((g) => g.paths)
    .filter((path) => !path.startsWith("_tests_/"))
  // _tests_ も消すときは、テストが import していても本体を消せる
  const withTests = protectImported(dir, [...machinery, "_tests_"], [])
  expect(withTests.protectedPaths).toEqual([])
  expect(withTests.deletable).toContain("scripts/safe-path.ts")
  // _tests_ を残すときは、テストが import する本体を守る
  const keepTests = protectImported(dir, machinery, [])
  expect(keepTests.protectedPaths).toContain("scripts/setup.ts")
  expect(keepTests.protectedPaths).toContain("scripts/safe-path.ts")
  expect(keepTests.deletable).not.toContain("scripts/setup.ts")
})

test("packageScriptsOf only lists scripts that package.json really has", () => {
  const dir = fixture()
  const groups = [...group("template-tools"), ...group("tests")]
  expect(packageScriptsOf(dir, groups)).toEqual([
    "coverage",
    "init",
    "knip",
    "setup",
    "test",
    "verify:generated",
  ])
  expect(packageScriptsOf(dir, group("ci"))).toEqual([])
  expect(packageScriptsOf(join(dir, "docs"), groups)).toEqual([])
})

test("planCleanup with no ids changes nothing", () => {
  const dir = fixture()
  expect(planCleanup(dir, [], true)).toEqual({ ...noCleanup, ids: [] })
  expect(planCleanup(dir, [], false)).toEqual({ ...noCleanup, ids: [] })
})

test("planCleanup plans the default cleanup from what is really there", () => {
  const dir = fixture()
  const plan = planCleanup(dir, defaultCleanupIds(), true)
  expect(plan.ids).toEqual(["template-tools", "tests", "workspace"])
  expect(plan.blocked).toEqual([])
  expect(plan.protectedPaths).toEqual([])
  expect(plan.paths).toContain("scripts/setup.ts")
  expect(plan.paths).toContain("scripts/safe-path.ts")
  expect(plan.paths).toContain("_tests_")
  expect(plan.paths).toContain("knip.jsonc")
  expect(plan.paths).toContain(".tmp")
  expect(plan.paths).toContain(".setup-backup")
  // 検証ゲートと Agent の資産は既定では消えない
  expect(plan.paths.filter((p) => p.startsWith("scripts/check"))).toEqual([
    "scripts/check-coverage.ts",
  ])
  expect(plan.paths.some((p) => p.startsWith(".agent") || p === "AGENTS.md")).toBe(false)
  expect(plan.packageScripts).toEqual([
    "coverage",
    "init",
    "knip",
    "setup",
    "test",
    "verify:generated",
  ])
  expect(plan.dependencies).toEqual(["@clack/prompts", "fast-check", "knip", "zod"])
  expect(plan.edits.map((e) => e.path)).toEqual(["scripts/check.ts", ".github/workflows/ci.yml"])
  expect(plan.editPaths).toEqual([
    ".github/workflows/ci.yml",
    "Makefile",
    "package.json",
    "scripts/check.ts",
  ])
  expect(plan.review).toEqual([
    ".agent/agents/test-writer.md",
    ".agent/commands/test.md",
    "AGENTS.md",
    "docs/ops/index.md",
  ])
  expect(plan.notes).toEqual([
    "package.json から依存を除きました: @clack/prompts, fast-check, knip, zod（bun install で bun.lock を更新してください）",
  ])
})

test("planCleanup keeps whatever the surviving scripts still import", () => {
  const dir = fixture()
  const plan = planCleanup(dir, ["gates"], true)
  expect(plan.protectedPaths).toEqual([
    "scripts/check-language.ts",
    "scripts/conventional-commit.ts",
    "scripts/walk.ts",
  ])
  expect(plan.notes).toContain(
    "残すスクリプトが import するため削除しません: scripts/check-language.ts, scripts/conventional-commit.ts, scripts/walk.ts",
  )
  expect(plan.paths).toContain(".githooks")
  expect(plan.paths).toContain("Makefile")
  expect(plan.paths).toContain("scripts/check.ts")
  expect(plan.paths).not.toContain("scripts/walk.ts")
  // AGENTS.md のゲートは Agent の資産なので削除候補に入らない
  expect(plan.paths).not.toContain("scripts/check-agents.ts")
  expect(plan.packageScripts).toEqual(["check", "postinstall"])
  // ゲートのテスト（_tests_/knip.test.ts）が消えるので、そこだけが使う依存も消える。
  // knip は `bun run knip` が残る（gates は消さない）ので依存も残す
  expect(plan.dependencies).toEqual(["fast-check"])
  // Makefile 自体が消えるので、書き換えの対象にはならない
  expect(plan.editPaths).toEqual([".github/workflows/ci.yml", "package.json"])
})

test("planCleanup refuses to delete what Git cannot restore", () => {
  const dir = fixture()
  const plan = planCleanup(dir, defaultCleanupIds(), false)
  expect(plan.paths).toEqual([".tmp", ".setup-backup"])
  expect(plan.blocked).toContain("scripts/setup.ts")
  expect(plan.blocked).toContain("_tests_")
  expect(plan.notes).toEqual([
    "Git 管理外のため削除しません（復元できません）。git init してから実行してください",
  ])
  // 消せなかった物に合わせて設定だけ書き換えることはしない
  expect(plan.edits).toEqual([])
  expect(plan.editPaths).toEqual([])
  expect(plan.packageScripts).toEqual([])
  expect(plan.dependencies).toEqual([])
  expect(plan.review).toEqual([])

  expect(applyCleanup(dir, plan)).toEqual({ deleted: 2, edited: [] })
  expect(existsSync(join(dir, ".tmp"))).toBe(false)
  expect(existsSync(join(dir, ".setup-backup"))).toBe(false)
  expect(existsSync(join(dir, "scripts/setup.ts"))).toBe(true)
  expect(read(dir, "package.json")).toContain('"knip"')
  expect(read(dir, "Makefile")).toContain("$(BUN) test")
  expect(read(dir, "scripts/check.ts")).toContain("テストとカバレッジ")
})

test("applyCleanup deletes the plan and rewrites the files that stay", () => {
  const dir = fixture()
  const plan = planCleanup(dir, defaultCleanupIds(), true)
  const result = applyCleanup(dir, plan)
  expect(result.deleted).toBe(plan.paths.length)
  expect(result.edited).toEqual([
    ".github/workflows/ci.yml",
    "Makefile",
    "package.json",
    "scripts/check.ts",
  ])
  expect(existsSync(join(dir, "scripts/setup.ts"))).toBe(false)
  expect(existsSync(join(dir, "_tests_"))).toBe(false)
  expect(existsSync(join(dir, "scripts/safe-path.ts"))).toBe(false)
  // 残すと決めた物は残る
  expect(existsSync(join(dir, "scripts/check.ts"))).toBe(true)
  expect(existsSync(join(dir, "AGENTS.md"))).toBe(true)
  expect(existsSync(join(dir, ".agent/commands/test.md"))).toBe(true)
  expect(existsSync(join(dir, "patches"))).toBe(false)

  const check = read(dir, "scripts/check.ts")
  expect(check).not.toContain("check-coverage")
  expect(check).not.toContain("テストとカバレッジ")
  expect(check).toContain('["内部リンク", () => [checkAgents, checkLinks]]')
  expect(check).toContain("export const gates")

  const pkg = JSON.parse(read(dir, "package.json")) as {
    scripts: Record<string, string>
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
  }
  expect(Object.keys(pkg.scripts)).toEqual([
    "check",
    "github:settings",
    "postinstall",
    "typecheck",
    "format",
    "build",
  ])
  expect(pkg.dependencies).toEqual({ "iconv-lite": "0.6.3" })
  expect(pkg.devDependencies).toEqual({
    "@octokit/rest": "22.0.0",
    "agents-md-lint": "1.0.0",
    "conventional-commits-parser": "6.0.0",
    "simple-git": "3.0.0",
    typescript: "5.0.0",
  })

  const ci = read(dir, ".github/workflows/ci.yml")
  expect(ci).not.toContain("bun run knip")
  expect(ci).not.toContain("Require native build toolchains")
  expect(ci).toContain("bun run check")
  expect(ci).toContain("CI_REQUIRE_NATIVE")
  expect(ci).toContain("- name: gitleaks")

  const makefile = read(dir, "Makefile")
  expect(makefile).toContain(".PHONY: help check github-settings")
  expect(makefile).not.toContain("$(BUN) test")
  expect(makefile).not.toContain("$(BUN) run coverage")
  expect(makefile).toContain("$(BUN) run github:settings")

  // 二度目は「変わった物なし」。計画は常に実物から作る
  expect(editPlan(dir, plan)).toEqual([])
  expect(applyCleanup(dir, plan).edited).toEqual([])
})

test("editFor returns null when a file is missing or already clean", () => {
  const dir = fixture()
  const missing: CleanupEdit = { path: "docs/nope.md", removeImports: ["./x.ts"] }
  expect(editFor(dir, missing)).toBeNull()
  expect(editFor(dir, { path: "scripts/walk.ts", removeImports: ["./nothing.ts"] })).toBeNull()
  expect(editFor(dir, { path: "scripts/check.ts", removeGates: ["無いゲート"] })).toBeNull()
  const edited = editFor(dir, {
    path: "scripts/check.ts",
    removeImports: ["./check-coverage.ts"],
    removeGates: ["テストとカバレッジ"],
  })
  expect(edited).not.toBeNull()
  expect(edited ?? "").not.toContain("check-coverage")
  expect(edited ?? "").toContain("checkAgents")
})

test("removeImportLines drops whole statements and never eats the rest", () => {
  const text = [
    'import { a } from "./keep.ts"',
    'import { b } from "./drop.ts"',
    "import {",
    "  c,",
    '} from "./drop.ts"',
    "import {",
    "  d,",
    '} from "./also-keep.ts"',
    'import "./side-effect.ts"',
    "",
    "export const x = [a, b, c, d]",
    "",
  ].join("\n")
  expect(removeImportLines(text, ["./drop.ts", "./side-effect.ts"])).toBe(
    [
      'import { a } from "./keep.ts"',
      "import {",
      "  d,",
      '} from "./also-keep.ts"',
      "",
      "export const x = [a, b, c, d]",
      "",
    ].join("\n"),
  )
  expect(removeImportLines(text, [])).toBe(text)
  // 閉じない import は捨てない（ファイルを壊さない）
  expect(removeImportLines("import {\n  a,\n", ["./x.ts"])).toBe("import {\n  a,\n")
})

test("removeGateLines drops one-line and Biome-wrapped gate entries", () => {
  const text = [
    "export const gates: Gate[] = [",
    '  ["内部リンク", checkLinks],',
    '  ["Biome", () => spawnSync("bun", ["x", "biome"], { stdio: "inherit" }).status ?? 1],',
    "  [",
    '    "テストとカバレッジ",',
    "    () =>",
    '      spawnSync("bun", ["run", "coverage"], {',
    '        stdio: "inherit",',
    "      }).status ?? 1,",
    "  ],",
    '  ["型検査", typecheck],',
    "]",
    "",
  ].join("\n")
  expect(removeGateLines(text, ["テストとカバレッジ"])).toBe(
    [
      "export const gates: Gate[] = [",
      '  ["内部リンク", checkLinks],',
      '  ["Biome", () => spawnSync("bun", ["x", "biome"], { stdio: "inherit" }).status ?? 1],',
      '  ["型検査", typecheck],',
      "]",
      "",
    ].join("\n"),
  )
  expect(removeGateLines(text, [])).toBe(text)
  expect(removeGateLines(text, ["無いゲート"])).toBe(text)
  // 名前が無い項目と、閉じない項目は残す
  expect(removeGateLines("const a = [\n  [1, 2],\n]", ["x"])).toBe("const a = [\n  [1, 2],\n]")
  expect(removeGateLines('const a = [\n  ["x",\n', ["x"])).toBe('const a = [\n  ["x",\n')
})

test("removeSteps drops a workflow step by name or by run, block and all", () => {
  const dir = fixture()
  const ci = read(dir, ".github/workflows/ci.yml")
  const withoutKnip = removeSteps(ci, [{ run: "bun run knip" }])
  expect(withoutKnip).not.toContain("bun run knip")
  expect(withoutKnip).toContain("bun run check")
  expect(withoutKnip).toContain("CI_REQUIRE_NATIVE")
  expect(withoutKnip).toContain("- name: gitleaks")
  const withoutNative = removeSteps(ci, [
    { name: "Require native build toolchains (no skipped Go/Rust tests)" },
  ])
  expect(withoutNative).not.toContain("verify:generated --build")
  expect(withoutNative).toContain("actions/checkout@v4")
  expect(withoutNative).toContain("bun run knip")
  expect(removeSteps(ci, [])).toBe(ci)
  expect(removeSteps(ci, [{ name: "無い step" }, { run: "無いコマンド" }])).toBe(ci)
  // 末尾の step を消しても改行は残る
  expect(removeSteps("steps:\n  - run: bun run knip\n", [{ run: "bun run knip" }])).toBe("steps:\n")
})

test("removePackageEntries keeps the JSON shape and the trailing newline", () => {
  const dir = fixture()
  const text = read(dir, "package.json")
  const next = removePackageEntries(text, ["test", "無いキー"], ["knip", "無い依存"])
  expect(next.endsWith("\n")).toBe(true)
  expect(next).toBe(`${JSON.stringify(JSON.parse(next) as unknown, null, 2)}\n`)
  const pkg = JSON.parse(next) as {
    scripts: Record<string, string | undefined>
    devDependencies: Record<string, string | undefined>
  }
  expect(pkg.scripts.test).toBeUndefined()
  expect(pkg.scripts.check).toBe("bun scripts/check.ts")
  expect(pkg.devDependencies.knip).toBeUndefined()
  expect(pkg.devDependencies.typescript).toBe("5.0.0")
  expect(removePackageEntries(text, [], [])).toBe(text)
})

test("pruneMakefile removes the targets whose command disappeared", () => {
  const dir = fixture()
  const next = pruneMakefile(read(dir, "Makefile"), ["coverage", "knip", "setup", "test"])
  expect(next).toBe(
    [
      ".DEFAULT_GOAL := help",
      ".PHONY: help check github-settings",
      "BUN ?= bun",
      "",
      "help:",
      '\t@echo "targets"',
      "",
      "check:",
      "\t$(BUN) run check",
      "",
      "github-settings:",
      "\t$(BUN) run github:settings",
      "",
    ].join("\n"),
  )
  expect(pruneMakefile(read(dir, "Makefile"), [])).toBe(read(dir, "Makefile"))
  // ターゲットが無い Makefile は .PHONY を落とすだけ（壊れた行を挿入しない）
  expect(pruneMakefile(".PHONY: all\nBUN ?= bun\n", ["test"])).toBe("BUN ?= bun\n")
  expect(pruneMakefile("BUN ?= bun\n", ["test"])).toBe("BUN ?= bun\n")
  // .PHONY が無い Makefile には、最初のターゲットの前に書き足す
  expect(
    pruneMakefile("BUN ?= bun\n\ntest:\n\t$(BUN) test\n\ncheck:\n\t$(BUN) run check\n", ["test"]),
  ).toBe("BUN ?= bun\n\n.PHONY: check\n\ncheck:\n\t$(BUN) run check\n")
})

test("gone answers for deleted paths and for paths that never existed", () => {
  const dir = fixture()
  const d = detect(dir)
  expect(gone(d, "scripts/setup.ts")).toBe(false)
  expect(gone(d, "docs/arch/architecture.md")).toBe(false)
  expect(gone(d, "docs/arch/missing.md")).toBe(true)
  expect(gone({ ...d, deleted: ["scripts"] }, "scripts/setup.ts")).toBe(true)
  expect(gone({ ...d, deleted: [] }, "scripts/setup.ts")).toBe(false)
})

test("withoutCleanup shows the documents the world after the cleanup", () => {
  const dir = fixture()
  const d = detect(dir)
  expect(d.gates).toEqual(["内部リンク", "テストとカバレッジ"])
  expect(d.workflows).toEqual(["ci.yml"])
  expect(withoutCleanup(d, noCleanup)).toBe(d)

  const tests = withoutCleanup(d, planCleanup(dir, ["tests"], true))
  expect(tests.gates).toEqual(["内部リンク"])
  expect(tests.scripts.test).toBeUndefined()
  expect(tests.scripts.check).toBe("bun scripts/check.ts")
  expect(tests.deleted).toContain("knip.jsonc")

  const gates = withoutCleanup(d, planCleanup(dir, ["gates"], true))
  expect(gates.gates).toEqual([])
  expect(gates.scripts.check).toBeUndefined()

  const ci = withoutCleanup(d, planCleanup(dir, ["ci"], true))
  expect(ci.workflows).toEqual([])

  const ops = withoutCleanup(d, planCleanup(dir, ["repo-ops"], true))
  expect(ops.docs).not.toContain("ops/GITHUB_SETTINGS.md")
  expect(ops.docs).toContain("arch/architecture.md")
  expect(ops.scripts.check).toBe("bun scripts/check.ts")
})

test("the documents stop advertising what the cleanup removed", () => {
  const dir = fixture()
  const d = detect(dir)
  const cleaned = withoutCleanup(d, planCleanup(dir, [...cleanupIds], true))
  // どの候補にも入らないスクリプト（typecheck / format / build）だけが正本として残る
  expect(Object.keys(cleaned.scripts)).toEqual(["typecheck", "format", "build"])
  expect(canonicalVerification(cleaned)).toEqual({
    command: "bun run typecheck",
    note: "（型検査だけが残っています）",
  })

  const section = renderCommandsSection(answers, cleaned).join("\n")
  expect(section).toContain("- **検証の正本**: `bun run typecheck`（型検査だけが残っています）。")
  expect(section).not.toContain("個別の検査")
  expect(section).not.toContain("make check")
  expect(section).not.toContain("bun run knip")
  expect(section).not.toContain("Git フック")
  expect(section).not.toContain("github:settings")
  expect(section).not.toContain("GITHUB_SETTINGS.md")
  expect(section).toContain("- **CI**: ワークフローは削除済みです。")
  expect(section).toContain("- **初期化**: CLI は削除済みです")

  const readme = renderReadme(answers, cleaned)
  expect(readme).not.toContain("bun run check")
  expect(readme).not.toContain("bun run knip")
  expect(readme).not.toContain("github:settings")
  expect(readme).not.toContain("GITHUB_SETTINGS.md")
  expect(readme).toContain(
    "bun run typecheck               # 検証の正本（型検査だけが残っています）",
  )
  expect(readme).toContain("bun install --frozen-lockfile   # 依存の導入\n")
  expect(readme).toContain("初期化 CLI は削除済みです")
  expect(readme).toContain("CI は削除済みです")

  const rule = renderProjectTemplateRule(answers, cleaned)
  expect(rule).toContain(
    "検証は `bun run typecheck`（型検査だけが残っています）が正本で、個別の検査はありません。",
  )
  expect(rule).not.toContain("- 個別の検査:")
  expect(rule).toContain("初期化 CLI（削除済み）で生成した（Demo App）")

  const agents = renderAgentsSection(answers, cleaned).join("\n")
  expect(agents).toContain("> 初期化 CLI（テンプレート専用だったため削除済み）で生成した。")
  const overview = renderProjectOverview(answers, cleaned)
  expect(overview).toContain(
    "- 検証は `bun run typecheck`（型検査だけが残っています）が正本で、個別の検査はありません。プロジェクト固有の制約は `AGENTS.md §6`。",
  )
  expect(overview).toContain("| `scripts/` | 検証の CLI（Bun / TypeScript） |")
  expect(overview).toContain("- 初期化 CLI は削除済みです。本ファイルは手で更新してください。")
  const architecture = renderArchitecture(answers, cleaned)
  expect(architecture).toContain(
    "> 初期化 CLI（テンプレート専用だったため削除済み）が実在するファイルから生成した（Demo App）。",
  )
  expect(architecture).not.toContain("bun run setup --init-only")

  const tree = renderTree(answers, cleaned).join("\n")
  expect(tree).toContain("AGENTS.md")
  expect(tree).toContain(".agent/")
  expect(tree).not.toContain("_tests_/")
  expect(tree).not.toContain("knip.jsonc")
  expect(tree).not.toContain(".gitleaks.toml")
  expect(tree).not.toContain("Makefile")
  expect(tree).toContain("検証の CLI（bun run の 3 コマンド）")

  // 検証コマンドが 1 つも残らないとき
  const nothing = { ...cleaned, scripts: {} }
  expect(canonicalVerification(nothing)).toBeNull()
  expect(gettingStarted(nothing)).toEqual([
    "```bash",
    "bun install --frozen-lockfile   # 依存の導入",
    "# 検証の正本はありません（テンプレート由来のゲートを削除したため）",
    "```",
  ])
  expect(verificationNote(nothing)).toBe(
    "検証の正本はありません（テンプレート由来のゲートを削除しました）。",
  )
  expect(renderReadme(answers, nothing)).toContain("# 検証の正本はありません")
  expect(renderCommandsSection(answers, nothing).join("\n")).toContain(
    "- **検証の正本**: なし（テンプレート由来のゲートを削除しました）。",
  )
  expect(renderTree(answers, nothing).join("\n")).toContain("bun run のコマンドは残っていません")
})

test("the documents keep every command that survives the cleanup", () => {
  const dir = fixture()
  const d = detect(dir)
  const a = answers
  expect(canonicalVerification(d)).toEqual({
    command: "bun run check",
    note: "（2 ゲート: 内部リンク / テストとカバレッジ）",
  })
  expect(gettingStarted(d)[2]).toBe(
    "bun run check                   # 検証の正本（2 ゲート: 内部リンク / テストとカバレッジ）",
  )
  expect(verificationNote(d)).toContain("未使用コード・依存は `bun run knip`。")
  expect(renderReadme(a, d)).toContain("bun run check")
  expect(renderCommandsSection(a, d).join("\n")).toContain("`make check` は同じ入口。")
  expect(renderProjectTemplateRule(a, d)).toContain("`bun run init` で生成した")
  expect(renderAgentsSection(a, d).join("\n")).toContain(
    "> `bun run setup --init-only` で生成した。事実が変わったら同じコマンドで生成し直す。",
  )
  const overview = renderProjectOverview(a, d)
  expect(overview).toContain("（初期化: `bun run setup --init-only`）")
  expect(overview).toContain("| `scripts/` | 検証と初期化の CLI（Bun / TypeScript） |")
  expect(overview).toContain(
    "- 初期化のやり直し: `.agent/skills/project-init/SKILL.md`（TUI の手順と確認項目）",
  )
  expect(renderArchitecture(a, d)).toContain(
    "> `bun run setup --init-only` が実在するファイルから生成した（Demo App）。",
  )

  // テストだけ消すと、正本は check のまま、ゲートと knip の話だけが減る
  const tests = withoutCleanup(d, planCleanup(dir, ["tests"], true))
  expect(canonicalVerification(tests)?.note).toBe("（1 ゲート: 内部リンク）")
  expect(verificationNote(tests)).not.toContain("knip")
  expect(renderReadme(a, tests)).toContain("bun run check")
  expect(renderReadme(a, tests)).not.toContain("bun run knip")
  const readme = renderReadme(a, tests)
  expect(readme).toContain("bun run init")
  expect(readme).not.toContain("初期化 CLI は削除済みです")
  expect(verificationNote(tests)).toContain("個別のゲートは `bun run check` の中にあります。")
  // check も test も消えたリポジトリでは test を正本にしない（何も残らない）
  expect(canonicalVerification({ ...d, scripts: { build: "bun run build" } })).toBeNull()
  expect(verificationNote({ ...d, scripts: { build: "bun run build" } })).toBe(
    "検証の正本はありません（テンプレート由来のゲートを削除しました）。",
  )
  // 個別ゲートのコマンドも check のゲートも無いときは「ありません」とだけ書く
  expect(verificationNote({ ...d, scripts: { test: "bun test" }, gates: [] })).toBe(
    "検証は `bun run test`が正本で、個別の検査はありません。",
  )
  // CLI だけ消して手順書を残したときは、画面で行う手順だけを案内する
  const manualDetected = { ...d, scripts: { check: "bun scripts/check.ts" } }
  const manual = renderReadme(a, manualDetected)
  expect(manual).toContain("## GitHub 側の設定")
  expect(manual).not.toContain("bun run github:settings")
  expect(manual).toContain(
    "[`docs/ops/GITHUB_SETTINGS.md`](docs/ops/GITHUB_SETTINGS.md) の手順を画面で行ってください。",
  )
  expect(renderCommandsSection(a, manualDetected).join("\n")).toContain(
    "- **GitHub 側の設定**: CLI は削除済みです。`docs/ops/GITHUB_SETTINGS.md` の手順を画面で行ってください。",
  )
  expect(renderCommandsSection(a, manualDetected).join("\n")).toContain("- **Git フック**:")
  expect(canonicalVerification({ ...d, scripts: { test: "bun test" }, gates: [] })).toEqual({
    command: "bun run test",
    note: "",
  })
  expect(treeRows(d).map((row) => row.path)).toContain("_tests_")
  expect(renderTree(a, d).join("\n")).toContain("├── _tests_/               # 回帰テスト")
})
