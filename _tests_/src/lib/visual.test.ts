import { describe, expect, it } from "vitest"
import {
  compareScreenshots,
  createVisualDiff,
  DEFAULT_VISUAL_CONFIG,
  formatVisualDiff,
  printVisualReport,
} from "../../../scripts/lib/visual.ts"

describe("visual.ts", () => {
  it("createVisualDiff", () => {
    const diff = createVisualDiff("homepage", 10, 10000)
    expect(diff.name).toBe("homepage")
    expect(diff.diffPixels).toBe(10)
    expect(diff.diffRatio).toBe(0.001)
    expect(diff.passed).toBe(true)
  })

  it("createVisualDiff fails on large diff", () => {
    const diff = createVisualDiff("homepage", 500, 10000)
    expect(diff.diffRatio).toBe(0.05)
    expect(diff.passed).toBe(false)
  })

  it("compareScreenshots", () => {
    const baseline = Buffer.from("a".repeat(1000))
    const current = Buffer.from("a".repeat(1010))
    const diff = compareScreenshots(baseline, current)
    expect(diff.diffPixels).toBe(10)
    expect(diff.name).toBe("screenshot-comparison")
  })

  it("compareScreenshots identical", () => {
    const buf = Buffer.from("same content")
    const diff = compareScreenshots(buf, buf)
    expect(diff.diffPixels).toBe(0)
    expect(diff.passed).toBe(true)
  })

  it("formatVisualDiff", () => {
    const diff = { name: "test", diffPixels: 10, diffRatio: 0.01, maxDiff: 100, passed: true }
    const str = formatVisualDiff(diff)
    expect(str).toContain("test")
    expect(str).toContain("10")
    expect(str).toContain("✅")

    const diff2 = { name: "test", diffPixels: 100, diffRatio: 0.1, maxDiff: 100, passed: false }
    expect(formatVisualDiff(diff2)).toContain("❌")
  })

  it("printVisualReport", () => {
    const diffs = [
      { name: "a", diffPixels: 0, diffRatio: 0, maxDiff: 100, passed: true },
      { name: "b", diffPixels: 200, diffRatio: 0.05, maxDiff: 100, passed: false },
    ]
    expect(() => printVisualReport(diffs)).not.toThrow()
    expect(() =>
      printVisualReport([{ name: "a", diffPixels: 0, diffRatio: 0, maxDiff: 100, passed: true }]),
    ).not.toThrow()
  })

  it("DEFAULT_VISUAL_CONFIG", () => {
    expect(DEFAULT_VISUAL_CONFIG.threshold).toBeDefined()
    expect(DEFAULT_VISUAL_CONFIG.maxDiffPixels).toBeDefined()
    expect(DEFAULT_VISUAL_CONFIG.animations).toBe("disabled")
  })
})
