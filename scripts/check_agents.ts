import { join } from "node:path"
import { root } from "./walk.ts"
// agents-md-lint 1.0.1 の npm bin symlink は no-op。realpath の CLI 本体を起動する。
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
