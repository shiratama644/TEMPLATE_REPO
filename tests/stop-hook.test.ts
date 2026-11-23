import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
const posix = process.platform === "win32" ? test.skip : test
const script = join(import.meta.dir, "..", ".agent", "hooks", "stop-verify.sh")
const run = (cwd: string, input = "{}", env: Record<string, string> = {}) =>
  spawnSync("sh", [script], { cwd, input, encoding: "utf8", env: { ...process.env, ...env } })

posix("stop hook blocks dirty or unpushed work and allows a clean pushed state", () => {
  const d = mkdtempSync(join(tmpdir(), "stop-hook-"))
  const remote = mkdtempSync(join(tmpdir(), "stop-hook-remote-"))
  dirs.push(d, remote)
  const git = (...args: string[]) => spawnSync("git", args, { cwd: d, encoding: "utf8" })
  expect(git("init", "-q").status).toBe(0)
  expect(spawnSync("git", ["init", "-q", "--bare", remote]).status).toBe(0)
  git("config", "user.name", "Test")
  git("config", "user.email", "test@example.org")
  writeFileSync(join(d, "file"), "x")
  git("add", "file")
  expect(git("commit", "-qm", "feat: initial").status).toBe(0)

  const unpushed = run(d)
  expect(unpushed.status).toBe(0)
  expect(unpushed.stdout).toContain('"decision":"block"')

  git("remote", "add", "origin", remote)
  expect(git("push", "-q", "-u", "origin", "HEAD").status).toBe(0)
  const clean = run(d)
  expect(clean.status).toBe(0)
  expect(clean.stdout).toBe("")

  writeFileSync(join(d, "dirty"), "x")
  expect(run(d).stdout).toContain('"decision":"block"')
  expect(run(d, '{"stop_hook_active":true}').stdout).toBe("")
  expect(run(d, "{}", { STOP_VERIFY: "off" }).stdout).toBe("")
})
