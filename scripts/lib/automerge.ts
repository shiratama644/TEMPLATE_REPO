/**
 * Auto-merge helper — local check for auto-merge eligibility
 */

import { DEFAULT_AUTOMERGE_CONFIG, shouldAutomerge } from "./cicd.ts"
import { logger } from "./logger.ts"

const log = logger.log.bind(logger)

export function checkAutomergeEligibility(
  actor: string,
  title: string,
  labels: string[],
  isDraft = false,
) {
  const result = shouldAutomerge(actor, title, labels, isDraft, DEFAULT_AUTOMERGE_CONFIG)
  log(`Actor: ${actor}`)
  log(`Title: ${title}`)
  log(`Labels: ${labels.join(", ")}`)
  log(`Draft: ${isDraft}`)
  log(
    `Result: ${result.should ? "✓ Should auto-merge" : "✗ Should NOT auto-merge"} — ${result.reason}`,
  )
  return result
}

/* v8 ignore start */
if (!process.env.VITEST) {
  const actor = process.argv[2] || "renovate[bot]"
  const title = process.argv[3] || "chore(deps): update dependencies"
  const labels = (process.argv[4] || "dependencies").split(",")
  const isDraft = process.argv.includes("--draft")

  checkAutomergeEligibility(actor, title, labels, isDraft)
}
/* v8 ignore stop */
