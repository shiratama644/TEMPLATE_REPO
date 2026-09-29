import { describe, expect, it } from "vitest"
import {
  parseJobs,
  parseStepsInJob,
  removeStepsByPattern,
} from "../../../../scripts/lib/bootstrap/yaml-utils.ts"

describe("yaml-utils 100% branches", () => {
  it("parseJobs with jobs section no jobs then other top-level", () => {
    const yaml = `
jobs:
other:
  key: value
`
    const jobs = parseJobs(yaml)
    expect(jobs.length).toBe(0)
  })

  it("parseJobs with job then other top-level", () => {
    const yaml = `
jobs:
  build:
    runs-on: ubuntu-latest
other:
  key: value
`
    const jobs = parseJobs(yaml)
    expect(jobs.length).toBe(1)
    expect(jobs[0].name).toBe("build")
  })

  it("removeStepsByPattern with no matching steps", () => {
    const yaml = `
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
`
    const result = removeStepsByPattern(yaml, ["NonExistentStep"])
    expect(result.includes("Checkout")).toBe(true)
  })

  it("removeStepsByPattern with matching and non-matching jobs", () => {
    const yaml = `
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: pnpm test
`
    // Only build job has Checkout, test job doesn't
    const result = removeStepsByPattern(yaml, ["Checkout"], ["build", "test"])
    expect(result.includes("Checkout")).toBe(false)
    expect(result.includes("Test")).toBe(true)
  })

  it("parseStepsInJob with no steps", () => {
    const yaml = `
jobs:
  build:
    runs-on: ubuntu-latest
`
    const steps = parseStepsInJob(yaml, "build")
    expect(steps.length).toBe(0)
  })
})
