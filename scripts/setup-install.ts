/** 依存の導入（`bun install`・OS パッケージ・言語別の手順）。導入は毎回承認を挟む。 */
import { spawnSync } from "node:child_process"
import { lstatSync } from "node:fs"
import { join } from "node:path"
import { text } from "@clack/prompts"
import { available, detectPackageManager, nativeInstallSteps, osCommand } from "./setup-env.ts"
import type { Options } from "./setup-options.ts"
import { required } from "./setup-options.ts"

/**
 * 導入の実行環境。テストは偽物を渡して、実際に何も導入せずに分岐を検証する。
 * `run` は終了コードを返す（0 が成功）。`ask` は対話端末での承認の答え。
 */
export type InstallEnv = {
  run(command: string, args: string[], cwd?: string): number
  ask(message: string): Promise<string>
  has(bin: string): boolean
  manager(): { name: string; packages: Record<string, string> } | null
}
export const installEnv: InstallEnv = {
  run: (command, args, cwd) =>
    spawnSync(command, args, { cwd, stdio: "inherit", shell: false }).status ?? 1,
  ask: async (message) => required(await text({ message, defaultValue: "" })),
  has: (bin) => available(bin),
  manager: () => detectPackageManager(),
}

export function installDependencies(o: Options, env: InstallEnv = installEnv): void {
  console.log("Bun 依存をインストール: bun install")
  if (env.run("bun", ["install"], o.dir) !== 0)
    throw new Error(
      "bun install に失敗。生成ファイルは残しています。設定を確認して再実行してください",
    )
}
/** OS パッケージは対話端末で 1 件ずつ承認する。導入できなければ true を返す。 */
export async function installOsPackages(
  o: Options,
  tty: boolean,
  requires: string[],
  env: InstallEnv = installEnv,
): Promise<boolean> {
  let missingNativeTool = false
  for (const bin of requires) {
    if (env.has(bin)) continue
    const m = env.manager(),
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
    if ((await env.ask(`${bin} を今インストールしますか？コマンドを確認し yes と入力`)) !== "yes") {
      missingNativeTool = true
      continue
    }
    if (env.run(command[0], command.slice(1)) !== 0) {
      console.error(`${bin} のインストールに失敗しました。手動で確認してください`)
      missingNativeTool = true
    } else missingNativeTool ||= !env.has(bin)
  }
  return missingNativeTool
}
export function installNative(
  o: Options,
  template: Parameters<typeof nativeInstallSteps>[0],
  env: InstallEnv = installEnv,
): void {
  const steps = nativeInstallSteps(template, o.dir)
  if (steps.length && lstatSync(join(o.dir, ".venv"), { throwIfNoEntry: false })?.isSymbolicLink())
    throw new Error(".venv が symlink です。安全のため依存導入を中止します")
  for (const [command, ...args] of steps) {
    console.log(`言語別の依存を導入: ${command} ${args.join(" ")}`)
    if (env.run(command, args, o.dir) !== 0)
      throw new Error(`依存導入に失敗しました: ${command}。生成ファイルは保持します`)
  }
}
