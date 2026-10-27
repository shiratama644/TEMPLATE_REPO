import { afterEach, expect, test } from "bun:test"
import { spawn, spawnSync } from "node:child_process"
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
  expect(cli(d, "--yes", "--apply", "--dry-run", "--preset", "next-app").status).toBe(0)
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

test("invalid preset, language and JSON configuration fail with actionable diagnostics", () => {
  const d = dir()
  const invalid = join(d, "settings.json")
  for (const [data, fragment] of [
    ["null", "設定ファイル"],
    ['{"features":"docker"}', "機能"],
    ['{"description":42}', "説明"],
  ]) {
    writeFileSync(invalid, data)
    const r = cli(d, "--yes", "--dry-run", "--config", invalid)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain(fragment)
  }
  for (const [arg, value, message] of [
    ["--preset", "missing", "不明なプリセット"],
    ["--language", "ruby", "不明な言語"],
  ]) {
    const r = cli(d, "--yes", "--dry-run", arg, value)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain(message)
  }
  writeFileSync(invalid, '{"name":42}')
  const badName = spawnSync(
    process.execPath,
    [
      join(import.meta.dir, "../scripts/setup.ts"),
      "--dir",
      d,
      "--yes",
      "--dry-run",
      "--config",
      invalid,
    ],
    { encoding: "utf8" },
  )
  expect(badName.status).toBe(1)
  expect(badName.stderr).toContain("プロジェクト名")
  expect(readdirSync(d)).toEqual(["settings.json"])
})

test("save-config supports nested paths and never writes Git metadata", () => {
  const d = dir()
  expect(
    cli(d, "--yes", "--apply", "--no-install", "--save-config", "meta/setup.json").status,
  ).toBe(0)
  expect(JSON.parse(readFileSync(join(d, "meta/setup.json"), "utf8")).name).toBe("test-project")
  const blocked = dir()
  const { mkdirSync } = require("node:fs") as typeof import("node:fs")
  mkdirSync(join(blocked, ".git"))
  const result = cli(blocked, "--yes", "--apply", "--no-install", "--save-config", ".git/new.json")
  expect(result.status).toBe(1)
  expect(existsSync(join(blocked, ".git/new.json"))).toBe(false)
  expect(existsSync(join(blocked, "package.json"))).toBe(false)
})

test("a symlinked backup directory cannot receive the existing package manifest", () => {
  const d = dir(),
    outside = dir()
  writeFileSync(join(d, "package.json"), '{"name":"original"}\n')
  const { symlinkSync } = require("node:fs") as typeof import("node:fs")
  symlinkSync(outside, join(d, ".setup-backup"), "dir")
  expect(cli(d, "--yes", "--apply", "--no-install").status).toBe(1)
  expect(readFileSync(join(d, "package.json"), "utf8")).toBe('{"name":"original"}\n')
  expect(readdirSync(outside)).toEqual([])
})

test("standalone coverage and Docker options provide their runtime prerequisites", () => {
  const d = dir()
  expect(cli(d, "--yes", "--apply", "--no-install", "--features", "coverage,docker").status).toBe(0)
  const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
  expect(pkg.devDependencies.vitest).toBeDefined()
  expect(readFileSync(join(d, "Dockerfile"), "utf8")).toContain("RUN bun install")
})

test("library preset produces a publishable package with complete validation dependencies", () => {
  const d = dir()
  expect(cli(d, "--yes", "--apply", "--no-install", "--preset", "library").status).toBe(0)
  const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
  expect(pkg.version).toBe("0.1.0")
  expect(pkg.private).toBe(false)
  expect(pkg.exports["."].types).toBe("./dist/index.d.ts")
  expect(pkg.devDependencies["@size-limit/preset-small-lib"]).toBeDefined()
  expect(pkg.scripts.build).toContain("tsc")
  expect(pkg["size-limit"][0].path).toBe("dist/index.js")
})

