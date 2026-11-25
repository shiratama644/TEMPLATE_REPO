/**
 * 初期化のあとに不要になるテンプレート専用ファイルの削除候補。
 * 削除は強制しない。すべて利用者が選び、計画に出て、承認後に適用する。
 * Agent の資産（`.agent/`・`AGENTS.md`・`.claude`・`CLAUDE.md`）と AGENTS.md の品質ゲート
 * （`scripts/check-agents.ts`・`patches/`・`agents-md-lint`）は削除候補に含めない。
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { Detected } from "./init-detect.ts"
import { safe } from "./safe-path.ts"

export type CleanupId = "template-tools" | "tests" | "gates" | "repo-ops" | "ci" | "workspace"
export const cleanupIds: CleanupId[] = [
  "template-tools",
  "tests",
  "gates",
  "repo-ops",
  "ci",
  "workspace",
]

/** ワークフローから除く step。`name` か `run` のどちらかで一致させる。 */
export type StepRef = { name?: string; run?: string }
/** 削除に伴って中身を書き換えるファイル。放置すると import・ゲート・step が宙に浮く。 */
export type CleanupEdit = {
  path: string
  /** 削除する import の module specifier（例: `./check-coverage.ts`） */
  removeImports?: string[]
  /** `scripts/check.ts` の `gates` から除くゲート名 */
  removeGates?: string[]
  /** ワークフローから除く step */
  removeSteps?: StepRef[]
}
export type CleanupGroup = {
  id: CleanupId
  label: string
  hint: string
  /** 対話の初期値を ON にするか。既定で消すのは「別のプロジェクトの邪魔になる物」だけ */
  default: boolean
  /** 削除するパス（ディレクトリも可）。実在する物だけが対象になる */
  paths: string[]
  /** `package.json` の scripts から除くキー */
  packageScripts: string[]
  /** import を辿れない依存（bin 名で呼ぶ物）は名前で除く */
  dependencies: string[]
  /** 削除に伴う書き換え */
  edits: CleanupEdit[]
  /** 削除後に手で確認する文書（自動では書き換えない） */
  review: string[]
}

/** テンプレート生成の機械。派生プロジェクトでは二度と使わない。 */
const templateTools = [
  "scripts/setup.ts",
  "scripts/setup-apply.ts",
  "scripts/setup-env.ts",
  "scripts/setup-init.ts",
  "scripts/setup-install.ts",
  "scripts/setup-manifest.ts",
  "scripts/setup-options.ts",
  "scripts/setup-package.ts",
  "scripts/setup-plan.ts",
  "scripts/setup-schema.ts",
  "scripts/init-agents.ts",
  "scripts/init-arch.ts",
  "scripts/init-cleanup.ts",
  "scripts/init-detect.ts",
  "scripts/init-docs.ts",
  "scripts/verify-generated.ts",
  "scripts/safe-path.ts",
]
/** 機械のテスト。本体を消すなら一緒に消さないと import が壊れる。 */
const templateToolTests = [
  "_tests_/setup.test.ts",
  "_tests_/setup-env.test.ts",
  "_tests_/setup-format.test.ts",
  "_tests_/setup-init.test.ts",
  "_tests_/setup-install.test.ts",
  "_tests_/setup-manifest.test.ts",
  "_tests_/setup-options.test.ts",
  "_tests_/setup-package.test.ts",
  "_tests_/setup-plan.test.ts",
  "_tests_/setup-run.test.ts",
  "_tests_/setup-schema.test.ts",
  "_tests_/init-cleanup.test.ts",
  "_tests_/verify-generated.test.ts",
  "_tests_/plan-verify.test.ts",
]
/** 検証ゲート。AGENTS.md ゲート（check-agents.ts）は Agent 資産の一部なので含めない。 */
const gateScripts = [
  "scripts/check.ts",
  "scripts/check-commit.ts",
  "scripts/check-doc-links.ts",
  "scripts/check-function-length.ts",
  "scripts/check-index.ts",
  "scripts/check-language.ts",
  "scripts/check-mermaid.ts",
  "scripts/check-shell.ts",
  "scripts/conventional-commit.ts",
  "scripts/walk.ts",
  "scripts/install-hooks.ts",
  ".githooks",
  "Makefile",
]
const gateTests = [
  "_tests_/check-gates.test.ts",
  "_tests_/check-doc-links.test.ts",
  "_tests_/check-function-length.test.ts",
  "_tests_/check-index.test.ts",
  "_tests_/check-language.test.ts",
  "_tests_/check-mermaid.test.ts",
  "_tests_/check-shell.test.ts",
  "_tests_/commit.test.ts",
  "_tests_/hooks-install.test.ts",
  "_tests_/block-secret-read.test.ts",
  "_tests_/stop-hook.test.ts",
  "_tests_/knip.test.ts",
]

