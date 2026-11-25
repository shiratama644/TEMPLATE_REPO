#!/usr/bin/env bun
/** Interactive / non-interactive Bun bootstrap. No existing user file is deleted. */
import { existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  type CANCEL_SYMBOL,
  type ConfirmOptions,
  cancel,
  confirm,
  type SelectOptions,
  select,
  type TextOptions,
  text,
} from "@clack/prompts"
import type { SectionId } from "./init-detect.ts"
import { isTemplate } from "./init-detect.ts"
import { applyPlan } from "./setup-apply.ts"
import { type InitOutcome, initPhase, printInitPlanJson } from "./setup-init.ts"
import {
  type InstallEnv,
  installDependencies,
  installEnv,
  installNative,
  installOsPackages,
} from "./setup-install.ts"
import {
  compatibleFeatures,
  featureNames,
  featureScaffold,
  type Language,
  type Preset,
  presets,
  scaffold,
  templates,
} from "./setup-manifest.ts"
import {
  assertChoices,
  defaultName,
  type Options,
  option,
  planApproval,
  type Resolved,
  required,
  SetupCancelled,
  usage,
} from "./setup-options.ts"
import { applyLanguageVariants, buildPackage, readJson } from "./setup-package.ts"
import { buildSetupPlan, printPlan, printPlanJson } from "./setup-plan.ts"
import { nameSchema, validateConfig } from "./setup-schema.ts"

/** `--config` の `init`（Zod で検証済み）。 */
export type InitConfig = {
  name?: string
  slug?: string
  description?: string
  owner?: string
  repo?: string
  licenseHolder?: string
  licenseYear?: string
  purpose?: string
  audience?: string
  nonGoals?: string
  firstTask?: string
  sections?: SectionId[]
  sectionText?: Record<string, string>
}
export type Selection = {
  resolved: Resolved
  generated: Record<string, string>
  pkg: Record<string, unknown>
  requires: string[]
  incompatible: string[]
}
/**
 * 対話と導入の差し替え口。テストは偽物を渡し、端末も実物の導入も無しで全分岐を通す。
 * `tty` が false のときは質問せず既定値を使う（非対話式の規則はここで決まる）。
 */
export type SetupUi = {
  tty: boolean
  select<T extends string>(message: string, values: readonly T[], initial: T): Promise<T>
  text(
    message: string,
    initial: string,
    validate?: (value: string) => string | undefined,
  ): Promise<string>
  confirm(message: string): Promise<boolean>
  install: InstallEnv
}
/** Clack の 3 呼び出しだけ（テストから差し替えられる形）。 */
export type ClackChoices = {
  select(opts: SelectOptions<string>): Promise<string | typeof CANCEL_SYMBOL>
  text(opts: TextOptions): Promise<string | typeof CANCEL_SYMBOL>
  confirm(opts: ConfirmOptions): Promise<boolean | typeof CANCEL_SYMBOL>
}
export function makeSetupUi(
  clack: ClackChoices,
  tty: boolean,
  install: InstallEnv = installEnv,
): SetupUi {
  return {
    tty,
    install,
    async select<T extends string>(message: string, values: readonly T[], initial: T) {
      // Clack の select は値を文字列で返すので、渡した候補の型に読み替える
      const chosen = required(
        await clack.select({
          message,
          options: values.map((value) => ({ value, label: value })),
          initialValue: initial,
        }),
      )
      return chosen as T
    },
    async text(message, initial, validate) {
      return required(
        await clack.text({
          message,
          ...(initial ? { initialValue: initial } : {}),
          defaultValue: initial,
          ...(validate ? { validate: (value?: string) => validate(value ?? "") } : {}),
        }),
      )
    },
    async confirm(message) {
      return required(
        await clack.confirm({ message, initialValue: false, active: "y", inactive: "N" }),
      )
    },
  }
}
export const setupUi: SetupUi = makeSetupUi(
  { select, text, confirm },
  Boolean(process.stdin.isTTY && process.stdout.isTTY),
)

