import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type InstallEnv,
  installDependencies,
  installEnv,
  installNative,
  installOsPackages,
} from "../scripts/setup-install.ts"
import { type Options, option, SetupCancelled } from "../scripts/setup-options.ts"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "setup-install-"))
  dirs.push(dir)
  return dir
}
function options(over: Partial<Options> = {}): Options {
  return { ...option(["--dir", temp()]), ...over }
}

type FakeConfig = {
  /** run の終了コード（既定は成功） */
  status?: number
  /** 承認の答え（既定は yes） */
  answer?: string
  /** 最初から PATH にある道具 */
  present?: string[]
  /** run が成功した後に PATH に入る道具 */
  installs?: string[]
  /** 承認を中止にする */
  cancel?: boolean
  manager?: InstallEnv["manager"]
}
/** 導入の偽物。コマンドは実行せず、呼び出しを記録して結果だけを決める。 */
function fakeEnv(config: FakeConfig = {}): { env: InstallEnv; calls: string[] } {
  const calls: string[] = []
  const present = new Set(config.present ?? [])
  const env: InstallEnv = {
    run(command, args, cwd) {
      calls.push(`run ${command} ${args.join(" ")}${cwd ? ` cwd=${cwd}` : ""}`)
      const status = config.status ?? 0
      if (status === 0) for (const bin of config.installs ?? []) present.add(bin)
      return status
    },
    async ask(message) {
      calls.push(`ask ${message}`)
      if (config.cancel) throw new SetupCancelled()
      return config.answer ?? "yes"
    },
    has: (bin) => present.has(bin),
    manager:
      config.manager ??
      (() => ({ name: "apt", packages: { python3: "python3", go: "golang-go" } })),
  }
  return { env, calls }
}

/** console.log と console.error を集める。戻り値が要る変数は外に出して代入する。 */
async function captured(run: () => unknown): Promise<string> {
  const logs: string[] = []
  const errors: string[] = []
  const originalLog = console.log
  const originalError = console.error
  console.log = (message: string) => logs.push(String(message))
  console.error = (message: string) => errors.push(String(message))
  try {
    await run()
    return logs.concat(errors).join("\n")
  } finally {
    console.log = originalLog
    console.error = originalError
  }
}

test("bun install runs in the target directory and a failure keeps the generated files", async () => {
  const o = options()
  const ok = fakeEnv()
  expect(await captured(() => installDependencies(o, ok.env))).toBe(
    "Bun 依存をインストール: bun install",
  )
  expect(ok.calls).toEqual([`run bun install cwd=${o.dir}`])

  const failed = fakeEnv({ status: 1 })
  expect(() => installDependencies(o, failed.env)).toThrow(
    "bun install に失敗。生成ファイルは残しています。設定を確認して再実行してください",
  )
  expect(failed.calls).toEqual([`run bun install cwd=${o.dir}`])
})

test("OS packages need a per-package yes in a terminal and are never installed by --yes", async () => {
  const present = fakeEnv({ present: ["python3"] })
  expect(await installOsPackages(options(), true, ["python3"], present.env)).toBe(false)
  expect(present.calls).toEqual([])
  // 何も要らなければ何も表示しない
  expect(await captured(() => installOsPackages(options(), true, [], present.env))).toBe("")

  const unknownOs = fakeEnv({ manager: () => null })
  let unknownMissing = false
  expect(
    await captured(async () => {
      unknownMissing = await installOsPackages(options(), true, ["cargo"], unknownOs.env)
    }),
  ).toContain("cargo が必要です。OS に応じて手動で導入してください")
  expect(unknownMissing).toBe(true)
  expect(unknownOs.calls).toEqual([])

  // 対応する package manager があっても、名前を知らない道具は案内だけ
  const unmapped = fakeEnv()
  expect(await installOsPackages(options(), true, ["zig"], unmapped.env)).toBe(true)
  expect(unmapped.calls).toEqual([])

  // 非対話・--yes・--no-os-install では導入しない（sudo を勝手に実行しない）
  for (const [tty, over] of [
    [false, {}],
    [true, { yes: true }],
    [true, { noOsInstall: true }],
  ] as Array<[boolean, Partial<Options>]>) {
    const skipped = fakeEnv()
    let missing = false
    const out = await captured(async () => {
      missing = await installOsPackages(options(over), tty, ["python3"], skipped.env)
    })
    expect(out).toContain("必要な OS パッケージ: sudo apt-get install -y python3")
    expect(out).toContain("OS パッケージは自動導入しません")
    expect(missing).toBe(true)
    expect(skipped.calls).toEqual([])
  }

  const declined = fakeEnv({ answer: "no" })
  expect(await installOsPackages(options(), true, ["python3"], declined.env)).toBe(true)
  expect(declined.calls).toEqual([
    "ask python3 を今インストールしますか？コマンドを確認し yes と入力",
  ])

  // 中止は握りつぶさず伝える（既定値で勝手に進めない）
  const cancelled = fakeEnv({ cancel: true })
  await expect(installOsPackages(options(), true, ["python3"], cancelled.env)).rejects.toThrow(
    SetupCancelled,
  )
})

