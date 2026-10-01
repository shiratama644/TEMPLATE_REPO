import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["bench/**/*.bench.ts", "src/**/*.bench.ts", "_tests_/**/*.bench.ts"],
    benchmark: {
      include: ["bench/**/*.bench.ts", "src/**/*.bench.ts"],
    },
    reporters: ["default", "json"],
    outputFile: {
      json: "reports/bench/bench.json",
      default: "reports/bench/bench.txt",
    },
  },
})
