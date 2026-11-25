/** テンプレート初期化の現状検出。読み取りだけで、ファイルを変更しない。 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { relative } from "node:path"
import { repoFromRemote } from "./github-settings.ts"
import { safe } from "./safe-path.ts"
import { files } from "./walk.ts"

/** 作者の作業痕跡の種類。初期化後はどれも残っていてはいけない。 */
export type TraceKind =
  | "author-repo"
  | "author-name"
  | "placeholder"
  | "dated-note"
  | "external-citation"
export type Trace = { path: string; line: number; kind: TraceKind; text: string }
/** 初期化が書き換える対象。この一覧だけが痕跡検査の対象になる。 */
export const initSurface = [
  "README.md",
  "LICENSE",
  "AGENTS.md",
  ".github/SECURITY.md",
  ".agent/rules/project-template.md",
  ".agent/skills/project-overview/SKILL.md",
  "docs/README.md",
  "docs/task-list.md",
  "docs/arch/README.md",
  "docs/arch/product.md",
  "docs/arch/architecture.md",
  "docs/ops/index.md",
  "docs/ops/GITHUB_SETTINGS.md",
  "docs/planning/_TEMPLATE.md",
]

/** 痕跡の判定規則。`paths` は対象ファイル、`section` は AGENTS.md のように節を限定するときの範囲。 */
export type TraceRule = {
  kind: TraceKind
  pattern: RegExp
  paths: string[]
  section?: { start: RegExp; end: RegExp }
}
export const traceRules: TraceRule[] = [
  { kind: "author-repo", pattern: /TEMPLATE_REPO|shiratama644/u, paths: initSurface },
  { kind: "author-name", pattern: /Shiratama/u, paths: initSurface },
  {
    // §6 の（例）だけを対象にする。他の節や docs/ops の一般的な例示は痕跡ではない。
    kind: "placeholder",
    pattern: /（例）|（例:/u,
    paths: ["AGENTS.md", ".agent/rules/project-template.md"],
    section: { start: /^## 6\./u, end: /^## 7\./u },
  },
  { kind: "dated-note", pattern: /20\d\d-\d\d-\d\d(\s|に)実測/u, paths: initSurface },
  {
    kind: "external-citation",
    pattern: /qiita\.com\/Y-Y-dev/u,
    paths: ["docs/planning/_TEMPLATE.md"],
  },
]
/** 初期化の手順記憶。初期化が終わったら不要になる作業ログ。 */
export const initLogs = ["docs/planning/INIT_PLAN.md", "docs/planning/INIT_STATE.md"]

/** §6.2〜§6.6 に対応する小節の ID（`--keep-sections` と対話の multiselect で使う）。 */
export type SectionId = "sandbox" | "git" | "impl" | "style" | "output"
export const sectionIds: SectionId[] = ["sandbox", "git", "impl", "style", "output"]
/** 初期化の答え。対話（TUI）か CLI 引数・`--config` から確定する。 */
export type InitAnswers = {
  /** 表示名（README の H1 と文書で使う） */
  name: string
  /** package.json の name（kebab-case） */
  slug: string
  description: string
  owner: string
  repo: string
  licenseHolder: string
  licenseYear: string
  purpose: string
  audience: string
  nonGoals: string
  firstTask: string
  sections: SectionId[]
  sectionText: Record<SectionId, string>
}

export type Detected = {
  dir: string
  template: boolean
  initialized: boolean
  name: string
  description: string
  owner: string
  repo: string
  licenseHolder: string
  licenseYear: string
  packageManager: string
  scripts: Record<string, string>
  gates: string[]
  workflows: string[]
  docs: string[]
  skills: string[]
  agents: string[]
  hooks: string[]
  git: boolean
  logs: string[]
  traces: Trace[]
  /** 初期化の削除で消えるパス（`withoutCleanup` が入れ、文書の生成が参照する） */
  deleted?: string[]
}

const read = (dir: string, path: string): string | null => {
  const target = safe(dir, path)
  return existsSync(target) ? readFileSync(target, "utf8") : null
}

/** `package.json` の scripts と packageManager。読めなければ空。 */
export function detectPackage(dir: string): {
  name: string
  description: string
  packageManager: string
  scripts: Record<string, string>
} {
  const text = read(dir, "package.json")
  const empty = { name: "", description: "", packageManager: "bun", scripts: {} }
  if (!text) return empty
  try {
    const pkg = JSON.parse(text) as Record<string, unknown>
    const scripts = (pkg.scripts ?? {}) as Record<string, string>
    const manager = typeof pkg.packageManager === "string" ? pkg.packageManager : "bun"
    return {
      name: typeof pkg.name === "string" ? pkg.name : "",
      description: typeof pkg.description === "string" ? pkg.description : "",
      packageManager: manager.replace(/^bun@/, ""),
      scripts,
    }
  } catch {
    return empty
  }
}

/** `scripts/check.ts` のゲート名をソースから拾う（実物とずらさないため）。 */
export function detectGates(dir: string): string[] {
  const text = read(dir, "scripts/check.ts") ?? ""
  return [...text.matchAll(/^\s*\["([^"]+)",/gmu)].map((m) => m[1])
}

/** Git remote から owner / repo。remote が無ければ空文字。 */
export function detectRemote(dir: string): { owner: string; repo: string; git: boolean } {
  const inside = spawnSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
  })
  const git = inside.status === 0 && inside.stdout.trim() === "true"
  if (!git) return { owner: "", repo: "", git: false }
  const remote = spawnSync("git", ["-C", dir, "remote", "get-url", "origin"], { encoding: "utf8" })
  const slug = remote.status === 0 ? repoFromRemote(remote.stdout ?? "") : null
  if (!slug) return { owner: "", repo: "", git }
  const [owner, repo] = slug.split("/")
  return { owner, repo, git }
}