export const cleanupGroups: CleanupGroup[] = [
  {
    id: "template-tools",
    label: "テンプレート生成の機械（対話 TUI・setup・初期化の実装）",
    hint: "scripts/setup*.ts・init-*.ts・verify-generated.ts とそのテスト、bun run setup / init / verify:generated",
    default: true,
    paths: [...templateTools, ...templateToolTests],
    packageScripts: ["setup", "init", "verify:generated"],
    dependencies: [],
    edits: [],
    review: ["docs/ops/index.md"],
  },
  {
    id: "tests",
    label: "回帰テストと、テストに依存する検査（カバレッジ・knip）",
    hint: "_tests_/ 一式・scripts/check-coverage.ts・knip.jsonc、ゲート「テストとカバレッジ」、CI の knip",
    default: true,
    paths: ["_tests_", "scripts/check-coverage.ts", "knip.jsonc"],
    packageScripts: ["test", "coverage", "knip"],
    dependencies: ["knip"],
    edits: [
      {
        path: "scripts/check.ts",
        removeImports: ["./check-coverage.ts"],
        removeGates: ["テストとカバレッジ"],
      },
      {
        path: ".github/workflows/ci.yml",
        removeSteps: [
          { name: "Require native build toolchains (no skipped Go/Rust tests)" },
          { run: "bun run knip" },
        ],
      },
    ],
    review: [
      "AGENTS.md",
      "docs/ops/index.md",
      ".agent/commands/test.md",
      ".agent/agents/test-writer.md",
    ],
  },
  {
    id: "gates",
    label: "検証ゲート（bun run check）と Git フック・Makefile",
    hint: "scripts/check*.ts（AGENTS.md ゲートは残る）・walk.ts・install-hooks.ts・.githooks/・Makefile。CI の bun run check も除く",
    default: false,
    paths: [...gateScripts, ...gateTests],
    packageScripts: [
      "check",
      "links",
      "mermaid",
      "lang",
      "index",
      "shell",
      "length",
      "commit:check",
      "hooks:install",
      "postinstall",
    ],
    dependencies: [],
    edits: [{ path: ".github/workflows/ci.yml", removeSteps: [{ run: "bun run check" }] }],
    review: ["AGENTS.md", "docs/ops/index.md", ".agent/rules/04_verification.md"],
  },
  {
    id: "repo-ops",
    label: "GitHub 設定と読み取り専用レポートの CLI",
    hint: "scripts/github-settings.ts・git-report.ts、docs/ops/GITHUB_SETTINGS.md・main-ruleset.json",
    default: false,
    paths: [
      "scripts/github-settings.ts",
      "scripts/git-report.ts",
      "docs/ops/GITHUB_SETTINGS.md",
      "docs/ops/main-ruleset.json",
      "_tests_/github-settings.test.ts",
      "_tests_/git-report.test.ts",
      "_tests_/ruleset.test.ts",
    ],
    packageScripts: ["github:settings", "git:report"],
    dependencies: [],
    edits: [],
    review: ["docs/ops/index.md"],
  },
  {
    id: "ci",
    label: "Actions のワークフローと Dependabot・gitleaks",
    hint: ".github/workflows/・dependabot.yml・.gitleaks.toml・CI の負例 fixtures（SECURITY.md は残る）",
    default: false,
    paths: [".github/workflows", ".github/dependabot.yml", ".github/fixtures", ".gitleaks.toml"],
    packageScripts: [],
    dependencies: [],
    edits: [],
    review: ["AGENTS.md", "docs/ops/index.md", ".agent/skills/ci-quality-gates/SKILL.md"],
  },
  {
    id: "workspace",
    label: "作業用の一時ディレクトリ（.tmp/・.setup-backup/）",
    hint: "カバレッジの出力と退避先。再生成できる物なので Git 管理外でも削除する",
    default: true,
    paths: [".tmp", ".setup-backup"],
    packageScripts: [],
    dependencies: [],
    edits: [],
    review: [],
  },
]

