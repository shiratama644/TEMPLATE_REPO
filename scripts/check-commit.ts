import { readFileSync } from "node:fs"
import { validateCommitMessage } from "./conventional-commit.ts"

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

/** CLI 入口。引数の形が違えば使い方を示して失敗する（fail closed）。 */
export function checkCommitEntry(argv: string[]): number {
  if (argv.length !== 3 || !argv[2]) {
    console.error("使用方法: bun scripts/check-commit.ts <commit-message-file>")
    return 1
  }
  return checkCommitFile(argv[2])
}

if (import.meta.main) process.exitCode = checkCommitEntry(process.argv)
