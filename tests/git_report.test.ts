import { afterEach, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assessPR, buildReport, classifyCommit, localReport } from "../scripts/git_report.ts"

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