test("incompatible feature choices cannot silently become no-ops", () => {
  const d = dir()
  const r = cli(
    d,
    "--yes",
    "--apply",
    "--no-install",
    "--language",
    "python",
    "--template",
    "python-cli",
    "--features",
    "husky",
  )
  expect(r.status).toBe(1)
  expect(r.stderr).toContain("husky")
  expect(readdirSync(d)).toEqual([])
})

test("native installation plans are isolated and remain platform-aware", () => {
  const { nativeInstallSteps } =
    require("../scripts/setup.ts") as typeof import("../scripts/setup.ts")
  const d = dir()
  const posix = nativeInstallSteps("python-fastapi", d, "linux")
  expect(posix[0]).toEqual(["python3", "-m", "venv", ".venv"])
  expect(posix[1][0]).toBe(join(d, ".venv/bin/python"))
  const windows = nativeInstallSteps("python-fastapi", d, "win32")
  expect(windows[0][0]).toBe("python")
  expect(windows[1][0]).toBe(join(d, ".venv/Scripts/python.exe"))
  expect(nativeInstallSteps("rust-axum", d)).toEqual([["cargo", "fetch"]])
  expect(nativeInstallSteps("go-http", d)).toEqual([])
})
test("config typos are rejected and native projects ignore local build products", () => {
  const d = dir(),
    config = join(d, "settings.json")
  writeFileSync(config, '{"featues":["docker"]}')
  const invalid = cli(d, "--yes", "--dry-run", "--config", config)
  expect(invalid.status).toBe(1)
  expect(invalid.stderr).toContain("featues")
  expect(
    cli(
      d,
      "--yes",
      "--apply",
      "--no-install",
      "--language",
      "python",
      "--template",
      "python-fastapi",
      "--features",
      "docker",
    ).status,
  ).toBe(0)
  expect(readFileSync(join(d, ".gitignore"), "utf8")).toContain(".venv/")
  expect(readFileSync(join(d, ".dockerignore"), "utf8")).toContain(".venv")
  expect(JSON.parse(readFileSync(join(d, "package.json"), "utf8")).scripts.start).toBe(
    "bun scripts/start.ts",
  )
})

test("link checker handles encoded paths, query strings and root-relative links", () => {
  const d = dir()
  const { mkdirSync } = require("node:fs") as typeof import("node:fs")
  mkdirSync(join(d, "docs"))
  writeFileSync(join(d, "file name.md"), "# file\n")
  writeFileSync(
    join(d, "docs/page.md"),
    "[one](../file%20name.md) [two](../file%20name.md?raw=1#file) [three](/file%20name.md)\n",
  )
  expect(brokenLinks(join(d, "docs/page.md"), d)).toEqual([])
  writeFileSync(join(d, "docs/page.md"), "[bad](missing%20name.md)\n")
  expect(brokenLinks(join(d, "docs/page.md"), d)).toHaveLength(1)
})

test("Mermaid checker reports an unclosed fenced diagram", () => {
  const { checkMermaid } =
    require("../scripts/check_mermaid.ts") as typeof import("../scripts/check_mermaid.ts")
  const d = dir()
  writeFileSync(join(d, "broken.md"), "```mermaid\nflowchart TD\n  A --> B\n")
  expect(checkMermaid(d)).toBe(1)
})

test("invalid package names and dangling symlinked manifest are rejected safely", () => {
  for (const name of ["a-", "a--b", `a${"-b".repeat(40)}`]) {
    const d = dir()
    const r = cli(d, "--name", name, "--yes", "--apply", "--no-install")
    expect(r.status).toBe(1)
    expect(readdirSync(d)).toEqual([])
  }
  const d = dir(),
    outside = dir()
  const { symlinkSync } = require("node:fs") as typeof import("node:fs")
  symlinkSync(join(outside, "missing.json"), join(d, "package.json"))
  const result = cli(d, "--yes", "--apply", "--no-install")
  expect(result.status).toBe(1)
  expect(result.stderr).toContain("symlink")
  expect(existsSync(join(outside, "missing.json"))).toBe(false)
})

