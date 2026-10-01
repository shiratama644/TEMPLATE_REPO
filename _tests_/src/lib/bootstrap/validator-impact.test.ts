import { describe, expect, it } from "vitest"
import { getDefaultAnswers } from "../../../../scripts/lib/bootstrap/prompts.ts"
import { getFeatureImpactSummary } from "../../../../scripts/lib/bootstrap/validator.ts"

describe("validator feature impact summary", () => {
  it("getFeatureImpactSummary all false", () => {
    const summary = getFeatureImpactSummary({
      docker: false,
      devcontainer: false,
      termux: false,
      vitest: false,
      playwright: false,
      coverage: false,
      cspell: false,
      knip: false,
      publint: false,
      "size-limit": false,
      determinism: false,
      husky: false,
      commitlint: false,
      "github-templates": false,
      renovate: false,
      "stale-bot": false,
      changesets: false,
    } as any)
    expect(summary.length).toBe(2)
    expect(summary[0]).toContain("Enabled 0")
  })

  it("getFeatureImpactSummary all true", () => {
    const features = getDefaultAnswers(process.cwd()).features
    for (const key of Object.keys(features)) {
      ;(features as any)[key] = true
    }
    const summary = getFeatureImpactSummary(features)
    expect(summary.some((s) => s.includes("Playwright"))).toBe(true)
    expect(summary.some((s) => s.includes("Docker"))).toBe(true)
    expect(summary.some((s) => s.includes("Changesets"))).toBe(true)
  })

  it("getFeatureImpactSummary only playwright", () => {
    const summary = getFeatureImpactSummary({ playwright: true } as any)
    expect(summary.some((s) => s.includes("Playwright"))).toBe(true)
    expect(summary.some((s) => s.includes("Docker"))).toBe(false)
  })

  it("getFeatureImpactSummary only docker", () => {
    const summary = getFeatureImpactSummary({ docker: true } as any)
    expect(summary.some((s) => s.includes("Docker"))).toBe(true)
  })

  it("getFeatureImpactSummary only changesets", () => {
    const summary = getFeatureImpactSummary({ changesets: true } as any)
    expect(summary.some((s) => s.includes("Changesets"))).toBe(true)
  })
})
