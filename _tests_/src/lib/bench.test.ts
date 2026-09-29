import { describe, expect, it } from "vitest"
import {
  checkForRegressions,
  parseArgs,
  printBenchResults,
  runBenchTasks,
} from "../../../scripts/lib/bench.ts"

describe("bench.ts", () => {
  it("runBenchTasks", async () => {
    const tasks = [
      {
        name: "task1",
        fn: () => {
          for (let i = 0; i < 100; i++) Math.random()
        },
      },
      {
        name: "task2",
        fn: async () => {
          await new Promise((r) => setTimeout(r, 1))
        },
        iterations: 5,
      },
    ]
    const results = await runBenchTasks(tasks)
    expect(results).toHaveLength(2)
    expect(results[0].name).toBe("task1")
    expect(results[0].mean).toBeGreaterThanOrEqual(0)
    expect(results[0].hz).toBeGreaterThanOrEqual(0)
  })

  it("printBenchResults does not throw", async () => {
    const tasks = [{ name: "quick", fn: () => {} }]
    const results = await runBenchTasks(tasks)
    expect(() => printBenchResults(results)).not.toThrow()
  })

  it("checkForRegressions detects regression", () => {
    const current = [
      { name: "a", hz: 100, mean: 15, min: 10, max: 20, p50: 15, p75: 16, p99: 19, samples: 10 },
    ]
    const baseline = [
      { name: "a", hz: 100, mean: 10, min: 5, max: 15, p50: 10, p75: 12, p99: 14, samples: 10 },
    ]
    const check = checkForRegressions(current, baseline)
    expect(check.hasRegression).toBe(true)
    expect(check.regressions.length).toBe(1)
  })

  it("checkForRegressions no regression", () => {
    const current = [
      { name: "a", hz: 100, mean: 9, min: 5, max: 15, p50: 9, p75: 10, p99: 14, samples: 10 },
    ]
    const baseline = [
      { name: "a", hz: 100, mean: 10, min: 5, max: 15, p50: 10, p75: 12, p99: 14, samples: 10 },
    ]
    const check = checkForRegressions(current, baseline)
    expect(check.hasRegression).toBe(false)
  })

  it("parseArgs", () => {
    const orig = process.argv
    process.argv = ["node", "bench.ts", "--compare", "--verbose"]
    const args = parseArgs()
    expect(args.compare).toBe(true)
    expect(args.verbose).toBe(true)
    process.argv = orig
  })
})
