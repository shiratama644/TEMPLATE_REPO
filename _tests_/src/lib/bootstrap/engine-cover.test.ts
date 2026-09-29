import { describe, expect, it } from "vitest"
import { diffPlans, formatPlan } from "../../../../scripts/lib/bootstrap/engine.ts"

describe("engine cover", () => {
  it("formatPlan with all types", () => {
    const plan = {
      files: [
        { path: "a.txt", type: "create" as const, reason: "test create", featureId: "docker" },
        { path: "b.txt", type: "update" as const, reason: "test update", featureId: "docker" },
        { path: "c.txt", type: "delete" as const, reason: "test delete", featureId: "docker" },
        { path: "d.txt", type: "keep" as const, reason: "test keep", featureId: "docker" },
      ],
      packageJson: [
        { type: "add-dep" as const, name: "dep1", value: "1.0", reason: "test" },
        { type: "remove-dep" as const, name: "dep2", reason: "test" },
        { type: "update-field" as const, name: "name", value: "my-app", reason: "test" },
        { type: "add-script" as const, name: "script", value: "echo", reason: "test" },
      ],
      workflows: [
        {
          file: ".github/workflows/ci.yml",
          type: "update" as const,
          reason: "test",
          removedJobs: ["job1"],
          removedSteps: ["step1"],
        },
        { file: ".github/workflows/release.yml", type: "delete" as const, reason: "test" },
      ],
      placeholders: [{ file: "README.md", replacements: { old: "new" } }],
      summary: {
        totalFiles: 4,
        toCreate: 1,
        toUpdate: 1,
        toDelete: 1,
        toKeep: 1,
        packageChanges: 4,
        workflowChanges: 2,
      },
    }
    const out = formatPlan(plan as any, { colors: true, verbose: true })
    expect(out).toContain("Create")
    expect(out).toContain("Update")
    expect(out).toContain("Delete")
    expect(out).toContain("Keep")
    expect(out).toContain("package.json")
    expect(out).toContain("Workflows")
    expect(out).toContain("Placeholders")

    const out2 = formatPlan(plan as any, { colors: false, verbose: false })
    expect(out2).toContain("Keep: 1 files")

    const out3 = formatPlan(plan as any, { colors: false, verbose: true })
    expect(out3).toContain("Keep")

    // Test with many keep files to trigger truncation
    const manyKeep = {
      ...plan,
      files: Array.from({ length: 25 }, (_, i) => ({
        path: `keep${i}.txt`,
        type: "keep" as const,
        reason: "keep",
        featureId: "docker",
      })),
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
    const out4 = formatPlan(manyKeep as any, { colors: false, verbose: true })
    expect(out4).toContain("and 5 more")
  })

  it("diffPlans with added and removed", () => {
    const plan1 = {
      files: [{ path: "a.txt", type: "create" as const, reason: "test" }],
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
      files: [{ path: "b.txt", type: "delete" as const, reason: "test" }],
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
    const diff = diffPlans(plan1 as any, plan2 as any)
    expect(diff).toContain("Added")
    expect(diff).toContain("Removed")
  })
})
