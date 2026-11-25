import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { hookOptions, installHooks } from "../scripts/install-hooks.ts"

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
/** 稼働中の husky（`.husky/_` に実行可能なフックがある）を再現する。 */
function huskyFixture() {
  const f = fixture()
  mkdirSync(join(f.d, ".husky/_"), { recursive: true })
  for (const name of ["pre-commit", "commit-msg"]) {
    writeFileSync(join(f.d, ".husky/_", name), "#!/bin/sh\nexit 0\n")
    chmodSync(join(f.d, ".husky/_", name), 0o755)
  }
  writeFileSync(join(f.d, ".husky/_/.gitignore"), "*\n")
  expect(f.git("config", "--local", "core.hooksPath", ".husky/_").status).toBe(0)
  return f
}
type Captured = { log: string[]; error: string[]; warn: string[] }
function capture(run: () => number): { value: number; out: Captured } {
  const out: Captured = { log: [], error: [], warn: [] }
  const original = { log: console.log, error: console.error, warn: console.warn }
  console.log = (message: string) => out.log.push(message)
  console.error = (message: string) => out.error.push(message)
  console.warn = (message: string) => out.warn.push(message)
  try {
    return { value: run(), out }
  } finally {
    console.log = original.log
    console.error = original.error
    console.warn = original.warn
  }
}
const text = (out: Captured) => [...out.log, ...out.error, ...out.warn].join("\n")
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
  mkdirSync(join(d, "other-hooks"))
  writeFileSync(join(d, "other-hooks/pre-commit"), "#!/bin/sh\nexit 0\n")
  chmodSync(join(d, "other-hooks/pre-commit"), 0o755)
  expect(installHooks(d)).toBe(1)
  expect(git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe("other-hooks")
})
test("archive without Git is not broken by postinstall; explicit install fails", () => {
  const d = mkdtempSync(join(tmpdir(), "hook-archive-"))
  dirs.push(d)
  expect(installHooks(d, { optionalGit: true })).toBe(0)
  expect(installHooks(d)).toBe(1)
})

posix("postinstall never fails bun install: refusals become warnings", () => {
  const { d, git } = fixture()
  const other = join(d, ".git/hooks/pre-push")
  writeFileSync(other, "#!/bin/sh\nexit 0\n")
  chmodSync(other, 0o755)
  const warned = capture(() => installHooks(d, { optionalGit: true }))
  expect(warned.value).toBe(0)
  expect(text(warned.out)).toContain("既存の Git フック pre-push は自動で引き継げません")
  expect(text(warned.out)).toContain("bun install は失敗しません")
  expect(git("config", "--local", "--get", "core.hooksPath").status).toBe(1)
})