export type Cleanup = {
  ids: CleanupId[]
  /** 削除するパス（実在し、残すスクリプトに必要とされていない物） */
  paths: string[]
  /** Git 管理外なので削除しないパス（復元できないため） */
  blocked: string[]
  /** 残すスクリプトが import するので削除しないパス */
  protectedPaths: string[]
  packageScripts: string[]
  /** `package.json` から除く依存 */
  dependencies: string[]
  edits: CleanupEdit[]
  /** 削除に合わせて書き換わるファイル（計画に表示する） */
  editPaths: string[]
  /** 削除後に手で確認する文書 */
  review: string[]
  notes: string[]
}
export const noCleanup: Cleanup = {
  ids: [],
  paths: [],
  blocked: [],
  protectedPaths: [],
  packageScripts: [],
  dependencies: [],
  edits: [],
  editPaths: [],
  review: [],
  notes: [],
}

/** `--cleanup none|all|id,id` を検証して id の並びにする。 */
export function parseCleanupIds(value: string): CleanupId[] {
  if (value === "none") return []
  if (value === "all") return [...cleanupIds]
  const ids = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean) as CleanupId[]
  for (const id of ids)
    if (!cleanupIds.includes(id))
      throw new Error(
        `不明な削除候補: ${id}（指定できるのは ${cleanupIds.join(", ")} / none / all）`,
      )
  return [...new Set(ids)]
}

/** 既定で削除する候補（非対話式と TUI の初期値）。 */
export const defaultCleanupIds = (): CleanupId[] =>
  cleanupGroups.filter((g) => g.default).map((g) => g.id)

const exists = (dir: string, path: string): boolean => existsSync(safe(dir, path))
/** Git 管理外でも消してよい物（再生成できる一時ディレクトリ）。 */
const regenerable = [".tmp", ".setup-backup"]
const readText = (dir: string, path: string): string | null => {
  const target = safe(dir, path)
  return existsSync(target) ? readFileSync(target, "utf8") : null
}
/** 削除対象（ディレクトリを含む）に path が含まれるか。 */
export function isDeleted(path: string, deleted: string[]): boolean {
  return deleted.some((d) => d === path || path.startsWith(`${d}/`))
}

/** 実在するパスを持つグループだけ（TUI の選択肢）。 */
export function cleanupChoices(dir: string): CleanupGroup[] {
  return cleanupGroups.filter((g) => g.paths.some((p) => exists(dir, p)))
}

const names = (dir: string, path: string, suffix: string): string[] => {
  const target = safe(dir, path)
  if (!existsSync(target)) return []
  return readdirSync(target)
    .filter((f) => f.endsWith(suffix))
    .map((f) => `${path}/${f}`)
    .sort()
}
/** 検査対象のソース（依存の使用箇所を調べる）。 */
export function sourceFiles(dir: string): string[] {
  return [...names(dir, "scripts", ".ts"), ...names(dir, "_tests_", ".test.ts")].sort()
}

