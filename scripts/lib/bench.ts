/**
 * Benchmark utilities — tinybench wrapper and comparison
 */

import { logger } from "./logger.ts"
import { type BenchmarkResult, compareBenchmarks, formatBenchmarkResult } from "./quality.ts"

const log = logger.log.bind(logger)

export type BenchTask = {
  name: string
  fn: () => void | Promise<void>
  iterations?: number
}

export async function runBenchTasks(tasks: BenchTask[]): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []

  // Use tinybench if available, otherwise fallback to simple timing
  try {
    const { Bench } = await import("tinybench")
    /* v8 ignore next 1 */
    const isTest = !!process.env.VITEST
    /* v8 ignore next 1 */
    const bench = new Bench({ time: isTest ? 50 : 500, iterations: isTest ? 5 : 50 })

    for (const task of tasks) {
      bench.add(task.name, task.fn)
    }

    await bench.run()

    for (const task of bench.tasks) {
      const result = task.result as any
      /* v8 ignore start */
      if (!result) continue

      results.push({
        name: task.name,
        hz: result.throughput?.mean || 0,
        mean: result.latency?.mean || 0,
        min: result.latency?.min || 0,
        max: result.latency?.max || 0,
        p50: result.latency?.p50 || 0,
        p75: result.latency?.p75 || 0,
        p99: result.latency?.p99 || 0,
        samples: result.latency?.samples?.length || 0,
      })
      /* v8 ignore stop */
    }
  } catch {
    /* v8 ignore start */
    // Fallback: simple performance.now timing
    for (const task of tasks) {
      const iterations = task.iterations || 100
      const samples: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await task.fn()
        const end = performance.now()
        samples.push(end - start)
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length
      const min = Math.min(...samples)
      const max = Math.max(...samples)
      const sorted = [...samples].sort((a, b) => a - b)
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0
      const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0
      const hz = mean > 0 ? 1000 / mean : 0

      results.push({ name: task.name, hz, mean, min, max, p50, p75, p99, samples: samples.length })
    }
    /* v8 ignore stop */
  }

  return results
}

export function printBenchResults(results: BenchmarkResult[]) {
  /* v8 ignore next 4 */
  log("⚡ Benchmark Results")
  for (const r of results) {
    log(`   ${formatBenchmarkResult(r)}`)
  }
}

export function checkForRegressions(
  current: BenchmarkResult[],
  baseline: BenchmarkResult[],
  threshold = 10,
): { hasRegression: boolean; regressions: string[] } {
  const comparisons = compareBenchmarks(current, baseline)
  const regressions = comparisons
    .filter((c) => c.regression)
    .map((c) => `${c.name}: +${c.percent.toFixed(1)}% slower`)

  return { hasRegression: regressions.length > 0, regressions }
}

export function parseArgs() {
  const args = process.argv.slice(2)
  /* v8 ignore next 3 */
  return {
    compare: args.includes("--compare"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    help: args.includes("--help") || args.includes("-h"),
  }
}

/* v8 ignore start */
if (!process.env.VITEST) {
  const opts = parseArgs()
  if (opts.help) {
    console.log(`
⚡ Benchmark — pnpm bench

Usage:
  pnpm bench [options]
  pnpm bench:compare --compare

Options:
  --compare   Compare with baseline
  --verbose   Verbose output
  --help      Show help
`)
    process.exit(0)
  }

  // Example bench
  runBenchTasks([
    {
      name: "example",
      fn: () => {
        for (let i = 0; i < 1000; i++) Math.random()
      },
    },
  ]).then((results) => {
    printBenchResults(results)
  })
}
/* v8 ignore stop */
