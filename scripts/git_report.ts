// Read-only Git/PR snapshot. Never invokes a Git mutator or a GitHub write endpoint.

import { Octokit } from "@octokit/rest"
import { simpleGit } from "simple-git"
import { classifyCommit } from "./conventional_commit.ts"

export { classifyCommit } from "./conventional_commit.ts"

type Verdict = "pass" | "fail" | "unknown"
export interface Report {
  verdict: Verdict
  branch: string | null
  head: string | null
  dirty: boolean | null
  commits: Array<{ hash: string; type: string | null; subject: string }>
  pr?: { number: number; branch: string; head: string; checks: Verdict; reason: string }
  reasons: string[]
}
const shaPattern = /^[0-9a-f]{40}$/i
export interface PRData {
  number: number
  branch: string
  head: string
  checks: Array<{ status: string; conclusion: string | null }>
}
export function assessPR(report: Report, pr: PRData): Report {
  const reasons = [...report.reasons]
  if (pr.branch !== report.branch || pr.head !== report.head)
    reasons.push("PR の branch/HEAD がローカルと一致しません")
  let checks: Verdict = "pass"
  if (
    pr.checks.length === 0 ||
    pr.checks.some((c) => c.status !== "completed" || c.conclusion === null)
  ) {
    checks = "unknown"
    reasons.push("PR checks が未取得または未完了です")
  } else if (
    pr.checks.some((c) => !["success", "neutral", "skipped"].includes(c.conclusion ?? ""))
  ) {
    checks = "fail"
    reasons.push("PR checks に失敗があります")
  }
  return {
    ...report,
    verdict: reasons.some((r) => r.includes("一致しません") || r.includes("失敗"))
      ? "fail"
      : reasons.length
        ? "unknown"
        : "pass",
    pr: {
      number: pr.number,
      branch: pr.branch,
      head: pr.head,
      checks,
      reason: reasons.at(-1) ?? "確認済み",
    },
    reasons,
  }
}
export async function localReport(dir: string, expectedBranch?: string): Promise<Report> {
  // Exact commands are all read-only. Missing Git, HEAD or repository is reported as unknown.
  try {
    const git = simpleGit({ baseDir: dir, binary: "git" })
    const [branch, head, status, log] = await Promise.all([
      git.branchLocal(),
      git.revparse("HEAD"),
      git.status(),
      git.log({ maxCount: 10 }),
    ])
    const current = branch.current || null
    const sha = head.trim()
    const reasons: string[] = []
    if (!current || !shaPattern.test(sha)) reasons.push("branch または HEAD を確認できません")
    if (expectedBranch && current !== expectedBranch) reasons.push("期待する branch と一致しません")
    if (!status.isClean()) reasons.push("作業ツリーに未コミットの変更があります")
    const commits = log.all.map((c) => ({ hash: c.hash, ...classifyCommit(c.message) }))
    if (commits.some((c) => !c.type))
      reasons.push("Conventional Commits として未解析のコミットがあります")
    return {
      verdict: reasons.some((r) => r.includes("一致しません"))
        ? "fail"
        : reasons.length
          ? "unknown"
          : "pass",
      branch: current,
      head: shaPattern.test(sha) ? sha : null,
      dirty: !status.isClean(),
      commits,
      reasons,
    }
  } catch (e) {
    return {
      verdict: "unknown",
      branch: null,
      head: null,
      dirty: null,
      commits: [],
      reasons: [`ローカル Git を確認できません: ${e instanceof Error ? e.message : "unknown"}`],
    }
  }
}
export interface PRClient {
  getPR(owner: string, repo: string, number: number): Promise<PRData>
}
function octokitClient(token: string): PRClient {
  const api = new Octokit({ auth: token })
  return {
    async getPR(owner, repo, number) {
      const { data: pr } = await api.pulls.get({ owner, repo, pull_number: number })
      const { data: checks } = await api.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha,
        per_page: 100,
      })
      // A truncated response cannot establish that all checks passed.
      if (checks.total_count > checks.check_runs.length)
        return { number, branch: pr.head.ref, head: pr.head.sha, checks: [] }
      return {
        number,
        branch: pr.head.ref,
        head: pr.head.sha,
        checks: checks.check_runs.map(({ status, conclusion }) => ({ status, conclusion })),
      }
    },
  }
}
export async function buildReport(
  dir: string,
  expectedBranch?: string,
  pr?: { repo: string; number: number; token?: string; client?: PRClient },
): Promise<Report> {
  const local = await localReport(dir, expectedBranch)
  if (!pr) return local
  if (!/^[\w.-]+\/[\w.-]+$/.test(pr.repo) || !Number.isSafeInteger(pr.number) || pr.number < 1)
    throw new Error("--repo owner/name と正の --pr 番号を指定してください")
  if (!pr.client && !pr.token)
    return {
      ...local,
      verdict: "unknown",
      reasons: [...local.reasons, "PR 参照には GITHUB_TOKEN が必要です"],
    }
  try {
    const [owner, repo] = pr.repo.split("/") as [string, string]
    return assessPR(
      local,
      await (pr.client ?? octokitClient(pr.token as string)).getPR(owner, repo, pr.number),
    )
  } catch {
    return {
      ...local,
      verdict: "unknown",
      reasons: [...local.reasons, "PR API 参照に失敗しました (未確認)"],
    }
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const value = (key: string) => {
    const i = args.indexOf(key)
    return i < 0 ? undefined : args[i + 1]
  }
  const permitted = new Set(["--json", "--branch", "--repo", "--pr", "--dir"])
  if (args.some((a) => a.startsWith("--") && !permitted.has(a))) throw new Error("不明な引数です")
  const number = value("--pr")
  if ((number && !value("--repo")) || (!number && value("--repo")))
    throw new Error("--pr と --repo は一緒に指定してください")
  const report = await buildReport(
    value("--dir") ?? process.cwd(),
    value("--branch"),
    number
      ? { repo: value("--repo") as string, number: Number(number), token: process.env.GITHUB_TOKEN }
      : undefined,
  )
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2))
  else
    console.log(
      `Git/PR: ${report.verdict}\nbranch: ${report.branch ?? "unknown"}\nHEAD: ${report.head ?? "unknown"}\n${report.reasons.join("\n")}`,
    )
  if (report.verdict !== "pass") process.exitCode = 1
}
