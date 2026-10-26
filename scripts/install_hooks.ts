import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { root } from "./walk.ts"

const hooks = join(root, ".git/hooks")
if (!existsSync(hooks)) {
  console.error("Git リポジトリが必要です")
  process.exit(1)
}
const current = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim()
if (current && current !== ".githooks") {
  console.error(`既存の Git hooksPath を上書きしません: ${current}`)
  process.exit(1)
}
if (!current)
  for (const name of readdirSync(hooks)) {
    if (name.endsWith(".sample")) continue
    if (["pre-commit", "commit-msg"].includes(name) && statSync(join(hooks, name)).isFile()) {
      console.error(`既存の Git フック ${name} を無効化せず停止します。手動で統合してください`)
      process.exit(1)
    }
  }
const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
})
process.exit(result.status ?? 1)
