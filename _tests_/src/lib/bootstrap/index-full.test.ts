import { describe, expect, it } from "vitest"

describe("bootstrap index re-exports", () => {
  it("exports all bootstrap modules", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/index.ts")
    expect(mod).toBeDefined()
    expect(mod.calculatePlan).toBeDefined()
    expect(mod.applyPlan).toBeDefined()
    expect(mod.expandGlob).toBeDefined()
    expect(mod.generateDocs).toBeDefined()
    expect(mod.generateReadme).toBeDefined()
    expect(mod.getDefaultAnswers).toBeDefined()
    expect(mod.getMinimalAnswers).toBeDefined()
    expect(mod.FEATURES).toBeDefined()
    expect(mod.PROJECT_TYPES).toBeDefined()
    expect(mod.PRESETS).toBeDefined()
    expect(mod.validateAnswers).toBeDefined()
    expect(mod.BOOTSTRAP_VERSION).toBeDefined()
    expect(mod.getBootstrapModules()).toContain("engine")
    expect(mod.getBootstrapModules().length).toBeGreaterThan(5)
  })
})
