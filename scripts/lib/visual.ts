/**
 * Visual regression testing utilities
 */

import { logger } from "./logger.ts"
import { calculateVisualDiffRatio, checkVisualThreshold, type VisualDiff } from "./quality.ts"

const log = logger.log.bind(logger)

export type VisualTestConfig = {
  threshold: number
  maxDiffPixels: number
  maxDiffRatio: number
  animations: "disabled" | "allow"
  caret: "hide" | "initial"
  scale: "css" | "device"
}

export const DEFAULT_VISUAL_CONFIG: VisualTestConfig = {
  threshold: 0.2,
  maxDiffPixels: 100,
  maxDiffRatio: 0.01,
  animations: "disabled",
  caret: "hide",
  scale: "css",
}

export function createVisualDiff(
  name: string,
  diffPixels: number,
  totalPixels: number,
  maxDiff = 100,
): VisualDiff {
  const diffRatio = calculateVisualDiffRatio(diffPixels, totalPixels)
  const passed = checkVisualThreshold(
    { name, diffPixels, diffRatio, maxDiff, passed: true },
    DEFAULT_VISUAL_CONFIG.maxDiffRatio,
  )
  return { name, diffPixels, diffRatio, maxDiff, passed }
}

export function compareScreenshots(
  baseline: Buffer,
  current: Buffer,
  threshold = DEFAULT_VISUAL_CONFIG.threshold,
): VisualDiff {
  // Simplified comparison — in real implementation would use pixelmatch
  // For template, we simulate based on buffer length diff
  const diffPixels = Math.abs(baseline.length - current.length)
  const totalPixels = Math.max(baseline.length, current.length)
  const diffRatio = calculateVisualDiffRatio(diffPixels, totalPixels)

  return {
    name: "screenshot-comparison",
    diffPixels,
    diffRatio,
    maxDiff: threshold,
    passed: diffRatio <= threshold,
  }
}

export function formatVisualDiff(diff: VisualDiff): string {
  const status = diff.passed ? "✓" : "✗"
  return `${status} ${diff.name}: ${diff.diffPixels} pixels diff (${(diff.diffRatio * 100).toFixed(2)}%), max ${diff.maxDiff}`
}

export function printVisualReport(diffs: VisualDiff[]) {
  log("👁️ Visual Regression Report")
  const passed = diffs.filter((d) => d.passed).length
  const total = diffs.length
  log(`   ${passed}/${total} passed`)

  for (const d of diffs) {
    log(`   ${formatVisualDiff(d)}`)
  }

  if (passed === total) {
    log("   ✓ All visual tests passed")
  } else {
    log(`   ✗ ${total - passed} visual tests failed`)
  }
}

/* v8 ignore start */
if (!process.env.VITEST) {
  const example = createVisualDiff("homepage", 10, 10000)
  printVisualReport([example])
}
/* v8 ignore stop */