/** LICENSE の著作権行から保持者と年を取り出す。 */
export function detectLicense(dir: string): { holder: string; year: string } {
  const text = read(dir, "LICENSE") ?? ""
  const m = /Copyright \(c\) (\d{4}) (.+)/.exec(text)
  return m ? { year: m[1], holder: m[2].trim() } : { holder: "", year: "" }
}

/** README の H1 と最初の段落。 */
export function detectReadme(dir: string): { heading: string; description: string } {
  const lines = (read(dir, "README.md") ?? "").split("\n")
  const heading = (lines.find((l) => l.startsWith("# ")) ?? "# ").slice(2).trim()
  const body = lines.findIndex((l) => l.startsWith("# "))
  const description = lines
    .slice(body + 1)
    .find((l) => l.trim() && !l.startsWith(">") && !l.startsWith("#"))
    ?.trim()
  return { heading, description: description ?? "" }
}

const entries = (dir: string, path: string): string[] => {
  const target = safe(dir, path)
  return existsSync(target) ? readdirSync(target).sort() : []
}

/** 規則に一致する行だけを選ぶ。`section` があればその範囲内に限る。 */
function scanLines(lines: string[], rule: TraceRule): number[] {
  const hits: number[] = []
  let inside = !rule.section
  lines.forEach((line, index) => {
    if (rule.section) {
      if (rule.section.start.test(line)) inside = true
      else if (rule.section.end.test(line)) inside = false
    }
    if (inside && rule.pattern.test(line)) hits.push(index)
  })
  return hits
}

/** 初期化が書き換えるファイルだけを走査し、作者の作業痕跡を集める。 */
export function findTraces(dir: string): Trace[] {
  const traces: Trace[] = []
  for (const rule of traceRules)
    for (const path of rule.paths) {
      const text = read(dir, path)
      if (!text) continue
      const lines = text.split("\n")
      for (const index of scanLines(lines, rule))
        traces.push({
          path,
          line: index + 1,
          kind: rule.kind,
          text: lines[index].trim().slice(0, 120),
        })
    }
  return traces.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
}

/** このディレクトリがテンプレート由来かを判定する（初期化の前提条件）。 */
export function isTemplate(dir: string): boolean {
  return ["AGENTS.md", "docs/arch/product.md", ".agent/skills/project-init/SKILL.md"].every((p) =>
    existsSync(safe(dir, p)),
  )
}

/** 初期化に必要な事実を一度に集める。 */
export function detect(dir: string): Detected {
  const pkg = detectPackage(dir)
  const readme = detectReadme(dir)
  const license = detectLicense(dir)
  const remote = detectRemote(dir)
  const traces = isTemplate(dir) ? findTraces(dir) : []
  const docsRoot = existsSync(safe(dir, "docs")) ? safe(dir, "docs") : null
  const docs = docsRoot
    ? [...files(docsRoot)]
        .map((f) => relative(docsRoot, f).replaceAll("\\", "/"))
        .filter((f) => f.endsWith(".md"))
        .sort()
    : []
  return {
    dir,
    template: isTemplate(dir),
    initialized: traces.length === 0,
    name: pkg.name || readme.heading,
    description: pkg.description || readme.description,
    owner: remote.owner,
    repo: remote.repo || readme.heading,
    licenseHolder: license.holder,
    licenseYear: license.year,
    packageManager: pkg.packageManager,
    scripts: pkg.scripts,
    gates: detectGates(dir),
    workflows: entries(dir, ".github/workflows").filter((f) => f.endsWith(".yml")),
    docs,
    skills: entries(dir, ".agent/skills").filter((s) =>
      existsSync(safe(dir, `.agent/skills/${s}/SKILL.md`)),
    ),
    agents: entries(dir, ".agent/agents").filter((f) => f.endsWith(".md")),
    hooks: entries(dir, ".agent/hooks"),
    git: remote.git,
    logs: initLogs.filter((p) => existsSync(safe(dir, p))),
    traces,
  }
}

/** テンプレート作者の値（名前・説明・著作権者）かどうか。既定値には使わない。 */
export const authorish = /TEMPLATE_REPO|template-repo|Shiratama|テンプレート/u
export function ownValue(value: string): string {
  return authorish.test(value) ? "" : value
}

/** 検出結果を人間が読む形にする（計画表示と `--plan-json` の両方が使う）。 */
export function describeDetected(d: Detected): string[] {
  return [
    `名前: ${d.name || "（未設定）"} / 説明: ${d.description || "（未設定）"}`,
    `GitHub: ${d.owner ? `${d.owner}/${d.repo}` : "（remote なし）"} / Git: ${d.git ? "あり" : "なし"}`,
    `ライセンス: ${d.licenseHolder || "（未設定）"} ${d.licenseYear}`.trimEnd(),
    `コマンド: ${Object.keys(d.scripts).length} 件 / ゲート: ${d.gates.length} 件 / workflow: ${d.workflows.length} 件 / skill: ${d.skills.length} 件`,
    `作者の作業痕跡: ${d.traces.length} 件（${[...new Set(d.traces.map((t) => t.path))].length} ファイル）`,
    `初期化ログ: ${d.logs.join(", ") || "なし"}`,
  ]
}

/** 書き換え対象のうち、このディレクトリに存在しないもの（生成先がテンプレートでない場合）。 */
export function initSurfaceMissing(dir: string): string[] {
  return initSurface.filter((p) => !existsSync(safe(dir, p)))
}
