import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CANCEL_SYMBOL, type MultiSelectOptions } from "@clack/prompts"
import { checkLinks } from "../scripts/check-doc-links.ts"
import { findIssues } from "../scripts/check-language.ts"
import { spliceAgents } from "../scripts/init-agents.ts"
import type { Detected, InitAnswers } from "../scripts/init-detect.ts"
import {
  describeDetected,
  detect,
  detectPackage,
  findTraces,
  initSurface,
  initSurfaceMissing,
  ownValue,
  sectionIds,
} from "../scripts/init-detect.ts"
import { renderPlanningTemplate, renderTaskList } from "../scripts/init-docs.ts"
import {
  answersFromOptions,
  applyInitPlan,
  buildInitPlan,
  type ClackUi,
  defaultAnswers,
  type InitOutcome,
  initPhase,
  kebab,
  makeClackPrompter,
  type Prompter,
  printInitPlanJson,
  sectionLabel,
} from "../scripts/setup-init.ts"
import type { Options } from "../scripts/setup-options.ts"
import { parseSections, SetupCancelled } from "../scripts/setup-options.ts"
import { root } from "../scripts/walk.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

/** 初期化済みのリポジトリから作っても同じ検査になるよう、作者の痕跡を再現する。 */
function deInitialize(dir: string): void {
  const patch = (path: string, edit: (text: string) => string) => {
    const target = join(dir, path)
    if (existsSync(target)) writeFileSync(target, edit(readFileSync(target, "utf8")))
  }
  writeFileSync(join(dir, "README.md"), "# TEMPLATE_REPO\n\nテンプレートの説明。\n")
  writeFileSync(
    join(dir, "docs/task-list.md"),
    [
      "# タスクリスト（派生プロジェクト用）",
      "",
      "## 未完了サマリー",
      "",
      "なし。最初のタスクを登録したら、ここに ID・状態・次に行うことを記載してください。",
      "",
      "## タスク一覧",
      "",
      "現在、登録済みのタスクはありません。初期設定後に次の列を持つ表を追加してください。",
      "",
      "| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |",
      "|---|---|---|---:|---|---|---|",
      "",
    ].join("\n"),
  )
  patch("LICENSE", (t) => t.replace(/Copyright \(c\).*/u, "Copyright (c) 2026 Shiratama"))
  patch("AGENTS.md", (t) => t.replace(/^(### 6\.2[^\n]*\n)/mu, "$1（例）外部 API に到達不可。\n"))
  patch("docs/ops/index.md", (t) => `${t}\n- 記録: 2026-11-23 実測の確認結果。\n`)
  patch(
    "docs/planning/_TEMPLATE.md",
    (t) => `> **形式の出典**: <https://qiita.com/Y-Y-dev/items/x>\n${t}`,
  )
  patch(
    "docs/ops/GITHUB_SETTINGS.md",
    (t) => `<!-- https://github.com/shiratama644/TEMPLATE_REPO -->\n${t}`,
  )
}

/** 実リポジトリのコピー（node_modules / .git / .tmp は除く）。初期化の対象になる最小の形。 */
const skip = new Set(["node_modules", ".git", ".tmp", ".setup-backup"])
function fixture(git = false): string {
  const dir = mkdtempSync(join(tmpdir(), "setup-init-"))
  dirs.push(dir)
  cpSync(root, dir, {
    recursive: true,
    filter: (from) => !from.split("/").some((part) => skip.has(part)),
  })
  deInitialize(dir)
  if (git) {
    spawnSync("git", ["init", "--quiet"], { cwd: dir })
    writeFileSync(join(dir, "docs/planning/INIT_PLAN.md"), "# 初期化計画（作業ログ）\n")
    writeFileSync(join(dir, "docs/planning/INIT_STATE.md"), "# 作業記憶（ログ）\n")
  }
  return dir
}

const minimalOptions = (dir: string): Options => ({
  ...defaultOptions,
  dir,
})
const defaultOptions: Options = {
  dir: ".",
  yes: false,
  apply: false,
  dryRun: false,
  planJson: false,
  noInstall: true,
  noOsInstall: true,
  help: false,
  list: false,
  initOnly: true,
  noInit: false,
}
function answers(d: Detected, over: Partial<InitAnswers> = {}): InitAnswers {
  return { ...defaultAnswers(minimalOptions(d.dir), d), ...over }
}

test("detect finds the template, its gates and the author traces", () => {
  const dir = fixture()
  const d = detect(dir)
  expect(d.template).toBe(true)
  expect(d.initialized).toBe(false)
  expect(d.gates).toContain("テストとカバレッジ")
  expect(d.gates.length).toBeGreaterThanOrEqual(10)
  expect(findTraces(dir).length).toBeGreaterThanOrEqual(5)
  expect(d.traces.some((t) => t.path === "README.md" && t.kind === "author-repo")).toBe(true)
  expect(d.traces.some((t) => t.path === "LICENSE" && t.kind === "author-name")).toBe(true)
  expect(ownValue("TEMPLATE_REPO")).toBe("")
  expect(ownValue("my-project")).toBe("my-project")
})

test("--owner accepts owner/repo without leaking the repository name into the license", () => {
  const d = detect(fixture())
  const a = defaultAnswers({ ...minimalOptions(d.dir), owner: "octocat/hello-world" }, d)
  expect(a.owner).toBe("octocat")
  expect(a.repo).toBe("hello-world")
  expect(a.licenseHolder).toBe("octocat")

  const kept = defaultAnswers(
    { ...minimalOptions(d.dir), owner: "octocat/hello-world", licenseHolder: "Octocat" },
    d,
  )
  expect(kept.licenseHolder).toBe("Octocat")
  expect(kept.repo).toBe("hello-world")
})

test("a non-template directory is not an init target", () => {
  const dir = mkdtempSync(join(tmpdir(), "setup-init-empty-"))
  dirs.push(dir)
  writeFileSync(join(dir, "README.md"), "# other\n")
  const d = detect(dir)
  expect(d.template).toBe(false)
  expect(d.traces).toEqual([])
})

test("apply rewrites every placeholder and leaves no author trace", () => {
  const dir = fixture(true)
  const d = detect(dir)
  const a = answers(d, {
    name: "My Project",
    slug: "my-project",
    description: "問い合わせ対応を自動化する",
    owner: "octocat",
    repo: "hello-world",
    licenseHolder: "Octocat",
    licenseYear: "2026",
    purpose: "対応時間を半分にする",
    audience: "社内のサポート担当",
    nonGoals: "音声対応はしない",
    firstTask: "API の設計",
  })
  const plan = buildInitPlan(dir, a, d)
  expect(plan.writes.length).toBeGreaterThanOrEqual(10)
  expect(plan.deletes).toEqual(["docs/planning/INIT_PLAN.md", "docs/planning/INIT_STATE.md"])
  applyInitPlan(dir, plan)

  expect(findTraces(dir)).toEqual([])
  expect(readFileSync(join(dir, "README.md"), "utf8").startsWith("# My Project\n")).toBe(true)
  expect(readFileSync(join(dir, "LICENSE"), "utf8")).toContain("Copyright (c) 2026 Octocat")
  expect(existsSync(join(dir, "docs/planning/INIT_PLAN.md"))).toBe(false)
  // 退避ディレクトリは作らない（復元は Git が担う）
  expect(existsSync(join(dir, ".setup-backup/init"))).toBe(false)

  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as Record<string, string>
  expect(pkg.name).toBe("my-project")
  expect(pkg.description).toBe("問い合わせ対応を自動化する")

  const agents = readFileSync(join(dir, "AGENTS.md"), "utf8")
  expect(agents).toContain("## 6. プロジェクト固有の遵守事項（My Project）")
  expect(agents).toContain("### 6.7 ドキュメント運用")
  expect(agents).toContain("## 7. コミュニケーション規約（要点）")
  expect(agents).not.toContain("（例）外部 API に到達不可")

  const taskList = readFileSync(join(dir, "docs/task-list.md"), "utf8")
  expect(taskList).toContain("| TASK-1 | API の設計 | 未着手 |")
  const ops = readFileSync(join(dir, "docs/ops/GITHUB_SETTINGS.md"), "utf8")
  expect(ops).toContain("https://github.com/octocat/hello-world/settings/rules")
  expect(ops).not.toContain("shiratama644")
})

test("generated documents keep links and language gates green", () => {
  const dir = fixture(true)
  const d = detect(dir)
  applyInitPlan(dir, buildInitPlan(dir, answers(d, { name: "My Project", slug: "my-project" }), d))
  expect(checkLinks(dir)).toBe(0)
  for (const path of initSurface) {
    if (!path.endsWith(".md") || !existsSync(join(dir, path))) continue
    expect(findIssues(readFileSync(join(dir, path), "utf8"))).toEqual([])
  }
})

test("re-running the plan changes nothing", () => {
  const dir = fixture()
  const d = detect(dir)
  const a = answers(d, { name: "My Project", slug: "my-project", purpose: "対応時間を半分にする" })
  applyInitPlan(dir, buildInitPlan(dir, a, d))
  const second = buildInitPlan(dir, a, detect(dir))
  expect(second.writes).toEqual([])
  expect(second.unchanged.length).toBeGreaterThanOrEqual(10)
  expect(second.deletes).toEqual([])
})

test("deleting the init logs needs Git; otherwise they are only reported", () => {
  const dir = fixture(false)
  writeFileSync(join(dir, "docs/planning/INIT_PLAN.md"), "# log\n")
  const plan = buildInitPlan(dir, answers(detect(dir)), detect(dir))
  expect(plan.deletes).toEqual([])
  expect(plan.blocked).toEqual(["docs/planning/INIT_PLAN.md"])
  applyInitPlan(dir, plan)
  expect(existsSync(join(dir, "docs/planning/INIT_PLAN.md"))).toBe(true)
})

test("small renderers stay idempotent and refuse to guess", () => {
  expect(kebab("My Project!")).toBe("my-project")
  expect(kebab("9lives")).toBe("project")
  expect(
    renderPlanningTemplate(
      "# t\n\n> **形式の出典**: Qiita\n> <https://qiita.com/Y-Y-dev/x>\n>\n> - 正本\n",
    ),
  ).toBe("# t\n\n> - 正本\n")
  expect(renderPlanningTemplate(null)).toBeNull()
  expect(renderTaskList({ firstTask: "" } as InitAnswers, "## タスク一覧\n")).toBeNull()
  expect(spliceAgents("# 1\n\n## 7. x\n", ["## 6. y"])).toBeNull()
  expect(spliceAgents(null, ["## 6. y"])).toBeNull()
})

test("section flags are validated", () => {
  expect(parseSections("none")).toEqual([])
  expect(parseSections("all")).toContain("sandbox")
  expect(parseSections("git,impl")).toEqual(["git", "impl"])
  expect(() => parseSections("nope")).toThrow("不明な節")
})

test("the CLI initializes a template copy and reports when it is done", () => {
  const dir = fixture(true)
  const cli = (...args: string[]) =>
    spawnSync(
      process.execPath,
      [join(root, "scripts/setup.ts"), "--dir", dir, "--init-only", ...args],
      { encoding: "utf8" },
    )
  const dry = cli(
    "--dry-run",
    "--yes",
    "--init-name",
    "My Project",
    "--purpose",
    "対応時間を半分にする",
  )
  expect(dry.status).toBe(0)
  expect(dry.stdout).toContain("dry-run: 初期化の変更は行いません")
  expect(readFileSync(join(dir, "README.md"), "utf8")).toContain("TEMPLATE_REPO")

  const noApply = cli("--yes", "--init-name", "My Project")
  expect(noApply.stdout).toContain("--yes --apply")
  expect(readFileSync(join(dir, "README.md"), "utf8")).toContain("TEMPLATE_REPO")

  const apply = cli(
    "--yes",
    "--apply",
    "--init-name",
    "My Project",
    "--owner",
    "octocat/hello-world",
    "--license-holder",
    "Octocat",
    "--purpose",
    "対応時間を半分にする",
  )
  expect(apply.status).toBe(0)
  expect(apply.stdout).toContain("作者の作業痕跡は残っていません")
  expect(readFileSync(join(dir, "README.md"), "utf8")).toContain("# My Project")

  const again = cli(
    "--yes",
    "--apply",
    "--init-name",
    "My Project",
    "--owner",
    "octocat/hello-world",
    "--license-holder",
    "Octocat",
    "--purpose",
    "対応時間を半分にする",
  )
  expect(again.stdout).toContain("初期化済みです")
})

test("the CLI refuses to initialize a directory that is not this template", () => {
  const dir = mkdtempSync(join(tmpdir(), "setup-init-other-"))
  dirs.push(dir)
  writeFileSync(join(dir, "README.md"), "# other\n")
  const r = spawnSync(
    process.execPath,
    [join(root, "scripts/setup.ts"), "--dir", dir, "--init-only", "--dry-run", "--yes"],
    { encoding: "utf8" },
  )
  expect(r.status).toBe(1)
  expect(r.stderr).toContain("初期化の対象ではありません")
})

test("--plan-json previews the init plan without writing", () => {
  const dir = fixture()
  const r = spawnSync(
    process.execPath,
    [
      join(root, "scripts/setup.ts"),
      "--dir",
      dir,
      "--init-only",
      "--plan-json",
      "--init-name",
      "My Project",
      "--owner",
      "octocat",
      "--purpose",
      "対応時間を半分にする",
    ],
    { encoding: "utf8" },
  )
  expect(r.status).toBe(0)
  const plan = JSON.parse(r.stdout) as {
    mode: string
    init: { writes: string[]; answers: { owner: string; slug: string } }
  }
  expect(plan.mode).toBe("preview")
  expect(plan.init.writes).toContain("README.md")
  expect(plan.init.answers.owner).toBe("octocat")
  expect(readFileSync(join(dir, "README.md"), "utf8")).toContain("TEMPLATE_REPO")
})

/** 対話の偽物。メッセージごとに決まった答えを返す。 */
function fakePrompter(log: string[], approve: boolean): Prompter {
  const answers: Record<string, string> = {
    "プロジェクト名（表示名）": "Demo App",
    "package.json の name": "demo-app",
    一行説明: "社内問い合わせを自動化する",
    "GitHub の owner/repo": "octocat/demo-app",
    ライセンスの著作権者: "Octocat",
    ライセンスの年: "2026",
    "目的（このプロジェクトは何のためか）": "対応時間を半分にする",
    "対象（誰が使うか）": "社内のサポート担当",
    "対象外（やらないこと）": "音声対応はしない",
    "§6.3 リポジトリ固有の Git 制約": "main への直接 push は禁止",
  }
  return {
    async text(message, initial) {
      log.push(message)
      return answers[message] ?? initial
    },
    async pick() {
      return ["git"]
    },
    async confirm() {
      log.push("approve")
      return approve
    },
  }
}

const interactiveOptions = (dir: string): Options => ({ ...minimalOptions(dir), initOnly: true })

test("the interactive TUI asks, then rewrites every document after approval", async () => {
  const dir = fixture(true)
  const log: string[] = []
  const outcome = await initPhase(interactiveOptions(dir), true, fakePrompter(log, true))
  expect(outcome.code).toBe(0)
  expect(log.filter((m) => m === "approve")).toHaveLength(1)
  expect(log.length).toBeGreaterThanOrEqual(12)
  expect(findTraces(dir)).toEqual([])
  const readme = readFileSync(join(dir, "README.md"), "utf8")
  expect(readme.startsWith("# Demo App\n")).toBe(true)
  expect(readme).toContain("**対象**: 社内のサポート担当")
  expect(readme).toContain("**対象外**: 音声対応はしない")
  expect(readme).toContain("Octocat (c) 2026")
  const agents = readFileSync(join(dir, "AGENTS.md"), "utf8")
  expect(agents).toContain("## 6. プロジェクト固有の遵守事項（Demo App）")
  expect(agents).toContain("- main への直接 push は禁止")
  expect(readFileSync(join(dir, "docs/ops/GITHUB_SETTINGS.md"), "utf8")).toContain(
    "github.com/octocat/demo-app",
  )
})

test("declining the approval leaves every file untouched", async () => {
  const dir = fixture(true)
  const before = readFileSync(join(dir, "README.md"), "utf8")
  const outcome = await initPhase(interactiveOptions(dir), true, fakePrompter([], false))
  expect(outcome.code).toBe(0)
  expect(outcome.plan?.writes.length).toBeGreaterThan(0)
  expect(readFileSync(join(dir, "README.md"), "utf8")).toBe(before)
  expect(existsSync(join(dir, "docs/planning/INIT_PLAN.md"))).toBe(true)
})

test("a task list that already has rows is never overwritten", () => {
  const dir = fixture(true)
  writeFileSync(
    join(dir, "docs/task-list.md"),
    "# タスクリスト\n\n## タスク一覧\n\n| ID | タスク |\n|---|---|\n| TASK-9 | 既存の作業 |\n",
  )
  const d = detect(dir)
  const plan = buildInitPlan(dir, answers(d, { firstTask: "新しい作業" }), d)
  expect(plan.skipped).toContain("docs/task-list.md")
  expect(plan.notes.join("\n")).toContain("既にタスクが登録されている")
  applyInitPlan(dir, plan)
  expect(readFileSync(join(dir, "docs/task-list.md"), "utf8")).toContain("TASK-9")
})

test("detectPackage falls back to empty values instead of guessing", () => {
  const dir = mkdtempSync(join(tmpdir(), "setup-init-pkg-"))
  dirs.push(dir)
  expect(detectPackage(dir)).toEqual({
    name: "",
    description: "",
    packageManager: "bun",
    scripts: {},
  })
  writeFileSync(join(dir, "package.json"), "{ not json\n")
  expect(detectPackage(dir).packageManager).toBe("bun")
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: 42, packageManager: "bun@1.4.5", scripts: { test: "bun test" } }),
  )
  const detected = detectPackage(dir)
  expect(detected.name).toBe("")
  expect(detected.packageManager).toBe("1.4.5")
  expect(detected.scripts).toEqual({ test: "bun test" })
  expect(initSurfaceMissing(dir)).toEqual(initSurface)
})

