#!/usr/bin/env bun
/** Explicit validation of a generated project. Never installs tools or dependencies. */
import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { safe } from "./setup.ts"
import { scaffold, type Template, templates } from "./setup-manifest.ts"

type Result = { check: string; status: "passed" | "failed" | "blocked"; detail?: string }
const known = new Set<Template>(Object.values(templates).flat())
const help = `bun run verify:generated --dir <project> --template <id> [--build]
Default: static file/manifest checks only. --build runs project code or local build tools and may write artifacts. No dependencies or OS packages are installed. Run only on trusted projects.`

function argumentsFor(args: string[]) {
  let dir: string | undefined
  let template: Template | undefined
  let build = false
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--help" && args.length === 1) return { help: true, dir, template, build }
    if (arg === "--build") build = true
    else if (arg === "--dir" || arg === "--template") {
      const value = args[++i]
      if (!value || value.startsWith("--")) throw new Error(`${arg} に値が必要です`)
      if (arg === "--dir") dir = value
      else template = value as Template
    } else throw new Error(`不明な引数: ${arg}`)
  }
  if (!dir || !template || !known.has(template))
    throw new Error("--dir と有効な --template が必要です（--help を参照）")
  const root = resolve(dir)
  if (!existsSync(root) || !statSync(root).isDirectory())
    throw new Error(`対象ディレクトリが存在しません: ${root}`)
  return { help: false, dir: root, template, build }
}

