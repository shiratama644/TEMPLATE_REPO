import { CommitParser } from "conventional-commits-parser"
import { stripCommit } from "./check_language.ts"

// Keep this allowlist aligned with AGENTS.md §4.2 and the commit-msg hook.
const headerPattern =
  /^(feat|fix|docs|test|refactor|perf|chore|build|ci)(?:\(([A-Za-z0-9_-]+)\))?(!)?: (\S(?:.*\S)?)$/
const parser = new CommitParser({
  headerPattern,
  headerCorrespondence: ["type", "scope", "breaking", "subject"],
})

export function classifyCommit(message: string): { type: string | null; subject: string } {
  const header = stripCommit(message).split(/\r?\n/, 1)[0]
  const match = headerPattern.exec(header)
  if (!match) return { type: null, subject: header }
  const parsed = parser.parse(header)
  // Parsing alone does not validate a header. Require both the canonical shape and parsed fields.
  if (parsed.type !== match[1] || parsed.subject !== match[4])
    return { type: null, subject: header }
  return { type: parsed.type, subject: parsed.subject }
}

export function validateCommitMessage(message: string): string | null {
  const { type } = classifyCommit(message)
  return type ? null : "Conventional Commits 形式が必要です（例: fix(scope): 件名）"
}
