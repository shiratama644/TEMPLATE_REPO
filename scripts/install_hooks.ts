import { spawnSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { root } from "./walk.ts"

// Git worktrees have a .git file rather than a .git directory.
const gitHooks = spawnSync("git", ["rev-parse", "--git-path", "hooks"], {
  cwd: root,
  encoding: "utf8",
})
if (gitHooks.status !== 0) {
  console.error("Git リポジトリが必要です")
  process.exit(1)
}
const hooks = resolve(root, gitHooks.stdout.trim())
const current = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim()
if (current && current !== ".githooks") {
  console.error(`既存の Git hooksPath を上書きしません: ${current}`)
  process.exit(1)
}
if (!current && existsSync(hooks))
  for (const name of readdirSync(hooks)) {
    if (name.endsWith(".sample")) continue
    if (["pre-commit", "commit-msg"].includes(name)) {
      console.error(`既存の Git フック ${name} を無効化せず停止します。手動で統合してください`)
      process.exit(1)
    }
  }
const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
})
process.exit(result.status ?? 1)
