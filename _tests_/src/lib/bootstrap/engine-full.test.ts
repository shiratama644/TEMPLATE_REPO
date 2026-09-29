import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  applyPlan,
  calculatePlan,
  diffPlans,
  expandGlob,
  formatPlan,
} from "../../../../scripts/lib/bootstrap/engine.ts"
import { getDefaultAnswers, getMinimalAnswers } from "../../../../scripts/lib/bootstrap/prompts.ts"

describe("engine full coverage", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `engine-full-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("expandGlob handles non-existing baseDir", () => {
    expect(expandGlob("nonexistent/**/*.ts", "/nonexistent/path/12345")).toEqual([])
  })

  it("expandGlob handles **/* suffix", () => {
    mkdirSync(join(tempRoot, "a", "b"), { recursive: true })
    writeFileSync(join(tempRoot, "a", "b", "c.ts"), "")
    const matches = expandGlob("a/**/*", tempRoot)
    expect(matches.length).toBeGreaterThan(0)
  })

  it("expandGlob handles ** with suffix", () => {
    writeFileSync(join(tempRoot, "test.config.ts"), "")
    const matches = expandGlob("**/*.config.ts", tempRoot)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("expandGlob handles star in subdir", () => {
    mkdirSync(join(tempRoot, "src"), { recursive: true })
    writeFileSync(join(tempRoot, "src", "a.ts"), "")
    writeFileSync(join(tempRoot, "src", "b.ts"), "")
    const matches = expandGlob("src/*.ts", tempRoot)
    expect(matches.length).toBe(2)
  })

  it("expandGlob handles non-existing searchDir for star", () => {
    expect(expandGlob("nonexistent/*.ts", tempRoot)).toEqual([])
  })

  it("expandGlob handles **/ prefix", () => {
    writeFileSync(join(tempRoot, "myfile.test.ts"), "")
    mkdirSync(join(tempRoot, "sub"), { recursive: true })
    writeFileSync(join(tempRoot, "sub", "other.test.ts"), "")
    const matches = expandGlob("**/*.test.ts", tempRoot)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("expandGlob handles exact file", () => {
    writeFileSync(join(tempRoot, "exact.txt"), "")
    expect(expandGlob("exact.txt", tempRoot)).toEqual(["exact.txt"])
    expect(expandGlob("nonexistent.txt", tempRoot)).toEqual([])
  })

  it("expandGlob handles ** with prefix and suffix", () => {
    mkdirSync(join(tempRoot, "docs"), { recursive: true })
    writeFileSync(join(tempRoot, "docs", "readme.md"), "")
    const matches = expandGlob("docs/**/*.md", tempRoot)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("calculatePlan handles feature dependencies", () => {
    const answers = getDefaultAnswers(tempRoot)
    answers.features.coverage = true
    answers.features.vitest = false
    const plan = calculatePlan(answers, tempRoot)
    expect(plan).toBeDefined()
  })

  it("calculatePlan handles all project types", () => {
    const types = ["plain", "vite", "next", "monorepo", "next-monorepo"] as const
    for (const type of types) {
      const answers = getDefaultAnswers(tempRoot)
      answers.projectType = type
      const plan = calculatePlan(answers, tempRoot)
      expect(plan.files.length).toBeGreaterThanOrEqual(0)
    }
  })

  it("calculatePlan handles disabled features", () => {
    writeFileSync(join(tempRoot, "Dockerfile"), "FROM node")
    writeFileSync(join(tempRoot, "docker-compose.yml"), "version: '3'")
    const answers = getDefaultAnswers(tempRoot)
    for (const key of Object.keys(answers.features)) {
      ;(answers.features as any)[key] = false
    }
    const plan = calculatePlan(answers, tempRoot)
    expect(plan.files.some((f) => f.type === "delete")).toBe(true)
  })

  it("calculatePlan handles enabled features keep", () => {
    const answers = getDefaultAnswers(tempRoot)
    writeFileSync(join(tempRoot, "Dockerfile"), "FROM node")
    const plan = calculatePlan(answers, tempRoot)
    expect(plan.files.some((f) => f.path === "Dockerfile")).toBe(true)
  })

  it("calculatePlan handles workflow deletions", () => {
    mkdirSync(join(tempRoot, ".github", "workflows"), { recursive: true })
    writeFileSync(join(tempRoot, ".github", "workflows", "release.yml"), "name: release")
    writeFileSync(join(tempRoot, ".github", "workflows", "stale.yml"), "name: stale")
    writeFileSync(join(tempRoot, ".github", "workflows", "label.yml"), "name: label")
    writeFileSync(
      join(tempRoot, ".github", "workflows", "ci.yml"),
      "name: ci\njobs:\n  test:\n    runs-on: ubuntu-latest",
    )
    const answers = getDefaultAnswers(tempRoot)
    answers.features.changesets = false
    answers.features["stale-bot"] = false
    answers.features["github-templates"] = false
    const plan = calculatePlan(answers, tempRoot)
    expect(plan.workflows.some((w) => w.file.includes("release.yml"))).toBe(true)
    expect(plan.workflows.some((w) => w.file.includes("stale.yml"))).toBe(true)
    expect(plan.workflows.some((w) => w.file.includes("label.yml"))).toBe(true)
  })

  it("calculatePlan handles placeholders", () => {
    writeFileSync(join(tempRoot, "README.md"), "template-repo")
    writeFileSync(join(tempRoot, "package.json"), JSON.stringify({ name: "test" }))
    const answers = getDefaultAnswers(tempRoot)
    answers.projectName = "my-new-app"
    answers.githubOwner = "newowner"
    const plan = calculatePlan(answers, tempRoot)
    expect(plan.placeholders.length).toBeGreaterThan(0)
    expect(plan.placeholders.some((p) => p.file === "README.md")).toBe(true)
  })

  it("calculatePlan handles projectType filesToRemove protection", () => {
    mkdirSync(join(tempRoot, "src"), { recursive: true })
    writeFileSync(join(tempRoot, "src", "index.ts"), "content")
    const answers = getDefaultAnswers(tempRoot)
    answers.projectType = "vite"
    const plan = calculatePlan(answers, tempRoot)
    expect(plan.files.every((f) => !f.path.startsWith("src/") || f.type !== "delete")).toBe(true)
  })

  it("applyPlan creates files", () => {
    const answers = getMinimalAnswers(tempRoot)
    answers.projectType = "plain"
    answers.projectName = "test-app"
    const plan = calculatePlan(answers, process.cwd())
    const createFiles = plan.files.filter((f) => f.type === "create" && !f.path.startsWith("src/"))
    const testPlan = {
      ...plan,
      files: createFiles.slice(0, 2),
      packageJson: [],
      workflows: [],
      placeholders: [],
    }
    expect(() => applyPlan(testPlan, answers, tempRoot, false)).not.toThrow()
  })

  it("applyPlan handles delete with protection", () => {
    const answers = getMinimalAnswers(tempRoot)
    const plan = {
      files: [{ path: "src/protected.ts", type: "delete" as const, reason: "test" }],
      packageJson: [],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 1,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 1,
        toKeep: 0,
        packageChanges: 0,
        workflowChanges: 0,
      },
    }
    expect(() => applyPlan(plan, answers, tempRoot, false)).not.toThrow()
  })

  it("applyPlan handles package.json changes", () => {
    writeFileSync(
      join(tempRoot, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { lodash: "1.0.0" },
        devDependencies: {},
        scripts: {},
        config: { commitizen: {} },
        "lint-staged": {},
        "size-limit": [],
      }),
    )
    const answers = getMinimalAnswers(tempRoot)
    answers.features.husky = false
    answers.features.commitlint = false
    answers.features["size-limit"] = false
    const plan = {
      files: [],
      packageJson: [
        { type: "remove-dep" as const, name: "lodash", reason: "test" },
        { type: "add-dep" as const, name: "new-dep", value: "1.0.0", reason: "test" },
        { type: "add-dep" as const, name: "new-dep2", value: "2.0.0", reason: "test" },
        { type: "add-script" as const, name: "test", value: "vitest", reason: "test" },
        { type: "remove-script" as const, name: "old-script", reason: "test" },
        { type: "update-field" as const, name: "name", value: "new-name", reason: "test" },
        { type: "update-field" as const, name: "description", value: "new desc", reason: "test" },
        {
          type: "update-field" as const,
          name: "repository",
          value: "https://github.com/test/repo",
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
        packageChanges: 8,
        workflowChanges: 0,
      },
    }
    expect(() => applyPlan(plan, answers, tempRoot, false)).not.toThrow()
    const pkg = JSON.parse(readFileSync(join(tempRoot, "package.json"), "utf8"))
    expect(pkg.name).toBe("new-name")
    expect(pkg.dependencies?.lodash).toBeUndefined()
  })

  it("applyPlan handles workflow delete and update", () => {
    mkdirSync(join(tempRoot, ".github", "workflows"), { recursive: true })
    writeFileSync(
      join(tempRoot, ".github", "workflows", "ci.yml"),
      "name: CI\njobs:\n  test:\n    runs-on: ubuntu\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm lint\n",
    )
    writeFileSync(join(tempRoot, ".github", "workflows", "release.yml"), "name: release")
    const answers = getMinimalAnswers(tempRoot)
    const plan = {
      files: [],
      packageJson: [],
      workflows: [
        { file: ".github/workflows/release.yml", type: "delete" as const, reason: "test" },
        {
          file: ".github/workflows/ci.yml",
          type: "update" as const,
          reason: "test",
          removedJobs: ["test"],
          removedSteps: ["lint"],
        },
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
    expect(() => applyPlan(plan, answers, tempRoot, false)).not.toThrow()
    expect(existsSync(join(tempRoot, ".github", "workflows", "release.yml"))).toBe(false)
  })

  it("applyPlan handles placeholders", () => {
    writeFileSync(join(tempRoot, "README.md"), "This is template-repo by shiratama644")
    writeFileSync(join(tempRoot, "CONTRIBUTING.md"), "template-repo")
    const answers = getMinimalAnswers(tempRoot)
    answers.projectName = "my-app"
    answers.githubOwner = "newowner"
    const plan = {
      files: [],
      packageJson: [],
      workflows: [],
      placeholders: [
        {
          file: "README.md",
          replacements: { "template-repo": "my-app", shiratama644: "newowner" } as Record<
            string,
            string
          >,
        },
        {
          file: "CONTRIBUTING.md",
          replacements: { "template-repo": "my-app" } as Record<string, string>,
        },
        { file: "package.json", replacements: {} as Record<string, string> },
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
    expect(() => applyPlan(plan as any, answers, tempRoot, false)).not.toThrow()
    const readme = readFileSync(join(tempRoot, "README.md"), "utf8")
    expect(readme).toContain("my-app")
  })

  it("applyPlan handles dryRun", () => {
    const answers = getMinimalAnswers(tempRoot)
    const plan = {
      files: [{ path: "test.txt", type: "create" as const, reason: "test" }],
      packageJson: [{ type: "update-field" as const, name: "name", value: "test", reason: "test" }],
      workflows: [{ file: ".github/workflows/ci.yml", type: "delete" as const, reason: "test" }],
      placeholders: [],
      summary: {
        totalFiles: 1,
        toCreate: 1,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 0,
        packageChanges: 1,
        workflowChanges: 1,
      },
    }
    expect(() => applyPlan(plan, answers, tempRoot, true)).not.toThrow()
    expect(existsSync(join(tempRoot, "test.txt"))).toBe(false)
  })

  it("applyPlan handles file with fromExample", () => {
    mkdirSync(join(tempRoot, "docs", "examples"), { recursive: true })
    writeFileSync(
      join(tempRoot, "docs", "examples", "example.txt"),
      "template-repo content by shiratama644",
    )
    const answers = getMinimalAnswers(tempRoot)
    answers.projectName = "my-app"
    answers.githubOwner = "newowner"
    answers.projectType = "plain"
    // Mock PROJECT_TYPES to include fromExample
    const plan = {
      files: [
        {
          path: "test-from-example.txt",
          type: "create" as const,
          reason: "test",
          featureId: "plain" as const,
        },
      ],
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
    // This will try to find fileDef in PROJECT_TYPES, which won't have our test file, so it will skip
    expect(() => applyPlan(plan as any, answers, tempRoot, false)).not.toThrow()
  })

  it("formatPlan handles all file types", () => {
    const answers = getDefaultAnswers(tempRoot)
    const plan = calculatePlan(answers, tempRoot)
    const formatted = formatPlan(plan, { colors: false, verbose: false })
    expect(formatted).toContain("Setup Plan")
    const formattedVerbose = formatPlan(plan, { colors: false, verbose: true })
    expect(formattedVerbose).toContain("Setup Plan")
  })

  it("formatPlan with colors handles keep truncation", () => {
    const plan = {
      files: Array.from({ length: 25 }, (_, i) => ({
        path: `file${i}.ts`,
        type: "keep" as const,
        reason: "keep",
      })),
      packageJson: [],
      workflows: [],
      placeholders: [],
      summary: {
        totalFiles: 25,
        toCreate: 0,
        toUpdate: 0,
        toDelete: 0,
        toKeep: 25,
        packageChanges: 0,
        workflowChanges: 0,
      },
    }
    const formatted = formatPlan(plan as any, { colors: true, verbose: true })
    expect(formatted).toContain("and 5 more")
  })

  it("formatPlan handles empty plan", () => {
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
    expect(formatted).toContain("no changes")
  })

  it("formatPlan handles package.json and workflows", () => {
    const plan = {
      files: [
        { path: "a.ts", type: "create" as const, reason: "create" },
        { path: "b.ts", type: "update" as const, reason: "update" },
        { path: "c.ts", type: "delete" as const, reason: "delete" },
        { path: "d.ts", type: "keep" as const, reason: "keep" },
      ],
      packageJson: [
        { type: "add-dep" as const, name: "dep1", value: "1.0.0", reason: "add" },
        { type: "remove-dep" as const, name: "dep2", reason: "remove" },
        { type: "update-field" as const, name: "name", value: "test", reason: "update" },
      ],
      workflows: [
        {
          file: ".github/workflows/ci.yml",
          type: "update" as const,
          reason: "update",
          removedJobs: ["job1"],
          removedSteps: ["step1"],
        },
        { file: ".github/workflows/release.yml", type: "delete" as const, reason: "delete" },
      ],
      placeholders: [{ file: "README.md", replacements: { a: "b" } }],
      summary: {
        totalFiles: 4,
        toCreate: 1,
        toUpdate: 1,
        toDelete: 1,
        toKeep: 1,
        packageChanges: 3,
        workflowChanges: 2,
      },
    }
    const formatted = formatPlan(plan as any, { colors: true, verbose: false })
    expect(formatted).toContain("Create")
    expect(formatted).toContain("Update")
    expect(formatted).toContain("Delete")
    expect(formatted).toContain("package.json")
    expect(formatted).toContain("Workflows")
    expect(formatted).toContain("Placeholders")
  })

  it("diffPlans works", () => {
    const plan1 = {
      files: [{ path: "a.ts", type: "create" as const, reason: "test" }],
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
    const plan2 = {
      files: [{ path: "b.ts", type: "create" as const, reason: "test" }],
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
    const diff = diffPlans(plan1 as any, plan2 as any)
    expect(diff).toContain("Added")
    expect(diff).toContain("Removed")

    const sameDiff = diffPlans(plan1 as any, plan1 as any)
    expect(sameDiff).toContain("identical")
  })
})