posix("stale husky hooksPath (no such directory) is taken over", () => {
  const { d, git } = fixture()
  expect(git("config", "--local", "core.hooksPath", ".husky/_").status).toBe(0)
  expect(existsSync(join(d, ".husky"))).toBe(false)
  const took = capture(() => installHooks(d, { optionalGit: true }))
  expect(took.value).toBe(0)
  expect(git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe(".githooks")
  expect(text(took.out)).toContain("core.hooksPath を .husky/_ から .githooks に切り替えます")
  expect(text(took.out)).toContain("実行可能なフックはありません")
  expect(text(took.out)).toContain("戻すには git config core.hooksPath .husky/_")
})

posix("hooksPath directory without executable hooks is stale too", () => {
  const { d, git } = fixture()
  mkdirSync(join(d, ".husky/_"), { recursive: true })
  writeFileSync(join(d, ".husky/_/.gitignore"), "*\n")
  writeFileSync(join(d, ".husky/_/pre-commit"), "#!/bin/sh\nexit 0\n")
  chmodSync(join(d, ".husky/_/pre-commit"), 0o644)
  expect(git("config", "--local", "core.hooksPath", ".husky/_").status).toBe(0)
  expect(capture(() => installHooks(d)).value).toBe(0)
  expect(git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe(".githooks")
})

posix("a live husky install is kept unless --force is given", () => {
  // 明示実行: 止めて設定を変えない
  const explicit = huskyFixture()
  const refused = capture(() => installHooks(explicit.d))
  expect(refused.value).toBe(1)
  expect(text(refused.out)).toContain("既存の Git hooksPath を上書きしません: .husky/_")
  expect(text(refused.out)).toContain("実行中のフック: commit-msg, pre-commit")
  expect(text(refused.out)).toContain("bun run hooks:install --force")
  expect(explicit.git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe(
    ".husky/_",
  )

  // postinstall: 警告だけで bun install は成功
  const post = huskyFixture()
  const warned = capture(() => installHooks(post.d, { optionalGit: true }))
  expect(warned.value).toBe(0)
  expect(text(warned.out)).toContain("bun install は失敗しません")
  expect(post.git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe(".husky/_")

  // --force: 置き換える（以前のディレクトリは残す）
  const forced = huskyFixture()
  const took = capture(() => installHooks(forced.d, { force: true }))
  expect(took.value).toBe(0)
  expect(forced.git("config", "--local", "--get", "core.hooksPath").stdout.trim()).toBe(".githooks")
  expect(existsSync(join(forced.d, ".husky/_/pre-commit"))).toBe(true)
  expect(text(took.out)).toContain("core.hooksPath を .husky/_ から .githooks に切り替えます")
  expect(text(took.out)).toContain("commit-msg, pre-commit")
})

posix("a .githooks file that is missing or not executable fails closed", () => {
  const { d, git } = fixture()
  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(message)
  try {
    chmodSync(join(d, ".githooks/pre-commit"), 0o644)
    expect(installHooks(d)).toBe(1)
    // 実行権限を戻し、別のフックを消しても同じように止まることを確かめる
    chmodSync(join(d, ".githooks/pre-commit"), 0o755)
    rmSync(join(d, ".githooks/commit-msg"))
    expect(installHooks(d)).toBe(1)
  } finally {
    console.error = original
  }
  const message = errors.join("\n")
  expect(message).toContain("実行可能な .githooks/pre-commit が必要です")
  expect(message).toContain("実行可能な .githooks/commit-msg が必要です")
  expect(git("config", "--local", "--get", "core.hooksPath").status).toBe(1)
})

posix("non-executable leftovers are ignored, self-referencing and non-file hooks are not", () => {
  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(message)
  try {
    // 実行権限の無い残骸は Git も実行しないので、引き継ぎの対象外（失敗させない）
    const ignored = fixture()
    writeFileSync(join(ignored.d, ".git/hooks/pre-push"), "#!/bin/sh\nexit 0\n")
    chmodSync(join(ignored.d, ".git/hooks/pre-push"), 0o644)
    expect(installHooks(ignored.d)).toBe(0)

    // 新フック自身を指す symlink は連鎖するので拒む
    const selfLink = fixture()
    symlinkSync(join(selfLink.d, ".githooks/pre-commit"), join(selfLink.d, ".git/hooks/pre-commit"))
    expect(installHooks(selfLink.d)).toBe(1)

    // 通常ファイルではない（ディレクトリの）フックも拒む
    const notFile = fixture()
    mkdirSync(join(notFile.d, ".git/hooks/pre-commit"), { recursive: true })
    chmodSync(join(notFile.d, ".git/hooks/pre-commit"), 0o755)
    expect(installHooks(notFile.d)).toBe(1)
  } finally {
    console.error = original
  }
  const message = errors.join("\n")
  expect(message).toContain("既存フック pre-commit が新フック自身を指しています")
  expect(message).toContain("既存フック pre-commit は通常のファイルではありません")
})

test("CLI flags decide postinstall tolerance and hooksPath takeover", () => {
  expect(hookOptions([])).toEqual({ optionalGit: false, force: false })
  expect(hookOptions(["--if-git"])).toEqual({ optionalGit: true, force: false })
  expect(hookOptions(["--force"])).toEqual({ optionalGit: false, force: true })
  expect(hookOptions(["bun", "scripts/install-hooks.ts", "--if-git", "--force"])).toEqual({
    optionalGit: true,
    force: true,
  })
})
