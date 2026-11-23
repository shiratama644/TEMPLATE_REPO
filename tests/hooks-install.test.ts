import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { installHooks } from "../scripts/install_hooks.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function fixture() {
  const d = mkdtempSync(join(tmpdir(), "hook-install-"))
  dirs.push(d)
  const source = join(import.meta.dir, "..")
  const git = (...args: string[]) => spawnSync("git", args, { cwd: d, encoding: "utf8" })
  expect(git("init", "-q").status).toBe(0)
  mkdirSync(join(d, ".githooks"))
  for (const name of ["commit-msg", "pre-commit", "chain-legacy"]) {
    copyFileSync(join(source, ".githooks", name), join(d, ".githooks", name))
    chmodSync(join(d, ".githooks", name), 0o755)
  }
  symlinkSync(join(source, "scripts"), join(d, "scripts"), "dir")
  // Pre-commit invokes the project gate. Keep this temporary fixture small.
  writeFileSync(join(d, "package.json"), '{"scripts":{"check":"bun -e \'process.exit(0)\'"}}\n')
  return { d, git }
}
const posix = process.platform === "win32" ? test.skip : test
posix(
  "auto-enable chains pre-existing hooks and blocks invalid commits without replacing the legacy files",
  () => {
    const { d, git } = fixture()
    const legacy = join(d, ".git/hooks/commit-msg")
    const pre = join(d, ".git/hooks/pre-commit")
    writeFileSync(legacy, '#!/bin/sh\nprintf "\\nLegacy-trailer: preserved\\n" >> "$1"\n')
    writeFileSync(pre, '#!/bin/sh\nprintf "called" > legacy-pre-commit\n')
    chmodSync(legacy, 0o755)
    chmodSync(pre, 0o755)
    const before = readFileSync(legacy, "utf8")
    expect(installHooks(d)).toBe(0)
    expect(installHooks(d)).toBe(0)
    expect(git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe(".githooks")
    expect(readFileSync(legacy, "utf8")).toBe(before)
    const commit = (msg: string) =>
      git(
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.org",
        "commit",
        "--allow-empty",
        "-m",
        msg,
      )
    expect(commit("not conventional").status).toBe(1)
    expect(git("rev-list", "--all", "--count").stdout.trim()).toBe("0")
    expect(commit("fix: Valid commit").status).toBe(0)
    expect(git("log", "-1", "--format=%B").stdout).toContain("Legacy-trailer: preserved")
    expect(readFileSync(join(d, "legacy-pre-commit"), "utf8")).toBe("called")
    expect(readFileSync(legacy, "utf8")).toBe(before)
  },
)
posix("unknown executable hook and foreign hooksPath fail closed without changing config", () => {
  const { d, git } = fixture()
  const other = join(d, ".git/hooks/pre-push")
  writeFileSync(other, "#!/bin/sh\nexit 0\n")
  chmodSync(other, 0o755)
  expect(installHooks(d)).toBe(1)
  expect(git("config", "--local", "--get", "core.hooksPath").status).toBe(1)
  rmSync(other)
  expect(git("config", "--local", "core.hooksPath", "other-hooks").status).toBe(0)
  expect(installHooks(d)).toBe(1)
  expect(git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe("other-hooks")
})
test("archive without Git is not broken by postinstall; explicit install fails", () => {
  const d = mkdtempSync(join(tmpdir(), "hook-archive-"))
  dirs.push(d)
  expect(installHooks(d, true)).toBe(0)
  expect(installHooks(d)).toBe(1)
})
