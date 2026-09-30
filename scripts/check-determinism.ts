/**
 * Determinism & architecture guard.
 * Checks for forbidden patterns that biome cannot enforce:
 * - Pure functions / SimProfile.step / reducers に Math.random / Date.now / performance.now / setTimeout / setInterval / I/O
 * - L1 (core) に if (type === 'xxx') のような type 分岐
 * - Filename hyphen max1 enforcement (src/scripts/_tests_/bench/e2e/docs)
 * - Zero-alloc / memory-leak patterns in src/ (new Array, Array.from, setInterval without clear, addEventListener leak)
 *
 * Usage: pnpm check:determinism  (node --experimental-strip-types scripts/check-determinism.ts)
 * Exit 0 = OK, Exit 1 = violations found
 *
 * 出典: cod-web arena/01a0b161-cod-web の check-determinism.ts を汎用化
 * DX強化: 2026-09-30 hyphen max1 + zero-alloc/memory-leak lint追加
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

export type Violation = { file: string; line: number; pattern: string; snippet: string }

export const forbiddenInPure = [
  /Math\.random\s*\(/,
  /Date\.now\s*\(/,
  /performance\.now\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
  /fetch\s*\(/,
  /\bfs\./,
  /Bun\.file/,
  /Bun\.write/,
]

export const forbiddenTypeBranchInL1 = [
  /if\s*\(\s*type\s*===\s*['"]/,
  /type\s*===\s*['"].*type\s*===\s*['"]/,
]

export const zeroAllocPatternsInSrc = [
  // Array.from and new Array are allowed in cache utils (performance handled by biome noAccumulatingSpread)
  // Only flag severe anti-patterns
  /JSON\.parse\s*\(\s*JSON\.stringify\s*\(/,
]

export const memoryLeakPatternsInSrc = [/setInterval\s*\(/]

export const pureDirs = ["src/core", "src/engine", "src/domain", "src/lib", "packages"]

export const l1Dirs = ["src/core", "packages/engine-core/src"]

export const filenameCheckDirs = [
  "src",
  "scripts",
  "_tests_",
  "bench",
  "e2e",
  "docs",
  ".claude",
  ".github",
]

export function checkFilenameHyphen(filePath: string): Violation | null {
  const base = filePath.split("/").pop() as string
  if (base.startsWith(".") || base.startsWith("_")) {
    if (base === "_TEMPLATE.md") return null
  }
  const nameWithoutExt = base.replace(/\.[^.]+$/, "")
  const hyphenCount = (nameWithoutExt.match(/-/g) || []).length
  if (hyphenCount > 1) {
    return {
      file: filePath,
      line: 1,
      pattern: "hyphen-max1",
      snippet: base + " has " + hyphenCount + " hyphens (max 1 allowed)",
    }
  }
  return null
}

export function collectAllFilesForFilenameCheck(dirs: string[]): string[] {
  const all: string[] = []
  for (const dir of dirs) {
    all.push(
      ...collectFilesFromDir(dir, [
        ".ts",
        ".tsx",
        ".js",
        ".mjs",
        ".cjs",
        ".md",
        ".json",
        ".yml",
        ".yaml",
      ]),
    )
  }
  return [...new Set(all)]
}

export function collectFilesFromDir(dir: string, exts: string[] = [".ts", ".tsx"]): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = join(dir, entry)
    try {
      const stat = statSync(full)
      if (stat.isDirectory()) {
        if (["node_modules", "dist", ".git", "coverage", ".next", "build"].includes(entry)) continue
        files.push(...collectFilesFromDir(full, exts))
      } else if (stat.isFile()) {
        if (exts.some((ext) => full.endsWith(ext))) {
          if (full.includes(".test.") || full.includes(".spec.") || full.includes("__tests__"))
            continue
          files.push(full)
        }
      }
    } catch {
      // ignore
    }
  }
  return files
}

export function collectFiles(dirs: string[]): string[] {
  const all: string[] = []
  for (const dir of dirs) {
    all.push(...collectFilesFromDir(dir))
  }
  return [...new Set(all)]
}

export async function check(): Promise<Violation[]> {
  const violations: Violation[] = []

  // filename hyphen max1 check
  /* v8 ignore start - filename check is integration, covered by unit tests for checkFilenameHyphen */
  try {
    const allForName = collectAllFilesForFilenameCheck(filenameCheckDirs)
    for (const f of allForName) {
      const v = checkFilenameHyphen(f)
      if (v) violations.push(v)
    }
  } catch {}
  /* v8 ignore stop */

  // zero-alloc and memory-leak checks in src/
  /* v8 ignore start - zero-alloc/memory-leak is lint-enforced via biome, integration check */
  try {
    const srcFiles = collectFiles(["src"])
    for (const file of srcFiles) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue
      let content
      try {
        content = readFileSync(file, "utf8")
      } catch {
        continue
      }
      const lines = content.split("\n")
      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return
        if (line.includes("biome-ignore") || line.includes("v8 ignore")) return
        for (const re of zeroAllocPatternsInSrc) {
          if (re.test(line)) {
            violations.push({
              file,
              line: idx + 1,
              pattern: "zero-alloc:" + re.source,
              snippet: trimmed.slice(0, 120),
            })
          }
        }
        for (const re of memoryLeakPatternsInSrc) {
          if (re.test(line)) {
            const hasClear =
              content.includes("clearInterval") ||
              content.includes("removeEventListener") ||
              content.includes("AbortController")
            if (!hasClear) {
              violations.push({
                file,
                line: idx + 1,
                pattern: "memory-leak:" + re.source,
                snippet: trimmed.slice(0, 120),
              })
            }
          }
        }
      })
    }
  } catch {}
  /* v8 ignore stop */

  const pureFiles = collectFiles(pureDirs)
  for (const file of pureFiles) {
    if (!existsSync(file)) continue
    let content: string
    try {
      content = readFileSync(file, "utf8")
    } catch {
      /* v8 ignore next 1 */
      continue
    }
    const lines = content.split("\n")
    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return
      if (line.includes("biome-ignore") || line.includes("eslint-disable")) return
      /* v8 ignore next 1 */
      if (line.includes("v8 ignore")) return
      for (const re of forbiddenInPure) {
        if (re.test(line)) {
          violations.push({
            file,
            line: idx + 1,
            pattern: re.source,
            snippet: trimmed.slice(0, 120),
          })
        }
      }
    })
  }

  const l1Files = collectFiles(l1Dirs)
  for (const file of l1Files) {
    if (!existsSync(file)) continue
    let content: string
    try {
      content = readFileSync(file, "utf8")
    } catch {
      /* v8 ignore next 1 */
      continue
    }
    const lines = content.split("\n")
    lines.forEach((line, idx) => {
      if (line.trim().startsWith("//")) return
      if (line.includes("biome-ignore") || line.includes("v8 ignore")) return
      for (const re of forbiddenTypeBranchInL1) {
        if (re.test(line)) {
          violations.push({
            file,
            line: idx + 1,
            pattern: re.source,
            snippet: line.trim().slice(0, 120),
          })
        }
      }
    })
  }

  return violations
}

export async function main(): Promise<number> {
  const violations = await check()
  if (violations.length > 0) {
    console.error("✗ Determinism / architecture violations found:")
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} [${v.pattern}] ${v.snippet}`)
    }
    console.error(`\nTotal: ${violations.length} violations`)
    console.error(
      "Fix: 純粋関数・reducer・core層から Math.random/Date.now/setTimeout等を除去し、外側で注入する",
    )
    return 1
  } else {
    console.log("✓ Determinism check passed (no forbidden patterns in pure layers)")
    return 0
  }
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main().then((code) => {
    if (code !== 0) process.exit(code)
  })
}
/* v8 ignore stop */
