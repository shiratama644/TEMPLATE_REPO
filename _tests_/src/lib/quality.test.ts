import { describe, expect, it } from "vitest"
import {
  calculateA11yScore,
  calculateDuplicationRate,
  calculateMutationScore,
  calculateTypeCoverage,
  calculateVisualDiffRatio,
  checkTypeCoverageThreshold,
  checkVisualThreshold,
  compareBenchmarks,
  filterA11yByImpact,
  filterDepCruiseBySeverity,
  formatBenchmarkResult,
  generateA11ySummary,
  generatePropertyTestSummary,
  parseMutationReport,
} from "../../../scripts/lib/quality.ts"

describe("quality.ts", () => {
  describe("calculateMutationScore", () => {
    it("calculates score", () => {
      expect(calculateMutationScore(80, 100)).toBe(80)
      expect(calculateMutationScore(0, 0)).toBe(0)
      expect(calculateMutationScore(0, 100)).toBe(0)
      expect(calculateMutationScore(100, 100)).toBe(100)
    })
  })

  describe("parseMutationReport", () => {
    it("parses Stryker format", () => {
      const json = JSON.stringify({
        files: {
          "src/index.ts": {
            mutants: [
              { status: "Killed" },
              { status: "Survived" },
              { status: "TimedOut" },
              { status: "NoCoverage" },
              { status: "Killed" },
            ],
          },
        },
      })
      const result = parseMutationReport(json)
      expect(result).not.toBeNull()
      expect(result!.totalMutants).toBe(5)
      expect(result!.killed).toBe(2)
      expect(result!.survived).toBe(1)
      expect(result!.timedOut).toBe(1)
      expect(result!.noCoverage).toBe(1)
      expect(result!.score).toBe(40)
    })
    it("parses simple format", () => {
      const json = JSON.stringify({ totalMutants: 10, killed: 8, survived: 2, score: 80 })
      const result = parseMutationReport(json)
      expect(result!.totalMutants).toBe(10)
      expect(result!.killed).toBe(8)
      expect(result!.score).toBe(80)
    })
    it("handles invalid json", () => {
      expect(parseMutationReport("invalid")).toBeNull()
      expect(parseMutationReport("{}")).toBeNull()
    })
    it("handles missing fields", () => {
      const json = JSON.stringify({ files: {} })
      const result = parseMutationReport(json)
      expect(result!.totalMutants).toBe(0)
    })
  })

  describe("A11y", () => {
    it("filterA11yByImpact", () => {
      const violations = [
        { id: "a", impact: "minor" as const, description: "", help: "", helpUrl: "", nodes: 1 },
        { id: "b", impact: "moderate" as const, description: "", help: "", helpUrl: "", nodes: 1 },
        { id: "c", impact: "serious" as const, description: "", help: "", helpUrl: "", nodes: 1 },
        { id: "d", impact: "critical" as const, description: "", help: "", helpUrl: "", nodes: 1 },
      ]
      expect(filterA11yByImpact(violations, "minor")).toHaveLength(4)
      expect(filterA11yByImpact(violations, "moderate")).toHaveLength(3)
      expect(filterA11yByImpact(violations, "serious")).toHaveLength(2)
      expect(filterA11yByImpact(violations, "critical")).toHaveLength(1)
    })
    it("calculateA11yScore", () => {
      expect(calculateA11yScore([])).toBe(100)
      const violations = [
        { id: "a", impact: "critical" as const, description: "", help: "", helpUrl: "", nodes: 1 },
      ]
      const score = calculateA11yScore(violations)
      expect(score).toBeLessThan(100)
      expect(score).toBeGreaterThanOrEqual(0)

      const many = Array(20)
        .fill(null)
        .map(() => ({
          id: "a",
          impact: "critical" as const,
          description: "",
          help: "",
          helpUrl: "",
          nodes: 10,
        }))
      expect(calculateA11yScore(many)).toBe(0)
    })
    it("generateA11ySummary", () => {
      const result = {
        url: "http://localhost:3000",
        violations: [
          {
            id: "a",
            impact: "critical" as const,
            description: "",
            help: "",
            helpUrl: "",
            nodes: 1,
          },
          { id: "b", impact: "serious" as const, description: "", help: "", helpUrl: "", nodes: 2 },
        ],
        passes: 10,
        incomplete: 0,
        timestamp: new Date().toISOString(),
      }
      const summary = generateA11ySummary(result)
      expect(summary).toContain("2 violations")
      expect(summary).toContain("critical:1")
    })
  })

  describe("Visual", () => {
    it("calculateVisualDiffRatio", () => {
      expect(calculateVisualDiffRatio(10, 100)).toBe(0.1)
      expect(calculateVisualDiffRatio(0, 0)).toBe(0)
      expect(calculateVisualDiffRatio(0, 100)).toBe(0)
    })
    it("checkVisualThreshold", () => {
      expect(
        checkVisualThreshold(
          { name: "test", diffPixels: 10, diffRatio: 0.005, maxDiff: 100, passed: true },
          0.01,
        ),
      ).toBe(true)
      expect(
        checkVisualThreshold(
          { name: "test", diffPixels: 100, diffRatio: 0.05, maxDiff: 100, passed: false },
          0.01,
        ),
      ).toBe(false)
    })
  })

  describe("Benchmark", () => {
    it("compareBenchmarks", () => {
      const current = [
        { name: "a", hz: 100, mean: 10, min: 5, max: 15, p50: 10, p75: 12, p99: 14, samples: 100 },
        { name: "b", hz: 200, mean: 5, min: 2, max: 8, p50: 5, p75: 6, p99: 7, samples: 100 },
      ]
      const baseline = [
        { name: "a", hz: 100, mean: 10, min: 5, max: 15, p50: 10, p75: 12, p99: 14, samples: 100 },
        { name: "b", hz: 200, mean: 4, min: 2, max: 8, p50: 5, p75: 6, p99: 7, samples: 100 },
      ]
      const comp = compareBenchmarks(current, baseline)
      expect(comp).toHaveLength(2)
      expect(comp[0].diff).toBe(0)
      expect(comp[1].regression).toBe(true) // 5 vs 4 = 25% slower
    })
    it("handles missing baseline", () => {
      const current = [
        { name: "a", hz: 100, mean: 10, min: 5, max: 15, p50: 10, p75: 12, p99: 14, samples: 100 },
      ]
      const baseline: any[] = []
      const comp = compareBenchmarks(current, baseline)
      expect(comp).toHaveLength(0)
    })
    it("formatBenchmarkResult", () => {
      const r = {
        name: "test",
        hz: 100.123,
        mean: 10.123,
        min: 5,
        max: 15,
        p50: 10,
        p75: 12,
        p99: 14.567,
        samples: 100,
      }
      const str = formatBenchmarkResult(r)
      expect(str).toContain("test")
      expect(str).toContain("100.12")
    })
  })

  describe("Property tests", () => {
    it("generatePropertyTestSummary", () => {
      const results = [
        { property: "prop1", passed: true, runs: 100 },
        { property: "prop2", passed: false, runs: 100, failedAfter: 10, counterexample: { x: 1 } },
      ]
      const summary = generatePropertyTestSummary(results)
      expect(summary).toContain("1/2 passed")
      expect(summary).toContain("prop1")
      expect(summary).toContain("prop2")
      expect(summary).toContain("counterexample")
    })
  })

  describe("Type coverage", () => {
    it("calculateTypeCoverage", () => {
      const r = calculateTypeCoverage(90, 100)
      expect(r.total).toBe(100)
      expect(r.covered).toBe(90)
      expect(r.uncovered).toBe(10)
      expect(r.percent).toBe(90)
    })
    it("handles zero total", () => {
      const r = calculateTypeCoverage(0, 0)
      expect(r.percent).toBe(100)
    })
    it("checkTypeCoverageThreshold", () => {
      const r = calculateTypeCoverage(90, 100)
      expect(checkTypeCoverageThreshold(r, 80)).toBe(true)
      expect(checkTypeCoverageThreshold(r, 95)).toBe(false)
    })
  })

  describe("DepCruise", () => {
    it("filterDepCruiseBySeverity", () => {
      const violations = [
        { from: "a", to: "b", rule: "r1", severity: "info" as const },
        { from: "a", to: "c", rule: "r2", severity: "warn" as const },
        { from: "a", to: "d", rule: "r3", severity: "error" as const },
      ]
      expect(filterDepCruiseBySeverity(violations, "info")).toHaveLength(3)
      expect(filterDepCruiseBySeverity(violations, "warn")).toHaveLength(2)
      expect(filterDepCruiseBySeverity(violations, "error")).toHaveLength(1)
    })
  })

  describe("Jscpd", () => {
    it("calculateDuplicationRate", () => {
      const dups = [
        { format: "ts", lines: 10, tokens: 100, firstFile: "a.ts", secondFile: "b.ts" },
        { format: "ts", lines: 20, tokens: 200, firstFile: "c.ts", secondFile: "d.ts" },
      ]
      expect(calculateDuplicationRate(dups, 100)).toBe(30)
      expect(calculateDuplicationRate([], 100)).toBe(0)
      expect(calculateDuplicationRate(dups, 0)).toBe(0)
    })
  })
})
