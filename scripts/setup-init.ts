/** テンプレート初期化。作者の作業痕跡を利用者の値で生成し直す（dry-run 既定・承認後に適用）。 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import {
  type CANCEL_SYMBOL,
  type ConfirmOptions,
  confirm,
  isCancel,
  type MultiSelectOptions,
  multiselect,
  type TextOptions,
  text,
} from "@clack/prompts"
import {
  renderAgentsSection,
  renderProjectOverview,
  renderProjectTemplateRule,
  spliceAgents,
} from "./init-agents.ts"
import {
  renderArchitecture,
  renderArchReadme,
  renderDocsIndex,
  renderProduct,
} from "./init-arch.ts"
import {
  applyCleanup,
  type Cleanup,
  type CleanupGroup,
  type CleanupId,
  cleanupChoices,
  defaultCleanupIds,
  noCleanup,
  planCleanup,
  withoutCleanup,
} from "./init-cleanup.ts"
import {
  type Detected,
  detect,
  findTraces,
  type InitAnswers,
  initLogs,
  ownValue,
  type SectionId,
  sectionIds,
  type Trace,
} from "./init-detect.ts"
import {
  renderLicense,
  renderPackage,
  renderPlanningTemplate,
  renderReadme,
  renderSecurity,
  renderTaskList,
  replaceTraces,
} from "./init-docs.ts"
import { safe } from "./safe-path.ts"
import { defaultName, type Options, required, SetupCancelled } from "./setup-options.ts"

/** 表示名から package.json 用の kebab-case を作る。 */
export function kebab(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
  return /^[a-z]/.test(slug) ? slug : "project"
}

const emptySections = (): Record<SectionId, string> => ({
  sandbox: "",
  git: "",
  impl: "",
  style: "",
  output: "",
})

/** 検出した事実からの既定値。CLI 引数はこれより優先する。 */
export function defaultAnswers(o: Options, d: Detected): InitAnswers {
  const detectedName = ownValue(d.name)
  const display = o.initName || detectedName || defaultName(d.dir)
  const year = o.licenseYear || String(new Date().getFullYear())
  const detectedDescription = ownValue(d.description)
  // `--owner octocat/hello-world` のようにリポジトリ名を含めてもよい。所有者だけを取り出す
  const [ownerArg, repoArg] = (o.owner ?? "").split("/")
  const owner = ownerArg || d.owner
  return {
    name: display,
    slug: o.name || kebab(display),
    description: o.description || detectedDescription,
    owner,
    repo: repoArg || o.repo || d.repo || kebab(display),
    licenseHolder: o.licenseHolder || owner || d.owner,
    licenseYear: year,
    purpose: o.purpose || "",
    audience: o.audience || "",
    nonGoals: o.nonGoals || "",
    firstTask: o.firstTask || "",
    sections: o.keepSections ?? [],
    sectionText: emptySections(),
  }
}

/** 非対話式（`--yes`）の答え。目的が未指定なら説明で代用し、そのことを返す。 */
export function answersFromOptions(
  o: Options,
  d: Detected,
): { answers: InitAnswers; notes: string[] } {
  const answers = defaultAnswers(o, d)
  const notes: string[] = []
  if (o.initSections)
    for (const [id, value] of Object.entries(o.initSections)) {
      const section = id as SectionId
      if (!sectionIds.includes(section)) throw new Error(`不明な節: ${id}`)
      answers.sections = [...new Set([...answers.sections, section])]
      answers.sectionText[section] = String(value)
    }
  if (!answers.purpose && answers.description) {
    answers.purpose = answers.description
    notes.push("目的が未指定のため、説明を目的として使いました（--purpose で指定できます）")
  }
  if (!answers.description && answers.purpose) {
    answers.description = answers.purpose
    notes.push("説明が未指定のため、目的を使いました（--description で指定できます）")
  }
  if (!answers.description) {
    answers.description = `${answers.name} のプロジェクト`
    answers.purpose ||= answers.description
    notes.push("説明と目的が未指定のため、名前を使いました（--purpose で指定できます）")
  }
  if (!answers.owner) notes.push("GitHub の owner が不明です（--owner owner/name で指定できます）")
  return { answers, notes }
}

