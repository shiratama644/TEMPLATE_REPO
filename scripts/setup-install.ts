/** 依存の導入（`bun install`・OS パッケージ・言語別の手順）。導入は毎回承認を挟む。 */
import { spawnSync } from "node:child_process"
import { lstatSync } from "node:fs"
import { join } from "node:path"
import { text } from "@clack/prompts"
import { available, detectPackageManager, nativeInstallSteps, osCommand } from "./setup-env.ts"
import type { Options } from "./setup-options.ts"
import { required } from "./setup-options.ts"

export function installDependencies(o: Options): void {
  console.log("Bun 依存をインストール: bun install")
  const installed = spawnSync("bun", ["install"], {
    cwd: o.dir,
    stdio: "inherit",
    shell: false,
  })
  if (installed.status !== 0)
    throw new Error(
      "bun install に失敗。生成ファイルは残しています。設定を確認して再実行してください",
    )
}
/** OS パッケージは対話端末で 1 件ずつ承認する。導入できなければ true を返す。 */
export async function installOsPackages(o: Options, tty: boolean, requires: string[]) {
  let missingNativeTool = false
  for (const bin of requires) {
    if (available(bin)) continue
    const m = detectPackageManager(),
      p = m?.packages[bin]
    if (!m || !p) {
      console.log(`${bin} が必要です。OS に応じて手動で導入してください`)
      missingNativeTool = true
      continue
    }
    const command = osCommand(m.name, p)
    console.log(`必要な OS パッケージ: ${command.join(" ")}`)
    if (!tty || o.yes || o.noOsInstall) {
      console.log("OS パッケージは自動導入しません")
      missingNativeTool = true
      continue
    }
    if (
      required(
        await text({
          message: `${bin} を今インストールしますか？コマンドを確認し yes と入力`,
          defaultValue: "",
        }),
      ) !== "yes"
    ) {
      missingNativeTool = true
      continue
    }
    const installed = spawnSync(command[0], command.slice(1), { stdio: "inherit", shell: false })
    if (installed.status !== 0) {
      console.error(`${bin} のインストールに失敗しました。手動で確認してください`)
      missingNativeTool = true
    } else missingNativeTool ||= !available(bin)
  }
  return missingNativeTool
}
export function installNative(o: Options, template: Parameters<typeof nativeInstallSteps>[0]) {
  const steps = nativeInstallSteps(template, o.dir)
  if (steps.length && lstatSync(join(o.dir, ".venv"), { throwIfNoEntry: false })?.isSymbolicLink())
    throw new Error(".venv が symlink です。安全のため依存導入を中止します")
  for (const [command, ...args] of steps) {
    console.log(`言語別の依存を導入: ${command} ${args.join(" ")}`)
    const result = spawnSync(command, args, { cwd: o.dir, stdio: "inherit", shell: false })
    if (result.status !== 0)
      throw new Error(`依存導入に失敗しました: ${command}。生成ファイルは保持します`)
  }
}