/** 相対 import の解決先（`from "./x.ts"` と `import("./x.ts")`）。 */
export function importsOf(text: string): string[] {
  return [...text.matchAll(/from\s+"(\.[^"]+)"|import\("(\.[^"]+)"\)/gu)]
    .map((m) => m[1] ?? m[2])
    .filter((p): p is string => typeof p === "string")
}
const resolves = (from: string, specifier: string) =>
  join(dirname(from), specifier).replaceAll("\\", "/")

/**
 * 残すスクリプトが必要とするスクリプトは削除しない。
 * `released` は「削除すると決めた import 行」の specifier で、そこで参照される物は保護しない。
 */
export function protectImported(
  dir: string,
  candidates: string[],
  released: string[],
): { deletable: string[]; protectedPaths: string[] } {
  const wanted = new Set(candidates)
  const queue: string[] = []
  const keep = (from: string) => {
    const text = readText(dir, from)
    if (text === null) return
    for (const specifier of importsOf(text)) {
      if (released.includes(specifier)) continue
      const target = resolves(from, specifier)
      if (wanted.has(target)) queue.push(target)
    }
  }
  // 削除されるディレクトリ（例: _tests_）の中のファイルは「残す側」として扱わない
  for (const path of sourceFiles(dir))
    if (!wanted.has(path) && !isDeleted(path, candidates)) keep(path)
  const protectedPaths = new Set<string>()
  while (queue.length) {
    const target = queue.shift() as string
    if (protectedPaths.has(target)) continue
    protectedPaths.add(target)
    keep(target)
  }
  return {
    deletable: candidates.filter((p) => !protectedPaths.has(p)),
    protectedPaths: [...protectedPaths].sort(),
  }
}

const packageOf = (dir: string): Record<string, unknown> => {
  const text = readText(dir, "package.json")
  return text ? (JSON.parse(text) as Record<string, unknown>) : {}
}
const keysOf = (value: unknown): string[] =>
  value && typeof value === "object" ? Object.keys(value as Record<string, unknown>) : []
/** import や実体パスで参照しているかを調べる（本文中の偶然の一致を依存の使用と誤認しない）。 */
export function referencesDependency(text: string, dep: string): boolean {
  const quoted = dep.replaceAll("/", "\\/")
  return new RegExp(
    `(?:from\\s+|import\\(|require\\()["']${quoted}(?:["'/])|node_modules/${quoted}/`,
    "u",
  ).test(text)
}
/** import ではなくコマンドとして叩く依存の bin 名（`package.json` の scripts を読んで判定する）。 */
const binaries: Record<string, string[]> = {
  typescript: ["tsc"],
  "@biomejs/biome": ["biome"],
}
/** 残る scripts がコマンドとして使う依存は消さない（消すと typecheck などが動かなくなる）。 */
const usedByKeptScripts = (
  pkg: Record<string, unknown>,
  removed: string[],
  dep: string,
): boolean => {
  const scripts = pkg.scripts
  const commands = Object.entries(scripts && typeof scripts === "object" ? scripts : {})
    .filter(([key]) => !removed.includes(key))
    .map(([, command]) => `${command}`)
    .join("\n")
  return [dep, ...(binaries[dep] ?? [])].some((name) => commands.includes(name))
}
/**
 * 依存を使っているファイルが全部消える物だけを除く。
 * 使うファイルが無かった依存と、残る `package.json` の scripts が叩く依存は残す。
 */
export function unusedDependencies(
  dir: string,
  deleted: string[],
  explicit: string[],
  removedScripts: string[] = [],
): string[] {
  const pkg = packageOf(dir)
  const deps = [...keysOf(pkg.dependencies), ...keysOf(pkg.devDependencies)]
  const users = new Map<string, string[]>()
  for (const file of sourceFiles(dir)) {
    const text = readText(dir, file) ?? ""
    for (const dep of deps)
      if (referencesDependency(text, dep)) users.set(dep, [...(users.get(dep) ?? []), file])
  }
  const kept = (dep: string): boolean => usedByKeptScripts(pkg, removedScripts, dep)
  const computed = deps.filter((dep) => {
    const list = users.get(dep)
    return !!list?.length && list.every((f) => isDeleted(f, deleted)) && !kept(dep)
  })
  const named = explicit.filter((dep) => deps.includes(dep) && !kept(dep))
  return [...new Set([...computed, ...named])].sort()
}