/** 対話の入れ替え可能な口。テストは偽物を渡し、実行時は Clack を使う。 */
export type Prompter = {
  text(message: string, initial: string, optional: boolean): Promise<string>
  pick(message: string, values: SectionId[], initial: SectionId[]): Promise<SectionId[]>
  /** 削除するテンプレート専用ファイルの候補を選ぶ（選択なしも許す） */
  choose(message: string, groups: CleanupGroup[], initial: CleanupId[]): Promise<CleanupId[]>
  confirm(message: string): Promise<boolean>
}
/** Clack の 3 呼び出しだけ。テストは偽物を差し替えて、キャンセルと整形の規則を検証する。 */
export type ClackUi = {
  text(opts: TextOptions): Promise<string | typeof CANCEL_SYMBOL>
  multiselect<Value>(opts: MultiSelectOptions<Value>): Promise<Value[] | typeof CANCEL_SYMBOL>
  confirm(opts: ConfirmOptions): Promise<boolean | typeof CANCEL_SYMBOL>
}
export function makeClackPrompter(ui: ClackUi): Prompter {
  return {
    async text(message, initial, optional) {
      const value = required(
        await ui.text({
          message: optional ? `${message}（任意。Enter で省略）` : message,
          initialValue: initial,
          defaultValue: initial,
        }),
      )
      return value.trim()
    },
    async pick(message, values, initial) {
      const picked = await ui.multiselect<SectionId>({
        message,
        options: values.map((id) => ({ value: id, label: sectionLabel(id) })),
        initialValues: initial,
        required: false,
      })
      if (isCancel(picked)) throw new SetupCancelled()
      return picked
    },
    async choose(message, groups, initial) {
      const picked = await ui.multiselect<CleanupId>({
        message,
        options: groups.map((g) => ({ value: g.id, label: g.label, hint: g.hint })),
        initialValues: initial.filter((id) => groups.some((g) => g.id === id)),
        required: false,
      })
      if (isCancel(picked)) throw new SetupCancelled()
      return picked
    },
    async confirm(message) {
      const ok = await ui.confirm({ message, initialValue: false, active: "y", inactive: "N" })
      if (isCancel(ok)) throw new SetupCancelled()
      return ok
    },
  }
}
export const clackPrompter: Prompter = makeClackPrompter({ text, multiselect, confirm })

/** 対話式 TUI。既定値は検出結果から埋め、空回答は「書かない」として扱う。 */
export async function askInitAnswers(
  o: Options,
  d: Detected,
  tty: boolean,
  prompt: Prompter = clackPrompter,
): Promise<InitAnswers> {
  const a = defaultAnswers(o, d)
  if (!tty || o.yes) return a
  console.log("\n== テンプレート初期化（作者の痕跡を利用者の値で生成し直します） ==")
  for (const line of describeAnswers(a)) console.log(`  既定: ${line}`)
  a.name = (await prompt.text("プロジェクト名（表示名）", a.name, false)) || a.name
  a.slug = kebab((await prompt.text("package.json の name", a.slug, false)) || a.slug)
  a.description = (await prompt.text("一行説明", a.description, false)) || a.description
  const slug = await prompt.text(
    "GitHub の owner/repo",
    a.owner ? `${a.owner}/${a.repo}` : "",
    true,
  )
  if (slug.includes("/")) [a.owner, a.repo] = slug.split("/")
  a.licenseHolder =
    (await prompt.text("ライセンスの著作権者", a.licenseHolder, false)) || a.licenseHolder
  a.licenseYear = (await prompt.text("ライセンスの年", a.licenseYear, false)) || a.licenseYear
  a.purpose = await prompt.text(
    "目的（このプロジェクトは何のためか）",
    a.purpose || a.description,
    false,
  )
  a.audience = await prompt.text("対象（誰が使うか）", a.audience, true)
  a.nonGoals = await prompt.text("対象外（やらないこと）", a.nonGoals, true)
  a.firstTask = await prompt.text("最初のタスク（docs/task-list.md に登録）", a.firstTask, true)
  a.sections = await prompt.pick(
    "AGENTS.md §6 に記入する節（スペースで選択、Enter で確定）",
    sectionIds,
    a.sections,
  )
  for (const id of a.sections)
    a.sectionText[id] = await prompt.text(sectionLabel(id), a.sectionText[id], true)
  return a
}

