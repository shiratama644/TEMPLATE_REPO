import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkShell } from "../scripts/check-shell.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
const posix = process.platform === "win32" ? test.skip : test
function fixture(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), "check-shell-"))
  dirs.push(base)
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(base, path, ".."), { recursive: true })
    writeFileSync(join(base, path), body)
  }
  return base
}

posix("the repository scripts are POSIX sh without bashisms", () => {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(message)
  try {
    expect(checkShell()).toBe(0)
  } finally {
    console.log = original
  }
  expect(logs.join("\n")).toContain("9 ファイル")
})

posix("bashisms and a non-POSIX shebang are rejected", () => {
  const base = fixture({
    ".githooks/pre-commit": '#!/bin/bash\n[[ -f x ]] && echo "$(cat /etc/hostname)"\n',
    ".agent/hooks/bad.sh": "#!/bin/sh\nx=${v//a/b}\necho -e hi\n",
  })
  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(message)
  try {
    expect(checkShell(base)).toBe(1)
  } finally {
    console.error = original
  }
  const text = errors.join("\n")
  expect(text).toContain("#!/bin/sh")
  expect(text).toContain("[[ ]]")
  expect(text).toContain("${var/pat/rep}")
  expect(text).toContain("echo -e")
})

posix("POSIX character classes and comments are not bashisms", () => {
  const base = fixture({
    ".githooks/commit-msg":
      "#!/bin/sh\n# [[ comment ]] mentions source and $BASH\nsed -n 's/[[:space:]]*//p' \"$1\" # trailing [[ note\n",
  })
  expect(checkShell(base)).toBe(0)
})

posix("the gate skips on Windows and reports a shell syntax error", () => {
  const logs: string[] = []
  const errors: string[] = []
  const originalLog = console.log
  const originalError = console.error
  console.log = (message: string) => logs.push(message)
  console.error = (message: string) => errors.push(message)
  try {
    expect(checkShell(".", "win32")).toBe(0)
    const base = fixture({ ".agent/hooks/broken.sh": "#!/bin/sh\nif true; then\n" })
    expect(checkShell(base)).toBe(1)
  } finally {
    console.log = originalLog
    console.error = originalError
  }
  expect(logs.join("\n")).toContain("SKIP: POSIX sh が無いため構文検査は未実施")
  expect(errors.join("\n")).toContain("-n が失敗")
})