test("an approved OS install reports a failure and a tool that is still missing", async () => {
  const broken = fakeEnv({ status: 1 })
  let brokenMissing = false
  const out = await captured(async () => {
    brokenMissing = await installOsPackages(options(), true, ["python3"], broken.env)
  })
  expect(out).toContain("python3 のインストールに失敗しました。手動で確認してください")
  expect(brokenMissing).toBe(true)
  expect(broken.calls).toEqual([
    "ask python3 を今インストールしますか？コマンドを確認し yes と入力",
    "run sudo apt-get install -y python3",
  ])

  // 導入は成功したのに道具が増えない（PATH が違う等）ときは保留のまま
  const stillMissing = fakeEnv()
  expect(await installOsPackages(options(), true, ["python3"], stillMissing.env)).toBe(true)

  const installed = fakeEnv({ installs: ["python3"] })
  expect(await installOsPackages(options(), true, ["python3"], installed.env)).toBe(false)

  // 複数の道具は 1 件ずつ承認し、片方だけ欠けても true
  const each = fakeEnv({ installs: ["python3"] })
  expect(await installOsPackages(options(), true, ["python3", "go"], each.env)).toBe(true)
  expect(each.calls.filter((call) => call.startsWith("ask"))).toHaveLength(2)
  expect(each.calls.filter((call) => call.startsWith("run"))).toEqual([
    "run sudo apt-get install -y python3",
    "run sudo apt-get install -y golang-go",
  ])
})

test("native installation runs the language steps in the target directory", async () => {
  const o = options()
  const none = fakeEnv()
  expect(await captured(() => installNative(o, "plain-ts", none.env))).toBe("")
  expect(none.calls).toEqual([])

  const steps = fakeEnv()
  const out = await captured(() => installNative(o, "python-fastapi", steps.env))
  expect(out).toContain("言語別の依存を導入: python3 -m venv .venv")
  expect(steps.calls).toHaveLength(2)
  expect(steps.calls[0]).toBe(`run python3 -m venv .venv cwd=${o.dir}`)
  expect(steps.calls[1]).toContain("-m pip install -e .")

  // 最初の手順で失敗したら、後続は実行せず理由を伝える
  const failed = fakeEnv({ status: 1 })
  expect(() => installNative(o, "python-fastapi", failed.env)).toThrow(
    "依存導入に失敗しました: python3。生成ファイルは保持します",
  )
  expect(failed.calls).toHaveLength(1)

  expect(await captured(() => installNative(o, "rust-axum", fakeEnv().env))).toContain(
    "言語別の依存を導入: cargo fetch",
  )
})

test("the real adapters run the command and report the toolchain they find", () => {
  // 偽物ではなく実物の InstallEnv。終了コードをそのまま返し、無い道具は 1 になる
  expect(installEnv.run(process.execPath, ["--version"])).toBe(0)
  expect(installEnv.run(process.execPath, ["-e", "process.exit(3)"])).toBe(3)
  expect(installEnv.run("definitely-not-a-tool", [])).toBe(1)
  expect(installEnv.has("definitely-not-a-tool")).toBe(false)
  const manager = installEnv.manager()
  expect(manager === null || typeof manager.name === "string").toBe(true)
  expect(manager === null || typeof manager.packages === "object").toBe(true)
  expect(typeof installEnv.ask).toBe("function")
})

test("a symlinked virtual environment stops the native installation", () => {
  const dir = temp()
  const outside = temp()
  mkdirSync(join(outside, "venv"))
  symlinkSync(join(outside, "venv"), join(dir, ".venv"))
  const guarded = fakeEnv()
  expect(() => installNative(options({ dir }), "python-fastapi", guarded.env)).toThrow(
    ".venv が symlink です。安全のため依存導入を中止します",
  )
  expect(guarded.calls).toEqual([])
  // 手順が無いテンプレートでは .venv があっても止まらない
  const noSteps = fakeEnv()
  installNative(options({ dir }), "plain-ts", noSteps.env)
  expect(noSteps.calls).toEqual([])
})
