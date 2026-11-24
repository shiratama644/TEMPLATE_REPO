import { afterEach, expect, test } from "bun:test"
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseArgs,
  plan,
  printChecks,
  repoFromRemote,
  secretVerdict,
} from "../scripts/github-settings.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
const script = join(import.meta.dir, "../scripts/github-settings.ts")
/** gh の代替。呼び出しを記録し、設定済みの repository を装う。 */
function fakeGh(rulesets = "[]") {
  const base = mkdtempSync(join(tmpdir(), "github-settings-"))
  dirs.push(base)
  const log = join(base, "gh.log")
  const bin = join(base, "gh")
  writeFileSync(
    bin,
    [
      "#!/bin/sh",
      'printf \'%s\\n\' "${*#api }" >> "$GH_LOG"',
      'case "$*" in',
      '  *"/rules/branches/main")',
      '    printf \'[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"pull_request"},{"type":"required_status_checks"}]\\n\' ;;',
      '  *"security_and_analysis"*)',
      '    printf \'{"private":false,"analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}\\n\' ;;',
      '  *"private-vulnerability-reporting"*) printf \'{"enabled":true}\\n\' ;;',
      `  *"rulesets"*) printf '${rulesets}\\n' ;;`,
      "esac",
      "exit 0",
      "",
    ].join("\n"),
  )
  chmodSync(bin, 0o755)
  const run = (...args: string[]) => {
    const r = Bun.spawnSync({
      cmd: [process.execPath, script, ...args],
      env: { ...process.env, PATH: `${base}:${process.env.PATH}`, GH_LOG: log },
      stdout: "pipe",
      stderr: "pipe",
    })
    return {
      status: r.exitCode,
      stdout: r.stdout.toString(),
      stderr: r.stderr.toString(),
      calls: readFileSync(log, "utf8").trim().split("\n").filter(Boolean),
    }
  }
  return { base, run }
}

test("remote URLs are reduced to owner/name", () => {
  expect(repoFromRemote("https://github.com/shiratama644/TEMPLATE_REPO.git")).toBe(
    "shiratama644/TEMPLATE_REPO",
  )
  expect(repoFromRemote("git@github.com:shiratama644/TEMPLATE_REPO.git")).toBe(
    "shiratama644/TEMPLATE_REPO",
  )
  expect(repoFromRemote("https://github.com/shiratama644/TEMPLATE_REPO")).toBe(
    "shiratama644/TEMPLATE_REPO",
  )
  expect(repoFromRemote("/local/path/repo")).toBeNull()
})

test("arguments are parsed and unknown ones are rejected", () => {
  expect(parseArgs(["--repo", "a/b", "--apply"])).toEqual({
    repo: "a/b",
    apply: true,
    check: false,
    help: false,
  })
  expect(parseArgs(["--check"]).check).toBe(true)
  expect(() => parseArgs(["--repo"])).toThrow("--repo")
  expect(() => parseArgs(["--force"])).toThrow("不明な引数")
})

test("dry-run prints the five commands and writes nothing", () => {
  const { run } = fakeGh()
  const r = run("--repo", "owner/name")
  expect(r.status).toBe(0)
  expect(r.stdout).toContain("repos/owner/name/vulnerability-alerts")
  expect(r.stdout).toContain("secret_scanning_push_protection")
  expect(r.stdout).toContain("repos/owner/name/rulesets --input")
  expect(r.stdout).toContain("変更していません")
  expect(r.calls).toEqual(["-X GET repos/owner/name/rulesets"])
})

test("--apply issues every write and verifies the result", () => {
  const { run } = fakeGh()
  const r = run("--repo", "owner/name", "--apply")
  expect(r.status).toBe(0)
  expect(r.stdout).toContain("すべて確認できました")
  const writes = r.calls.filter((c) => !c.startsWith("-X GET"))
  expect(writes).toHaveLength(5)
  expect(writes[0]).toBe("-X PUT repos/owner/name/vulnerability-alerts")
  expect(writes[4]).toContain("-X POST repos/owner/name/rulesets --input")
})

test("--apply updates an existing ruleset instead of creating a second one", () => {
  const { run } = fakeGh('[{"id":27920421,"name":"main-protection"}]')
  const r = run("--repo", "owner/name", "--apply")
  expect(r.status).toBe(0)
  expect(r.calls.some((c) => c.startsWith("-X PUT repos/owner/name/rulesets/27920421"))).toBe(true)
})

test("--check reports a repository that is not configured yet", () => {
  const base = mkdtempSync(join(tmpdir(), "github-settings-empty-"))
  dirs.push(base)
  const bin = join(base, "gh")
  writeFileSync(
    bin,
    '#!/bin/sh\necho "gh: Resource not accessible by integration (HTTP 403)" >&2\nexit 1\n',
  )
  chmodSync(bin, 0o755)
  const r = Bun.spawnSync({
    cmd: [process.execPath, script, "--repo", "owner/name", "--check"],
    env: { ...process.env, PATH: `${base}:${process.env.PATH}` },
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(r.exitCode).toBe(1)
  expect(r.stdout.toString()).toContain("管理者権限が必要です")
  expect(r.stdout.toString()).toContain("確認できませんでした")
})

test("plan chooses create or update from the existing ruleset", () => {
  const create = plan("owner/name", null)
  expect(create).toHaveLength(5)
  expect(create[4].commands()[0]).toEqual([
    "-X",
    "POST",
    "repos/owner/name/rulesets",
    "--input",
    expect.stringContaining("main-ruleset.json"),
  ])
  const update = plan("owner/name", 27920421)
  expect(update[4].label).toContain("更新")
  expect(update[4].commands()[0][2]).toBe("repos/owner/name/rulesets/27920421")
})

test("printChecks reports the number of unmet items", () => {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    printChecks([
      { id: "a", label: "A", verdict: "pass", detail: "有効" },
      { id: "b", label: "B", verdict: "unknown", detail: "取得できませんでした" },
    ])
  } finally {
    console.log = original
  }
  expect(logs.join("\n")).toContain("OK  A: 有効")
  expect(logs.join("\n")).toContain("??  B: 取得できませんでした")
  expect(logs.at(-1)).toContain("1 件は確認できませんでした")
})

test("secret scanning verdict accounts for public repositories", () => {
  expect(secretVerdict({ private: false })).toEqual({
    verdict: "pass",
    detail: expect.stringContaining("公開リポジトリでは既定で有効"),
  })
  expect(
    secretVerdict({
      private: true,
      analysis: {
        secret_scanning: { status: "enabled" },
        secret_scanning_push_protection: { status: "enabled" },
      },
    }),
  ).toEqual({ verdict: "pass", detail: "secret_scanning=enabled, push_protection=enabled" })
  expect(secretVerdict({ analysis: { secret_scanning: { status: "disabled" } } }).verdict).toBe(
    "fail",
  )
  expect(secretVerdict({ private: true }).verdict).toBe("unknown")
  expect(secretVerdict(null).verdict).toBe("unknown")
})
