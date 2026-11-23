import { spawnSync } from "node:child_process"
import { checkAgents } from "./check_agents.ts"
import { checkLinks } from "./check_doc_links.ts"
import { checkLanguage } from "./check_language.ts"
import { checkMermaid } from "./check_mermaid.ts"

const commands: Array<[string, () => number]> = [
  ["内部リンク", checkLinks],
  ["Mermaid 宣言", checkMermaid],
  ["日本語・英語ゲート", () => checkLanguage()],
  ["AGENTS.md", checkAgents],
  ["Biome", () => spawnSync("bun", ["x", "biome", "check", "."], { stdio: "inherit" }).status ?? 1],
  ["型検査", () => spawnSync("bun", ["run", "typecheck"], { stdio: "inherit" }).status ?? 1],
  ["テスト", () => spawnSync("bun", ["test"], { stdio: "inherit" }).status ?? 1],
]
for (const [name, run] of commands) {
  console.log(`== ${name}`)
  if (run() !== 0) {
    console.error(`NG: ${name}`)
    process.exit(1)
  }
}
console.log(`OK: ${commands.length} ゲートが通りました`)
