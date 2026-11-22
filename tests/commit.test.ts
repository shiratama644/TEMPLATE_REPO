import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkCommitFile } from "../scripts/check_commit.ts"
import { classifyCommit, validateCommitMessage } from "../scripts/conventional_commit.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function dir() {
  const d = mkdtempSync(join(tmpdir(), "commit-gate-"))
  dirs.push(d)
  return d
}
test("parser and validator accept only the documented Conventional Commit headers", () => {
  for (const message of [
    "feat: 日本語の件名",
    "fix(core): Repair error\n\nBody paragraph",
    "feat(core)!: Change API\n\nBREAKING CHANGE: Details",
    "# git template comment\nchore: Update tooling\n# instructions",
    "docs: Explain changes\n\n# ------------------------ >8 ------------------------\ninvalid: ignored",
  ]) {
    expect(validateCommitMessage(message)).toBeNull()
    expect(classifyCommit(message).type).not.toBeNull()
  }
  for (const message of [
    "",
    "# comments only",
    "fix: ",
    "fix:   ",
    "fix: Missing subject ",
    "wrong: Invalid type",
    "Feat: Wrong case",
    "feat(): Empty scope",
    "feat(a.b): Bad scope",
    "Not valid\n\nfeat: valid body",
    " fix: Leading space",
  ]) {
    expect(validateCommitMessage(message)).not.toBeNull()
  }
})
test("missing or malformed commit message file fails closed", () => {
  const d = dir()
  expect(checkCommitFile(join(d, "missing"))).toBe(1)
  const file = join(d, "message")
  writeFileSync(file, Buffer.from([0xff, 0xfe]))
  expect(checkCommitFile(file)).toBe(1)
})
const posix = process.platform === "win32" ? test.skip : test
posix("actual git commit-msg hook rejects bad headers and accepts valid messages", () => {
  const d = dir()
  const root = join(import.meta.dir, "..")
  symlinkSync(join(root, "scripts"), join(d, "scripts"), "dir")
  mkdirSync(join(d, ".githooks"))
  for (const name of ["commit-msg", "chain-legacy"]) {
    copyFileSync(join(root, ".githooks", name), join(d, ".githooks", name))
    chmodSync(join(d, ".githooks", name), 0o755)
  }
  const git = (...args: string[]) => spawnSync("git", args, { cwd: d, encoding: "utf8" })
  expect(git("init", "-q").status).toBe(0)
  const commit = (message: string) =>
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.org",
      "-c",
      `core.hooksPath=${join(d, ".githooks")}`,
      "commit",
      "--allow-empty",
      "-m",
      message,
    )
  expect(commit("not valid\n\nfeat: body only").status).toBe(1)
  expect(commit("fix:   ").status).toBe(1)
  expect(commit(`fix: ${String.fromCodePoint(0x41f)}`).status).toBe(1)
  expect(git("rev-list", "--all", "--count").stdout.trim()).toBe("0")
  expect(commit("feat(core)!: 日本語の件名\n\nBREAKING CHANGE: 説明").status).toBe(0)
  expect(git("rev-list", "--all", "--count").stdout.trim()).toBe("1")
})
