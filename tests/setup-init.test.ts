import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkLinks } from "../scripts/check-doc-links.ts"
import { findIssues } from "../scripts/check-language.ts"
import { spliceAgents } from "../scripts/init-agents.ts"
import type { Detected, InitAnswers } from "../scripts/init-detect.ts"
import { detect, findTraces, initSurface, ownValue } from "../scripts/init-detect.ts"
import { renderPlanningTemplate, renderTaskList } from "../scripts/init-docs.ts"
import {
  applyInitPlan,
  buildInitPlan,
  defaultAnswers,
  initPhase,
  kebab,
  type Prompter,
} from "../scripts/setup-init.ts"
import type { Options } from "../scripts/setup-options.ts"
import { parseSections } from "../scripts/setup-options.ts"
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
