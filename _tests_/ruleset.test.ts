import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// GitHub REST API の create-a-repository-ruleset が各 rule で必須とする parameters。
// ここが欠けると API は 422 "data matches no possible input" を返す。
const requiredParameters: Record<string, readonly string[]> = {
  pull_request: [
    "dismiss_stale_reviews_on_push",
    "require_code_owner_review",
    "require_last_push_approval",
    "required_approving_review_count",
    "required_review_thread_resolution",
  ],
  required_status_checks: ["required_status_checks", "strict_required_status_checks_policy"],
}
const optionalParameters: Record<string, readonly string[]> = {
  pull_request: ["allowed_merge_methods"],
  required_status_checks: ["do_not_enforce_on_create"],
}
const ruleset = JSON.parse(
  readFileSync(join(import.meta.dir, "../docs/ops/main-ruleset.json"), "utf8"),
) as {
  name: string
  enforcement: string
  rules: Array<{ type: string; parameters?: Record<string, unknown> }>
}

test("the ruleset template declares every parameter the REST API requires", () => {
  expect(ruleset.name).toBe("main-protection")
  expect(ruleset.enforcement).toBe("active")
  for (const rule of ruleset.rules) {
    const required = requiredParameters[rule.type]
    if (!required) continue
    const given = Object.keys(rule.parameters ?? {})
    for (const name of required) expect(given).toContain(name)
    for (const name of given)
      expect([...required, ...(optionalParameters[rule.type] ?? [])]).toContain(name)
  }
})

test("the required status checks are the CI job names", () => {
  const checks = ruleset.rules.find((r) => r.type === "required_status_checks")?.parameters
  const contexts = (checks?.required_status_checks as Array<{ context: string }> | undefined)?.map(
    (c) => c.context,
  )
  expect(contexts).toEqual([
    "bun run check（全ゲート）",
    "秘密情報の検出（gitleaks）",
    "actionlint / zizmor",
    "OSV bun.lock 新規脆弱性（PR 差分） / osv-scan",
    "依存関係の差分レビュー",
  ])
})