test("describeDetected reports every detected fact in one line each", () => {
  const dir = fixture()
  const lines = describeDetected(detect(dir))
  expect(lines).toHaveLength(6)
  expect(lines[0]).toContain("名前:")
  expect(lines[1]).toContain("GitHub:")
  expect(lines[2]).toContain("ライセンス:")
  expect(lines[3]).toContain("ゲート:")
  expect(lines[4]).toContain("作者の作業痕跡:")
  expect(lines[5]).toContain("初期化ログ:")
  expect(initSurfaceMissing(dir)).toEqual([])
})

/** console.log を集める。`await run()` の後に join しないと出力を取りこぼす。 */
async function captured(run: () => unknown): Promise<{ out: string; value: unknown }> {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(String(message))
  try {
    const value = await run()
    return { out: logs.join("\n"), value }
  } finally {
    console.log = original
  }
}

test("--yes builds the answers from the options and says what it had to guess", () => {
  const dir = fixture()
  const d = detect(dir)
  const described = answersFromOptions(
    { ...minimalOptions(dir), description: "問い合わせ対応を自動化する", owner: "octocat/demo" },
    d,
  )
  expect(described.answers.purpose).toBe("問い合わせ対応を自動化する")
  expect(described.answers.owner).toBe("octocat")
  expect(described.answers.repo).toBe("demo")
  expect(described.notes.join("\n")).toContain("目的が未指定のため、説明を目的として使いました")

  const purposed = answersFromOptions(
    { ...minimalOptions(dir), purpose: "対応時間を半分にする", description: "" },
    d,
  )
  expect(purposed.notes.join("\n")).toContain("説明が未指定のため、目的を使いました")

  // 何も指定しなければ名前だけを使って、そのことを隠さない
  const empty = mkdtempSync(join(tmpdir(), "setup-init-empty-"))
  dirs.push(empty)
  const guessed = answersFromOptions(minimalOptions(empty), detect(empty))
  expect(guessed.answers.description).toBe(`${guessed.answers.name} のプロジェクト`)
  expect(guessed.notes.join("\n")).toContain("説明と目的が未指定のため、名前を使いました")
  expect(guessed.notes.join("\n")).toContain("GitHub の owner が不明です")

  const sections = answersFromOptions(
    { ...minimalOptions(dir), initSections: { git: "main への直接 push は禁止" } },
    d,
  )
  expect(sections.answers.sections).toContain("git")
  expect(sections.answers.sectionText.git).toBe("main への直接 push は禁止")
  expect(() =>
    answersFromOptions({ ...minimalOptions(dir), initSections: { nope: "x" } }, d),
  ).toThrow("不明な節: nope")
})

