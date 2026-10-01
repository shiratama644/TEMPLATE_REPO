import { describe, expect, it } from "vitest"
import { getDefaultAnswers } from "../../../../scripts/lib/bootstrap/prompts.ts"
import {
  getFeatureImpactSummary,
  resolveFeatureDependencies,
  suggestProjectTypeFromExisting,
  validateAnswers,
  validateGithubOwner,
  validateProjectName,
} from "../../../../scripts/lib/bootstrap/validator.ts"

describe("validateProjectName extra", () => {
  it("rejects starting with dot and underscore", () => {
    expect(validateProjectName(".hidden").valid).toBe(false)
    expect(validateProjectName("_private").valid).toBe(false)
  })
  it("rejects too long", () => {
    expect(validateProjectName("a".repeat(215)).valid).toBe(false)
  })
  it("rejects invalid chars", () => {
    expect(validateProjectName("My App").valid).toBe(false)
  })
  it("validates scoped package", () => {
    expect(validateProjectName("@scope/my-app").valid).toBe(true)
    expect(validateProjectName("@scope/invalid name").valid).toBe(false)
  })
  it("rejects invalid start", () => {
    expect(validateProjectName("-invalid").valid).toBe(false)
  })
})

describe("validateAnswers extra", () => {
  it("detects unknown project type", () => {
    const answers = getDefaultAnswers(process.cwd())
    ;(answers as any).projectType = "unknown"
    const result = validateAnswers(answers)
    expect(result.valid).toBe(false)
  })
  it("detects feature conflicts", () => {
    const answers = getDefaultAnswers(process.cwd())
    // Find a feature with conflicts if any, otherwise test unknown feature warning
    ;(answers.features as any)["unknown-feature"] = true
    const result = validateAnswers(answers)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
  it("detects invalid github owner warning", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.githubOwner = "-invalid"
    const result = validateAnswers(answers)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
  it("handles requires auto-enable", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.features.coverage = true
    answers.features.vitest = false
    const result = validateAnswers(answers)
    // coverage requires vitest, should warn
    expect(result.warnings.some((w) => w.includes("vitest") || w.includes("requires"))).toBe(true)
  })
  it("handles requires already enabled", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.features.coverage = true
    answers.features.vitest = true
    const result = validateAnswers(answers)
    // coverage requires vitest, already enabled, no warning about vitest
    expect(result.warnings.filter((w) => w.includes("vitest")).length).toBe(0)
  })
  it("handles disabled feature no requires check", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.features.coverage = false
    answers.features.vitest = false
    const result = validateAnswers(answers)
    expect(result.warnings.filter((w) => w.includes("coverage")).length).toBe(0)
  })
  it("handles feature without requires", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.features.docker = true
    const result = validateAnswers(answers)
    // docker has no requires, should not warn about requires
    expect(result.valid).toBe(true)
  })
  it("handles githubOwner undefined fallback", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.githubOwner = undefined as any
    const result = validateAnswers(answers)
    expect(result.valid).toBe(true)
  })
  it("handles githubOwner empty fallback", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.githubOwner = "" as any
    const result = validateAnswers(answers)
    expect(result.valid).toBe(true)
  })
})

describe("resolveFeatureDependencies extra", () => {
  it("resolves nested dependencies", () => {
    const features = {
      coverage: true,
      vitest: false,
    } as any
    const resolved = resolveFeatureDependencies(features)
    expect(resolved.vitest).toBe(true)
  })
})

describe("getFeatureImpactSummary extra", () => {
  it("covers all branches", () => {
    const features = getDefaultAnswers(process.cwd()).features
    features.playwright = true
    features.docker = true
    features.changesets = true
    const summary = getFeatureImpactSummary(features)
    expect(summary.length).toBeGreaterThan(3)
  })
  it("handles empty", () => {
    const summary = getFeatureImpactSummary({} as any)
    expect(Array.isArray(summary)).toBe(true)
  })
})

describe("suggestProjectTypeFromExisting extra", () => {
  it("covers all branches", () => {
    expect(suggestProjectTypeFromExisting(["vite.config.ts", "next.config.mjs"])).toBe("vite")
    expect(suggestProjectTypeFromExisting(["next.config.mjs"])).toBe("next")
    expect(suggestProjectTypeFromExisting(["turbo.json", "pnpm-workspace.yaml"])).toBe("monorepo")
    expect(
      suggestProjectTypeFromExisting(["turbo.json", "pnpm-workspace.yaml", "next.config.mjs"]),
    ).toBe("next-monorepo")
    expect(suggestProjectTypeFromExisting([])).toBe("plain")
  })
})
