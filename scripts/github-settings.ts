#!/usr/bin/env bun
/**
 * GitHub の repository 設定を `gh api` で一括適用する。管理者権限 (Admin) のあるアカウントで
 * `gh auth login` 済みであること。既定は dry-run で、`--apply` を付けたときだけ書き込む。
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join, relative } from "node:path"
import { root } from "./walk.ts"

type Verdict = "pass" | "fail" | "unknown"
/** `GET repos/{owner}/{repo}` から Secret scanning の判定に必要な部分だけを取り出す。 */
export type SecurityState = {
  private?: boolean
  analysis?: {
    secret_scanning?: { status?: string }
    secret_scanning_push_protection?: { status?: string }
  }
}
/** 公開リポジトリでは Secret scanning と Push protection が既定で有効（`security_and_analysis` は null）。 */
export function secretVerdict(security: SecurityState | null): Pick<Check, "verdict" | "detail"> {
  if (!security) return { verdict: "unknown", detail: "取得できませんでした" }
  const status = security.analysis?.secret_scanning?.status
  if (status) {
    const push = security.analysis?.secret_scanning_push_protection?.status ?? "-"
    return {
      verdict: status === "enabled" ? "pass" : "fail",
      detail: `secret_scanning=${status}, push_protection=${push}`,
    }
  }
  if (security.private === false)
    return {
      verdict: "pass",
      detail: "公開リポジトリでは既定で有効（API の security_and_analysis は null）",
    }
  return {
    verdict: "unknown",
    detail: "security_and_analysis が null（private では GitHub Advanced Security が必要）",
  }
}
export type Check = { id: string; label: string; verdict: Verdict; detail: string }
export type Options = { repo: string; apply: boolean; check: boolean; help: boolean }
export type Action = { id: string; label: string; commands: () => string[][] }
type GhResult = { status: number | null; stdout: string; stderr: string }

