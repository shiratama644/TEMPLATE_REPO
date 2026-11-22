import { spawnSync } from "node:child_process"
import { accessSync, constants, existsSync, readdirSync, realpathSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { root } from "./walk.ts"

function git(base: string, ...args: string[]) {
  return spawnSync("git", args, { cwd: base, encoding: "utf8" })
}
export function installHooks(base = root, optionalGit = false): number {
  const repo = git(base, "rev-parse", "--show-toplevel")
  if (repo.status !== 0 || resolve(repo.stdout.trim()) !== resolve(base)) {
    if (optionalGit) {
      console.log("Git リポジトリ外のためフック導入を省略します")
      return 0
    }
    console.error("Git リポジトリのルートが必要です")
    return 1
  }
  const current = git(base, "config", "--get", "core.hooksPath").stdout.trim()
  if (current === ".githooks") {
    console.log("Git フックは導入済みです")
    return 0
  }
  if (current) {
    console.error(`既存の Git hooksPath を上書きしません: ${current}`)
    return 1
  }
  for (const name of ["pre-commit", "commit-msg", "chain-legacy"]) {
    try {
      accessSync(resolve(base, ".githooks", name), constants.X_OK)
    } catch {
      console.error(`実行可能な .githooks/${name} が必要です`)
      return 1
    }
  }
  const common = git(base, "rev-parse", "--git-common-dir")
  if (common.status !== 0) return 1
  const hooks = resolve(base, common.stdout.trim(), "hooks")
  if (existsSync(hooks)) {
    for (const name of readdirSync(hooks)) {
      if (name.endsWith(".sample")) continue
      const target = resolve(hooks, name)
      try {
        accessSync(target, constants.X_OK)
      } catch {
        continue
      } // Git ignores non-executable hooks.
      if (!["pre-commit", "commit-msg"].includes(name)) {
        console.error(`既存の Git フック ${name} は自動で引き継げません`)
        return 1
      }
      if (realpathSync(target) === realpathSync(resolve(base, ".githooks", name))) {
        console.error(`既存フック ${name} が新フック自身を指しています`)
        return 1
      }
      if (!statSync(target).isFile()) {
        console.error(`既存フック ${name} は通常のファイルではありません`)
        return 1
      }
    }
  }
  const result = git(base, "config", "--local", "core.hooksPath", ".githooks")
  if (result.status !== 0) console.error(result.stderr)
  else console.log(".githooks を有効化しました（既存の commit-msg/pre-commit は保持）")
  return result.status ?? 1
}
if (import.meta.main) process.exitCode = installHooks(root, process.argv.includes("--if-git"))