test("the clack adapter trims answers, marks optional questions and refuses to guess on cancel", async () => {
  const seen: unknown[] = []
  const ui: ClackUi = {
    async text(opts) {
      seen.push(opts)
      return "  demo  "
    },
    // 偽物は値を 1 つに決めているので、型引数は呼び出し側の Value に合わせる
    async multiselect<Value>(opts: MultiSelectOptions<Value>) {
      seen.push(opts)
      return ["git"] as unknown as Value[]
    },
    async confirm(opts) {
      seen.push(opts)
      return true
    },
  }
  const prompter = makeClackPrompter(ui)
  expect(await prompter.text("プロジェクト名", "初期値", false)).toBe("demo")
  expect(seen[0]).toEqual({
    message: "プロジェクト名",
    initialValue: "初期値",
    defaultValue: "初期値",
  })
  expect(await prompter.text("対象", "", true)).toBe("demo")
  expect(seen[1]).toMatchObject({ message: "対象（任意。Enter で省略）" })
  expect(await prompter.pick("節", sectionIds, ["git"])).toEqual(["git"])
  expect(seen[2]).toMatchObject({ message: "節", initialValues: ["git"], required: false })
  const picked = seen[2] as { options: Array<{ value: string; label: string }> }
  expect(picked.options).toHaveLength(sectionIds.length)
  expect(picked.options[0]).toEqual({ value: "sandbox", label: sectionLabel("sandbox") })
  expect(await prompter.confirm("適用しますか？")).toBe(true)
  expect(seen[3]).toEqual({
    message: "適用しますか？",
    initialValue: false,
    active: "y",
    inactive: "N",
  })

  // Ctrl+C は「空の答え」ではなく中止。既定値で勝手に進めない
  const cancelled = makeClackPrompter({
    async text() {
      return CANCEL_SYMBOL
    },
    async multiselect() {
      return CANCEL_SYMBOL
    },
    async confirm() {
      return CANCEL_SYMBOL
    },
  })
  await expect(cancelled.text("プロジェクト名", "", false)).rejects.toThrow(SetupCancelled)
  await expect(cancelled.pick("節", sectionIds, [])).rejects.toThrow(SetupCancelled)
  await expect(cancelled.confirm("適用しますか？")).rejects.toThrow(SetupCancelled)
})

