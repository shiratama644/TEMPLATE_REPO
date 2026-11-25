import { afterEach, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  assessPR,
  buildReport,
  classifyCommit,
  type GitHubApi,
  localReport,
  octokitClient,
  reportEntry,
} from "../scripts/git-report.ts"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function repo() {
  const dir = mkdtempSync(join(tmpdir(), "git-report-"))
  dirs.push(dir)
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim()
  git("init", "-q", "-b", "report-test")
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.org",
    "commit",
    "--allow-empty",
    "-qm",
    "feat: initial",
  )
  return { dir, git }
}
test("parser distinguishes conventional and unparsed messages", () => {
  expect(classifyCommit("feat(core)!: Add something").type).toBe("feat")
  expect(classifyCommit("something happened").type).toBeNull()
})
test("read-only local report: clean, dirty, branch mismatch, unparsed commit, missing Git", async () => {
  const { dir, git } = repo()
  expect((await localReport(dir, "report-test")).verdict).toBe("pass")
  expect((await localReport(dir, "other")).verdict).toBe("fail")
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.org",
    "commit",
    "--allow-empty",
    "-qm",
    "not conventional",
  )
  expect((await localReport(dir)).reasons.join()).toContain("未解析")
  expect((await localReport("/missing/git/repository")).verdict).toBe("unknown")
})
test("PR reports distinguish checks, mismatches, absent credentials and API failure", async () => {
  const { dir, git } = repo()
  const head = git("rev-parse", "HEAD")
  const options = { repo: "owner/repo", number: 3 }
  expect((await buildReport(dir, "report-test", options)).verdict).toBe("unknown")
  const client = (checks: Array<{ status: string; conclusion: string | null }>, sha = head) => ({
    getPR: async () => ({ number: 3, branch: "report-test", head: sha, checks }),
  })
  expect(
    (
      await buildReport(dir, "report-test", {
        ...options,
        client: client([{ status: "completed", conclusion: "success" }]),
      })
    ).verdict,
  ).toBe("pass")
  expect(
    (
      await buildReport(dir, "report-test", {
        ...options,
        client: client([{ status: "queued", conclusion: null }]),
      })
    ).verdict,
  ).toBe("unknown")
  expect((await buildReport(dir, "report-test", { ...options, client: client([]) })).verdict).toBe(
    "unknown",
  )
  expect(
    (
      await buildReport(dir, "report-test", {
        ...options,
        client: client([{ status: "completed", conclusion: "failure" }]),
      })
    ).verdict,
  ).toBe("fail")
  expect(
    (
      await buildReport(dir, "report-test", {
        ...options,
        client: client([{ status: "completed", conclusion: "success" }], "0".repeat(40)),
      })
    ).verdict,
  ).toBe("fail")
  expect(
    (
      await buildReport(dir, "report-test", {
        ...options,
        client: {
          getPR: async () => {
            throw new Error("offline")
          },
        },
      })
    ).verdict,
  ).toBe("unknown")
  expect(
    assessPR(await localReport(dir), { number: 3, branch: "report-test", head, checks: [] }).pr
      ?.checks,
  ).toBe("unknown")
})

test("known failures cannot be hidden by pending checks or an unavailable PR API", async () => {
  const { dir, git } = repo()
  const head = git("rev-parse", "HEAD")
  const local = await localReport(dir)
  expect(
    assessPR(local, {
      number: 3,
      branch: "report-test",
      head,
      checks: [
        { status: "completed", conclusion: "failure" },
        { status: "queued", conclusion: null },
      ],
    }).verdict,
  ).toBe("fail")
  const mismatch = await buildReport(dir, "different-branch", { repo: "owner/repo", number: 3 })
  expect(mismatch.verdict).toBe("fail")
  const offline = await buildReport(dir, "different-branch", {
    repo: "owner/repo",
    number: 3,
    client: {
      getPR: async () => {
        throw new Error("offline")
      },
    },
  })
  expect(offline.verdict).toBe("fail")
  expect(offline.reasons.join()).toContain("未確認")
})

test("a failed commit status is not a passing PR even when all check runs succeed", async () => {
  const { dir, git } = repo()
  const head = git("rev-parse", "HEAD")
  const local = await localReport(dir)
  const data = {
    number: 3,
    branch: "report-test",
    head,
    checks: [{ status: "completed", conclusion: "success" }],
    statusContexts: "failure",
  }
  expect(assessPR(local, data).verdict).toBe("fail")
  expect(assessPR(local, { ...data, statusContexts: "pending" }).verdict).toBe("unknown")
  expect(assessPR(local, { ...data, statusContexts: "success" }).verdict).toBe("pass")
})

test("incomplete conclusions are unknown and a closed PR cannot pass", async () => {
  const { dir, git } = repo()
  const head = git("rev-parse", "HEAD")
  const local = await localReport(dir)
  const data = {
    number: 3,
    branch: "report-test",
    head,
    checks: [{ status: "completed", conclusion: null }],
  }
  expect(assessPR(local, data).verdict).toBe("unknown")
  expect(
    assessPR(local, {
      ...data,
      state: "closed",
      checks: [{ status: "completed", conclusion: "success" }],
    }).verdict,
  ).toBe("fail")
})

test("skipped and neutral PR checks are not counted as passing evidence", async () => {
  const { dir, git } = repo()
  const head = git("rev-parse", "HEAD")
  const local = await localReport(dir)
  for (const conclusion of ["skipped", "neutral"]) {
    const result = assessPR(local, {
      number: 3,
      branch: "report-test",
      head,
      checks: [{ status: "completed", conclusion }],
    })
    expect(result.verdict).toBe("unknown")
    expect(result.pr?.checks).toBe("unknown")
  }
})

