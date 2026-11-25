import { afterEach, expect, test } from "bun:test"
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  applyAll,
  existingRulesetId,
  explain,
  type GhRunner,
  ghApi,
  main,
  originRemote,
  parseArgs,
  plan,
  printChecks,
  repoFromRemote,
  rulesetPath,
  secretVerdict,
  verify,
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

/** 端点ごとに決まった応答を返す偽の gh。呼び出しを記録する。 */
function fakeRunner(
  responses: Record<string, { status: number; stdout?: string; stderr?: string }>,
): { run: GhRunner; calls: string[][] } {
  const calls: string[][] = []
  const run: GhRunner = (args) => {
    calls.push(args)
    const key = args.join(" ")
    const hit = Object.entries(responses).find(([path]) => key.includes(path))
    const r = hit ? hit[1] : { status: 0 }
    return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" }
  }
  return { run, calls }
}
const ok = (stdout: string) => ({ status: 0, stdout })
const denied = (code: number) => ({ status: 1, stderr: `gh: HTTP ${code}: Not allowed` })

test("explain turns an HTTP code into the next action, and falls back to exit status", () => {
  expect(explain({ status: 1, stdout: "", stderr: "gh: HTTP 403: Resource not accessible" })).toBe(
    "gh: HTTP 403: Resource not accessible（管理者権限が必要です）",
  )
  expect(explain({ status: 1, stdout: "", stderr: "gh: HTTP 422: Validation Failed" })).toContain(
    "パラメータを確認してください",
  )
  expect(explain({ status: 2, stdout: "", stderr: "connection refused" })).toBe(
    "connection refused",
  )
  // stderr が空なら stdout の 1 行目、どちらも空なら終了コードを理由にする
  expect(explain({ status: 3, stdout: "failed\nsecond line", stderr: "" })).toBe("failed")
  expect(explain({ status: 4, stdout: "", stderr: "" })).toBe("exit 4")
})

test("existingRulesetId finds the protected ruleset by name and tolerates a bad response", () => {
  expect(
    existingRulesetId(
      "o/r",
      fakeRunner({
        rulesets: ok('[{"id":27920421,"name":"main-protection"},{"id":1,"name":"other"}]'),
      }).run,
    ),
  ).toBe(27920421)
  expect(existingRulesetId("o/r", fakeRunner({ rulesets: ok("[]") }).run)).toBeNull()
  // 403 や壊れた JSON では id が読めないので「無い」と同じ扱い（作成を計画する）
  expect(existingRulesetId("o/r", fakeRunner({ rulesets: denied(403) }).run)).toBeNull()
  expect(existingRulesetId("o/r", fakeRunner({ rulesets: ok("not json") }).run)).toBeNull()
})

test("plan emits the secret scanning and ruleset writes as gh api arguments", () => {
  const actions = plan("octocat/hello-world", 7, "/tmp/main-ruleset.json")
  const byId = Object.fromEntries(actions.map((a) => [a.id, a.commands()[0]]))
  expect(byId["secret-scanning"]).toEqual([
    "-X",
    "PATCH",
    "repos/octocat/hello-world",
    "-f",
    "security_and_analysis[secret_scanning][status]=enabled",
    "-f",
    "security_and_analysis[secret_scanning_push_protection][status]=enabled",
  ])
  expect(byId.pvr).toEqual([
    "-X",
    "PUT",
    "repos/octocat/hello-world/private-vulnerability-reporting",
  ])
  expect(byId.alerts[2]).toBe("repos/octocat/hello-world/vulnerability-alerts")
  expect(byId["security-updates"][2]).toBe("repos/octocat/hello-world/automated-security-fixes")
  expect(byId.ruleset).toEqual([
    "-X",
    "PUT",
    "repos/octocat/hello-world/rulesets/7",
    "--input",
    "/tmp/main-ruleset.json",
  ])
})

test("applyAll reports the first failing command and keeps going for the rest", () => {
  const { run, calls } = fakeRunner({
    "automated-security-fixes": denied(403),
    rulesets: ok("[]"),
  })
  const checks = applyAll(plan("o/r", null), run)
  expect(checks.map((c) => [c.id, c.verdict])).toEqual([
    ["alerts", "pass"],
    ["security-updates", "fail"],
    ["secret-scanning", "pass"],
    ["pvr", "pass"],
    ["ruleset", "pass"],
  ])
  expect(checks[1].detail).toContain("管理者権限が必要です")
  expect(checks[0].detail).toBe("適用しました")
  expect(calls).toHaveLength(5)
  expect(calls[4].slice(0, 3)).toEqual(["-X", "POST", "repos/o/r/rulesets"])
})

