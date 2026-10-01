import { describe, expect, it } from "vitest"
import {
  getAnswersFromPreset,
  getDefaultAnswers,
  getMinimalAnswers,
} from "../../../../scripts/lib/bootstrap/prompts.ts"

describe("prompts full coverage", () => {
  it("getDefaultAnswers returns defaults", () => {
    const answers = getDefaultAnswers("/tmp")
    expect(answers.projectName).toBeTruthy()
    expect(answers.projectType).toBe("plain")
    expect(answers.features).toBeDefined()
    expect(answers.termuxMode).toBe("auto")
  })

  it("getMinimalAnswers returns minimal", () => {
    const answers = getMinimalAnswers("/tmp")
    expect(answers.projectName).toBeTruthy()
    expect(answers.features.vitest).toBe(true)
    expect(answers.features.docker).toBe(false)
    expect(answers.termuxMode).toBe("no")
  })

  it("getAnswersFromPreset returns preset", () => {
    const answers = getAnswersFromPreset("minimal", {}, "/tmp")
    expect(answers).toBeDefined()
    expect(answers?.preset).toBe("minimal")
    expect(answers?.projectType).toBe("plain")
  })

  it("getAnswersFromPreset with overrides", () => {
    const answers = getAnswersFromPreset(
      "vite-app",
      { projectName: "my-vite", githubOwner: "myuser" },
      "/tmp",
    )
    expect(answers?.projectName).toBe("my-vite")
    expect(answers?.githubOwner).toBe("myuser")
    expect(answers?.projectType).toBe("vite")
  })

  it("getAnswersFromPreset returns undefined for unknown", () => {
    const answers = getAnswersFromPreset("unknown" as any, {}, "/tmp")
    expect(answers).toBeUndefined()
  })

  it("getAnswersFromPreset handles all presets", () => {
    const presets = [
      "minimal",
      "recommended",
      "full",
      "library",
      "vite-app",
      "next-app",
      "monorepo",
    ] as const
    for (const preset of presets) {
      const answers = getAnswersFromPreset(preset, {}, "/tmp")
      expect(answers).toBeDefined()
      expect(answers?.preset).toBe(preset)
    }
  })

  it("getDefaultAnswers handles cwd with special chars", () => {
    const answers = getDefaultAnswers("/tmp/my app@123")
    expect(answers.projectName).toBe("my-app-123")
  })

  it("getMinimalAnswers handles cwd with special chars", () => {
    const answers = getMinimalAnswers("/tmp/my app@123")
    expect(answers.projectName).toBe("my-app-123")
  })

  it("getDefaultAnswers infers owner from git when possible", () => {
    const answers = getDefaultAnswers(process.cwd())
    expect(answers.githubOwner).toBeTruthy()
  })
})