test("initPhase stops outside a template and keeps --plan-json to a single JSON document", async () => {
  const empty = mkdtempSync(join(tmpdir(), "setup-init-plain-"))
  dirs.push(empty)
  await expect(initPhase(minimalOptions(empty), false)).rejects.toThrow(
    "初期化の対象ではありません",
  )
  const notTemplate = await initPhase({ ...minimalOptions(empty), initOnly: false }, false)
  expect(notTemplate).toEqual({ code: 0, plan: null, answers: null, detected: expect.anything() })

  const dir = fixture(true)
  const silent = await captured(() =>
    initPhase({ ...minimalOptions(dir), planJson: true, yes: true }, false),
  )
  expect(silent.out).toBe("")
  const outcome = silent.value as { code: number; plan: { writes: Array<{ path: string }> } }
  expect(outcome.code).toBe(0)
  expect(outcome.plan.writes.map((f) => f.path)).toContain("README.md")

  const printed = await captured(() =>
    printInitPlanJson({
      ...(silent.value as InitOutcome),
      notes: ["説明と目的が未指定のため、名前を使いました"],
    }),
  )
  const payload = JSON.parse(printed.out) as {
    schemaVersion: number
    mode: string
    init: { notes: string[]; writes: string[]; detected: { template: boolean } | null }
  }
  expect(payload.schemaVersion).toBe(1)
  expect(payload.mode).toBe("preview")
  expect(payload.init.detected?.template).toBe(true)
  expect(payload.init.writes).toContain("README.md")
  expect(payload.init.notes.join("\n")).toContain("説明と目的が未指定のため、名前を使いました")

  // 計画も検出結果も無い（初期化の対象ではなかった）ときの形
  const blank = await captured(() =>
    printInitPlanJson({ code: 0, plan: null, answers: null, detected: null }),
  )
  expect(JSON.parse(blank.out).init).toMatchObject({
    answers: null,
    detected: null,
    notes: [],
    writes: [],
    unchanged: [],
    skipped: [],
    deletes: [],
    blocked: [],
    missing: [],
  })
})