export const sectionLabel = (id: SectionId): string =>
  ({
    sandbox: "§6.2 サンドボックス制約",
    git: "§6.3 リポジトリ固有の Git 制約",
    impl: "§6.4 実装ルール",
    style: "§6.5 Lint・フォーマット特有ルール",
    output: "§6.6 成果物・表現ルール",
  })[id]

export function describeAnswers(a: InitAnswers): string[] {
  return [
    `名前 ${a.name} / slug ${a.slug}`,
    `説明 ${a.description}`,
    `GitHub ${a.owner ? `${a.owner}/${a.repo}` : "（未設定）"}`,
    `ライセンス ${a.licenseHolder || "（未設定）"} (${a.licenseYear})`,
    `目的 ${a.purpose || "（未設定）"}`,
    `§6 に記入する節 ${a.sections.join(", ") || "なし"}`,
    `最初のタスク ${a.firstTask || "なし"}`,
  ]
}

const read = (dir: string, path: string): string | null => {
  const target = safe(dir, path)
  return existsSync(target) ? readFileSync(target, "utf8") : null
}

/** 答えと検出結果から、書き換えるファイルの内容を作る。null は「触らない」。 */
export function renderAll(dir: string, a: InitAnswers, d: Detected): Record<string, string | null> {
  const section = renderAgentsSection(a, d)
  return {
    "README.md": renderReadme(a, d),
    LICENSE: renderLicense(a, read(dir, "LICENSE")),
    "package.json": renderPackage(a, read(dir, "package.json")),
    "AGENTS.md": spliceAgents(read(dir, "AGENTS.md"), section),
    ".github/SECURITY.md": renderSecurity(a, read(dir, ".github/SECURITY.md")),
    ".agent/rules/project-template.md": renderProjectTemplateRule(a, d),
    ".agent/skills/project-overview/SKILL.md": renderProjectOverview(a, d),
    "docs/README.md": renderDocsIndex(a, d),
    "docs/task-list.md": renderTaskList(a, read(dir, "docs/task-list.md")),
    "docs/arch/README.md": renderArchReadme(a),
    "docs/arch/product.md": renderProduct(a, d),
    "docs/arch/architecture.md": renderArchitecture(a, d),
    "docs/ops/index.md": traceFix(dir, "docs/ops/index.md", a),
    "docs/ops/GITHUB_SETTINGS.md": traceFix(dir, "docs/ops/GITHUB_SETTINGS.md", a),
    "docs/planning/_TEMPLATE.md": renderPlanningTemplate(read(dir, "docs/planning/_TEMPLATE.md")),
  }
}

const traceFix = (dir: string, path: string, a: InitAnswers): string | null => {
  const existing = read(dir, path)
  return existing ? replaceTraces(existing, a) : null
}

export type InitFile = { path: string; content: string }
export type InitPlan = {
  writes: InitFile[]
  unchanged: string[]
  /** 内容は変えないが触らないファイル（例: 最初のタスクを指定しなかった task-list.md） */
  skipped: string[]
  deletes: string[]
  /** Git 管理外のため削除しなかった初期化ログ */
  blocked: string[]
  /** 存在しないため生成できなかったファイル */
  missing: string[]
  /** 触らない理由（例: タスク登録済みの task-list.md） */
  notes: string[]
  /** 選ばれたテンプレート専用ファイルの削除（空なら何もしない） */
  cleanup: Cleanup
}

/** 削除する文書を目次と木から除く（切れたリンクを残さない）。 */
export function withoutDeleted(d: Detected, deletes: string[]): Detected {
  const gone = new Set(
    deletes.filter((p) => p.startsWith("docs/")).map((p) => p.slice("docs/".length)),
  )
  return gone.size ? { ...d, docs: d.docs.filter((f) => !gone.has(f)) } : d
}

/** 計画を作る。実質同じ内容は書き換えない（冪等）。 */
export function buildInitPlan(
  dir: string,
  a: InitAnswers,
  d: Detected,
  cleanup: Cleanup = noCleanup,
): InitPlan {
  const logs = initLogs.filter((p) => existsSync(safe(dir, p)))
  const git = d.git || existsSync(join(dir, ".git"))
  const deletes = git ? logs : []
  // 文書は「削除した後」の実物から作る（消えたコマンドやディレクトリを書かない）
  const rendered = renderAll(dir, a, withoutCleanup(withoutDeleted(d, deletes), cleanup))
  const writes: InitFile[] = []
  const unchanged: string[] = []
  const missing: string[] = []
  const skipped: string[] = []
  for (const [path, content] of Object.entries(rendered)) {
    if (content === null) {
      if (!existsSync(safe(dir, path))) missing.push(path)
      else skipped.push(path)
      continue
    }
    if (read(dir, path) === content) unchanged.push(path)
    else writes.push({ path, content })
  }
  const notes: string[] = [...cleanup.notes]
  if (a.firstTask && skipped.includes("docs/task-list.md"))
    notes.push(
      "docs/task-list.md は既にタスクが登録されているため触りません。最初のタスクは手で追記してください",
    )
  return { writes, unchanged, skipped, deletes, blocked: git ? [] : logs, missing, notes, cleanup }
}