test("verify reads five endpoints and grades each one", () => {
  const rules = '[{"type":"deletion"},{"type":"pull_request"}]'
  const { run, calls } = fakeRunner({
    "vulnerability-alerts": ok(""),
    "automated-security-fixes": denied(404),
    "private-vulnerability-reporting": ok('{"enabled":false}'),
    security_and_analysis: ok('{"private":true,"analysis":null}'),
    "rules/branches/main": ok(rules),
  })
  const checks = verify("o/r", run)
  expect(checks.map((c) => [c.id, c.verdict])).toEqual([
    ["vulnerability-alerts", "pass"],
    // 404 は「読めない」ではなく「無効」
    ["automated-security-fixes", "fail"],
    ["pvr", "fail"],
    ["secret-scanning", "unknown"],
    ["ruleset", "fail"],
  ])
  expect(checks[0].detail).toBe("有効")
  expect(checks[1].detail).toContain("Not allowed")
  expect(checks[2].detail).toBe("無効")
  expect(checks[3].detail).toContain("GitHub Advanced Security")
  expect(checks[4].detail).toBe("未適用: non_fast_forward, required_status_checks")
  expect(calls.map((c) => c.at(2))).toContain("repos/o/r/rules/branches/main")

  // 応答が読めないときは fail ではなく unknown（権限不足を未設定と誤報しない）
  const unreadable = fakeRunner({
    "vulnerability-alerts": denied(403),
    "automated-security-fixes": denied(403),
    "private-vulnerability-reporting": denied(403),
    security_and_analysis: denied(403),
    "rules/branches/main": denied(403),
  })
  expect(verify("o/r", unreadable.run).every((c) => c.verdict === "unknown")).toBe(true)
  expect(unreadable.calls).toHaveLength(5)
})

test("verify accepts a fully configured repository", () => {
  const { run } = fakeRunner({
    "vulnerability-alerts": ok(""),
    "automated-security-fixes": ok(""),
    "private-vulnerability-reporting": ok('{"enabled":true}'),
    security_and_analysis: ok('{"private":false,"analysis":null}'),
    "rules/branches/main": ok(
      '[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"pull_request"},{"type":"required_status_checks"}]',
    ),
  })
  const checks = verify("o/r", run)
  expect(checks.every((c) => c.verdict === "pass")).toBe(true)
  expect(checks.at(-1)?.detail).toBe("4 ルールを確認")
})

function capture(fn: () => number): { code: number; out: string } {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    return { code: fn(), out: logs.join("\n") }
  } finally {
    console.log = original
  }
}

test("main prints usage, dry-run commands, verification and the right exit code", () => {
  const help = capture(() => main(["--help"], fakeRunner({}).run, () => ""))
  expect(help.code).toBe(0)
  expect(help.out).toContain("--apply")
  expect(help.out).toContain("main-ruleset.json")

  // remote から owner/name を読む。--repo があれば remote は読まない
  const dry = fakeRunner({ rulesets: ok("[]") })
  const dryRun = capture(() => main([], dry.run, () => "git@github.com:octocat/hello-world.git\n"))
  expect(dryRun.code).toBe(0)
  expect(dryRun.out).toContain("対象: octocat/hello-world（dry-run）")
  expect(dryRun.out).toContain("gh api -X PUT repos/octocat/hello-world/vulnerability-alerts")
  expect(dryRun.out).toContain("変更していません")
  // dry-run は ruleset の一覧を読むだけで、書き込みはしない
  expect(dry.calls).toHaveLength(1)
  expect(dry.calls[0][1]).toBe("GET")

  const check = fakeRunner({
    "vulnerability-alerts": ok(""),
    "automated-security-fixes": ok(""),
    "private-vulnerability-reporting": ok('{"enabled":true}'),
    security_and_analysis: ok('{"private":false,"analysis":null}'),
    "rules/branches/main": ok(
      '[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"pull_request"},{"type":"required_status_checks"}]',
    ),
  })
  const verified = capture(() => main(["--repo", "o/r", "--check"], check.run, () => ""))
  expect(verified.code).toBe(0)
  expect(verified.out).toContain("対象: o/r（確認のみ）")
  expect(verified.out).toContain("すべて確認できました")
  expect(check.calls.every((c) => c[1] === "GET")).toBe(true)

  const broken = fakeRunner({
    rulesets: ok("[]"),
    "vulnerability-alerts": denied(403),
    "automated-security-fixes": ok(""),
    "private-vulnerability-reporting": ok('{"enabled":true}'),
    security_and_analysis: ok('{"private":false,"analysis":null}'),
    "rules/branches/main": ok(
      '[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"pull_request"},{"type":"required_status_checks"}]',
    ),
  })
  const applied = capture(() => main(["--repo", "o/r", "--apply"], broken.run, () => ""))
  expect(applied.code).toBe(1)
  expect(applied.out).toContain("対象: o/r（適用）")
  expect(applied.out).toContain("NG  Dependabot alerts")
  expect(applied.out).toContain("1 件が未達成です")
})

test("main refuses to guess a repository and to run without the ruleset file", () => {
  const empty = () => ""
  expect(() => main([], fakeRunner({}).run, empty)).toThrow(
    "--repo owner/name を指定するか Git remote を設定してください",
  )
  const missing = join("docs", "ops", "missing-ruleset.json")
  expect(() => main(["--repo", "o/r"], fakeRunner({}).run, empty, missing)).toThrow(
    `${missing} がありません`,
  )
  // ruleset の本体が無いまま --apply すると空の --input で失敗するので、先に止める
  expect(existsSync(rulesetPath)).toBe(true)
})

test("the real gh and git adapters stay safe when the call fails", () => {
  // 実物の gh/git を呼ぶ。無くても失敗しても例外を投げず、文字列を返すのが契約
  const r = ghApi(["--definitely-not-a-flag"])
  expect(r.status).not.toBe(0)
  expect(typeof r.stdout).toBe("string")
  expect(typeof r.stderr).toBe("string")
  expect(explain(r).length).toBeGreaterThan(0)
  const remote = originRemote()
  expect(typeof remote).toBe("string")
  expect(remote === "" || /^[\w.-]+\/[\w.-]+$/.test(repoFromRemote(remote) ?? "")).toBe(true)
})
