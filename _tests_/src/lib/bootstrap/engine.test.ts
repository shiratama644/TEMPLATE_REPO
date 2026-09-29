import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  applyPlan,
  calculatePlan,
  diffPlans,
  expandGlob,
  formatPlan,
} from "../../../../scripts/lib/bootstrap/engine.ts"
import { getDefaultAnswers, getMinimalAnswers } from "../../../../scripts/lib/bootstrap/prompts.ts"

describe("expandGlob", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `glob-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("exact file", () => {
    writeFileSync(join(tempRoot, "test.txt"), "hello", "utf8")
    expect(expandGlob("test.txt", tempRoot)).toEqual(["test.txt"])
  })

  it("returns empty if not exists", () => {
    expect(expandGlob("nonexistent.txt", tempRoot)).toEqual([])
  })

  it("star pattern", () => {
    writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
    writeFileSync(join(tempRoot, "vite.config.js"), "", "utf8")
    const matches = expandGlob("vite.config.*", tempRoot)
    expect(matches.length).toBe(2)
  })

  it("double star pattern", () => {
    mkdirSync(join(tempRoot, ".devcontainer"), { recursive: true })
    writeFileSync(join(tempRoot, ".devcontainer", "devcontainer.json"), "{}", "utf8")
    const matches = expandGlob(".devcontainer/**", tempRoot)
    expect(matches.length).toBe(1)
  })

  it("handles **/ pattern", () => {
    writeFileSync(join(tempRoot, "a.test.ts"), "", "utf8")
    mkdirSync(join(tempRoot, "sub"), { recursive: true })
    writeFileSync(join(tempRoot, "sub", "b.test.ts"), "", "utf8")
    const matches = expandGlob("**/*.test.ts", tempRoot)
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })
})

describe("calculatePlan", () => {
  it("generates plan for plain", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.projectType = "plain"
    const plan = calculatePlan(answers, process.cwd())
    expect(plan.files.length).toBeGreaterThan(0)
    expect(plan.summary.totalFiles).toBe(plan.files.length)
  })

  it("generates plan for vite", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.projectType = "vite"
    const plan = calculatePlan(answers, process.cwd())
    const hasVite = plan.files.some((f) => f.path === "vite.config.ts")
    expect(hasVite).toBe(true)
  })

  it("minimal removes docker", () => {
    const answers = getMinimalAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    const hasDockerDelete = plan.files.some((f) => f.path === "Dockerfile" && f.type === "delete")
    expect(hasDockerDelete).toBe(true)
  })

  it("protects src/", () => {
    const answers = getMinimalAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    const hasSrcDelete = plan.files.some((f) => f.path.startsWith("src/") && f.type === "delete")
    expect(hasSrcDelete).toBe(false)
  })

  it("handles unknown project type", () => {
    const answers = getDefaultAnswers(process.cwd())
    ;(answers as any).projectType = "unknown-type"
    expect(() => calculatePlan(answers, process.cwd())).toThrow()
  })

  it("includes placeholders", () => {
    const answers = getDefaultAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    expect(plan.placeholders.length).toBeGreaterThan(0)
  })

  it("includes package.json changes", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.projectName = "my-test-app"
    const plan = calculatePlan(answers, process.cwd())
    const hasName = plan.packageJson.some((p) => p.name === "name" && p.value === "my-test-app")
    expect(hasName).toBe(true)
  })

  it("handles termux disabled", () => {
    const answers = getDefaultAnswers(process.cwd())
    answers.features.termux = false
    answers.termuxMode = "no"
    const plan = calculatePlan(answers, process.cwd())
    const hasTermuxRemoval = plan.workflows.some((w) =>
      w.removedSteps?.some((s) => s.toLowerCase().includes("termux")),
    )
    expect(hasTermuxRemoval).toBe(true)
  })
})

describe("formatPlan", () => {
  it("formats with colors and summary", () => {
    const answers = getMinimalAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    const formatted = formatPlan(plan, { colors: false })
    expect(formatted.includes("Setup Plan")).toBe(true)
    expect(formatted.includes("Summary:")).toBe(true)
  })

  it("formats with colors", () => {
    const answers = getMinimalAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    const colored = formatPlan(plan, { colors: true })
    expect(colored.includes("\x1b[")).toBe(true)
  })

  it("verbose shows keep files", () => {
    const answers = getDefaultAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    const verbose = formatPlan(plan, { colors: false, verbose: true })
    expect(verbose.includes("Keep")).toBe(true)
  })

  it("handles empty plan", () => {
    const plan = {
      files: [],
      packageJson: [],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 0,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 0,
        packageChanges: 0,
        workflowChanges: 0,
      },
    }
    const formatted = formatPlan(plan as any, { colors: false })
    expect(formatted.includes("no changes")).toBe(true)
  })
})

describe("diffPlans", () => {
  it("detects identical plans", () => {
    const answers = getDefaultAnswers(process.cwd())
    const plan = calculatePlan(answers, process.cwd())
    const diff = diffPlans(plan, plan)
    expect(diff.includes("identical")).toBe(true)
  })

  it("detects differences", () => {
    const answers1 = getMinimalAnswers(process.cwd())
    const answers2 = getDefaultAnswers(process.cwd())
    const plan1 = calculatePlan(answers1, process.cwd())
    const plan2 = calculatePlan(answers2, process.cwd())
    const diff = diffPlans(plan1, plan2)
    expect(diff.length).toBeGreaterThan(0)
  })
})

describe("applyPlan dry-run", () => {
  it("does not modify files in dry-run", () => {
    const tempRoot = join(tmpdir(), `apply-dry-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      const answers = getMinimalAnswers(tempRoot)
      const plan = calculatePlan(answers, process.cwd())
      // Dry-run should not throw
      expect(() => applyPlan(plan, answers, tempRoot, true)).not.toThrow()
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
