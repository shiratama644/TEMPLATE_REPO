import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brokenLinks } from "../scripts/check_doc_links.ts"
import { classify, findIssues, stripCommit } from "../scripts/check_language.ts"
import { blocks, checkBlock } from "../scripts/check_mermaid.ts"
import { detectPackageManager } from "../scripts/setup.ts"
import { featureNames, presets, scaffold, templates } from "../scripts/setup_manifest.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function dir() {
  const d = mkdtempSync(join(tmpdir(), "bun-setup-"))
  dirs.push(d)
  return d
}
function cli(d: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    [join(import.meta.dir, "../scripts/setup.ts"), "--dir", d, "--name", "test-project", ...args],
    { encoding: "utf8" },
  )
}
test("7 presets and 17 features, all templates generate files", () => {
  expect(Object.keys(presets)).toHaveLength(7)
  expect(featureNames).toHaveLength(17)
  for (const template of new Set(Object.values(templates).flat()))
    expect(Object.keys(scaffold(template, "test-project").files).length).toBeGreaterThan(0)
})
test("non-interactive without --yes does not write", () => {
  const d = dir(),
    r = cli(d, "--apply")
  expect(r.status).toBe(1)
  expect(existsSync(join(d, "package.json"))).toBe(false)
})
test("dry-run and --yes without --apply never write", () => {
  const d = dir()
  expect(cli(d, "--yes", "--dry-run", "--preset", "next-app").status).toBe(0)
  expect(cli(d, "--yes", "--preset", "next-app").status).toBe(0)
  expect(readdirSync(d)).toEqual([])
})
test("non-interactive apply, idempotency and user data protection", () => {
  const d = dir()
  writeFileSync(join(d, "README.md"), "USER DATA\n")
  const args = [
    "--yes",
    "--apply",
    "--no-install",
    "--preset",
    "vite-app",
    "--language",
    "typescript",
    "--template",
    "vite-react",
  ]
  expect(cli(d, ...args).status).toBe(0)
  expect(readFileSync(join(d, "README.md"), "utf8")).toBe("USER DATA\n")
  const main = join(d, "src/main.tsx")
  expect(existsSync(main)).toBe(true)
  writeFileSync(main, "CUSTOM\n")
  expect(cli(d, ...args).status).toBe(0)
  expect(readFileSync(main, "utf8")).toBe("CUSTOM\n")
  expect(JSON.parse(readFileSync(join(d, "package.json"), "utf8")).packageManager).toMatch(/^bun@/)
})
test("language, name, unknown feature and template mismatch stop before writes", () => {
  const d = dir()
  for (const extra of [
    ["--name", "../escape"],
    ["--features", "imaginary"],
    ["--language", "go", "--template", "next"],
  ]) {
    const r = cli(d, "--yes", "--apply", "--no-install", ...extra)
    expect(r.status).toBe(1)
    expect(readdirSync(d)).toEqual([])
  }
})
test("OS installation is skipped even with --yes, prints guidance", () => {
  const d = dir()
  // cargo may already be installed on the runner. Hide host tools so this branch is deterministic.
  const r = spawnSync(
    process.execPath,
    [
      join(import.meta.dir, "../scripts/setup.ts"),
      "--dir",
      d,
      "--name",
      "test-project",
      "--yes",
      "--apply",
      "--no-install",
      "--no-os-install",
      "--language",
      "rust",
      "--template",
      "rust-cli",
    ],
    { encoding: "utf8", env: { ...process.env, PATH: d } },
  )
  expect(r.status).toBe(0)
  expect(readFileSync(join(d, "Cargo.toml"), "utf8")).toContain("[package]")
  expect(r.stdout).toContain("OS パッケージは自動導入しません")
})
test("language gate detects disallowed character; scissors and warnings work", () => {
  expect(classify(String.fromCodePoint(0x52a8))?.level).toBe("error")
  expect(classify(String.fromCodePoint(0x20b9f))?.level).toBe("warn")
  expect(classify("﨑")).toBeNull()
  expect(findIssues(stripCommit(`fix: OK\n# ${String.fromCodePoint(0x52a8)}\n`))).toHaveLength(0)
})
test("doc links and Mermaid negative fixtures", () => {
  const d = dir(),
    p = join(d, "doc.md")
  writeFileSync(p, "[broken](missing.md)\n")
  expect(brokenLinks(p)).toHaveLength(1)
  expect(checkBlock(["flowchart TD", "flowchart TD"])).toHaveLength(1)
  expect(blocks("```mermaid\nflowchart TD\n```\n")).toHaveLength(1)
})

test("OS detection covers apt, Homebrew, winget, Termux and unsupported", () => {
  expect(detectPackageManager("linux", undefined, true)?.name).toBe("apt")
  expect(detectPackageManager("darwin", undefined, false)?.name).toBe("brew")
  expect(detectPackageManager("win32", undefined, false)?.name).toBe("winget")
  expect(detectPackageManager("linux", "/data/data/com.termux/files/usr", false)?.name).toBe("pkg")
  expect(detectPackageManager("freebsd", undefined, false)).toBeNull()
})
test("JavaScript Web templates generate JS/JSX instead of TypeScript app files", () => {
  for (const template of ["next", "vite-react"]) {
    const d = dir()
    const r = cli(
      d,
      "--yes",
      "--apply",
      "--no-install",
      "--language",
      "javascript",
      "--template",
      template,
    )
    expect(r.status).toBe(0)
    expect(existsSync(join(d, template === "next" ? "app/layout.jsx" : "src/main.jsx"))).toBe(true)
    expect(existsSync(join(d, template === "next" ? "app/layout.tsx" : "src/main.tsx"))).toBe(false)
  }
})
test("symlinked package.json is never overwritten", () => {
  const d = dir(),
    outside = dir()
  const external = join(outside, "package.json")
  writeFileSync(external, '{"keep":true}\n')
  const { symlinkSync } = require("node:fs") as typeof import("node:fs")
  symlinkSync(external, join(d, "package.json"))
  expect(cli(d, "--yes", "--apply", "--no-install").status).toBe(1)
  expect(readFileSync(external, "utf8")).toBe('{"keep":true}\n')
})

test("generated Web package scripts use Bun and Next includes node types", () => {
  const d = dir()
  expect(cli(d, "--yes", "--apply", "--no-install", "--preset", "next-app").status).toBe(0)
  const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
  expect(pkg.scripts.build).toBe("bun x next build")
  expect(pkg.devDependencies["@types/node"]).toBeDefined()
  const mono = dir()
  expect(cli(mono, "--yes", "--apply", "--no-install", "--preset", "monorepo").status).toBe(0)
  const workspace = JSON.parse(readFileSync(join(mono, "package.json"), "utf8"))
  expect(workspace.workspaces).toEqual(["apps/*", "packages/*"])
})
