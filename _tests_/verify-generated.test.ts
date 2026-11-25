import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { type Scaffold, scaffold, type Template } from "../scripts/setup-manifest.ts"
import {
  argumentsFor,
  type BuildEnv,
  buildNative,
  buildProject,
  checkBuildScripts,
  fileExists,
  type Result,
  requiredFiles,
  runCommand,
  verifyEntry,
  verifyGenerated,
} from "../scripts/verify-generated.ts"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "verify-generated-"))
  dirs.push(dir)
  return dir
}
/** 生成直後のプロジェクトを、標準のスクリプトのまま作る。 */
function project(template: Template, pkg: Record<string, unknown> = {}): string {
  const dir = temp()
  const built: Scaffold = scaffold(template, "demo-app")
  for (const [path, content] of Object.entries(built.files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      { name: "demo-app", packageManager: "bun@1.4.4", scripts: built.scripts, ...pkg },
      null,
      2,
    )}\n`,
  )
  return dir
}
const readPackage = (dir: string) =>
  JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as Record<string, unknown>

type Call = { cmd: string; args: string[]; dir: string; env?: NodeJS.ProcessEnv }
/** ビルドの偽物。道具の有無と実行結果を決めて、実際に何もビルドしない。 */
function fakeBuild(
  config: { tools?: string[]; result?: Partial<Result>; throws?: string; platform?: string } = {},
): { env: BuildEnv; calls: Call[] } {
  const calls: Call[] = []
  const tools = new Set(config.tools ?? [])
  const env: BuildEnv = {
    which: (bin) => (tools.has(bin) ? `/usr/bin/${bin}` : null),
    run(cmd, args, dir, runEnv) {
      calls.push({ cmd, args, dir, env: runEnv })
      if (config.throws) throw new Error(config.throws)
      return {
        check: "build",
        status: "passed",
        ...config.result,
      } as Result
    },
    platform: config.platform ?? "linux",
  }
  return { env, calls }
}

function captured(run: () => number): { code: number; out: string } {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(String(message))
  try {
    return { code: run(), out: logs.join("\n") }
  } finally {
    console.log = original
  }
}

test("arguments require a directory and a known template", () => {
  const dir = temp()
  expect(argumentsFor(["--dir", dir, "--template", "plain-ts"])).toEqual({
    help: false,
    dir,
    template: "plain-ts",
    build: false,
  })
  expect(argumentsFor(["--dir", dir, "--template", "go-http", "--build"]).build).toBe(true)
  expect(argumentsFor(["--help"])).toMatchObject({ help: true })
  // --help は単独のときだけ案内。他の引数と一緒に来たら不明な引数として拒否する
  expect(() => argumentsFor(["--help", "--dir", dir])).toThrow("不明な引数: --help")
  for (const args of [
    [],
    ["--dir", dir],
    ["--template", "plain-ts"],
    ["--dir", dir, "--template", "cobol"],
  ])
    expect(() => argumentsFor(args)).toThrow("--dir と有効な --template が必要です")
  expect(() => argumentsFor(["--dir"])).toThrow("--dir に値が必要です")
  expect(() => argumentsFor(["--dir", "--template", "plain-ts"])).toThrow("--dir に値が必要です")
  expect(() => argumentsFor(["--dir", dir, "--template", "plain-ts", "--fast"])).toThrow(
    "不明な引数: --fast",
  )
  expect(() => argumentsFor(["--dir", join(dir, "missing"), "--template", "plain-ts"])).toThrow(
    "対象ディレクトリが存在しません",
  )
  writeFileSync(join(dir, "file.txt"), "x\n")
  expect(() => argumentsFor(["--dir", join(dir, "file.txt"), "--template", "plain-ts"])).toThrow(
    "対象ディレクトリが存在しません",
  )
})

test("only real files count, and the Web variants accept either extension", () => {
  const dir = temp()
  mkdirSync(join(dir, "folder"))
  writeFileSync(join(dir, "real.ts"), "export {}\n")
  symlinkSync(join(dir, "real.ts"), join(dir, "link.ts"))
  expect(fileExists(dir, "real.ts")).toBe(true)
  expect(fileExists(dir, "link.ts")).toBe(false)
  expect(fileExists(dir, "folder")).toBe(false)
  expect(fileExists(dir, "missing.ts")).toBe(false)

  expect(requiredFiles("plain-ts", dir)).toEqual([["src/index.ts"]])
  expect(requiredFiles("vite-react", dir)[1]).toEqual(["src/main.tsx"])
  mkdirSync(join(dir, "src"))
  writeFileSync(join(dir, "src/main.jsx"), "export {}\n")
  expect(requiredFiles("vite-react", dir).flat()).toEqual([
    "index.html",
    "src/main.jsx",
    "vite.config.js",
  ])
  expect(requiredFiles("next", dir)[0]).toEqual(["app/page.tsx"])
  mkdirSync(join(dir, "app"))
  writeFileSync(join(dir, "app/page.jsx"), "export {}\n")
  expect(requiredFiles("next", dir).flat()).toEqual([
    "app/page.jsx",
    "app/layout.jsx",
    "next.config.mjs",
  ])
  // ネイティブのテンプレートも生成物の一覧で確認する
  expect(requiredFiles("python-fastapi", dir)).toEqual([
    ["pyproject.toml"],
    ["app.py"],
    ["scripts/start.ts"],
  ])
})

test("runCommand reports the exit status and keeps the first lines of the failure", () => {
  const dir = temp()
  expect(runCommand(process.execPath, ["-e", "0"], dir).status).toBe("passed")
  const failed = runCommand(process.execPath, ["-e", "console.error('だめ'); process.exit(2)"], dir)
  expect(failed.status).toBe("failed")
  expect(failed.check).toBe("build")
  expect(failed.detail).toContain("だめ")
  // stderr が空なら起動エラーの文言、それも無ければ終了コードを理由にする
  expect(runCommand("definitely-not-a-tool", [], dir).detail).toContain("definitely-not-a-tool")
  expect(runCommand(process.execPath, ["-e", "process.exit(2)"], dir).detail).toBe("exit 2")
})

test("native builds are blocked without their toolchain and offline when they have one", () => {
  const dir = temp()
  const missing = fakeBuild()
  expect(buildNative(dir, "go-cli", dir, missing.env)).toEqual({
    check: "build",
    status: "blocked",
    detail: "go がありません",
  })
  expect(buildNative(dir, "rust-axum", dir, missing.env)?.detail).toBe("cargo がありません")
  expect(buildNative(dir, "python-cli", dir, missing.env)?.detail).toBe("python3 がありません")
  // JS 系のテンプレートは native の対象外
  expect(buildNative(dir, "plain-ts", dir, missing.env)).toBeUndefined()
  expect(missing.calls).toEqual([])

  const go = fakeBuild({ tools: ["go"] })
  expect(buildNative(dir, "go-http", dir, go.env)?.status).toBe("passed")
  expect(go.calls[0].cmd).toBe("go")
  expect(go.calls[0].args).toEqual(["build", "-o", join(dir, "app"), "."])
  expect(go.calls[0].env?.GOPROXY).toBe("off")
  expect(go.calls[0].env?.GOSUMDB).toBe("off")

  // 依存がローカルに無いときの失敗は「失敗」ではなく「確認できない」
  const offline = fakeBuild({
    tools: ["cargo"],
    result: { status: "failed", detail: "error: offline mode and the lock file is missing" },
  })
  expect(buildNative(dir, "rust-cli", dir, offline.env)).toEqual({
    check: "build",
    status: "blocked",
    detail: "必要な Rust 依存がローカルにありません",
  })
  const broken = fakeBuild({
    tools: ["cargo"],
    result: { status: "failed", detail: "cannot find" },
  })
  expect(buildNative(dir, "rust-cli", dir, broken.env)?.status).toBe("failed")

  const python = fakeBuild({ tools: ["python3"] })
  expect(buildNative(dir, "python-cli", dir, python.env)?.status).toBe("passed")
  expect(python.calls[0].args).toEqual(["-B", "main.py"])

  // python-fastapi は .venv の Python を使う。無ければ導入せずに blocked
  const noVenv = fakeBuild({ tools: ["python3"] })
  expect(buildNative(dir, "python-fastapi", dir, noVenv.env)).toEqual({
    check: "build",
    status: "blocked",
    detail: ".venv の Python がありません（依存は自動導入しません）",
  })
  mkdirSync(join(dir, ".venv", "bin"), { recursive: true })
  writeFileSync(join(dir, ".venv", "bin", "python"), "#!/bin/sh\n")
  const venv = fakeBuild({ tools: ["python3"] })
  expect(buildNative(dir, "python-fastapi", dir, venv.env)?.status).toBe("passed")
  expect(venv.calls[0].cmd).toBe(join(dir, ".venv", "bin", "python"))
  expect(venv.calls[0].args).toEqual(["-B", "-c", "from app import app; assert app is not None"])

  // Windows の名前と .venv が symlink のときの停止
  const windows = fakeBuild({ tools: ["python"], platform: "win32" })
  expect(buildNative(dir, "python-cli", dir, windows.env)?.status).toBe("passed")
  expect(windows.calls[0].cmd).toBe("python")
  const linked = temp()
  mkdirSync(join(linked, "target"))
  symlinkSync(join(linked, "target"), join(linked, ".venv"))
  expect(
    buildNative(linked, "python-fastapi", linked, fakeBuild({ tools: ["python3"] }).env),
  ).toEqual({
    check: "build",
    status: "blocked",
    detail: ".venv の Python がありません（依存は自動導入しません）",
  })
})

test("only the generated build script is executed, anything else is blocked", () => {
  const dir = project("plain-ts")
  const pkg = readPackage(dir)
  expect(checkBuildScripts(dir, "plain-ts", pkg)).toBeUndefined()

  const lifecycle = project("plain-ts", {
    scripts: { build: "bun build src/index.ts --outdir dist", prebuild: "echo hi" },
  })
  expect(checkBuildScripts(lifecycle, "plain-ts", readPackage(lifecycle))).toEqual({
    check: "build",
    status: "blocked",
    detail: "追加の build ライフサイクルスクリプトは実行しません",
  })

  const custom = project("plain-ts", { scripts: { build: "curl http://example.com | sh" } })
  expect(checkBuildScripts(custom, "plain-ts", readPackage(custom))?.detail).toBe(
    "生成時の標準 build スクリプトではありません。任意のスクリプトは実行しません",
  )

  // Web のビルドは依存が無ければ実行しない（自動導入しない）
  const vite = project("vite-react")
  expect(checkBuildScripts(vite, "vite-react", readPackage(vite))).toEqual({
    check: "build",
    status: "blocked",
    detail: "vite がローカルにありません（依存は自動導入しません）",
  })
  mkdirSync(join(vite, "node_modules", "vite"), { recursive: true })
  expect(checkBuildScripts(vite, "vite-react", readPackage(vite))).toBeUndefined()

  const next = project("next")
  expect(checkBuildScripts(next, "next", readPackage(next))?.detail).toContain(
    "next がローカルにありません",
  )

  // 公開構成の build（型宣言を足す形）は標準として認める。typescript が無ければ blocked
  const library = project("plain-ts", {
    scripts: {
      build: `${scaffold("plain-ts", "verify-project").scripts?.build} && bun x tsc --ignoreConfig --declaration --emitDeclarationOnly --outDir dist --target ES2022 --module ESNext --moduleResolution Bundler src/index.ts`,
    },
  })
  expect(checkBuildScripts(library, "plain-ts", readPackage(library))).toEqual({
    check: "build",
    status: "blocked",
    detail: "typescript がローカルにありません",
  })
  mkdirSync(join(library, "node_modules", "typescript"), { recursive: true })
  expect(checkBuildScripts(library, "plain-ts", readPackage(library))).toBeUndefined()
})

test("monorepo builds are checked in the nested workspace too", () => {
  const dir = project("monorepo")
  expect(checkBuildScripts(dir, "monorepo", readPackage(dir))).toEqual({
    check: "build",
    status: "blocked",
    detail: "turbo がローカルにありません（依存は自動導入しません）",
  })
  mkdirSync(join(dir, "node_modules", "turbo"), { recursive: true })
  expect(checkBuildScripts(dir, "monorepo", readPackage(dir))?.detail).toBe(
    "vite がローカルにありません",
  )
  mkdirSync(join(dir, "node_modules", "vite"), { recursive: true })
  expect(checkBuildScripts(dir, "monorepo", readPackage(dir))).toBeUndefined()

  const nested = join(dir, "apps", "web", "package.json")
  const original = readPackage(dir)
  writeFileSync(
    nested,
    JSON.stringify({ name: "demo-app-web", scripts: { build: "rm -rf /" } }, null, 2),
  )
  expect(checkBuildScripts(dir, "monorepo", original)?.detail).toBe(
    "apps/web の build スクリプトが標準と異なります",
  )
  writeFileSync(
    nested,
    JSON.stringify(
      {
        name: "demo-app-web",
        scripts: { build: scaffold("vite-react", "verify-project").scripts?.build, postbuild: "x" },
      },
      null,
      2,
    ),
  )
  expect(checkBuildScripts(dir, "monorepo", original)?.detail).toBe(
    "apps/web の追加 build スクリプトは実行しません",
  )

  const next = project("next-monorepo")
  mkdirSync(join(next, "node_modules", "turbo"), { recursive: true })
  expect(checkBuildScripts(next, "next-monorepo", readPackage(next))?.detail).toBe(
    "next がローカルにありません",
  )
  mkdirSync(join(next, "apps", "web", "node_modules", "next"), { recursive: true })
  expect(checkBuildScripts(next, "next-monorepo", readPackage(next))).toBeUndefined()
})

test("buildProject prefers the native build, then the guard, then bun run build", () => {
  const dir = project("go-cli")
  const blocked = fakeBuild()
  expect(buildProject(dir, "go-cli", readPackage(dir), blocked.env)).toEqual({
    check: "build",
    status: "blocked",
    detail: "go がありません",
  })
  expect(blocked.calls).toEqual([])

  const guarded = fakeBuild({ tools: [] })
  const custom = project("plain-ts", { scripts: { build: "echo arbitrary" } })
  expect(buildProject(custom, "plain-ts", readPackage(custom), guarded.env).status).toBe("blocked")
  expect(guarded.calls).toEqual([])

  const built = fakeBuild()
  const plain = project("plain-ts")
  expect(buildProject(plain, "plain-ts", readPackage(plain), built.env).status).toBe("passed")
  expect(built.calls).toEqual([{ cmd: "bun", args: ["run", "build"], dir: plain, env: undefined }])
})

test("verifyGenerated grades the files, the manifest and the exit code", () => {
  const dir = project("plain-ts")
  const ok = captured(() => verifyGenerated(["--dir", dir, "--template", "plain-ts"]))
  expect(ok.code).toBe(0)
  expect(ok.out).toContain("passed: src/index.ts")
  expect(ok.out).toContain("passed: package.json")

  rmSync(join(dir, "src/index.ts"))
  const missingFile = captured(() => verifyGenerated(["--dir", dir, "--template", "plain-ts"]))
  expect(missingFile.code).toBe(1)
  expect(missingFile.out).toContain("failed: src/index.ts")

  const symlinked = project("plain-ts")
  const outside = temp()
  rmSync(join(symlinked, "package.json"))
  writeFileSync(join(outside, "package.json"), '{"name":"outside"}\n')
  symlinkSync(join(outside, "package.json"), join(symlinked, "package.json"))
  expect(
    captured(() => verifyGenerated(["--dir", symlinked, "--template", "plain-ts"])).out,
  ).toContain("failed: package.json — Error: package.json が存在しないか symlink です")

  // manifest の中身が契約どおりでなければ failed
  for (const pkg of [
    { name: 42 },
    { name: "demo-app", packageManager: "npm@10" },
    { name: "demo-app", packageManager: "bun@1.4.4", scripts: null },
  ]) {
    const broken = project("plain-ts", pkg)
    const result = captured(() => verifyGenerated(["--dir", broken, "--template", "plain-ts"]))
    expect(result.code).toBe(1)
    expect(result.out).toContain("failed: package.json")
  }

  // JSON として読めない manifest も failed
  const notJson = project("plain-ts")
  writeFileSync(join(notJson, "package.json"), "{ not json\n")
  expect(captured(() => verifyGenerated(["--dir", notJson, "--template", "plain-ts"])).code).toBe(1)
})

test("a path that cannot be inspected at all is reported as a failure", () => {
  // src がディレクトリではなくファイルだと lstat は ENOTDIR で失敗する。握りつぶさず報告する
  const dir = project("plain-ts")
  rmSync(join(dir, "src"), { recursive: true, force: true })
  writeFileSync(join(dir, "src"), "export {}\n")
  const result = captured(() => verifyGenerated(["--dir", dir, "--template", "plain-ts"]))
  expect(result.code).toBe(1)
  expect(result.out).toContain("failed: src/index.ts —")
  expect(result.out).toMatch(/ENOTDIR|Not a directory/u)
})

test("a required path that goes through a symlink is a failure, not a pass", () => {
  const dir = project("plain-ts")
  const outside = temp()
  rmSync(join(dir, "src"), { recursive: true, force: true })
  mkdirSync(join(outside, "src"))
  writeFileSync(join(outside, "src", "index.ts"), 'export const name = "outside"\n')
  symlinkSync(join(outside, "src"), join(dir, "src"))
  const result = captured(() => verifyGenerated(["--dir", dir, "--template", "plain-ts"]))
  expect(result.code).toBe(1)
  expect(result.out).toContain("failed: src/index.ts")
  expect(result.out).toContain("シンボリックリンク経由の書き込みはしません")
})

test("verifyGenerated only builds on request and reports blocked separately", () => {
  const dir = project("plain-ts")
  const built = fakeBuild()
  const passed = captured(() =>
    verifyGenerated(["--dir", dir, "--template", "plain-ts", "--build"], built.env),
  )
  expect(passed.code).toBe(0)
  expect(passed.out).toContain("passed: build")
  expect(built.calls).toHaveLength(1)

  // 静的検査が失敗しているときはビルドしない
  const broken = project("plain-ts", { scripts: { build: "echo arbitrary" } })
  rmSync(join(broken, "src/index.ts"))
  const skipped = fakeBuild()
  const failed = captured(() =>
    verifyGenerated(["--dir", broken, "--template", "plain-ts", "--build"], skipped.env),
  )
  expect(failed.code).toBe(1)
  expect(failed.out).not.toContain("build")
  expect(skipped.calls).toEqual([])

  // 任意のスクリプトは実行せず blocked（終了コード 2）。静的検査は全部通しておく
  const arbitrary = project("plain-ts", { scripts: { build: "echo arbitrary" } })
  const guarded = fakeBuild()
  const blocked = captured(() =>
    verifyGenerated(["--dir", arbitrary, "--template", "plain-ts", "--build"], guarded.env),
  )
  expect(blocked.code).toBe(2)
  expect(blocked.out).toContain("blocked: build — 生成時の標準 build スクリプトではありません")
  expect(guarded.calls).toEqual([])

  // 失敗は blocked より強く、例外は failed として報告する
  const failing = fakeBuild({ result: { status: "failed", detail: "bun build failed" } })
  expect(
    captured(() =>
      verifyGenerated(["--dir", dir, "--template", "plain-ts", "--build"], failing.env),
    ).code,
  ).toBe(1)
  const throwing = fakeBuild({ throws: "ディスクが満杯です" })
  const crashed = captured(() =>
    verifyGenerated(["--dir", dir, "--template", "plain-ts", "--build"], throwing.env),
  )
  expect(crashed.code).toBe(1)
  expect(crashed.out).toContain("failed: build — Error: ディスクが満杯です")

  const help = captured(() => verifyGenerated(["--help"]))
  expect(help.code).toBe(0)
  expect(help.out).toContain("bun run verify:generated")
})

test("the CLI entry prints NG instead of throwing", () => {
  const dir = project("plain-ts")
  expect(verifyEntry(["--dir", dir, "--template", "plain-ts"])).toBe(0)
  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(String(message))
  try {
    expect(verifyEntry(["--template", "plain-ts"])).toBe(1)
  } finally {
    console.error = original
  }
  expect(errors.join("\n")).toBe("NG: --dir と有効な --template が必要です（--help を参照）")
})