/** 削除の計画。実在する物だけ、Git 管理外は blocked、残す物が import する物は protected。 */
export function planCleanup(dir: string, ids: CleanupId[], git: boolean): Cleanup {
  const groups = cleanupGroups.filter((g) => ids.includes(g.id))
  if (!groups.length) return { ...noCleanup, ids }
  const candidates = [...new Set(groups.flatMap((g) => g.paths))].filter((p) => exists(dir, p))
  const released = groups.flatMap((g) => g.edits.flatMap((e) => e.removeImports ?? []))
  const { deletable, protectedPaths } = protectImported(dir, candidates, released)
  const paths = git ? deletable : deletable.filter((p) => regenerable.includes(p))
  const blocked = git ? [] : deletable.filter((p) => !regenerable.includes(p))
  // 実際に消える物を持つグループだけを対象にする（Git 管理外で消せない物の設定は触らない）
  const applied = groups.filter((g) => g.paths.some((p) => paths.includes(p)))
  const edits = applied
    .flatMap((g) => g.edits)
    .filter((e) => exists(dir, e.path) && !isDeleted(e.path, paths))
  const scripts = packageScriptsOf(dir, applied)
  const dependencies = unusedDependencies(
    dir,
    paths,
    applied.flatMap((g) => g.dependencies),
    scripts,
  )
  const notes: string[] = []
  if (blocked.length)
    notes.push("Git 管理外のため削除しません（復元できません）。git init してから実行してください")
  if (protectedPaths.length)
    notes.push(`残すスクリプトが import するため削除しません: ${protectedPaths.join(", ")}`)
  if (dependencies.length)
    notes.push(
      `package.json から依存を除きました: ${dependencies.join(", ")}（bun install で bun.lock を更新してください）`,
    )
  const review = [...new Set(applied.flatMap((g) => g.review))].filter((p) => exists(dir, p)).sort()
  const cleanup: Cleanup = {
    ids,
    paths,
    blocked,
    protectedPaths,
    packageScripts: scripts,
    dependencies,
    edits,
    editPaths: [],
    review,
    notes,
  }
  cleanup.editPaths = editPlan(dir, cleanup).map((e) => e.path)
  return cleanup
}

/** `package.json` に実在する scripts のキーだけ（無いく除外しない）。 */
export function packageScriptsOf(dir: string, groups: CleanupGroup[]): string[] {
  const scripts = packageOf(dir).scripts
  const present = new Set(keysOf(scripts))
  return [...new Set(groups.flatMap((g) => g.packageScripts))].filter((k) => present.has(k)).sort()
}

/** import 文を丸ごと除く（1 行・複数行の両方）。閉じない import はそのまま残す。 */
export function removeImportLines(text: string, specifiers: string[]): string {
  const out: string[] = []
  let pending: string[] = []
  for (const line of text.split("\n")) {
    if (!pending.length && !/^import\b/.test(line)) {
      out.push(line)
      continue
    }
    pending.push(line)
    const specifier = /from\s+"([^"]+)"|^import\s+"([^"]+)"/.exec(line)
    if (!specifier) continue
    const current = specifier[1] ?? specifier[2]
    if (!specifiers.includes(current)) out.push(...pending)
    pending = []
  }
  return [...out, ...pending].join("\n")
}

