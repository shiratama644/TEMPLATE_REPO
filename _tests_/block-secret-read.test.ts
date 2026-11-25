import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const posix = process.platform === "win32" ? test.skip : test
const script = join(import.meta.dir, "..", ".agent", "hooks", "block-secret-read.sh")

const run = (command: string) => {
  const input = JSON.stringify({ tool_input: { command } })
  const result = spawnSync("sh", [script], { input, encoding: "utf8" })
  expect(result.status).toBe(0)
  return result.stdout
}
const denied = (command: string) => expect(run(command)).toContain('"permissionDecision":"deny"')
const allowed = (command: string) => expect(run(command)).toBe("")

posix("secret-read hook blocks Bash commands that reach .env, secrets or a recursive rm", () => {
  for (const command of [
    "cat .env",
    "cat ./.env",
    "head -n 5 .env.local",
    "grep -r TOKEN secrets/",
    "ls secrets",
    "ls ./secrets",
    "git show HEAD:.env",
    "cat config/secrets.json",
    'echo "$KEY" > .env.production',
    "cp .env.example .env",
  ]) {
    denied(command)
  }
  for (const command of [
    "rm -rf node_modules",
    "rm -r build",
    "rm -Rf out",
    "rm -f -r dist",
    "rm --recursive coverage",
    "sudo rm -fr /tmp/x",
    "git status && rm -r x",
  ]) {
    denied(command)
  }
})

posix(
  "secret-read hook allows templates, non-recursive rm, git rm -r and ordinary commands",
  () => {
    for (const command of [
      "cat .env.example",
      "cat .env.template",
      "cat .envrc",
      "cat foo.environment",
      "echo mysecrets",
      "rm file.txt",
      "rm -f file.txt",
      "git rm -r --cached docs/old",
      "mkdir -p a && rm -v a",
      "bun run check",
    ]) {
      allowed(command)
    }
    // 引数運び（手動実行）と空入力
    const manual = spawnSync("sh", [script, "cat .env"], { encoding: "utf8" })
    expect(manual.stdout).toContain('"permissionDecision":"deny"')
    expect(spawnSync("sh", [script], { input: "", encoding: "utf8" }).stdout).toBe("")
  },
)
