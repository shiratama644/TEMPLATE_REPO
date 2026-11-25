import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// POSIX tests the npm bin symlink; Windows has a .cmd shim, so test the CLI entry directly.
test(`agents-md-lint ${process.platform === "win32" ? "CLI" : "npm bin"} handles clean and oversized AGENTS.md`, () => {
  const dir = mkdtempSync(join(tmpdir(), "agents-bin-"))
  // Windows npm uses .cmd shims rather than a POSIX symlink; exercise the CLI directly there.
  const bin = join(
    import.meta.dir,
    process.platform === "win32"
      ? "../node_modules/agents-md-lint/dist/cli.js"
      : "../node_modules/.bin/agents-md-lint",
  )
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
