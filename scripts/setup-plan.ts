/** 適用前に表示する計画（作成・保持・更新の一覧と、`--plan-json` の出力）。 */
import { existsSync, lstatSync, readFileSync } from "node:fs"
import { safe } from "./safe-path.ts"
import { available, detectPackageManager, osCommand } from "./setup-env.ts"
import type { Resolved } from "./setup-options.ts"
import { suggestions } from "./setup-options.ts"
import { json } from "./setup-package.ts"

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
): void {
  const manager = detectPackageManager()
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
        missing: requires.filter((bin) => !available(bin)),
        osPackageManager: manager?.name ?? null,
        osPackages: requires
          .filter((bin) => !available(bin))
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
      manualReview: suggestions,
    }),
  )
}
export function printPlan(o: Resolved, files: PlanFile[], requires: string[]): void {
  console.log(`\nセットアップ計画: ${o.name} / ${o.language} / ${o.template} / ${o.preset}`)
  console.log(`機能: ${o.features.join(", ") || "なし"}`)
  console.log(
    `OS: ${process.platform} / ${detectPackageManager()?.name ?? "未対応"}  必要: ${requires.join(", ") || "Bun"}`,
  )
  for (const file of files) {
    if (file.action === "retain") console.log(`= ${file.path} （既存を保持）`)
    else if (file.path === "package.json" && file.backupPlanned)
      console.log(`~ package.json （バックアップを作成）`)
    else console.log(`+ ${file.path}`)
  }
  console.log(`完了後に手動で確認・修正する候補（自動削除なし）:\n- ${suggestions.join("\n- ")}`)
}