export function printInitPlan(plan: InitPlan): void {
  console.log("\n初期化計画（作者の痕跡を利用者の値で生成し直します）")
  for (const file of plan.writes) console.log(`~ ${file.path}`)
  for (const path of plan.unchanged) console.log(`= ${path} （変更なし）`)
  for (const path of plan.skipped) console.log(`= ${path} （触らない）`)
  for (const path of plan.deletes) console.log(`- ${path} （初期化ログを削除）`)
  for (const path of plan.blocked) console.log(`! ${path} （Git 管理外のため削除しません）`)
  for (const path of plan.missing) console.log(`! ${path} （生成できなかったため触りません）`)
  printCleanup(plan.cleanup)
  for (const note of plan.notes) console.log(`注意: ${note}`)
  console.log(
    `書き換え ${plan.writes.length + plan.cleanup.editPaths.length} 件、変更なし ${
      plan.unchanged.length + plan.skipped.length
    } 件、削除 ${plan.deletes.length + plan.cleanup.paths.length} 件`,
  )
}

/**
 * 計画どおりに書き換える。退避ディレクトリは作らない（利用者の方針）。
 * 復元は Git（`git restore <file>`）と、適用前の計画表示・`--dry-run` が担う。
 */
export function applyInitPlan(
  dir: string,
  plan: InitPlan,
): { written: number; deleted: number; edited: string[] } {
  let written = 0
  let deleted = 0
  for (const file of plan.writes) {
    const target = safe(dir, file.path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, file.content)
    written++
  }
  for (const path of plan.deletes) {
    rmSync(safe(dir, path), { force: true })
    deleted++
  }
  // 削除は文書を書いた後（package.json を生成した後に scripts を除くため）
  const cleanup = applyCleanup(dir, plan.cleanup)
  return { written, deleted: deleted + cleanup.deleted, edited: cleanup.edited }
}

/** 選ばれた削除の計画を表示する（`-` 削除 / `~` 書き換え / `!` 手を付ける必要）。 */
export function printCleanup(c: Cleanup): void {
  if (!c.ids.length) return
  for (const path of c.paths) console.log(`- ${path} （テンプレート専用ファイルを削除）`)
  for (const path of c.editPaths) console.log(`~ ${path} （削除に合わせて書き換え）`)
  for (const path of c.blocked) console.log(`! ${path} （Git 管理外のため削除しません）`)
  for (const path of c.protectedPaths)
    console.log(`= ${path} （残すスクリプトが import するため保持）`)
  for (const path of c.review) console.log(`! ${path} （削除後に手で確認してください）`)
}

/** 削除するテンプレート専用ファイルを選ぶ。Agent の資産は候補に出さない。 */
export async function askCleanup(dir: string, prompt: Prompter): Promise<CleanupId[]> {
  const groups = cleanupChoices(dir)
  if (!groups.length) return []
  console.log(
    "\n== テンプレート専用ファイルの削除（このリポジトリは別のプロジェクトになります） ==",
  )
  console.log("  Agent の資産（.agent/・AGENTS.md・.claude・CLAUDE.md）は候補に含めません")
  console.log("  テンプレート本体で使うときは何も選ばないでください（--cleanup none と同じ）")
  return prompt.choose("削除する候補（スペースで選択、Enter で確定）", groups, defaultCleanupIds())
}

/** 適用後に作者の痕跡が残っていないかを確かめる。 */
export function verifyInit(dir: string): Trace[] {
  return findTraces(dir)
}

export type InitOutcome = {
  code: number
  plan: InitPlan | null
  answers: InitAnswers | null
  detected: Detected | null
  /** 非対話式で既定値を使ったときの注意（`--plan-json` では JSON に含める） */
  notes?: string[]
}