test("backup names remain unique for repeated updates in quick succession", () => {
  const d = dir()
  writeFileSync(join(d, "package.json"), '{"name":"old"}\n')
  expect(cli(d, "--yes", "--apply", "--no-install").status).toBe(0)
  expect(cli(d, "--name", "updated", "--yes", "--apply", "--no-install").status).toBe(0)
  const backups = readdirSync(join(d, ".setup-backup"))
  expect(backups).toHaveLength(2)
  expect(backups.every((name) => existsSync(join(d, ".setup-backup", name, "package.json")))).toBe(
    true,
  )
})

test("optional Husky installation checks existing hooks rather than installing implicitly", () => {
  const d = dir()
  expect(cli(d, "--yes", "--apply", "--no-install", "--features", "husky,commitlint").status).toBe(
    0,
  )
  const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
  expect(pkg.scripts["husky:install"]).toBe("bun scripts/install_husky.ts")
  expect(pkg.scripts.prepare).toBeUndefined()
  expect(readFileSync(join(d, "scripts/install_husky.ts"), "utf8")).toContain("core.hooksPath")
  expect(readFileSync(join(d, ".husky/commit-msg"), "utf8")).toContain("lint:commit")
})

test("every language/template pair runs through the CLI without discarded files", () => {
  for (const [language, variants] of Object.entries(templates)) {
    for (const template of variants) {
      const d = dir()
      const result = cli(
        d,
        "--yes",
        "--apply",
        "--no-install",
        "--features",
        "none",
        "--language",
        language,
        "--template",
        template,
      )
      expect(result.status).toBe(0)
      const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
      expect(pkg.name).toBe("test-project")
      for (const path of Object.keys(scaffold(template, "test-project").files)) {
        if (
          language === "javascript" &&
          [
            "src/main.tsx",
            "vite.config.ts",
            "app/layout.tsx",
            "app/page.tsx",
            "next.config.ts",
          ].includes(path)
        )
          continue
        expect(existsSync(join(d, path))).toBe(true)
      }
    }
  }
})

test("native presets disclose and filter unsupported features", () => {
  const d = dir()
  const r = cli(
    d,
    "--yes",
    "--apply",
    "--no-install",
    "--preset",
    "full",
    "--language",
    "python",
    "--template",
    "python-cli",
  )
  expect(r.status).toBe(0)
  expect(r.stdout).toContain("非対応の機能を除外")
  const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
  expect(pkg.devDependencies.vitest).toBeUndefined()
  expect(existsSync(join(d, "Dockerfile"))).toBe(true)
})

test("commit-msg hook rejects a nonconventional header even if body contains a valid one", () => {
  const d = dir(),
    message = join(d, "commit-message")
  writeFileSync(message, "not valid\n\nfeat: valid text in body\n")
  const hook = join(import.meta.dir, "../.githooks/commit-msg")
  expect(spawnSync("sh", [hook, message], { cwd: join(import.meta.dir, "..") }).status).toBe(1)
  writeFileSync(message, "fix: 正しい形式\n")
  expect(spawnSync("sh", [hook, message], { cwd: join(import.meta.dir, "..") }).status).toBe(0)
})

test("native devcontainers bootstrap application dependencies after creation", () => {
  for (const [language, template, expected] of [
    ["python", "python-fastapi", "pip install -e ."],
    ["rust", "rust-axum", "cargo fetch"],
  ]) {
    const d = dir()
    expect(
      cli(
        d,
        "--yes",
        "--apply",
        "--no-install",
        "--language",
        language,
        "--template",
        template,
        "--features",
        "devcontainer",
      ).status,
    ).toBe(0)
    const config = JSON.parse(readFileSync(join(d, ".devcontainer/devcontainer.json"), "utf8"))
    expect(config.postCreateCommand).toContain(expected)
  }
})

