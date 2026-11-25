/** 適用前に表示する計画（作成・保持・更新の一覧と、`--plan-json` の出力）。 */
import { existsSync, lstatSync, readFileSync } from "node:fs"
import { safe } from "./safe-path.ts"
import { available, detectPackageManager, osCommand } from "./setup-env.ts"
import type { InitOutcome } from "./setup-init.ts"
import type { Resolved } from "./setup-options.ts"
import { suggestions } from "./setup-options.ts"
import { json } from "./setup-package.ts"

/** 計画表示が使う OS の事実。テストは偽物を渡して平台に依存しない出力を検証する。 */
export type PlanEnv = {
  manager(): { name: string; packages: Record<string, string> } | null
  has(bin: string): boolean
  platform: string
}
export const planEnv: PlanEnv = {
  manager: () => detectPackageManager(),
  has: (bin) => available(bin),
  platform: process.platform,
}
export type PlanFile = {
  path: string
  action: "create" | "retain" | "update"
  backupPlanned?: boolean
}
export function buildSetupPlan(
  o: Resolved,
  generated: Record<string, string>,
  pkg: Record<string, unknown>,
) {
  const pkgPath = safe(o.dir, "package.json")
  if (lstatSync(pkgPath, { throwIfNoEntry: false })?.isSymbolicLink())
    throw new Error("package.json が symlink です。安全のため中止します")
  const create = Object.entries(generated).filter(([p]) => !existsSync(safe(o.dir, p)))
  const retained = Object.keys(generated).filter((p) => existsSync(safe(o.dir, p)))
  const pkgChanged = !existsSync(pkgPath) || readFileSync(pkgPath, "utf8") !== json(pkg)
  const configDest = o.saveConfig ? safe(o.dir, o.saveConfig) : undefined
  if (configDest && existsSync(configDest))
    throw new Error(`既存の設定ファイルを上書きできません: ${o.saveConfig}`)
  // 適用時に退避先を作れるかを計画の段階で確かめる（symlink での逃走はここで止まる）
  if (pkgChanged && existsSync(pkgPath)) safe(o.dir, ".setup-backup/check")
  const files: PlanFile[] = [
    ...create.map(([path]) => ({ path, action: "create" as const })),
    ...retained.map((path) => ({ path, action: "retain" as const })),
    {
      path: "package.json",
      action: pkgChanged ? (existsSync(pkgPath) ? "update" : "create") : "retain",
      backupPlanned: pkgChanged && existsSync(pkgPath),
    },
    ...(configDest ? [{ path: o.saveConfig as string, action: "create" as const }] : []),
  ]
  return { create, retained, pkgChanged, configDest, files, pkgPath }
}
export function printPlanJson(
  o: Resolved,
  files: PlanFile[],
  requires: string[],
  incompatible: string[],
  init?: InitOutcome | null,
  env: PlanEnv = planEnv,
): void {
  const manager = env.manager()
  console.log(
    json({
      schemaVersion: 1,
      mode: "preview",
      selection: {
        name: o.name,
        language: o.language,
        template: o.template,
        preset: o.preset,
        features: o.features,
        excludedFeatures: incompatible,
      },
      files,
      prerequisites: {
        runtime: requires,
        missing: requires.filter((bin) => !env.has(bin)),
        osPackageManager: manager?.name ?? null,
        osPackages: requires
          .filter((bin) => !env.has(bin))
          .map((bin) => {
            const name = manager?.packages[bin]
            return {
              tool: bin,
              command: manager && name ? osCommand(manager.name, name) : null,
              status: "manual-confirmation-required",
            }
          }),
        osPackagesRequireIndividualApproval: true,
      },
      dependencies: { wouldInstallOnApply: !o.noInstall, executed: false },
      ...(init?.plan
        ? {
            init: {
              answers: init.answers,
              writes: init.plan.writes.map((f) => f.path),
              unchanged: init.plan.unchanged,
              skipped: init.plan.skipped,
              deletes: init.plan.deletes,
              blocked: init.plan.blocked,
              missing: init.plan.missing,
              notes: init.plan.notes,
            },
          }
        : {}),
      manualReview: suggestions,
    }),
  )
}
export function printPlan(
  o: Resolved,
  files: PlanFile[],
  requires: string[],
  env: PlanEnv = planEnv,
): void {
  console.log(`\nセットアップ計画: ${o.name} / ${o.language} / ${o.template} / ${o.preset}`)
  console.log(`機能: ${o.features.join(", ") || "なし"}`)
  console.log(
    `OS: ${env.platform} / ${env.manager()?.name ?? "未対応"}  必要: ${requires.join(", ") || "Bun"}`,
  )
  for (const file of files) {
    if (file.action === "retain") console.log(`= ${file.path} （既存を保持）`)
    else if (file.path === "package.json" && file.backupPlanned)
      console.log(`~ package.json （バックアップを作成）`)
    else console.log(`+ ${file.path}`)
  }
  console.log(`完了後に手動で確認・修正する候補（自動削除なし）:\n- ${suggestions.join("\n- ")}`)
}
