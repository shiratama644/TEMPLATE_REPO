/** `bun run setup` の引数解析と、対話の承認判定（`--dry-run` / `--yes` / `--apply`）。 */
import { basename } from "node:path"
import { type CANCEL_SYMBOL, isCancel } from "@clack/prompts"
import { type CleanupId, parseCleanupIds } from "./init-cleanup.ts"
import type { SectionId } from "./init-detect.ts"
import { sectionIds } from "./init-detect.ts"
import {
  type Feature,
  featureNames,
  type Language,
  type Preset,
  presets,
  type Template,
  templates,
} from "./setup-manifest.ts"
import { validateChoices } from "./setup-schema.ts"

export type Options = {
  name?: string
  description?: string
  language?: Language
  template?: Template
  preset?: Preset
  features?: Feature[]
  dir: string
  yes: boolean
  apply: boolean
  dryRun: boolean
  planJson: boolean
  noInstall: boolean
  noOsInstall: boolean
  help: boolean
  list: boolean
  config?: string
  saveConfig?: string
  initOnly: boolean
  noInit: boolean
  initName?: string
  owner?: string
  repo?: string
  licenseHolder?: string
  licenseYear?: string
  purpose?: string
  audience?: string
  nonGoals?: string
  firstTask?: string
  keepSections?: SectionId[]
  initSections?: Record<string, string>
  /** 初期化で削除するテンプレート専用ファイルの候補（未指定なら対話で選ぶ） */
  cleanup?: CleanupId[]
}
/** 引数と対話が確定した後の選択。`collectSelection` が保証する。 */
export type Resolved = Options & {
  name: string
  preset: Preset
  language: Language
  template: Template
  features: Feature[]
}
export const usage = `bun run setup [options]\n\n  --preset <id>       ${Object.keys(presets).join(" | ")}\n  --language <id>     ${Object.keys(templates).join(" | ")}\n  --template <id>     ${Object.values(templates).flat().join(" | ")}\n  --name <name>       Project name (lowercase kebab-case)\n  --description <s>   Project description\n  --features <ids>    Comma-separated feature IDs, or none / all\n  --config <file>     Load JSON configuration\n  --save-config <f>  Save choices when the plan is approved\n  --dir <path>        Target directory (default: current directory)\n  --dry-run           Show plan; never write files or install anything\n  --plan-json         Print a single JSON preview; never write or prompt (no --apply/--save-config)\n  --apply             With --yes, authorize writing without a prompt (not needed interactively)\n  --yes               Skip interactive questions; requires --apply to make changes\n  --no-install        Skip bun install\n  --no-os-install     Show OS package instructions only\n  --list-presets      Show presets and features\n  --help              Show this help\n\nテンプレート初期化（このリポジトリの文書を生成し直す）\n  --init-only         初期化だけを行い、プロジェクト生成はしない\n  --no-init           初期化をスキップする\n  --init-name <name>  表示名（README の H1。package.json は --name / 表示名から kebab-case）\n  --owner <owner[/repo]>  GitHub の owner と repo（docs/ops の URL に使う）\n  --repo <name>       リポジトリ名（--owner に含めない場合）\n  --license-holder <s> / --license-year <yyyy>  LICENSE の著作権表示\n  --purpose <s>       目的（README・docs/arch/product.md・AGENTS.md §6）\n  --audience <s>      対象（任意）\n  --non-goals <s>     対象外（任意）\n  --first-task <s>    docs/task-list.md に登録する最初のタスク（任意）\n  --keep-sections <ids>  AGENTS.md §6 に記入する節（none | all | sandbox,git,impl,style,output）\n  --cleanup <ids>     初期化で削除するテンプレート専用ファイル（none | all | template-tools,tests,gates,repo-ops,ci,workspace）\n\n\nOS packages always require a separate, per-package confirmation in an interactive terminal.\nNon-interactive mode only prints OS installation instructions; --yes never authorizes sudo.\n`
export function option(args: string[]): Options {
  const o: Options = {
    dir: process.cwd(),
    yes: false,
    apply: false,
    dryRun: false,
    planJson: false,
    noInstall: false,
    noOsInstall: false,
    help: false,
    list: false,
    initOnly: false,
    noInit: false,
  }
  const keys: Record<string, keyof Options> = {
    "--preset": "preset",
    "--language": "language",
    "--template": "template",
    "--name": "name",
    "--description": "description",
    "--features": "features",
    "--config": "config",
    "--save-config": "saveConfig",
    "--dir": "dir",
    "--init-name": "initName",
    "--owner": "owner",
    "--repo": "repo",
    "--license-holder": "licenseHolder",
    "--license-year": "licenseYear",
    "--purpose": "purpose",
    "--audience": "audience",
    "--non-goals": "nonGoals",
    "--first-task": "firstTask",
    "--keep-sections": "keepSections",
    "--cleanup": "cleanup",
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a in keys) {
      const v = args[++i]
      if (!v || v.startsWith("--")) throw new Error(`${a} に値が必要です`)
      if (a === "--features")
        o.features = (
          v === "all" ? [...featureNames] : v === "none" ? [] : v.split(",").map((f) => f.trim())
        ) as Feature[]
      else if (a === "--keep-sections") o.keepSections = parseSections(v)
      else if (a === "--cleanup") o.cleanup = parseCleanupIds(v)
      else (o as unknown as Record<string, string>)[keys[a]] = v
    } else if (a === "--help" || a === "-h") o.help = true
    else if (a === "--list-presets") o.list = true
    else if (a === "--dry-run") o.dryRun = true
    else if (a === "--plan-json") o.planJson = true
    else if (a === "--apply") o.apply = true
    else if (a === "--yes") o.yes = true
    else if (a === "--init-only") o.initOnly = true
    else if (a === "--no-init") o.noInit = true
    else if (a === "--no-install") o.noInstall = true
    else if (a === "--no-os-install") o.noOsInstall = true
    else throw new Error(`不明な引数: ${a}`)
  }
  return o
}
/** `--keep-sections` の値を検証する（none / all / カンマ区切り）。 */
export function parseSections(value: string): SectionId[] {
  if (value === "none") return []
  if (value === "all") return [...sectionIds]
  const picked = value.split(",").map((s) => s.trim())
  const unknown = picked.filter((s) => !sectionIds.includes(s as SectionId))
  if (unknown.length)
    throw new Error(`不明な節: ${unknown.join(", ")}（${sectionIds.join(" | ")}）`)
  return picked as SectionId[]
}
export function assertChoices(o: Options): void {
  validateChoices({
    name: o.name,
    description: o.description,
    language: o.language,
    template: o.template,
    preset: o.preset,
    features: o.features,
  })
}
export class SetupCancelled extends Error {}
export function required<T extends string | boolean>(value: T | typeof CANCEL_SYMBOL): T {
  if (isCancel(value)) throw new SetupCancelled()
  return value as T
}
export async function planApproval(
  options: Pick<Options, "dryRun" | "yes" | "apply">,
  tty: boolean,
  confirmPlan: () => Promise<boolean | typeof CANCEL_SYMBOL>,
): Promise<"dry-run" | "decline" | "needs-apply" | "apply"> {
  if (options.dryRun) return "dry-run"
  if (tty && !options.yes) return required(await confirmPlan()) ? "apply" : "decline"
  return options.apply ? "apply" : "needs-apply"
}
export const defaultName = (dir: string) => {
  const stem = basename(dir)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64)
    .replace(/-$/g, "")
  return /^[a-z]/.test(stem) ? stem : "project"
}
export const suggestions = [
  "docs/planning/_TEMPLATE.md を使ったプロジェクトの計画",
  "docs/task-list.md への最初のタスク登録",
  "使用しない .agent/skills/ と .agent/agents/",
  "README.md のテンプレート説明",
]
