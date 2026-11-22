import { readFileSync } from "node:fs"
import { validateCommitMessage } from "./conventional_commit.ts"

export function checkCommitFile(path: string): number {
  try {
    const message = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path))
    const error = validateCommitMessage(message)
    if (error) {
      console.error(`NG: ${error}`)
      return 1
    }
    return 0
  } catch (error) {
    console.error(
      `NG: コミットメッセージを確認できません: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 1
  }
}

if (import.meta.main) {
  if (process.argv.length !== 3 || !process.argv[2]) {
    console.error("使用方法: bun scripts/check_commit.ts <commit-message-file>")
    process.exitCode = 1
  } else process.exitCode = checkCommitFile(process.argv[2])
}