test("selected quality tools include runnable scaffolds and scoped configuration", () => {
  const d = dir()
  expect(cli(d, "--yes", "--apply", "--no-install", "--preset", "full").status).toBe(0)
  const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"))
  expect(pkg.scripts.test).toContain("vitest")
  expect(pkg.scripts.e2e).toContain("playwright")
  expect(existsSync(join(d, "src/index.test.ts"))).toBe(true)
  expect(existsSync(join(d, "tests/e2e.ts"))).toBe(true)
  const spell = JSON.parse(readFileSync(join(d, "cspell.json"), "utf8"))
  expect(spell.ignorePaths).toContain("coverage/**")
  const knip = JSON.parse(readFileSync(join(d, "knip.jsonc"), "utf8"))
  expect(knip.ignoreDependencies).toContain("husky")
  for (const template of ["vite-react", "next", "monorepo", "next-monorepo"]) {
    const web = dir()
    expect(
      cli(
        web,
        "--yes",
        "--apply",
        "--no-install",
        "--template",
        template,
        "--features",
        "playwright",
      ).status,
    ).toBe(0)
    expect(readFileSync(join(web, "playwright.config.ts"), "utf8")).toContain("webServer")
    expect(readFileSync(join(web, "tests/e2e.ts"), "utf8")).toContain("response.ok()")
  }
})

async function interactiveCli(d: string, answer: string | null, ...flags: string[]) {
  const args = [
    process.execPath,
    join(import.meta.dir, "../scripts/setup.ts"),
    "--dir",
    d,
    "--name",
    "test-project",
    "--description",
    "interactive test",
    "--preset",
    "minimal",
    "--language",
    "typescript",
    "--template",
    "plain-ts",
    "--features",
    "none",
    "--no-install",
    ...flags,
  ]
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
  return await new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn("script", ["-q", "-e", "-c", args.map(quote).join(" "), "/dev/null"])
    let output = "",
      sent = false
    const timer = setTimeout(() => {
      child.stdin.end()
      child.kill()
      reject(new Error(`対話式 CLI が終了しません: ${output}`))
    }, 10_000)
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString()
      if (!sent && output.includes("[y/N]:")) {
        sent = true
        child.stdin.write(`${answer ?? ""}\n`)
      }
    })
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("close", (status) => {
      clearTimeout(timer)
      if (answer !== null && !sent) reject(new Error(`確認プロンプトが表示されません: ${output}`))
      else resolve({ status, output })
    })
  })
}

test("interactive plan accepts y without --apply and rejects N or empty input", async () => {
  const cancelled = dir()
  const no = await interactiveCli(cancelled, "N", "--save-config", "choices.json")
  expect(no.status).toBe(0)
  expect(no.output).toContain("この計画を適用しますか？ [y/N]:")
  expect(no.output).toContain("中止しました")
  expect(readdirSync(cancelled)).toEqual([])

  const empty = dir()
  expect((await interactiveCli(empty, "")).status).toBe(0)
  expect(readdirSync(empty)).toEqual([])

  const legacy = dir()
  expect((await interactiveCli(legacy, "N", "--apply")).status).toBe(0)
  expect(readdirSync(legacy)).toEqual([])

  const approved = dir()
  const yes = await interactiveCli(approved, "y", "--save-config", "choices.json")
  expect(yes.status).toBe(0)
  expect(existsSync(join(approved, "package.json"))).toBe(true)
  expect(existsSync(join(approved, "src/index.ts"))).toBe(true)
  expect(existsSync(join(approved, "choices.json"))).toBe(true)

  const dryRun = dir()
  const preview = await interactiveCli(dryRun, null, "--apply", "--dry-run")
  expect(preview.status).toBe(0)
  expect(preview.output).toContain("セットアップ計画")
  expect(preview.output).not.toContain("[y/N]:")
  expect(readdirSync(dryRun)).toEqual([])
})