// The JavaScript Web variants rename the source and config files as a unit.
function requiredFiles(template: Template, root: string): string[][] {
  if (template === "vite-react") {
    const js = fileExists(root, "src/main.jsx")
    return [
      ["index.html"],
      [js ? "src/main.jsx" : "src/main.tsx"],
      [js ? "vite.config.js" : "vite.config.ts"],
    ]
  }
  if (template === "next") {
    const js = fileExists(root, "app/page.jsx")
    return [
      [js ? "app/page.jsx" : "app/page.tsx"],
      [js ? "app/layout.jsx" : "app/layout.tsx"],
      [js ? "next.config.mjs" : "next.config.ts"],
    ]
  }
  return Object.keys(scaffold(template, "verify-project").files).map((p) => [p])
}
function fileExists(root: string, path: string): boolean {
  const full = safe(root, path)
  const stat = lstatSync(full, { throwIfNoEntry: false })
  return stat?.isFile() === true && !stat.isSymbolicLink()
}
function runCommand(cmd: string, args: string[], dir: string, env = process.env) {
  const result = spawnSync(cmd, args, {
    cwd: dir,
    encoding: "utf8",
    shell: false,
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    env,
  })
  return {
    check: "build",
    status: result.status === 0 ? "passed" : "failed",
    detail:
      result.status === 0
        ? undefined
        : (result.stderr || result.error?.message || `exit ${result.status}`).trim().slice(0, 600),
  } as Result
}
function buildProject(root: string, template: Template, pkg: Record<string, unknown>): Result {
  const temp = mkdtempSync(join(tmpdir(), "verify-generated-"))
  try {
    if (template === "go-cli" || template === "go-http") {
      if (!Bun.which("go")) return { check: "build", status: "blocked", detail: "go がありません" }
      return runCommand("go", ["build", "-o", join(temp, "app"), "."], root, {
        ...process.env,
        GOPROXY: "off",
        GOSUMDB: "off",
      })
    }
    if (template === "rust-cli" || template === "rust-axum") {
      if (!Bun.which("cargo"))
        return { check: "build", status: "blocked", detail: "cargo がありません" }
      const result = runCommand("cargo", ["check", "--offline"], root, {
        ...process.env,
        CARGO_TARGET_DIR: join(temp, "target"),
      })
      if (
        result.status === "failed" &&
        /offline mode|no matching package named|attempting to make an HTTP request/.test(
          result.detail || "",
        )
      )
        return {
          check: "build",
          status: "blocked",
          detail: "必要な Rust 依存がローカルにありません",
        }
      return result
    }
    if (template === "python-cli" || template === "python-fastapi") {
      const executable = process.platform === "win32" ? "python" : "python3"
      if (!Bun.which(executable))
        return { check: "build", status: "blocked", detail: `${executable} がありません` }
      if (template === "python-cli") return runCommand(executable, ["-B", "main.py"], root)
      const venv = join(
        root,
        ".venv",
        process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
      )
      if (
        lstatSync(join(root, ".venv"), { throwIfNoEntry: false })?.isSymbolicLink() ||
        !existsSync(venv)
      )
        return {
          check: "build",
          status: "blocked",
          detail: ".venv の Python がありません（依存は自動導入しません）",
        }
      return runCommand(venv, ["-B", "-c", "from app import app; assert app is not None"], root)
    }
    const scripts = (pkg.scripts || {}) as Record<string, unknown>
    if ("prebuild" in scripts || "postbuild" in scripts)
      return {
        check: "build",
        status: "blocked",
        detail: "追加の build ライフサイクルスクリプトは実行しません",
      }
    const base = scaffold(template, "verify-project").scripts?.build
    const libraryBuild =
      template === "plain-ts" &&
      typeof scripts.build === "string" &&
      scripts.build ===
        `${base} && bun x tsc --ignoreConfig --declaration --emitDeclarationOnly --outDir dist --target ES2022 --module ESNext --moduleResolution Bundler src/index.ts`
    if (scripts.build !== base && !libraryBuild)
      return {
        check: "build",
        status: "blocked",
        detail: "生成時の標準 build スクリプトではありません。任意のスクリプトは実行しません",
      }
    const tool =
      template === "vite-react" || template === "monorepo"
        ? "vite"
        : template === "next" || template === "next-monorepo"
          ? "next"
          : undefined
    const dependency = template.includes("monorepo") ? "turbo" : tool
    if (dependency && !existsSync(join(root, "node_modules", dependency)))
      return {
        check: "build",
        status: "blocked",
        detail: `${dependency} がローカルにありません（依存は自動導入しません）`,
      }
    if (template.includes("monorepo")) {
      const nested = JSON.parse(
        readFileSync(join(root, "apps/web/package.json"), "utf8"),
      ) as Record<string, unknown>
      const expected = scaffold(template === "monorepo" ? "vite-react" : "next", "verify-project")
        .scripts?.build
      const nestedScripts = nested.scripts as Record<string, unknown> | undefined
      if (nestedScripts && ("prebuild" in nestedScripts || "postbuild" in nestedScripts))
        return {
          check: "build",
          status: "blocked",
          detail: "apps/web の追加 build スクリプトは実行しません",
        }
      if (nestedScripts?.build !== expected)
        return {
          check: "build",
          status: "blocked",
          detail: "apps/web の build スクリプトが標準と異なります",
        }
      if (
        tool &&
        !existsSync(join(root, "node_modules", tool)) &&
        !existsSync(join(root, "apps/web/node_modules", tool))
      )
        return { check: "build", status: "blocked", detail: `${tool} がローカルにありません` }
    }
    if (libraryBuild && !existsSync(join(root, "node_modules", "typescript")))
      return { check: "build", status: "blocked", detail: "typescript がローカルにありません" }
    return runCommand("bun", ["run", "build"], root)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}
export function verifyGenerated(args: string[]): number {
  const options = argumentsFor(args)
  if (options.help) {
    console.log(help)
    return 0
  }
  const root = options.dir as string
  const template = options.template as Template
  const results: Result[] = []
  for (const candidates of requiredFiles(template, root)) {
    try {
      const matched = candidates.some((file) => fileExists(root, file))
      results.push({ check: candidates.join(" | "), status: matched ? "passed" : "failed" })
    } catch (e) {
      results.push({ check: candidates.join(" | "), status: "failed", detail: String(e) })
    }
  }
  let pkg: Record<string, unknown> | undefined
  try {
    if (!fileExists(root, "package.json"))
      throw new Error("package.json が存在しないか symlink です")
    const value: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>).name !== "string" ||
      !/^bun@/.test(String((value as Record<string, unknown>).packageManager)) ||
      typeof (value as Record<string, unknown>).scripts !== "object" ||
      !(value as Record<string, unknown>).scripts
    )
      throw new Error("package.json の name / packageManager / scripts が不正です")
    pkg = value as Record<string, unknown>
    results.push({ check: "package.json", status: "passed" })
  } catch (e) {
    results.push({ check: "package.json", status: "failed", detail: String(e) })
  }
  if (options.build && results.every((r) => r.status === "passed") && pkg) {
    try {
      results.push(buildProject(root, template, pkg))
    } catch (e) {
      results.push({ check: "build", status: "failed", detail: String(e) })
    }
  }
  for (const r of results) console.log(`${r.status}: ${r.check}${r.detail ? ` — ${r.detail}` : ""}`)
  return results.some((r) => r.status === "failed")
    ? 1
    : results.some((r) => r.status === "blocked")
      ? 2
      : 0
}
if (import.meta.main) {
  try {
    process.exit(verifyGenerated(process.argv.slice(2)))
  } catch (e) {
    console.error(`NG: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  }
}
