/**
 * A11y testing utilities — axe-core helpers
 */

import { logger } from "./logger.ts"
import {
  type A11yResult,
  type A11yViolation,
  calculateA11yScore,
  filterA11yByImpact,
} from "./quality.ts"

const log = logger.log.bind(logger)

export const A11Y_RULES = {
  critical: ["color-contrast", "image-alt", "label", "link-name", "button-name"],
  serious: ["aria-allowed-attr", "aria-required-attr", "duplicate-id", "heading-order"],
  moderate: ["landmark-one-main", "page-has-heading-one", "region"],
  minor: ["meta-viewport"],
}

export const A11Y_IMPACT_LEVELS = ["minor", "moderate", "serious", "critical"] as const

export function createA11yResult(url: string, violations: A11yViolation[]): A11yResult {
  return {
    url,
    violations,
    passes: 0,
    incomplete: 0,
    timestamp: new Date().toISOString(),
  }
}

export function checkA11yResult(
  result: A11yResult,
  maxViolations = 0,
  minScore = 80,
): { passed: boolean; reason?: string } {
  const score = calculateA11yScore(result.violations)
  const critical = filterA11yByImpact(result.violations, "critical")

  if (critical.length > 0) {
    return { passed: false, reason: `Found ${critical.length} critical a11y violations` }
  }

  if (result.violations.length > maxViolations) {
    return {
      passed: false,
      reason: `Found ${result.violations.length} violations, max allowed ${maxViolations}`,
    }
  }

  if (score < minScore) {
    return { passed: false, reason: `A11y score ${score} < ${minScore}` }
  }

  return { passed: true }
}

export function formatA11yViolation(v: A11yViolation): string {
  return `[${v.impact.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes} nodes) — ${v.helpUrl}`
}

export function printA11yReport(result: A11yResult) {
  log(`🔍 A11y Report for ${result.url}`)
  log(`   Violations: ${result.violations.length}, Score: ${calculateA11yScore(result.violations)}`)

  if (result.violations.length === 0) {
    log("   ✓ No violations found")
    return
  }

  for (const v of result.violations) {
    /* v8 ignore next 1 */
    const icon =
      v.impact === "critical"
        ? "🔴"
        : v.impact === "serious"
          ? "🟠"
          : v.impact === "moderate"
            ? "🟡"
            : "⚪"
    log(`   ${icon} ${formatA11yViolation(v)}`)
  }
}

/* v8 ignore start */
if (!process.env.VITEST) {
  // Example usage
  const example = createA11yResult("http://localhost:3000", [])
  printA11yReport(example)
}
/* v8 ignore stop */
