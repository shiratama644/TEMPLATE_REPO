/**
 * Bundle size analysis helper
 */

import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { formatBytes, parseSizeLimitOutput } from "./cicd.ts"
import { logger } from "./logger.ts"

const log = logger.log.bind(logger)

export function analyzeSrcSize(dir = "src"): { file: string; size: number }[] {
  const results: { file: string; size: number }[] = []
  if (!existsSync(dir)) return results

  function walk(d: string) {
    const entries = readdirSync(d)
    for (const entry of entries) {
      const full = join(d, entry)
      /* v8 ignore start */
      try {
        const stat = statSync(full)
        if (stat.isDirectory()) walk(full)
        else if (stat.isFile() && (full.endsWith(".ts") || full.endsWith(".js"))) {
          results.push({ file: full, size: stat.size })
        }
      } catch {
        // ignore
      }
      /* v8 ignore stop */
    }
  }

  walk(dir)
  return results.sort((a, b) => b.size - a.size)
}

export function printBundleAnalysis() {
  log("📦 Bundle Analysis")
  log("")

  const srcFiles = analyzeSrcSize("src")
  /* v8 ignore next 4 */
  if (srcFiles.length > 0) {
    log("Top 10 largest src files:")
    for (const f of srcFiles.slice(0, 10)) {
      log(`  ${f.file}: ${formatBytes(f.size)}`)
    }
    log("")
  }

  // Try to parse size-limit output if available
  /* v8 ignore start */
  try {
    const { execSync } = require("node:child_process")
    const output = execSync("pnpm size 2>&1", { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
    const results = parseSizeLimitOutput(output)
    if (results.length > 0) {
      log("Size-limit results:")
      for (const r of results) {
        log(
          `  ${r.name}: ${formatBytes(r.size)}${r.limit ? ` / ${formatBytes(r.limit)}` : ""} ${r.passed ? "✓" : "✗"}`,
        )
      }
    }
  } catch {
    log("⚠️ Could not run pnpm size — run manually for details")
  }
  /* v8 ignore stop */
}

/* v8 ignore start */
if (!process.env.VITEST) {
  printBundleAnalysis()
}
/* v8 ignore stop */
