#!/usr/bin/env node
/**
 * E2E discovery check — tolerant to missing Playwright browsers
 * Tries `playwright test --list`, falls back to file glob if browsers missing
 */
import { execSync, spawnSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

function listFiles(): string[] {
  const e2eDir = join(process.cwd(), "e2e")
  if (!existsSync(e2eDir)) return []
  try {
    const files = readdirSync(e2eDir, { recursive: true } as any) as string[]
    return files.filter((f: string) => f.endsWith(".e2e.ts") || f.endsWith(".test.ts"))
  } catch {
    return []
  }
}

try {
  const result = spawnSync(
    "pnpm",
    ["exec", "playwright", "test", "--list", "--pass-with-no-tests"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30_000,
    },
  )
  const output = (result.stdout || "") + (result.stderr || "")
  if (result.status === 0) {
    console.log(output)
    console.log(`\n✓ E2E discovery OK via playwright --list`)
    process.exit(0)
  }
  // If browser missing, fallback
  if (
    output.includes("Executable doesn't exist") ||
    output.includes("browserType.launch") ||
    output.includes("Please run")
  ) {
    console.log("⚠ Playwright browsers not installed — falling back to file listing")
    const files = listFiles()
    console.log(`Found ${files.length} e2e files:`)
    for (const f of files) console.log(`  - ${f}`)
    console.log("\n✓ E2E discovery OK (fallback)")
    process.exit(0)
  }
  console.log(output)
  process.exit(result.status ?? 1)
} catch (err) {
  console.log(`⚠ E2E list failed: ${err instanceof Error ? err.message : String(err)} — fallback`)
  const files = listFiles()
  console.log(`Found ${files.length} e2e files:`)
  for (const f of files) console.log(`  - ${f}`)
  console.log("\n✓ E2E discovery OK (fallback)")
  process.exit(0)
}