test("initPhase previews by default and only writes after --yes --apply", async () => {
  const dir = fixture(true)
  const preview = await captured(() => initPhase({ ...minimalOptions(dir), yes: true }, false))
  expect(preview.out).toContain("初期化計画")
  expect(preview.out).toContain("変更なし。非対話式の適用には --yes --apply を指定してください")
  expect(readFileSync(join(dir, "README.md"), "utf8")).toContain("TEMPLATE_REPO")

  const dry = await captured(() =>
    initPhase({ ...minimalOptions(dir), yes: true, dryRun: true }, false),
  )
  expect(dry.out).toContain("dry-run: 初期化の変更は行いません")
  expect(readFileSync(join(dir, "README.md"), "utf8")).toContain("TEMPLATE_REPO")

  const applied = await captured(() =>
    initPhase(
      {
        ...minimalOptions(dir),
        yes: true,
        apply: true,
        description: "問い合わせ対応を自動化する",
        owner: "octocat/demo",
      },
      false,
    ),
  )
  expect(applied.out).toContain("注意: 目的が未指定のため、説明を目的として使いました")
  expect(applied.out).toContain("初期化を適用しました")
  expect(applied.out).toContain("OK: 作者の作業痕跡は残っていません")
  expect((applied.value as { code: number }).code).toBe(0)
  expect(readFileSync(join(dir, "README.md"), "utf8")).not.toContain("TEMPLATE_REPO")
  expect(existsSync(join(dir, "docs/planning/INIT_PLAN.md"))).toBe(false)

  // 同じ答えでもう一度実行すると書き換える物が無い
  const again = await captured(() =>
    initPhase(
      {
        ...minimalOptions(dir),
        yes: true,
        apply: true,
        description: "問い合わせ対応を自動化する",
        owner: "octocat/demo",
      },
      false,
    ),
  )
  expect(again.out).toContain("初期化済みです（書き換える内容がありません）")
})

test("initPhase fails when the answers would leave an author trace behind", async () => {
  const dir = fixture(true)
  const result = await captured(() =>
    initPhase({ ...minimalOptions(dir), yes: true, apply: true, initName: "TEMPLATE_REPO" }, false),
  )
  expect((result.value as { code: number }).code).toBe(1)
  // 先頭 10 件だけを表示するので、特定のパスではなく形式と件数で確認する
  expect(result.out).toMatch(/NG {2}\S+:\d+ author-repo/u)
  expect(result.out).toContain("作者の痕跡が")
  expect(result.out).not.toContain("OK: 作者の作業痕跡は残っていません")
})
