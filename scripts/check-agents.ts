import { join } from "node:path"
import { root } from "./walk.ts"

/**
 * 指示ファイルの品質検査（agents-md-lint）の起動。
 * Bun のパッチで npm bin の no-op を修正済み。CLI は実体から起動し OS 別 bin shim に依存しない。
 */
export type LintRunner = (args: string[]) => number
export const lintCli: LintRunner = (args) =>
  Bun.spawnSync(
    [process.execPath, join(root, "node_modules/agents-md-lint/dist/cli.js"), ...args],
    { cwd: root, stdout: "inherit", stderr: "inherit" },
  ).exitCode

export function checkAgents(run: LintRunner = lintCli): number {
  return run(["--root", ".", "AGENTS.md"])
}

if (import.meta.main) process.exit(checkAgents())