/** 初期化フェーズ。`--plan-json` では表示せず計画だけ返す。 */
export async function initPhase(
  o: Options,
  tty: boolean,
  prompt: Prompter = clackPrompter,
): Promise<InitOutcome> {
  const d = detect(o.dir)
  if (!d.template) {
    const message =
      "初期化の対象ではありません（AGENTS.md と docs/arch/ があるテンプレートで実行してください）"
    if (o.initOnly) throw new Error(message)
    return { code: 0, plan: null, answers: null, detected: d }
  }
  let answers: InitAnswers
  const notes: string[] = []
  if (tty && !o.yes) answers = await askInitAnswers(o, d, tty, prompt)
  else {
    const fromOptions = answersFromOptions(o, d)
    answers = fromOptions.answers
    notes.push(...fromOptions.notes)
    if (!o.planJson) for (const note of notes) console.log(`注意: ${note}`)
  }
  // 削除はすべて選択制。非対話式は既定の候補（--cleanup で変えられる）
  const ids = o.cleanup ?? (tty && !o.yes ? await askCleanup(o.dir, prompt) : defaultCleanupIds())
  const cleanup = planCleanup(o.dir, ids, d.git || existsSync(join(o.dir, ".git")))
  const plan = buildInitPlan(o.dir, answers, d, cleanup)
  // `--plan-json` の標準出力は単一 JSON。注意は JSON の中だけで返す。
  if (o.planJson) return { code: 0, plan, answers, detected: d, notes }
  if (o.dryRun) {
    printInitPlan(plan)
    console.log("dry-run: 初期化の変更は行いません")
    return { code: 0, plan, answers, detected: d }
  }
  printInitPlan(plan)
  if (
    !plan.writes.length &&
    !plan.deletes.length &&
    !plan.cleanup.paths.length &&
    !plan.cleanup.editPaths.length
  ) {
    console.log("初期化済みです（書き換える内容がありません）")
    return { code: 0, plan, answers, detected: d }
  }
  const approved =
    tty && !o.yes ? await prompt.confirm("この初期化を適用しますか？ [y/N]") : o.apply
  if (!approved) {
    console.log(
      tty && !o.yes
        ? "中止しました。初期化の変更は行いません"
        : "変更なし。非対話式の適用には --yes --apply を指定してください",
    )
    return { code: 0, plan, answers, detected: d }
  }
  const applied = applyInitPlan(o.dir, plan)
  const traces = verifyInit(o.dir)
  console.log(
    `初期化を適用しました（書き換え ${applied.written} 件、削除 ${applied.deleted} 件。戻すときは git restore）`,
  )
  if (traces.length) {
    for (const t of traces.slice(0, 10)) console.log(`NG  ${t.path}:${t.line} ${t.kind}`)
    console.log(`作者の痕跡が ${traces.length} 件残っています`)
    return { code: 1, plan, answers, detected: d }
  }
  console.log("OK: 作者の作業痕跡は残っていません")
  return { code: 0, plan, answers, detected: d }
}

/** `--init-only --plan-json` の出力（本文は出さず、パスと答えだけ）。 */
export function printInitPlanJson(outcome: InitOutcome): void {
  const plan = outcome.plan
  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        mode: "preview",
        init: {
          answers: outcome.answers,
          detected: outcome.detected
            ? { template: outcome.detected.template, traces: outcome.detected.traces.length }
            : null,
          notes: [...(outcome.notes ?? []), ...(plan?.notes ?? [])],
          writes: plan ? plan.writes.map((f) => f.path) : [],
          unchanged: plan?.unchanged ?? [],
          skipped: plan?.skipped ?? [],
          deletes: plan?.deletes ?? [],
          blocked: plan?.blocked ?? [],
          missing: plan?.missing ?? [],
          cleanup: {
            ids: plan?.cleanup.ids ?? [],
            paths: plan?.cleanup.paths ?? [],
            edits: plan?.cleanup.editPaths ?? [],
            packageScripts: plan?.cleanup.packageScripts ?? [],
            dependencies: plan?.cleanup.dependencies ?? [],
            blocked: plan?.cleanup.blocked ?? [],
            protected: plan?.cleanup.protectedPaths ?? [],
            review: plan?.cleanup.review ?? [],
          },
        },
      },
      null,
      2,
    ),
  )
}
