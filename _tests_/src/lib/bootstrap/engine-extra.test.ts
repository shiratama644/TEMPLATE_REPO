import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { applyPlan, calculatePlan } from "../../../../scripts/lib/bootstrap/engine.ts"
import { getDefaultAnswers, getMinimalAnswers } from "../../../../scripts/lib/bootstrap/prompts.ts"

describe("engine extra coverage", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `engine-extra-${Date.now()}-${Math.random()}`)
    mkdirSync(tmp, { recursive: true })
    vi.resetModules()
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it("applyPlan handles fromExample and replacements", async () => {
    // Create example file
    mkdirSync(join(tmp, "examples"), { recursive: true })
    writeFileSync(
      join(tmp, "examples", "tmpl.txt"),
      "template-repo and TEMPLATE_REPO and shiratama644 and your-github-username",
    )
    // Mock PROJECT_TYPES to have file with fromExample
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          ...actual.PROJECT_TYPES,
          plain: {
            ...actual.PROJECT_TYPES.plain,
            filesToCreate: [
              ...actual.PROJECT_TYPES.plain.filesToCreate,
              { path: "from-example.txt", fromExample: "examples/tmpl.txt" } as any,
            ],
          },
        },
      }
    })
    const { calculatePlan: calc, applyPlan: apply } = await import(
      "../../../../scripts/lib/bootstrap/engine.ts"
    )
    const answers = getMinimalAnswers(tmp)
    answers.projectType = "plain"
    answers.projectName = "my-app"
    answers.githubOwner = "newowner"
    const plan = calc(answers, tmp)
    // Force include our file
    const customPlan = {
      ...plan,
      files: [{ path: "from-example.txt", type: "create" as const, reason: "test" }],
      packageJson: [],
      workflows: [],
      placeholders: [],
    }
    apply(customPlan as any, answers, tmp, false)
    const content = readFileSync(join(tmp, "from-example.txt"), "utf8")
    expect(content).toContain("my-app")
    expect(content).toContain("MY_APP")
    expect(content).toContain("newowner")
  })

  it("applyPlan handles overwrite false", async () => {
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          ...actual.PROJECT_TYPES,
          plain: {
            ...actual.PROJECT_TYPES.plain,
            filesToCreate: [
              { path: "no-overwrite.txt", content: "new content", overwrite: false } as any,
            ],
          },
        },
      }
    })
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    const answers = getMinimalAnswers(tmp)
    answers.projectType = "plain"
    writeFileSync(join(tmp, "no-overwrite.txt"), "existing")
    const plan = {
      files: [{ path: "no-overwrite.txt", type: "create" as const, reason: "test" }],
      packageJson: [],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 1,
        toCreate: 1,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 0,
        packageChanges: 0,
        workflowChanges: 0,
      },
    }
    apply(plan as any, answers, tmp, false)
    const content = readFileSync(join(tmp, "no-overwrite.txt"), "utf8")
    expect(content).toBe("existing")
  })

  it("applyPlan handles package.json add-dep already exists and dev false", async () => {
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          ...actual.PROJECT_TYPES,
          plain: {
            ...actual.PROJECT_TYPES.plain,
            dependenciesToAdd: [
              { name: "existing-dep", version: "1.0.0", dev: false },
              { name: "new-dep", version: "2.0.0", dev: true },
            ],
            filesToCreate: [],
          },
        },
      }
    })
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        dependencies: { "existing-dep": "0.5.0" },
        devDependencies: {},
        scripts: { old: "echo old" },
      }),
    )
    const answers = getMinimalAnswers(tmp)
    answers.projectType = "plain"
    const plan = {
      files: [],
      packageJson: [
        { type: "add-dep" as const, name: "existing-dep", value: "1.0.0", reason: "test" },
        { type: "add-dep" as const, name: "new-dep", value: "2.0.0", reason: "test" },
        { type: "add-dep" as const, name: "new-dep2", value: "3.0.0", reason: "test" },
        { type: "add-script" as const, name: "old", value: "new val", reason: "test" },
        { type: "add-script" as const, name: "new-script", value: "echo new", reason: "test" },
        { type: "remove-script" as const, name: "old", reason: "test" },
      ],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 0,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 0,
        packageChanges: 6,
        workflowChanges: 0,
      },
    }
    apply(plan as any, answers, tmp, false)
    const pkg = JSON.parse(readFileSync(join(tmp, "package.json"), "utf8"))
    expect(pkg.dependencies["existing-dep"]).toBe("0.5.0") // should keep existing
    expect(pkg.devDependencies["new-dep"]).toBe("2.0.0")
    expect(pkg.scripts["new-script"]).toBe("echo new")
  })

  it("applyPlan handles repository as string and object", async () => {
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    // string repository
    writeFileSync(join(tmp, "package.json"), JSON.stringify({ repository: "https://old.com" }))
    const answers = getMinimalAnswers(tmp)
    const plan = {
      files: [],
      packageJson: [
        {
          type: "update-field" as const,
          name: "repository",
          value: "https://new.com",
          reason: "test",
        },
      ],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 0,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 0,
        packageChanges: 1,
        workflowChanges: 0,
      },
    }
    apply(plan as any, answers, tmp, false)
    let pkg = JSON.parse(readFileSync(join(tmp, "package.json"), "utf8"))
    expect(pkg.repository).toBe("https://new.com")

    // object repository
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ repository: { url: "https://old.com" } }),
    )
    apply(plan as any, answers, tmp, false)
    pkg = JSON.parse(readFileSync(join(tmp, "package.json"), "utf8"))
    expect(pkg.repository.url).toBe("https://new.com")

    // no repository
    writeFileSync(join(tmp, "package.json"), JSON.stringify({}))
    apply(plan as any, answers, tmp, false)
    pkg = JSON.parse(readFileSync(join(tmp, "package.json"), "utf8"))
    expect(pkg.repository).toBe("https://new.com")
  })

  it("applyPlan handles commitizen config removal", async () => {
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        config: { commitizen: { path: "cz" }, other: "keep" },
      }),
    )
    const answers = getMinimalAnswers(tmp)
    answers.features.commitlint = false
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
    apply(plan as any, answers, tmp, false)
    let pkg = JSON.parse(readFileSync(join(tmp, "package.json"), "utf8"))
    expect(pkg.config?.commitizen).toBeUndefined()
    expect(pkg.config?.other).toBe("keep")

    // config only commitizen, should delete config entirely
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        config: { commitizen: { path: "cz" } },
      }),
    )
    apply(plan as any, answers, tmp, false)
    pkg = JSON.parse(readFileSync(join(tmp, "package.json"), "utf8"))
    expect(pkg.config).toBeUndefined()
  })

  it("applyPlan handles workflow update when file doesn't exist", async () => {
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    const answers = getMinimalAnswers(tmp)
    const plan = {
      files: [],
      packageJson: [],
      workflows: [
        {
          file: ".github/workflows/ci.yml",
          type: "update" as const,
          reason: "test",
          removedJobs: ["job"],
          removedSteps: ["step"],
        },
        { file: ".github/workflows/release.yml", type: "delete" as const, reason: "test" },
      ],
      placeholders: [],
      summary: {
        totalFiles: 0,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 0,
        packageChanges: 0,
        workflowChanges: 2,
      },
    }
    // No workflow files exist, should not throw
    expect(() => apply(plan as any, answers, tmp, false)).not.toThrow()
  })

  it("applyPlan handles placeholder file not existing", async () => {
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    const answers = getMinimalAnswers(tmp)
    const plan = {
      files: [],
      packageJson: [],
      workflows: [],
      placeholders: [
        { file: "NONEXISTENT.md", replacements: { a: "b" } },
        { file: "README.md", replacements: { "no-match": "b" } },
      ],
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
    expect(() => apply(plan as any, answers, tmp, false)).not.toThrow()
  })

  it("applyPlan handles delete with directory and failure", async () => {
    const { applyPlan: apply } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    mkdirSync(join(tmp, "to-delete-dir"), { recursive: true })
    writeFileSync(join(tmp, "to-delete-dir", "file.txt"), "content")
    const answers = getMinimalAnswers(tmp)
    const plan = {
      files: [
        { path: "to-delete-dir", type: "delete" as const, reason: "test" },
        { path: "nonexistent.txt", type: "delete" as const, reason: "test" },
      ],
      packageJson: [],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 2,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 2,
        toKeep: 0,
        packageChanges: 0,
        workflowChanges: 0,
      },
    }
    expect(() => apply(plan as any, answers, tmp, false)).not.toThrow()
    expect(existsSync(join(tmp, "to-delete-dir"))).toBe(false)
  })

  it("calculatePlan handles feature with ciJobs and ciSteps merging", async () => {
    mkdirSync(join(tmp, ".github", "workflows"), { recursive: true })
    writeFileSync(join(tmp, ".github", "workflows", "ci.yml"), "name: ci")
    const answers = getDefaultAnswers(tmp)
    // Disable multiple features that have ciJobs
    answers.features.cspell = false
    answers.features.knip = false
    const plan = calculatePlan(answers, tmp)
    expect(plan.workflows.length).toBeGreaterThanOrEqual(1)
  })

  it("calculatePlan handles filesToCreate with overwrite false and exists", async () => {
    writeFileSync(join(tmp, "existing.txt"), "exists")
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          ...actual.PROJECT_TYPES,
          plain: {
            ...actual.PROJECT_TYPES.plain,
            filesToCreate: [
              { path: "existing.txt", content: "new", overwrite: false } as any,
              { path: "new.txt", content: "new file" } as any,
            ],
          },
        },
      }
    })
    const { calculatePlan: calc } = await import("../../../../scripts/lib/bootstrap/engine.ts")
    const answers = getMinimalAnswers(tmp)
    answers.projectType = "plain"
    const plan = calc(answers, tmp)
    const existing = plan.files.find((f) => f.path === "existing.txt")
    expect(existing?.type).toBe("keep")
    const newFile = plan.files.find((f) => f.path === "new.txt")
    expect(newFile?.type).toBe("create")
  })
})
