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
const temp = (name: string) => {
  const d = mkdtempSync(join(tmpdir(), name))
  dirs.push(d)
  return d
}
function repository() {
  const d = temp("stop-hook-")
  const remote = temp("stop-hook-remote-")
  const git = (...args: string[]) => spawnSync("git", args, { cwd: d, encoding: "utf8" })
  expect(git("init", "-q").status).toBe(0)
  expect(spawnSync("git", ["init", "-q", "--bare", remote]).status).toBe(0)
  git("config", "user.name", "Test")
  git("config", "user.email", "test@example.org")
  git("remote", "add", "origin", remote)
  writeFileSync(join(d, "file"), "x")
  git("add", "file")
  expect(git("commit", "-qm", "feat: initial").status).toBe(0)
  return { d, git }
}

posix("stop hook blocks unpushed or dirty work and allows a clean pushed state", () => {
  const { d, git } = repository()
  const branch = git("rev-parse", "--abbrev-ref", "HEAD").stdout.trim()

  expect(run(d).stdout).toContain('"decision":"block"')
  expect(git("push", "-q", "origin", branch).status).toBe(0)
  const pushed = run(d)
  expect(pushed.status).toBe(0)
  expect(pushed.stdout).toBe("")

  writeFileSync(join(d, "second"), "x")
  git("add", "second")
  expect(git("commit", "-qm", "feat: second").status).toBe(0)
  expect(run(d).stdout).toContain('"decision":"block"')
  expect(git("push", "-q", "origin", branch).status).toBe(0)
  expect(run(d).stdout).toBe("")

  writeFileSync(join(d, "dirty"), "x")
  expect(run(d).stdout).toContain('"decision":"block"')
  expect(run(d, '{"stop_hook_active":true}').stdout).toBe("")
  expect(run(d, "{}", { STOP_VERIFY: "off" }).stdout).toBe("")
})

posix("stop hook reports a repository that has no remote branch to compare with", () => {
  const d = temp("stop-hook-local-")
  const git = (...args: string[]) => spawnSync("git", args, { cwd: d, encoding: "utf8" })
  expect(git("init", "-q").status).toBe(0)
  git("config", "user.name", "Test")
  git("config", "user.email", "test@example.org")
  writeFileSync(join(d, "file"), "x")
  git("add", "file")
  expect(git("commit", "-qm", "feat: initial").status).toBe(0)
  expect(run(d).stdout).toContain('"decision":"block"')
})
