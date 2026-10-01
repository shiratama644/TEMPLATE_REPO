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

describe("validateProjectName", () => {
  it("valid names", () => {
    expect(validateProjectName("my-app").valid).toBe(true)
    expect(validateProjectName("@scope/my-app").valid).toBe(true)
    expect(validateProjectName("my_app-123").valid).toBe(true)
  })
  it("invalid names", () => {
    expect(validateProjectName("").valid).toBe(false)
    expect(validateProjectName(".hidden").valid).toBe(false)
    expect(validateProjectName("_private").valid).toBe(false)
    expect(validateProjectName("a".repeat(215)).valid).toBe(false)
    expect(validateProjectName("My App").valid).toBe(false)
  })
})

describe("validateGithubOwner", () => {
  it("valid owners", () => {
    expect(validateGithubOwner("myuser").valid).toBe(true)
    expect(validateGithubOwner("your-github-username").valid).toBe(true)
    expect(validateGithubOwner("my-user-123").valid).toBe(true)
  })
  it("invalid owners", () => {
    expect(validateGithubOwner("-invalid").valid).toBe(false)
    expect(validateGithubOwner("invalid-").valid).toBe(false)
  })
})

describe("resolveFeatureDependencies", () => {
  it("auto-enables vitest for coverage", () => {
    const features = {
      docker: false,
      devcontainer: false,
      termux: false,
      vitest: false,
      playwright: false,
      coverage: true,
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
    } as any
    const resolved = resolveFeatureDependencies(features)
    expect(resolved.vitest).toBe(true)
    expect(resolved.coverage).toBe(true)
  })
  it("keeps already enabled", () => {
    const features = {
      vitest: true,
      coverage: true,
    } as any
    const resolved = resolveFeatureDependencies(features)
    expect(resolved.vitest).toBe(true)
  })
})

describe("validateAnswers", () => {
  it("valid answers", () => {
    const answers = getDefaultAnswers(process.cwd())
    const result = validateAnswers(answers)
    expect(result.valid).toBe(true)
  })
  it("invalid project name", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.projectName = ""
    const result = validateAnswers(answers)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
  it("unknown feature warning", () => {
    const answers = getDefaultAnswers(process.cwd())
    ;(answers.features as any)["unknown-feature"] = true
    const result = validateAnswers(answers)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
  it("invalid termux mode", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.termuxMode = "invalid" as any
    const result = validateAnswers(answers)
    expect(result.valid).toBe(false)
  })
})

describe("getFeatureImpactSummary", () => {
  it("includes enabled/disabled and warnings", () => {
    const features = getDefaultAnswers(process.cwd()).features
    features.playwright = true
    features.docker = true
    const summary = getFeatureImpactSummary(features)
    expect(summary.some((s) => s.includes("Playwright"))).toBe(true)
    expect(summary.some((s) => s.includes("Docker"))).toBe(true)
  })
})

describe("suggestProjectTypeFromExisting", () => {
  it("suggests vite", () => {
    expect(suggestProjectTypeFromExisting(["vite.config.ts"])).toBe("vite")
  })
  it("suggests next", () => {
    expect(suggestProjectTypeFromExisting(["next.config.mjs"])).toBe("next")
  })
  it("suggests monorepo", () => {
    expect(suggestProjectTypeFromExisting(["pnpm-workspace.yaml", "turbo.json"])).toBe("monorepo")
  })
  it("suggests next-monorepo", () => {
    expect(
      suggestProjectTypeFromExisting(["pnpm-workspace.yaml", "turbo.json", "next.config.mjs"]),
    ).toBe("next-monorepo")
  })
  it("prefers vite when both present", () => {
    expect(suggestProjectTypeFromExisting(["vite.config.ts", "next.config.mjs"])).toBe("vite")
  })
  it("suggests plain for unknown", () => {
    expect(suggestProjectTypeFromExisting(["README.md"])).toBe("plain")
  })
})