/** 文字列の中身は無視して、行内の角括弧の増減を数える。 */
const bracketDepth = (line: string): number => {
  let depth = 0
  let quote = ""
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = ""
      continue
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch
    else if (ch === "[") depth++
    else if (ch === "]") depth--
  }
  return depth
}
/**
 * `gates` の項目を名前で除く。1 行の項目も、Biome が折り返した複数行の項目も同じに扱う。
 * 閉じない項目はそのまま残す（壊れた配列を作らない）。
 */
export function removeGateLines(text: string, gateNames: string[]): string {
  const out: string[] = []
  let element: string[] = []
  let depth = 0
  const flush = (complete: boolean): void => {
    if (!element.length) return
    const body = element.join("\n").replace(/^\s*\[\s*/u, "")
    const name = /^"([^"]+)"/u.exec(body)?.[1]
    if (complete && name && gateNames.includes(name)) element = []
    else out.push(...element)
    element = []
  }
  for (const line of text.split("\n")) {
    if (!element.length && !/^\s*\[/u.test(line)) {
      out.push(line)
      continue
    }
    element.push(line)
    depth += bracketDepth(line)
    if (depth <= 0) {
      flush(true)
      depth = 0
    }
  }
  flush(false)
  return out.join("\n")
}

/** ワークフローの step を name / run で除く（ブロックは次の同インデントまで）。 */
export function removeSteps(text: string, refs: StepRef[]): string {
  const lines = text.split("\n")
  const drop = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    const start = /^(\s*)- /.exec(lines[i])
    if (!start) continue
    const indent = start[1].length
    let end = i + 1
    while (end < lines.length) {
      const line = lines[end] ?? ""
      if (line.trim() && (line.match(/^\s*/)?.[0].length ?? 0) <= indent) break
      end++
    }
    const block = lines.slice(i, end).join("\n")
    const name = /^\s*- name: (.+)$/m.exec(block)?.[1]?.trim()
    const run = /^\s*- run: (.+)$/m.exec(block)?.[1]?.trim()
    if (refs.some((r) => (r.name && r.name === name) || (r.run && r.run === run)))
      for (let line = i; line < end; line++) drop.add(line)
  }
  const kept = lines.filter((_, i) => !drop.has(i)).join("\n")
  return text.endsWith("\n") && !kept.endsWith("\n") ? `${kept}\n` : kept
}

/** `package.json` から scripts と依存を除く（2 space・末尾改行の形は保つ）。 */
export function removePackageEntries(
  text: string,
  scripts: string[],
  dependencies: string[],
): string {
  const pkg = JSON.parse(text) as Record<string, unknown>
  for (const key of scripts)
    if (pkg.scripts && typeof pkg.scripts === "object")
      delete (pkg.scripts as Record<string, unknown>)[key]
  for (const field of ["dependencies", "devDependencies"])
    for (const dep of dependencies)
      if (pkg[field] && typeof pkg[field] === "object")
        delete (pkg[field] as Record<string, unknown>)[dep]
  return `${JSON.stringify(pkg, null, 2)}\n`
}

/**
 * Makefile のターゲットを、消えた bun run のキーに合わせて除く。`.PHONY:` も追い従う。
 * 元の `.PHONY:` の位置は動かさないので、何度実行しても同じ結果になる。
 */
export function pruneMakefile(text: string, removed: string[]): string {
  const kept: string[] = []
  let block: string[] = []
  let drop = false
  let phonyAt = -1
  const flush = (): void => {
    if (block.length && !drop) kept.push(...block)
    block = []
    drop = false
  }
  for (const line of text.split("\n")) {
    if (/^[a-zA-Z_-]+:/.test(line)) {
      flush()
      block = [line]
      continue
    }
    if (block.length) {
      block.push(line)
      const run = /\$\(BUN\)\s+(?:run\s+([a-zA-Z:_-]+)|test)\b/.exec(line)
      if (run && removed.includes(run[1] ?? "test")) drop = true
      continue
    }
    if (/^\.PHONY:/.test(line)) phonyAt = kept.length
    kept.push(line)
  }
  flush()
  const targets = kept
    .map((line) => /^([a-zA-Z_-]+):/.exec(line)?.[1])
    .filter((t): t is string => !!t)
  const phony = targets.length ? `.PHONY: ${targets.join(" ")}` : ""
  // 元の `.PHONY:` の行をその場で置き換える（無ければ最初のターゲットの前に挿入する）
  if (phonyAt >= 0) {
    if (phony) kept[phonyAt] = phony
    else kept.splice(phonyAt, 1)
    return kept.join("\n")
  }
  const head = kept.findIndex((line) => /^[a-zA-Z_-]+:/.test(line))
  if (head < 0 || !phony) return kept.join("\n")
  return [...kept.slice(0, head), `${phony}\n`, ...kept.slice(head)].join("\n")
}

