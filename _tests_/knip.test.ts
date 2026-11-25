import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("Knip finds an unused source file in an isolated project", () => {
  const dir = mkdtempSync(join(tmpdir(), "knip-negative-"))
  try {
    writeFileSync(
      join(dir, "package.json"),
      '{"name":"knip-fixture","version":"0.0.1","type":"module"}\n',
    )
    writeFileSync(join(dir, "index.ts"), 'console.log("ok")\n')
    writeFileSync(join(dir, "unused.ts"), "export const unused = 1\n")
    const r = spawnSync(
      join(import.meta.dir, "../node_modules/.bin/knip"),
      ["--directory", dir, "--reporter", "compact"],
      {
        encoding: "utf8",
        env: { ...process.env, KNIP_DISABLE_RAW_TRANSFER: "1" },
      },
    )
    expect(r.status).toBe(1)
    expect(r.stdout).toContain("Unused files")
    expect(r.stdout).toContain("unused.ts")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