/** `--config` の JSON を CLI 引数より弱い優先度で反映する。 */
export function loadConfig(o: Options): void {
  if (!o.config) return
  const config = readJson(resolve(o.config))
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("設定ファイルは JSON オブジェクトで指定してください")
  validateConfig(config)
  const keys = [
    "name",
    "description",
    "language",
    "template",
    "preset",
    "features",
    "cleanup",
  ] as const
  for (const k of keys)
    if (config[k] !== undefined && o[k] === undefined)
      (o as unknown as Record<string, unknown>)[k] = config[k]
  applyInitConfig(o, config.init as InitConfig | undefined)
}
/** `--config` の `init` を CLI 引数より弱い優先度で反映する。 */
export function applyInitConfig(o: Options, init: InitConfig | undefined): void {
  if (!init) return
  const map: Array<[keyof InitConfig, keyof Options]> = [
    ["name", "initName"],
    ["description", "description"],
    ["owner", "owner"],
    ["repo", "repo"],
    ["licenseHolder", "licenseHolder"],
    ["licenseYear", "licenseYear"],
    ["purpose", "purpose"],
    ["audience", "audience"],
    ["nonGoals", "nonGoals"],
    ["firstTask", "firstTask"],
    ["slug", "name"],
  ]
  const target = o as unknown as Record<string, string | undefined>
  for (const [from, to] of map) {
    const value = init[from] as string | undefined
    if (value !== undefined && target[to as string] === undefined) target[to as string] = value
  }
  if (init.sections && o.keepSections === undefined) o.keepSections = init.sections
  if (init.sectionText && o.initSections === undefined) o.initSections = init.sectionText
}
export const decisionMessages = {
  "dry-run": "dry-run: 変更・インストールは行いません",
  decline: "中止しました。変更・インストールは行いません",
  "needs-apply": "変更なし。非対話式の適用には --yes --apply を指定してください",
} as const
export type PlanSummary = {
  create: unknown[]
  pkgChanged: boolean
  configDest: string | undefined
}
/** 計画に適用すべき変更があるか。package.json と --save-config の書き込みも含めて数える。 */
export function planPending(plan: PlanSummary): boolean {
  return plan.create.length > 0 || plan.pkgChanged || plan.configDest !== undefined
}
/** 承認されなかった理由の案内。適用すべき変更があるのに --apply が無い場合は区別する。 */
export function decisionMessage(decision: keyof typeof decisionMessages, pending: boolean): string {
  if (decision !== "needs-apply" || !pending) return decisionMessages[decision]
  return "計画は適用していません。適用するには --yes --apply を指定してください"
}
export async function run(args: string[], ui: SetupUi = setupUi): Promise<number> {
  const o = option(args)
  if (o.planJson && (o.help || o.list))
    throw new Error("--plan-json は --help / --list-presets と併用できません")
  if (o.help) {
    console.log(usage)
    return 0
  }
  if (o.list) {
    for (const [key, p] of Object.entries(presets))
      console.log(`${key}: ${p.description} (${p.template}, ${p.features.length} 機能)`)
    console.log(`機能: ${featureNames.join(", ")}`)
    return 0
  }
  if (o.planJson) {
    if (o.apply || o.saveConfig)
      throw new Error("--plan-json は --apply / --save-config と同時に指定できません")
    o.yes = true
    o.dryRun = true
  }
  o.dir = resolve(o.dir)
  if (!existsSync(o.dir) || !statSync(o.dir).isDirectory())
    throw new Error(`対象ディレクトリが存在しません: ${o.dir}`)
  loadConfig(o)
  assertChoices(o) // Validate JSON and CLI values before indexing presets / templates.
  const tty = ui.tty
  if (!tty && !o.yes && !o.dryRun)
    throw new Error("非対話式には --yes を指定してください（書き込みには --apply も必要）")
  const init = await maybeInit(o, tty)
  if (o.initOnly) return init?.code ?? 0
  let filesApplied = false
  try {
    const selection = await collectSelection(o, ui)
    const plan = buildSetupPlan(selection.resolved, selection.generated, selection.pkg)
    if (o.planJson) {
      printPlanJson(
        selection.resolved,
        plan.files,
        selection.requires,
        selection.incompatible,
        init,
      )
      return 0
    }
    printPlan(selection.resolved, plan.files, selection.requires)
    const decision = await planApproval(o, tty, () => ui.confirm("この計画を適用しますか？ [y/N]"))
    if (decision !== "apply") {
      console.log(decisionMessage(decision, planPending(plan)))
      return 0
    }
    const applied = applyPlan(
      selection.resolved,
      plan.create,
      selection.pkg,
      plan.pkgPath,
      plan.pkgChanged,
      plan.configDest,
    )
    filesApplied = true
    // 件数は実際に書いた物から数える。計画の + 行（package.json も含む）と食い違わせない
    console.log(
      `作成 ${applied.created.length} 件、更新 ${applied.changed.length} 件、保持 ${plan.retained.length} 件。${
        applied.backup ? `バックアップ: ${applied.backup}` : ""
      }`,
    )
    if (!o.noInstall) installDependencies(o, ui.install)
    const missingNativeTool = await installOsPackages(o, tty, selection.requires, ui.install)
    if (!o.noInstall && !missingNativeTool)
      installNative(o, selection.resolved.template, ui.install)
    else if (missingNativeTool)
      console.log("言語別の依存導入は保留しました。必要な実行ツールを用意してください")
    console.log(
      "セットアップ処理が終わりました。案内した文書・スキル候補を確認してください（自動削除はしません）。",
    )
    return 0
  } catch (e) {
    if (e instanceof SetupCancelled) {
      cancel(
        filesApplied
          ? "後続の導入を中止しました。生成済みのファイルは保持します"
          : "中止しました。変更・インストールは行いません",
      )
      return 0
    }
    throw e
  }
}
/** テンプレート初期化が必要なら実行する。`--no-init` とテンプレート以外では何もしない。 */
export async function maybeInit(o: Options, tty: boolean): Promise<InitOutcome | null> {
  if (o.noInit || (!o.initOnly && !isTemplate(o.dir))) return null
  const outcome = await initPhase(o, tty)
  if (o.planJson && o.initOnly) printInitPlanJson(outcome)
  return outcome
}
/** 引数・対話で選択を確定し、生成物と package.json を組み立てる。 */
export async function collectSelection(o: Options, ui: SetupUi): Promise<Selection> {
  await promptChoices(o, ui)
  const explicitFeatures = o.features !== undefined
  o.features ??= presets[o.preset as Preset].features
  assertChoices(o)
  // ここから先は name / preset / language / template / features が確定している。
  return buildSelection(o as Resolved, explicitFeatures)
}
/** 未指定の項目だけ対話で聞く（`--yes` や非 TTY なら既定値のまま）。 */
export async function promptChoices(o: Options, ui: SetupUi): Promise<void> {
  const suggestedName = defaultName(o.dir)
  const ask = ui.tty && !o.yes
  if (!o.preset && ask)
    o.preset = await ui.select("プリセット", Object.keys(presets) as Preset[], "recommended")
  o.preset ??= "recommended"
  const preset = presets[o.preset]
  if (!o.language && ask)
    o.language = await ui.select("使用する言語", Object.keys(templates) as Language[], "typescript")
  o.language ??= "typescript"
  if (!o.template && ask)
    o.template = await ui.select(
      "テンプレート",
      templates[o.language],
      templates[o.language].includes(preset.template) ? preset.template : templates[o.language][0],
    )
  o.template ??= templates[o.language].includes(preset.template)
    ? preset.template
    : templates[o.language][0]
  if (!o.name && ask)
    o.name = await ui.text("プロジェクト名", suggestedName, (value) =>
      nameSchema.safeParse(value).success
        ? undefined
        : "英小文字で始まる kebab-case（最大 64 文字）で指定してください",
    )
  o.name ??= suggestedName
  if (!o.description && ask) o.description = await ui.text("したいこと・概要（任意）", "")
  if (!o.features && ask) {
    console.log(`推奨機能: ${preset.features.join(", ") || "なし"}`)
    const input = await ui.text("機能を変更する場合はカンマ区切りで入力（Enter で推奨）", "")
    if (input)
      o.features =
        input === "none"
          ? []
          : input === "all"
            ? [...featureNames]
            : (input.split(",").map((s) => s.trim()) as Options["features"])
  }
}
/** 確定した選択から生成物と package.json を組み立てる。 */
export function buildSelection(r: Resolved, explicitFeatures: boolean): Selection {
  const allowed = compatibleFeatures(r.template)
  const incompatible = r.features.filter((f) => !allowed.includes(f))
  if (incompatible.length) {
    if (explicitFeatures)
      throw new Error(`${r.template} では使用できない機能: ${incompatible.join(", ")}`)
    if (!r.planJson)
      console.log(`対象言語・テンプレートに非対応の機能を除外: ${incompatible.join(", ")}`)
    r.features = r.features.filter((f) => allowed.includes(f))
  }
  const base = scaffold(r.template, r.name)
  const extra = featureScaffold(r.features, r.name, r.template)
  if (
    r.features.includes("termux") &&
    process.env.PREFIX?.includes("com.termux") &&
    r.template === "next" &&
    base.scripts
  )
    base.scripts.dev = "bun x next dev --webpack"
  const generated = { ...base.files, ...extra.files }
  applyLanguageVariants(r, generated, base)
  const existing = existsSync(join(r.dir, "package.json"))
    ? readJson(join(r.dir, "package.json"))
    : {}
  return {
    resolved: r,
    generated,
    pkg: buildPackage(r, base, extra, existing),
    requires: base.requires || [],
    incompatible,
  }
}
/** CLI 入口。失敗は NG の表示と終了コード 1 になり、例外を投げない。 */
export async function setupEntry(args: string[]): Promise<number> {
  try {
    return await run(args)
  } catch (e) {
    console.error(`NG: ${e instanceof Error ? e.message : e}`)
    return 1
  }
}

if (import.meta.main) process.exit(await setupEntry(process.argv.slice(2)))
