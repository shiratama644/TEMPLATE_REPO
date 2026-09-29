/**
 * Quality utilities — Mutation, A11y, Visual, Benchmark, Property testing
 * テスト・品質強化: ミューテーション、A11y、ビジュアルリグレッション、ベンチマーク
 */

export type MutationScore = {
  totalMutants: number
  killed: number
  survived: number
  timedOut: number
  noCoverage: number
  score: number
}

export function calculateMutationScore(killed: number, total: number): number {
  if (total === 0) return 0
  return (killed / total) * 100
}

export function parseMutationReport(jsonStr: string): MutationScore | null {
  try {
    const data = JSON.parse(jsonStr)
    // Stryker JSON format
    if (data.files) {
      let total = 0
      let killed = 0
      let survived = 0
      let timedOut = 0
      let noCoverage = 0

      for (const file of Object.values(data.files) as any[]) {
        /* v8 ignore next 1 */
        for (const mutant of file.mutants || []) {
          total++
          if (mutant.status === "Killed") killed++
          else if (mutant.status === "Survived") survived++
          else if (mutant.status === "TimedOut") timedOut++
          else if (mutant.status === "NoCoverage") noCoverage++
        }
      }

      return {
        totalMutants: total,
        killed,
        survived,
        timedOut,
        noCoverage,
        score: calculateMutationScore(killed, total),
      }
    }

    // Simple format
    if (typeof data.totalMutants === "number") {
      /* v8 ignore start */
      return {
        totalMutants: data.totalMutants,
        killed: data.killed || 0,
        survived: data.survived || 0,
        timedOut: data.timedOut || 0,
        noCoverage: data.noCoverage || 0,
        score: data.score || calculateMutationScore(data.killed || 0, data.totalMutants),
      }
      /* v8 ignore stop */
    }

    return null
  } catch {
    return null
  }
}

export type A11yViolation = {
  id: string
  impact: "minor" | "moderate" | "serious" | "critical"
  description: string
  help: string
  helpUrl: string
  nodes: number
}

export type A11yResult = {
  url: string
  violations: A11yViolation[]
  passes: number
  incomplete: number
  timestamp: string
}

export function filterA11yByImpact(
  violations: A11yViolation[],
  minImpact: A11yViolation["impact"],
): A11yViolation[] {
  const order = { minor: 0, moderate: 1, serious: 2, critical: 3 }
  const min = order[minImpact]
  return violations.filter((v) => order[v.impact] >= min)
}

export function calculateA11yScore(violations: A11yViolation[]): number {
  if (violations.length === 0) return 100
  const weights = { minor: 1, moderate: 3, serious: 7, critical: 15 }
  let penalty = 0
  for (const v of violations) {
    /* v8 ignore next 1 */
    penalty += (weights[v.impact] || 1) * v.nodes
  }
  // Cap at 100 penalty
  return Math.max(0, 100 - Math.min(100, penalty))
}

export function generateA11ySummary(result: A11yResult): string {
  const critical = result.violations.filter((v) => v.impact === "critical").length
  const serious = result.violations.filter((v) => v.impact === "serious").length
  const moderate = result.violations.filter((v) => v.impact === "moderate").length
  const minor = result.violations.filter((v) => v.impact === "minor").length

  return `A11y: ${result.violations.length} violations (critical:${critical} serious:${serious} moderate:${moderate} minor:${minor}) score:${calculateA11yScore(result.violations)}`
}

export type VisualDiff = {
  name: string
  diffPixels: number
  diffRatio: number
  maxDiff: number
  passed: boolean
}

export function calculateVisualDiffRatio(diffPixels: number, totalPixels: number): number {
  if (totalPixels === 0) return 0
  return diffPixels / totalPixels
}

export function checkVisualThreshold(diff: VisualDiff, threshold = 0.01): boolean {
  return diff.diffRatio <= threshold
}

export type BenchmarkResult = {
  name: string
  hz: number
  mean: number
  min: number
  max: number
  p50: number
  p75: number
  p99: number
  samples: number
}

export function compareBenchmarks(
  current: BenchmarkResult[],
  baseline: BenchmarkResult[],
): { name: string; diff: number; percent: number; regression: boolean }[] {
  const comparisons: { name: string; diff: number; percent: number; regression: boolean }[] = []

  for (const cur of current) {
    const base = baseline.find((b) => b.name === cur.name)
    if (!base) continue

    const diff = cur.mean - base.mean
    /* v8 ignore next 1 */
    const percent = base.mean === 0 ? 0 : (diff / base.mean) * 100
    const regression = diff > 0 && percent > 10 // 10% slower is regression

    comparisons.push({ name: cur.name, diff, percent, regression })
  }

  return comparisons
}

export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `${result.name}: ${result.hz.toFixed(2)} ops/sec, mean ${result.mean.toFixed(3)}ms, p99 ${result.p99.toFixed(3)}ms`
}

export type PropertyTestResult = {
  property: string
  passed: boolean
  runs: number
  failedAfter?: number
  counterexample?: any
}

export function generatePropertyTestSummary(results: PropertyTestResult[]): string {
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const lines = [`Property tests: ${passed}/${total} passed`]
  for (const r of results) {
    if (!r.passed) {
      lines.push(
        `  ❌ ${r.property} failed after ${r.failedAfter} runs, counterexample: ${JSON.stringify(r.counterexample)}`,
      )
    } else {
      lines.push(`  ✅ ${r.property} passed (${r.runs} runs)`)
    }
  }
  return lines.join("\n")
}

export type TypeCoverageResult = {
  total: number
  covered: number
  uncovered: number
  percent: number
}

export function calculateTypeCoverage(covered: number, total: number): TypeCoverageResult {
  const uncovered = total - covered
  const percent = total === 0 ? 100 : (covered / total) * 100
  return { total, covered, uncovered, percent }
}

export function checkTypeCoverageThreshold(result: TypeCoverageResult, threshold = 90): boolean {
  return result.percent >= threshold
}

export type DepCruiseViolation = {
  from: string
  to: string
  rule: string
  severity: "error" | "warn" | "info"
}

export function filterDepCruiseBySeverity(
  violations: DepCruiseViolation[],
  minSeverity: DepCruiseViolation["severity"],
): DepCruiseViolation[] {
  const order = { info: 0, warn: 1, error: 2 }
  const min = order[minSeverity]
  return violations.filter((v) => order[v.severity] >= min)
}

export type JscpdResult = {
  format: string
  lines: number
  tokens: number
  firstFile: string
  secondFile: string
}

export function calculateDuplicationRate(duplications: JscpdResult[], totalLines: number): number {
  if (totalLines === 0) return 0
  const dupLines = duplications.reduce((acc, d) => acc + d.lines, 0)
  return (dupLines / totalLines) * 100
}
