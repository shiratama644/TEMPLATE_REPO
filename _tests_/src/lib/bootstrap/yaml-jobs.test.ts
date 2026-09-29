import { describe, expect, it } from "vitest"
import { parseStepsInJob } from "../../../../scripts/lib/bootstrap/yaml-utils.ts"

describe("yaml-utils parse steps in job", () => {
  const YAML_WITH_TWO_JOBS = `
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

  const YAML_WITH_STEPS_AND_NEXT_JOB = `
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build
        run: pnpm build
    env:
      NODE_ENV: production
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: pnpm test
`

  it("parseStepsInJob with env after steps", () => {
    const steps = parseStepsInJob(YAML_WITH_STEPS_AND_NEXT_JOB, "build")
    expect(steps.length).toBe(2)
  })

  it("parseStepsInJob with two jobs", () => {
    const steps = parseStepsInJob(YAML_WITH_TWO_JOBS, "build")
    expect(steps.length).toBe(2)
    const steps2 = parseStepsInJob(YAML_WITH_TWO_JOBS, "test")
    expect(steps2.length).toBe(1)
  })

  it("parseStepsInJob with uses", () => {
    const yaml = `
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: pnpm build
`
    const steps = parseStepsInJob(yaml, "build")
    expect(steps.length).toBe(2)
    expect(steps[0].name).toBe("actions/checkout@v4")
  })
})
