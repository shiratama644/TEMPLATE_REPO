import { spawnSync } from "node:child_process"
import { checkAgents } from "./check-agents.ts"
import { checkCoverage } from "./check-coverage.ts"
import { checkLinks } from "./check-doc-links.ts"
import { checkFunctionLength } from "./check-function-length.ts"
import { checkIndex } from "./check-index.ts"
import { checkLanguage } from "./check-language.ts"
import { checkMermaid } from "./check-mermaid.ts"
import { checkShell } from "./check-shell.ts"

export type Gate = [name: string, run: () => number]
/** 検証の正本。順序は表示どおりで、失敗した所で止める。 */
export const gates: Gate[] = [
  ["内部リンク", checkLinks],
  ["Mermaid 宣言", checkMermaid],
  ["日本語・英語ゲート", () => checkLanguage()],
  ["AGENTS.md", checkAgents],
  ["入口整合", () => checkIndex()],
  ["POSIX sh", () => checkShell()],
  ["関数長", () => checkFunctionLength()],
  ["Biome", () => spawnSync("bun", ["x", "biome", "check", "."], { stdio: "inherit" }).status ?? 1],
  ["型検査", () => spawnSync("bun", ["run", "typecheck"], { stdio: "inherit" }).status ?? 1],
  ["テストとカバレッジ", () => checkCoverage()],
]

/** ゲートを順に実行し、最初の失敗で止めて 1 を返す。全部通れば 0。 */
export function runGates(list: Gate[] = gates): number {
  for (const [name, run] of list) {
    console.log(`== ${name}`)
    if (run() !== 0) {
      console.error(`NG: ${name}`)
      return 1
    }
  }
  console.log(`OK: ${list.length} ゲートが通りました`)
  return 0
}

if (import.meta.main) process.exit(runGates())
