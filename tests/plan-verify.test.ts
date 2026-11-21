import { afterEach, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const dirs: string[] = []
function target() {
  const path = mkdtempSync(join(tmpdir(), "plan-verify-"))
  dirs.push(path)
  return path
}
afterEach(() => {
  for (const path of dirs.splice(0)) rmSync(path, { recursive: true, force: true })
})
const setup = join(import.meta.dir, "../scripts/setup.ts")
const verify = join(import.meta.dir, "../scripts/verify_generated.ts")
const cli = (script: string, dir: string, ...args: string[]) =>
  spawnSync(process.execPath, [script, "--dir", dir, ...args], { encoding: "utf8" })
const create = (dir: string, template: string, language: string) =>
  cli(
    setup,
    dir,
    "--yes",
    "--apply",
    "--no-install",
    "--name",
    "my-project",
    "--language",
    language,
    "--template",
    template,
  )

test("JSON preview is a single machine-readable, read-only plan with the same actions as application", () => {
  const dir = target()
  const args = ["--plan-json", "--name", "my-project", "--preset", "minimal"]
  const result = cli(setup, dir, ...args)
  expect(result.status).toBe(0)
  expect(result.stderr).toBe("")
  const plan = JSON.parse(result.stdout)
  expect(plan.schemaVersion).toBe(1)
  expect(plan.mode).toBe("preview")
  expect(plan.selection.features).toEqual(["vitest"])
  expect(plan.files).toContainEqual({ path: "src/index.ts", action: "create" })
  expect(plan.files).toContainEqual({
    path: "package.json",
    action: "create",
    backupPlanned: false,
  })
  expect(plan.dependencies).toEqual({ wouldInstallOnApply: true, executed: false })
  expect(readdirSync(dir)).toEqual([])
  expect(
    cli(
      setup,
      dir,
      "--yes",
      "--apply",
      "--no-install",
      "--name",
      "my-project",
      "--preset",
      "minimal",
    ).status,
  ).toBe(0)
  const again = JSON.parse(cli(setup, dir, ...args).stdout)
  expect(again.files.find((file: { path: string }) => file.path === "src/index.ts").action).toBe(
    "retain",
  )
  expect(again.files.find((file: { path: string }) => file.path === "package.json").action).toBe(
    "retain",
  )
})

test("JSON preview reports manifest backup and filtered preset features, never changes data", () => {
  const dir = target()
  writeFileSync(join(dir, "package.json"), '{"name":"user-project"}\n')
  const original = readFileSync(join(dir, "package.json"), "utf8")
  const result = cli(
    setup,
    dir,
    "--plan-json",
    "--language",
    "go",
    "--template",
    "go-http",
    "--name",
    "my-project",
  )
  expect(result.status).toBe(0)
  const plan = JSON.parse(result.stdout)
  expect(plan.selection.excludedFeatures.length).toBeGreaterThan(0)
  expect(plan.files).toContainEqual({ path: "package.json", action: "update", backupPlanned: true })
  expect(plan.prerequisites.runtime).toEqual(["go"])
  expect(readFileSync(join(dir, "package.json"), "utf8")).toBe(original)
  expect(existsSync(join(dir, ".setup-backup"))).toBe(false)
  for (const args of [["--apply"], ["--save-config", "settings.json"]]) {
    const invalid = cli(setup, dir, "--plan-json", ...args)
    expect(invalid.status).toBe(1)
    expect(invalid.stdout).toBe("")
  }
})

test("generated verifier rejects broken files and accepts every template in static mode", () => {
  const templates: Array<[string, string]> = [
    ["plain-ts", "typescript"],
    ["plain-js", "javascript"],
    ["vite-react", "javascript"],
    ["next", "javascript"],
    ["monorepo", "typescript"],
    ["next-monorepo", "typescript"],
    ["python-cli", "python"],
    ["python-fastapi", "python"],
    ["go-cli", "go"],
    ["go-http", "go"],
    ["rust-cli", "rust"],
    ["rust-axum", "rust"],
  ]
  for (const [template, language] of templates) {
    const dir = target()
    expect(create(dir, template, language).status).toBe(0)
    const checked = cli(verify, dir, "--template", template)
    expect(checked.status).toBe(0)
    expect(checked.stdout).toContain("passed: package.json")
  }
  const broken = target()
  expect(create(broken, "go-cli", "go").status).toBe(0)
  rmSync(join(broken, "go.mod"))
  expect(cli(verify, broken, "--template", "go-cli", "--build").status).toBe(1)
  expect(existsSync(join(broken, "main"))).toBe(false)
  expect(cli(verify, broken, "--template", "other").status).toBe(1)
})

test("build is explicit, missing runtime is blocked, never installs", () => {
  const dir = target()
  expect(create(dir, "go-cli", "go").status).toBe(0)
  const before = readdirSync(dir).sort()
  const result = spawnSync(
    process.execPath,
    [verify, "--dir", dir, "--template", "go-cli", "--build"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: dir },
    },
  )
  expect(result.status).toBe(2)
  expect(result.stdout).toContain("blocked: build")
  expect(existsSync(join(dir, "go.sum"))).toBe(false)
  expect(readdirSync(dir).sort()).toEqual(before)
})