export const rulesetPath = join(root, "docs/ops/main-ruleset.json")
export const rulesetName = "main-protection"
const usage = `bun run github:settings [options]

  --repo <owner/name>  対象（既定は Git remote から判定）
  --apply              実際に書き込む（既定は dry-run で表示のみ）
  --check              書き込まずに現在の状態だけを確認する
  --help               この説明

Dependabot alerts / Dependabot security updates / Secret scanning + Push protection /
Private vulnerability reporting / main の ruleset（docs/ops/main-ruleset.json）を設定します。
`
const gh = (args: string[]): GhResult => {
  const r = spawnSync("gh", ["api", ...args], { encoding: "utf8" })
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" }
}
const http = (r: GhResult) => Number(/HTTP (\d{3})/.exec(`${r.stderr}${r.stdout}`)?.[1] ?? 0)
function explain(r: GhResult): string {
  const text = (r.stderr || r.stdout).trim().split("\n")[0] || `exit ${r.status}`
  const code = http(r)
  if (code === 403) return `${text}（管理者権限が必要です）`
  if (code === 422) return `${text}（パラメータを確認してください）`
  return text
}
function json<T>(r: GhResult): T | null {
  try {
    return JSON.parse(r.stdout) as T
  } catch {
    return null
  }
}
export function parseArgs(argv: string[]): Options {
  const o: Options = { repo: "", apply: false, check: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--repo") {
      const value = argv[++i]
      if (!value) throw new Error("--repo に値が必要です")
      o.repo = value
    } else if (a === "--apply") o.apply = true
    else if (a === "--check") o.check = true
    else if (a === "--help" || a === "-h") o.help = true
    else throw new Error(`不明な引数: ${a}`)
  }
  return o
}
export function repoFromRemote(url: string): string | null {
  const trimmed = url.trim()
  if (!/^(https?:\/\/|ssh:\/\/|git@)/.test(trimmed)) return null
  const m = /[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/.exec(trimmed)
  return m ? `${m[1]}/${m[2]}` : null
}
export function existingRulesetId(repo: string): number | null {
  const list = json<Array<{ id: number; name: string }>>(
    gh(["-X", "GET", `repos/${repo}/rulesets`]),
  )
  return list?.find((r) => r.name === rulesetName)?.id ?? null
}
/** ruleset は同名が既にあれば更新（PUT）、無ければ作成（POST）する。 */
export function plan(repo: string, rulesetId = existingRulesetId(repo)): Action[] {
  return [
    {
      id: "alerts",
      label: "Dependabot alerts",
      commands: () => [["-X", "PUT", `repos/${repo}/vulnerability-alerts`]],
    },
    {
      id: "security-updates",
      label: "Dependabot security updates",
      commands: () => [["-X", "PUT", `repos/${repo}/automated-security-fixes`]],
    },
    {
      id: "secret-scanning",
      label: "Secret scanning + Push protection",
      commands: () => [
        [
          "-X",
          "PATCH",
          `repos/${repo}`,
          "-f",
          "security_and_analysis[secret_scanning][status]=enabled",
          "-f",
          "security_and_analysis[secret_scanning_push_protection][status]=enabled",
        ],
      ],
    },
    {
      id: "pvr",
      label: "Private vulnerability reporting",
      commands: () => [["-X", "PUT", `repos/${repo}/private-vulnerability-reporting`]],
    },
    {
      id: "ruleset",
      label: `main の ruleset（${rulesetId ? "更新" : "作成"}）`,
      commands: () => [
        [
          "-X",
          rulesetId ? "PUT" : "POST",
          `repos/${repo}/rulesets${rulesetId ? `/${rulesetId}` : ""}`,
          "--input",
          rulesetPath,
        ],
      ],
    },
  ]
}
export function applyAll(actions: Action[]): Check[] {
  return actions.map((action) => {
    const failed = action
      .commands()
      .map(gh)
      .find((r) => r.status !== 0)
    return failed
      ? { id: action.id, label: action.label, verdict: "fail", detail: explain(failed) }
      : { id: action.id, label: action.label, verdict: "pass", detail: "適用しました" }
  })
}
export function verify(repo: string): Check[] {
  const checks: Check[] = []
  const on = (endpoint: string, label: string) => {
    const r = gh(["-X", "GET", `repos/${repo}/${endpoint}`])
    const verdict: Verdict = r.status === 0 ? "pass" : http(r) === 404 ? "fail" : "unknown"
    checks.push({
      id: endpoint,
      label,
      verdict,
      detail: r.status === 0 ? "有効" : explain(r),
    })
  }
  on("vulnerability-alerts", "Dependabot alerts")
  on("automated-security-fixes", "Dependabot security updates")
  const pvr = json<{ enabled?: boolean }>(
    gh(["-X", "GET", `repos/${repo}/private-vulnerability-reporting`]),
  )
  checks.push({
    id: "pvr",
    label: "Private vulnerability reporting",
    verdict: pvr ? (pvr.enabled ? "pass" : "fail") : "unknown",
    detail: pvr ? (pvr.enabled ? "有効" : "無効") : "取得できませんでした",
  })
  const security = json<SecurityState>(
    gh([
      "-X",
      "GET",
      `repos/${repo}`,
      "--jq",
      "{private: .private, analysis: .security_and_analysis}",
    ]),
  )
  checks.push({
    id: "secret-scanning",
    label: "Secret scanning + Push protection",
    ...secretVerdict(security),
  })
  const rules = json<Array<{ type: string }>>(
    gh(["-X", "GET", `repos/${repo}/rules/branches/main`]),
  )
  const types = new Set(rules?.map((r) => r.type) ?? [])
  const wanted = ["deletion", "non_fast_forward", "pull_request", "required_status_checks"]
  const missing = wanted.filter((t) => !types.has(t))
  checks.push({
    id: "ruleset",
    label: "main の ruleset",
    verdict: rules ? (missing.length ? "fail" : "pass") : "unknown",
    detail: rules
      ? missing.length
        ? `未適用: ${missing.join(", ")}`
        : "4 ルールを確認"
      : "取得できませんでした",
  })
  return checks
}
/** pass は OK、fail は NG、unknown（読めなかった）は ?? として分けて表示する。 */
export function printChecks(checks: Check[]): void {
  for (const c of checks) {
    const mark = c.verdict === "pass" ? "OK" : c.verdict === "fail" ? "NG" : "??"
    console.log(`${mark}  ${c.label}: ${c.detail}`)
  }
  const fail = checks.filter((c) => c.verdict === "fail").length
  const unknown = checks.filter((c) => c.verdict === "unknown").length
  const parts = [
    fail ? `${fail} 件が未達成です` : "",
    unknown ? `${unknown} 件は確認できませんでした（管理者権限の token で再実行してください）` : "",
  ].filter(Boolean)
  console.log(parts.length ? `\n${parts.join("、")}` : "\nすべて確認できました")
}
export function main(argv: string[]): number {
  const o = parseArgs(argv)
  if (o.help) {
    console.log(usage)
    return 0
  }
  const remote = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" })
  const repo = o.repo || repoFromRemote(remote.stdout ?? "")
  if (!repo) throw new Error("--repo owner/name を指定するか Git remote を設定してください")
  if (!existsSync(rulesetPath)) throw new Error(`${relative(root, rulesetPath)} がありません`)
  const actions = plan(repo)
  if (o.check) console.log(`対象: ${repo}（確認のみ）`)
  else {
    console.log(`対象: ${repo}（${o.apply ? "適用" : "dry-run"}）`)
    for (const action of actions)
      for (const command of action.commands()) console.log(`  gh api ${command.join(" ")}`)
  }
  if (o.check) {
    const checks = verify(repo)
    printChecks(checks)
    return checks.every((c) => c.verdict === "pass") ? 0 : 1
  }
  if (!o.apply) {
    console.log("\n変更していません。実行するときは --apply を付けてください。")
    return 0
  }
  const checks = [...applyAll(actions), ...verify(repo)]
  printChecks(checks)
  return checks.every((c) => c.verdict === "pass") ? 0 : 1
}
if (import.meta.main) process.exit(main(process.argv.slice(2)))
