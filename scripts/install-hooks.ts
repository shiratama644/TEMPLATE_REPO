import { spawnSync } from "node:child_process"
import { accessSync, constants, existsSync, readdirSync, realpathSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { root } from "./walk.ts"

function git(base: string, ...args: string[]) {
  return spawnSync("git", args, { cwd: base, encoding: "utf8" })
}

/** Git は実行権のあるパスしかフックとして実行しない。実行可能性だけを見る。 */
function runnable(target: string): boolean {
  try {
    accessSync(target, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** ディレクトリの中に Git が実行するフック（実行可能な通常ファイル）があるか。 */
function hookFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => {
      const target = resolve(dir, name)
      return runnable(target) && statSync(target).isFile()
    })
    .sort()
}

export type HooksOptions = { optionalGit?: boolean; force?: boolean }

/**
 * 導入できない理由を伝える。postinstall（optionalGit）では失敗を返さない。
 * `core.hooksPath` は clone した側の都合で決まるので、依存の導入を止める理由にしない。
 */
function refuse(message: string, options: HooksOptions): number {
  if (!options.optionalGit) {
    console.error(message)
    return 1
  }
  console.warn(message)
  console.warn("postinstall は Git の設定を変えずに終了します（bun install は失敗しません）")
  return 0
}

export function installHooks(base = root, options: HooksOptions = {}): number {
  const repo = git(base, "rev-parse", "--show-toplevel")
  if (repo.status !== 0 || resolve(repo.stdout.trim()) !== resolve(base)) {
    if (options.optionalGit) {
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
    const foreign = hookFiles(resolve(base, current))
    if (foreign.length > 0 && !options.force)
      return refuse(
        `既存の Git hooksPath を上書きしません: ${current}（実行中のフック: ${foreign.join(", ")}）。` +
          "置き換えるには bun run hooks:install --force",
        options,
      )
    console.log(
      `core.hooksPath を ${current} から .githooks に切り替えます` +
        `（${foreign.join(", ") || "実行可能なフックはありません"}）`,
    )
    console.log(`${current} は消しません。戻すには git config core.hooksPath ${current}`)
  }
  for (const name of ["pre-commit", "commit-msg", "chain-legacy"]) {
    if (!runnable(resolve(base, ".githooks", name)))
      return refuse(`実行可能な .githooks/${name} が必要です`, options)
  }
  const common = git(base, "rev-parse", "--git-common-dir")
  if (common.status !== 0) return refuse("git-common-dir を解決できませんでした", options)
  const hooks = resolve(base, common.stdout.trim(), "hooks")
  if (existsSync(hooks)) {
    for (const name of readdirSync(hooks)) {
      if (name.endsWith(".sample")) continue
      const target = resolve(hooks, name)
      if (!runnable(target)) continue // Git ignores non-executable hooks.
      if (!["pre-commit", "commit-msg"].includes(name))
        return refuse(`既存の Git フック ${name} は自動で引き継げません`, options)
      if (realpathSync(target) === realpathSync(resolve(base, ".githooks", name)))
        return refuse(`既存フック ${name} が新フック自身を指しています`, options)
      if (!statSync(target).isFile())
        return refuse(`既存フック ${name} は通常のファイルではありません`, options)
    }
  }
  const result = git(base, "config", "--local", "core.hooksPath", ".githooks")
  if (result.status !== 0) return refuse(result.stderr.trim() || "設定に失敗しました", options)
  console.log(".githooks を有効化しました（既存の commit-msg/pre-commit は保持）")
  return 0
}

/** postinstall は `--if-git`（Git 管理外でも成功）、稼働中の hooksPath の置き換えは `--force`。 */
export function hookOptions(argv: string[]): HooksOptions {
  return { optionalGit: argv.includes("--if-git"), force: argv.includes("--force") }
}

if (import.meta.main) process.exitCode = installHooks(root, hookOptions(process.argv))