/** 計画どおりに削除し、連動するファイルを書き換える。 */
export function applyCleanup(dir: string, c: Cleanup): { deleted: number; edited: string[] } {
  const edited: string[] = []
  let deleted = 0
  for (const path of c.paths) {
    rmSync(safe(dir, path), { recursive: true, force: true })
    deleted++
  }
  for (const edit of editPlan(dir, c)) {
    writeFileSync(safe(dir, edit.path), edit.content)
    edited.push(edit.path)
  }
  return { deleted, edited }
}

/** 1 ファイルの書き換え内容。変わらない（既に書き換わっている）ときは null。 */
export function editFor(dir: string, edit: CleanupEdit): string | null {
  const text = readText(dir, edit.path)
  if (text === null) return null
  let next = text
  if (edit.removeImports?.length) next = removeImportLines(next, edit.removeImports)
  if (edit.removeGates?.length) next = removeGateLines(next, edit.removeGates)
  if (edit.removeSteps?.length) next = removeSteps(next, edit.removeSteps)
  return next === text ? null : next
}
/** 書き換わるファイルとその内容。計画は「実際に変わる物」だけを出す（再実行で空になる）。 */
export function editPlan(dir: string, c: Cleanup): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = []
  const pkg = readText(dir, "package.json")
  if (pkg !== null && (c.packageScripts.length || c.dependencies.length)) {
    const next = removePackageEntries(pkg, c.packageScripts, c.dependencies)
    if (next !== pkg) out.push({ path: "package.json", content: next })
  }
  for (const edit of c.edits) {
    const next = editFor(dir, edit)
    if (next !== null) out.push({ path: edit.path, content: next })
  }
  const makefile = readText(dir, "Makefile")
  if (makefile !== null && c.packageScripts.length && !isDeleted("Makefile", c.paths)) {
    const next = pruneMakefile(makefile, c.packageScripts)
    if (next !== makefile) out.push({ path: "Makefile", content: next })
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : 1))
}

/**
 * 検出結果の側から「そのパスは無い（または無くなる）」を答える（文書の生成が使う）。
 * 既に無い物も消える物と同じに扱うので、初期化の再実行でも同じ文書になる。
 */
export const gone = (d: Detected, path: string): boolean =>
  isDeleted(path, d.deleted ?? []) || !existsSync(safe(d.dir, path))

/** 削除後の世界で文書を生成するための検出結果（目次・ゲート・コマンドを合わせる）。 */
export function withoutCleanup(d: Detected, c: Cleanup): Detected {
  if (!c.ids.length) return d
  const removedGates = c.edits.flatMap((e) => e.removeGates ?? [])
  const scripts = Object.fromEntries(
    Object.entries(d.scripts).filter(([key]) => !c.packageScripts.includes(key)),
  )
  return {
    ...d,
    scripts,
    gates: isDeleted("scripts/check.ts", c.paths)
      ? []
      : d.gates.filter((g) => !removedGates.includes(g)),
    workflows: d.workflows.filter((w) => !isDeleted(`.github/workflows/${w}`, c.paths)),
    docs: d.docs.filter((f) => !isDeleted(`docs/${f}`, c.paths)),
    deleted: c.paths,
  }
}
