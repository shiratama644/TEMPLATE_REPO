#!/usr/bin/env bun
/** Interactive / non-interactive Bun bootstrap. No existing user file is deleted. */
import { existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { cancel, confirm, select, text } from "@clack/prompts"
import { applyPlan } from "./setup-apply.ts"
import { installDependencies, installNative, installOsPackages } from "./setup-install.ts"
import {
  compatibleFeatures,
  featureNames,
  featureScaffold,
  type Language,
  type Preset,
  presets,
  type Scaffold,
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

type Selection = {
  resolved: Resolved
  generated: Record<string, string>
  pkg: Record<string, unknown>
  requires: string[]
  incompatible: string[]
}
/** `--config` の JSON を CLI 引数より弱い優先度で反映する。 */
function loadConfig(o: Options): void {
  if (!o.config) return
  const config = readJson(resolve(o.config))
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("設定ファイルは JSON オブジェクトで指定してください")
  validateConfig(config)
  const keys = ["name", "description", "language", "template", "preset", "features"] as const
  for (const k of keys)
    if (config[k] !== undefined && o[k] === undefined)
      (o as unknown as Record<string, unknown>)[k] = config[k]
}
const decisionMessages = {
  "dry-run": "dry-run: 変更・インストールは行いません",
  decline: "中止しました。変更・インストールは行いません",
  "needs-apply": "変更なし。非対話式の適用には --yes --apply を指定してください",
} as const
export async function run(args: string[]): Promise<number> {
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
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  if (!tty && !o.yes && !o.dryRun)
    throw new Error("非対話式には --yes を指定してください（書き込みには --apply も必要）")
  let filesApplied = false
  try {
    const selection = await collectSelection(o, tty)
    const plan = buildSetupPlan(selection.resolved, selection.generated, selection.pkg)
    if (o.planJson) {
      printPlanJson(selection.resolved, plan.files, selection.requires, selection.incompatible)
      return 0
    }
    printPlan(selection.resolved, plan.files, selection.requires)
    const decision = await planApproval(o, tty, () =>
      confirm({
        message: "この計画を適用しますか？ [y/N]",
        initialValue: false,
        active: "y",
        inactive: "N",
      }),
    )
    if (decision !== "apply") {
      console.log(decisionMessages[decision])
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
    console.log(
      `作成 ${plan.create.length} 件、保持 ${plan.retained.length} 件。${applied.changed.length ? `バックアップ: ${applied.backup}` : ""}`,
    )
    if (!o.noInstall) installDependencies(o)
    const missingNativeTool = await installOsPackages(o, tty, selection.requires)
    if (!o.noInstall && !missingNativeTool) installNative(o, selection.resolved.template)
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
/** 引数・対話で選択を確定し、生成物と package.json を組み立てる。 */
async function collectSelection(o: Options, tty: boolean): Promise<Selection> {
  await promptChoices(o, tty)
  const explicitFeatures = o.features !== undefined
  o.features ??= presets[o.preset as Preset].features
  assertChoices(o)
  // ここから先は name / preset / language / template / features が確定している。
  return buildSelection(o as Resolved, explicitFeatures)
}
/** 未指定の項目だけ対話で聞く（`--yes` や非 TTY なら既定値のまま）。 */
async function promptChoices(o: Options, tty: boolean): Promise<void> {
  const suggestedName = defaultName(o.dir)
  const selectChoice = async <T extends string>(
    label: string,
    values: readonly T[],
    fallback: T,
  ): Promise<T> =>
    required(
      await select<string>({
        message: label,
        options: values.map((value) => ({ value, label: value })),
        initialValue: fallback,
      }),
    ) as T
  const ask = tty && !o.yes
  if (!o.preset && ask)
    o.preset = await selectChoice("プリセット", Object.keys(presets) as Preset[], "recommended")
  o.preset ??= "recommended"
  const preset = presets[o.preset]
  if (!o.language && ask)
    o.language = await selectChoice(
      "使用する言語",
      Object.keys(templates) as Language[],
      "typescript",
    )
  o.language ??= "typescript"
  if (!o.template && ask)
    o.template = await selectChoice(
      "テンプレート",
      templates[o.language],
      templates[o.language].includes(preset.template) ? preset.template : templates[o.language][0],
    )
  o.template ??= templates[o.language].includes(preset.template)
    ? preset.template
    : templates[o.language][0]
  if (!o.name && ask)
    o.name = required(
      await text({
        message: "プロジェクト名",
        initialValue: suggestedName,
        defaultValue: suggestedName,
        validate: (value) =>
          nameSchema.safeParse(value).success
            ? undefined
            : "英小文字で始まる kebab-case（最大 64 文字）で指定してください",
      }),
    )
  o.name ??= suggestedName
  if (!o.description && ask)
    o.description = required(await text({ message: "したいこと・概要（任意）", defaultValue: "" }))
  if (!o.features && ask) {
    console.log(`推奨機能: ${preset.features.join(", ") || "なし"}`)
    const input = required(
      await text({
        message: "機能を変更する場合はカンマ区切りで入力（Enter で推奨）",
        defaultValue: "",
      }),
    )
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
function buildSelection(r: Resolved, explicitFeatures: boolean): Selection {
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
if (import.meta.main)
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(`NG: ${e instanceof Error ? e.message : e}`)
      process.exit(1)
    })
