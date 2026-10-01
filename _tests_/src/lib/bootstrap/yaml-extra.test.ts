import { describe, expect, it } from "vitest"
import {
  getJobNames,
  parseJobs,
  parseStepsInJob,
  removeJob,
  removeJobStructured,
  removeStepsByPattern,
  safeRemoveJob,
  safeRemoveSteps,
  validateYamlStructure,
} from "../../../../scripts/lib/bootstrap/yaml-utils.ts"

const sampleYaml = `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build
        run: pnpm build
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: pnpm test
`

describe("yaml-utils extended", () => {
  it("getJobNames", () => {
    const names = getJobNames(sampleYaml)
    expect(names).toContain("build")
    expect(names).toContain("test")
  })
  it("getJobNames fallback", () => {
    const invalid = "jobs:\n  build: [invalid\n  test:\n    runs-on: ubuntu"
    const names = getJobNames(invalid)
    expect(Array.isArray(names)).toBe(true)
  })
  it("removeJobStructured", () => {
    const result = removeJobStructured(sampleYaml, "build")
    expect(result).not.toContain("build:")
    expect(result).toContain("test:")
  })
  it("removeJobStructured fallback on invalid yaml", () => {
    const invalid = "jobs:\n  build: [invalid"
    const result = removeJobStructured(invalid, "build")
    expect(typeof result).toBe("string")
  })
  it("removeJobStructured no job", () => {
    const result = removeJobStructured(sampleYaml, "nonexistent")
    expect(result).toBe(sampleYaml)
  })
  it("validateYamlStructure", () => {
    expect(validateYamlStructure(sampleYaml).valid).toBe(true)
    expect(validateYamlStructure("no jobs here").valid).toBe(false)
  })
  it("safeRemoveJob keeps valid", () => {
    const result = safeRemoveJob(sampleYaml, "build")
    expect(result).toContain("jobs:")
    const invalidResult = safeRemoveJob("no jobs", "build")
    expect(invalidResult).toBe("no jobs")
  })
  it("safeRemoveSteps", () => {
    const result = safeRemoveSteps(sampleYaml, ["Checkout"])
    expect(result).toContain("jobs:")
  })
  it("safeRemoveSteps invalid", () => {
    const result = safeRemoveSteps("no jobs", ["Checkout"])
    expect(result).toBe("no jobs")
  })
  it("parseStepsInJob", () => {
    const steps = parseStepsInJob(sampleYaml, "build")
    expect(steps.length).toBeGreaterThan(0)
  })
  it("parseStepsInJob fallback with invalid yaml", () => {
    const invalid =
      "jobs:\n  build:\n    steps:\n      - name: Test\n        run: echo hi\n  test:\n    runs-on: ubuntu"
    const steps = parseStepsInJob(invalid, "build")
    expect(Array.isArray(steps)).toBe(true)
  })
  it("parseStepsInJob missing job", () => {
    const steps = parseStepsInJob(sampleYaml, "nonexistent")
    expect(steps.length).toBe(0)
  })
  it("removeStepsByPattern", () => {
    const result = removeStepsByPattern(sampleYaml, ["Checkout"])
    expect(result).not.toContain("Checkout")
  })
  it("removeStepsByPattern empty", () => {
    const result = removeStepsByPattern(sampleYaml, [])
    expect(result).toBe(sampleYaml)
  })
  it("removeStepsByPattern with jobNames", () => {
    const result = removeStepsByPattern(sampleYaml, ["Checkout"], ["build"])
    expect(result).not.toContain("Checkout")
    expect(result).toContain("Test")
  })
  it("parseJobs with structured", () => {
    const jobs = parseJobs(sampleYaml)
    expect(jobs.length).toBe(2)
    expect(jobs[0].name).toBe("build")
  })
  it("parseJobs fallback", () => {
    const invalid = "jobs:\n  build: [invalid\n  test:\n    runs-on: ubuntu"
    const jobs = parseJobs(invalid)
    expect(jobs.length).toBeGreaterThan(0)
  })
  it("removeJob", () => {
    const result = removeJob(sampleYaml, "build")
    expect(result).not.toContain("  build:")
    expect(result).toContain("test:")
    const noJob = removeJob(sampleYaml, "nonexistent")
    expect(noJob).toBe(sampleYaml)
  })
})
