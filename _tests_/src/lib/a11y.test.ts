import { describe, expect, it } from "vitest"
import {
  checkA11yResult,
  createA11yResult,
  formatA11yViolation,
  printA11yReport,
} from "../../../scripts/lib/a11y.ts"

describe("a11y.ts", () => {
  it("createA11yResult", () => {
    const r = createA11yResult("http://localhost:3000", [])
    expect(r.url).toBe("http://localhost:3000")
    expect(r.violations).toHaveLength(0)
    expect(r.timestamp).toBeDefined()
  })

  it("checkA11yResult passes", () => {
    const r = createA11yResult("http://localhost:3000", [])
    const check = checkA11yResult(r)
    expect(check.passed).toBe(true)
  })

  it("checkA11yResult fails on critical", () => {
    const r = createA11yResult("http://localhost:3000", [
      {
        id: "color-contrast",
        impact: "critical",
        description: "Contrast",
        help: "Fix contrast",
        helpUrl: "https://example.com",
        nodes: 1,
      },
    ])
    const check = checkA11yResult(r)
    expect(check.passed).toBe(false)
    expect(check.reason).toContain("critical")
  })

  it("checkA11yResult fails on max violations", () => {
    const r = createA11yResult("http://localhost:3000", [
      { id: "a", impact: "minor", description: "", help: "", helpUrl: "", nodes: 1 },
      { id: "b", impact: "minor", description: "", help: "", helpUrl: "", nodes: 1 },
    ])
    const check = checkA11yResult(r, 1)
    expect(check.passed).toBe(false)
  })

  it("checkA11yResult fails on low score", () => {
    const violations = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `v${i}`,
        impact: "serious" as const,
        description: "",
        help: "",
        helpUrl: "",
        nodes: 5,
      }))
    const r = createA11yResult("http://localhost:3000", violations)
    const check = checkA11yResult(r, 100, 90)
    expect(check.passed).toBe(false)
  })

  it("formatA11yViolation", () => {
    const v = {
      id: "color-contrast",
      impact: "critical" as const,
      description: "Contrast issue",
      help: "Fix",
      helpUrl: "https://example.com",
      nodes: 2,
    }
    const str = formatA11yViolation(v)
    expect(str).toContain("color-contrast")
    expect(str).toContain("CRITICAL")
    expect(str).toContain("https://example.com")
  })

  it("printA11yReport does not throw", () => {
    const r = createA11yResult("http://localhost:3000", [])
    expect(() => printA11yReport(r)).not.toThrow()

    const r2 = createA11yResult("http://localhost:3000", [
      {
        id: "a",
        impact: "critical",
        description: "desc",
        help: "help",
        helpUrl: "https://example.com",
        nodes: 1,
      },
      {
        id: "b",
        impact: "minor",
        description: "desc",
        help: "help",
        helpUrl: "https://example.com",
        nodes: 1,
      },
    ])
    expect(() => printA11yReport(r2)).not.toThrow()
  })
})