test("truncated check pagination stays unknown unless a visible check failed", async () => {
  const { dir, git } = repo()
  const head = git("rev-parse", "HEAD")
  const local = await localReport(dir)
  const data = {
    number: 3,
    branch: "report-test",
    head,
    checksTruncated: true,
    checks: [{ status: "completed", conclusion: "success" }],
  }
  expect(assessPR(local, data).verdict).toBe("unknown")
  expect(
    assessPR(local, { ...data, checks: [{ status: "completed", conclusion: "failure" }] }).verdict,
  ).toBe("fail")
})

/** octokit の 3 呼び出しの偽物。記録した呼び出しと返す値をテストが指定する。 */
function fakeApi(
  pr: { ref: string; sha: string; state: "open" | "closed" },
  checks: { total: number; runs: Array<{ status: string; conclusion: string | null }> },
  contexts: { total: number; state: string; statuses: unknown[] },
): { api: GitHubApi; calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    api: {
      pulls: {
        async get(o) {
          calls.push(`pulls.get ${o.owner}/${o.repo}#${o.pull_number}`)
          return { data: { head: { ref: pr.ref, sha: pr.sha }, state: pr.state } }
        },
      },
      checks: {
        async listForRef(o) {
          calls.push(`checks.listForRef ${o.ref} per_page=${o.per_page}`)
          return { data: { total_count: checks.total, check_runs: checks.runs } }
        },
      },
      repos: {
        async getCombinedStatusForRef(o) {
          calls.push(`repos.getCombinedStatusForRef ${o.ref} per_page=${o.per_page}`)
          return {
            data: {
              total_count: contexts.total,
              state: contexts.state,
              statuses: contexts.statuses,
            },
          }
        },
      },
    },
  }
}

test("octokitClient maps the three calls onto PRData and distrusts a truncated page", async () => {
  const { api, calls } = fakeApi(
    { ref: "feature", sha: "abc1234", state: "open" },
    { total: 3, runs: [{ status: "completed", conclusion: "success" }] },
    { total: 2, state: "success", statuses: [{ context: "ci" }] },
  )
  const data = await octokitClient("token", api).getPR("octocat", "hello-world", 9)
  expect(data).toEqual({
    number: 9,
    branch: "feature",
    head: "abc1234",
    state: "open",
    checks: [{ status: "completed", conclusion: "success" }],
    // 1 件しか見えていないのに total が 3 → 「全部成功」とは言えない
    checksTruncated: true,
    statusContexts: "pending",
  })
  expect(calls).toHaveLength(3)
  expect(calls[0]).toBe("pulls.get octocat/hello-world#9")
  // checks と status は Promise.all で並行に呼ぶので、順序ではなく集合で確認する
  expect(calls.slice(1).sort()).toEqual([
    "checks.listForRef abc1234 per_page=100",
    "repos.getCombinedStatusForRef abc1234 per_page=100",
  ])

  // 切り詰めがあっても、見える範囲に失敗があれば pending ではなく failure を返す
  const failed = fakeApi(
    { ref: "feature", sha: "abc1234", state: "closed" },
    { total: 1, runs: [] },
    { total: 5, state: "failure", statuses: [{}] },
  )
  expect(await octokitClient("token", failed.api).getPR("o", "r", 1)).toMatchObject({
    checksTruncated: true,
    statusContexts: "failure",
    state: "closed",
  })

  // status が 1 件も無ければ null（判定材料なし）
  const none = fakeApi(
    { ref: "feature", sha: "abc1234", state: "open" },
    { total: 0, runs: [] },
    { total: 0, state: "pending", statuses: [] },
  )
  expect((await octokitClient("token", none.api).getPR("o", "r", 1)).statusContexts).toBeNull()

  // token だけ渡した既定経路も octokit を組み立てる（リクエストはしない）
  expect(typeof octokitClient("token").getPR).toBe("function")
})

test("buildReport rejects a malformed repository or PR number before any request", async () => {
  const { dir } = repo()
  const client = {
    async getPR() {
      throw new Error("呼ばれてはいけない")
    },
  }
  for (const pr of [
    { repo: "bad", number: 1 },
    { repo: "a/b/c", number: 1 },
    { repo: "o/r", number: 0 },
    { repo: "o/r", number: 1.5 },
    { repo: "o/r", number: Number.NaN },
  ])
    await expect(buildReport(dir, undefined, { ...pr, client })).rejects.toThrow(
      "--repo owner/name と正の --pr 番号を指定してください",
    )
})

test("the report CLI validates its arguments and prints JSON or text", async () => {
  const { dir } = repo()
  await expect(reportEntry(["--nope"], {}, dir)).rejects.toThrow("不明な引数です")
  await expect(reportEntry(["--pr", "9"], {}, dir)).rejects.toThrow(
    "--pr と --repo は一緒に指定してください",
  )
  await expect(reportEntry(["--repo", "octocat/hello-world"], {}, dir)).rejects.toThrow(
    "--pr と --repo は一緒に指定してください",
  )

  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(await reportEntry(["--json", "--dir", dir], {})).toBe(0)
    expect(JSON.parse(logs[0]).verdict).toBe("pass")
    expect(await reportEntry(["--dir", dir, "--branch", "other"], {})).toBe(1)
    expect(logs[1]).toContain("Git/PR: fail")
    expect(logs[1]).toContain("branch: report-test")
    // token が無ければ PR は「確認できない」であり pass にはしない
    expect(
      await reportEntry(["--dir", dir, "--pr", "9", "--repo", "octocat/hello-world"], {}),
    ).toBe(1)
    expect(logs[2]).toContain("Git/PR: unknown")
    expect(logs[2]).toContain("PR 参照には GITHUB_TOKEN が必要です")
  } finally {
    console.log = original
  }
})