test.skipIf(!Bun.which("go"))("Go CLI and HTTP build in isolated temporary output", () => {
  for (const template of ["go-cli", "go-http"]) {
    const dir = target()
    expect(create(dir, template, "go").status).toBe(0)
    const result = cli(verify, dir, "--template", template, "--build")
    if (result.status !== 0)
      throw new Error(
        `native build ${template}: ${JSON.stringify({ status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr })}`,
      )
    expect(result.stdout).toContain("passed: build")
    expect(existsSync(join(dir, "app"))).toBe(false)
  }
})

test.skipIf(!Bun.which("cargo"))(
  "Rust CLI can be checked offline without keeping target artifacts",
  () => {
    const dir = target()
    expect(create(dir, "rust-cli", "rust").status).toBe(0)
    const result = cli(verify, dir, "--template", "rust-cli", "--build")
    if (result.status !== 0)
      throw new Error(
        `rust build: ${JSON.stringify({ status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr })}`,
      )
    expect(existsSync(join(dir, "target"))).toBe(false)
  },
)

test("local plain TS build runs only on explicit request and rejects altered scripts", () => {
  const dir = target()
  expect(create(dir, "plain-ts", "typescript").status).toBe(0)
  expect(cli(verify, dir, "--template", "plain-ts").status).toBe(0)
  expect(existsSync(join(dir, "dist"))).toBe(false)
  const built = cli(verify, dir, "--template", "plain-ts", "--build")
  expect(built.status).toBe(0)
  expect(built.stdout).toContain("passed: build")
  const pkgPath = join(dir, "package.json")
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  pkg.scripts.build = "echo changed > unsafe.txt"
  writeFileSync(pkgPath, `${JSON.stringify(pkg)}\n`)
  const blocked = cli(verify, dir, "--template", "plain-ts", "--build")
  expect(blocked.status).toBe(2)
  expect(blocked.stdout).toContain("blocked: build")
  expect(existsSync(join(dir, "unsafe.txt"))).toBe(false)
  pkg.scripts.build = "bun build src/index.ts --outdir dist"
  pkg.scripts.prebuild = "echo changed > unsafe.txt"
  writeFileSync(pkgPath, `${JSON.stringify(pkg)}\n`)
  expect(cli(verify, dir, "--template", "plain-ts", "--build").status).toBe(2)
  expect(existsSync(join(dir, "unsafe.txt"))).toBe(false)
  pkg.packageManager = "npm@1"
  writeFileSync(pkgPath, `${JSON.stringify(pkg)}\n`)
  expect(cli(verify, dir, "--template", "plain-ts").status).toBe(1)
})

test("static validation detects a mixed JavaScript/TypeScript Web scaffold", () => {
  const dir = target()
  expect(create(dir, "vite-react", "javascript").status).toBe(0)
  rmSync(join(dir, "vite.config.js"))
  writeFileSync(join(dir, "vite.config.ts"), "export default {}\n")
  const checked = cli(verify, dir, "--template", "vite-react")
  expect(checked.status).toBe(1)
  expect(checked.stdout).toContain("failed: vite.config.js")
})

test.skipIf(!Bun.which(process.platform === "win32" ? "python" : "python3"))(
  "Python CLI runs only with --build; FastAPI without .venv is blocked",
  () => {
    const simple = target()
    expect(create(simple, "python-cli", "python").status).toBe(0)
    expect(cli(verify, simple, "--template", "python-cli", "--build").status).toBe(0)
    const api = target()
    expect(create(api, "python-fastapi", "python").status).toBe(0)
    const blocked = cli(verify, api, "--template", "python-fastapi", "--build")
    expect(blocked.status).toBe(2)
    expect(blocked.stdout).toContain("blocked: build")
    expect(existsSync(join(api, ".venv"))).toBe(false)
  },
)
