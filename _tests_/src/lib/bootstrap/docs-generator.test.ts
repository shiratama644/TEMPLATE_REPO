import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { generateDocs } from "../../../../scripts/lib/bootstrap/docs-generator.ts"

describe("docs-generator", () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `test-docs-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(testDir, { recursive: true })
    mkdirSync(join(testDir, "docs/arch"), { recursive: true })
    mkdirSync(join(testDir, "docs/complete"), { recursive: true })
    mkdirSync(join(testDir, "docs/audit"), { recursive: true })
    mkdirSync(join(testDir, "docs/planning/complete"), { recursive: true })
    mkdirSync(join(testDir, "docs/research"), { recursive: true })
    mkdirSync(join(testDir, "docs/ops"), { recursive: true })
    mkdirSync(join(testDir, "docs/examples"), { recursive: true })

    // Create old template-repo-specific files that should be deleted
    writeFileSync(join(testDir, "docs/complete/migration.md"), "old migration")
    writeFileSync(join(testDir, "docs/audit/activity.md"), "old activity")
    writeFileSync(join(testDir, "docs/planning/robustness-plan.md"), "old plan")
    writeFileSync(join(testDir, "docs/arch/product.md"), "old product")
    writeFileSync(join(testDir, "docs/arch/architecture.md"), "old arch")
    writeFileSync(join(testDir, "docs/arch/tech-stack.md"), "old tech")
    writeFileSync(join(testDir, "docs/arch/bootstrap.md"), "old bootstrap")
    writeFileSync(join(testDir, "docs/arch/detector.md"), "old detector")
    writeFileSync(join(testDir, "docs/arch/cache.md"), "old cache")
    writeFileSync(join(testDir, "docs/arch/termux.md"), "old termux")
    writeFileSync(join(testDir, "docs/arch/adr.md"), "old adr")
    writeFileSync(join(testDir, "docs/arch/engineering.md"), "old engineering")
    writeFileSync(join(testDir, "docs/arch/milestones.md"), "old milestones")
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it("deletes old template-repo files and creates new project docs", () => {
    const answers = {
      projectName: "my-app",
      projectDescription: "My awesome project",
      githubOwner: "testuser",
      projectType: "plain" as const,
      preset: "minimal" as const,
      termuxMode: "auto" as const,
      features: { vitest: true } as any,
    }

    const created = generateDocs(answers, testDir)

    expect(created).toContain("docs/README.md")
    expect(created).toContain("docs/task-list.md")
    expect(created).toContain("docs/arch/README.md")
    expect(created).toContain("docs/arch/engineering.md")
    expect(created).toContain("docs/arch/milestones.md")
    expect(created).toContain("docs/arch/product.md")
    expect(created).toContain("docs/arch/architecture.md")
    expect(created).toContain("docs/arch/adr.md")

    // Old TEMPLATE_REPO-specific files that are NOT recreated should be deleted
    expect(existsSync(join(testDir, "docs/complete/migration.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/audit/activity.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/planning/robustness-plan.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/arch/tech-stack.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/arch/bootstrap.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/arch/detector.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/arch/cache.md"))).toBe(false)
    expect(existsSync(join(testDir, "docs/arch/termux.md"))).toBe(false)

    // New files contain project name (recreated)
    const readmeContent = readFileSync(join(testDir, "docs/README.md"), "utf8")
    expect(readmeContent).toContain("my-app")
    expect(readmeContent).toContain("Generated with Template Bootstrap")
    expect(readmeContent).toContain("engineering.md")
    expect(readmeContent).toContain("milestones.md")

    const taskList = readFileSync(join(testDir, "docs/task-list.md"), "utf8")
    expect(taskList).toContain("my-app")
    expect(taskList).toContain("SETUP-1")

    const product = readFileSync(join(testDir, "docs/arch/product.md"), "utf8")
    expect(product).toContain("my-app")
    expect(product).toContain("My awesome project")
    expect(product).not.toContain("old product")

    const archReadme = readFileSync(join(testDir, "docs/arch/README.md"), "utf8")
    expect(archReadme).toContain("my-app")
    expect(archReadme).toContain("engineering.md")
    expect(archReadme).toContain("milestones.md")

    // New engineering and milestones contain project name and not old content
    const eng = readFileSync(join(testDir, "docs/arch/engineering.md"), "utf8")
    expect(eng).toContain("my-app")
    expect(eng).not.toContain("old engineering")
    const mile = readFileSync(join(testDir, "docs/arch/milestones.md"), "utf8")
    expect(mile).toContain("my-app")
    expect(mile).not.toContain("old milestones")

    const adr = readFileSync(join(testDir, "docs/arch/adr.md"), "utf8")
    expect(adr).toContain("my-app")
    expect(adr).not.toContain("old adr")
  })

  it("creates missing dirs and handles existing index files", () => {
    // Remove some dirs to test ensureDir
    rmSync(join(testDir, "docs/research"), { recursive: true, force: true })
    rmSync(join(testDir, "docs/ops"), { recursive: true, force: true })

    const answers = {
      projectName: "test-proj",
      projectDescription: "",
      githubOwner: "owner",
      projectType: "vite" as const,
      preset: undefined,
      termuxMode: "no" as const,
      features: {} as any,
    }

    const created = generateDocs(answers, testDir)

    expect(existsSync(join(testDir, "docs/research"))).toBe(true)
    expect(existsSync(join(testDir, "docs/ops"))).toBe(true)
    expect(existsSync(join(testDir, "docs/arch"))).toBe(true)
    expect(existsSync(join(testDir, "docs/arch/engineering.md"))).toBe(true)
    expect(existsSync(join(testDir, "docs/arch/milestones.md"))).toBe(true)
    expect(created.length).toBeGreaterThan(0)
  })
})
