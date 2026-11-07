import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Exercise the actual npm bin symlink with Node: calling dist/cli.js directly hides the bug.
test("agents-md-lint npm bin executes for clean and oversized AGENTS.md", () => {
  const dir = mkdtempSync(join(tmpdir(), "agents-bin-"))
  const bin = join(import.meta.dir, "../node_modules/.bin/agents-md-lint")
  const file = join(dir, "AGENTS.md")
  const lint = () => spawnSync("node", [bin, "--root", dir, file], { cwd: dir, encoding: "utf8" })
  try {
    writeFileSync(file, "# Guide\n")
    const clean = lint()
    expect(clean.error).toBeUndefined()
    expect(clean.status).toBe(0)
    expect(clean.stdout).toContain("1 file(s): 0 error(s)")

    writeFileSync(file, `# Guide\n${"x".repeat(90_000)}`)
    const invalid = lint()
    expect(invalid.error).toBeUndefined()
    expect(invalid.status).toBe(1)
    expect(invalid.stdout).toContain("XP-007")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
