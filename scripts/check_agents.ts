import { join } from "node:path"
import { root } from "./walk.ts"
// Bun のパッチで npm bin の no-op を修正済み。CLI は実体から起動し OS 別 bin shim に依存しない。
export function checkAgents(): number {
  const result = Bun.spawnSync(
    [
      process.execPath,
      join(root, "node_modules/agents-md-lint/dist/cli.js"),
      "--root",
      ".",
      "AGENTS.md",
    ],
    { cwd: root, stdout: "inherit", stderr: "inherit" },
  )
  return result.exitCode
}
if (import.meta.main) process.exit(checkAgents())
