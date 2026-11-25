import { afterEach, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type Scaffold, scaffold } from "../scripts/setup-manifest.ts"
import { option, type Resolved } from "../scripts/setup-options.ts"
import { applyLanguageVariants, buildPackage, json, readJson } from "../scripts/setup-package.ts"

const dirs: string[] = []
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "setup-package-"))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** CLI の引数から確定済みの選択を作る（対話を通さない最短の経路）。 */
function resolved(args: string[], over: Partial<Resolved> = {}): Resolved {
  const parsed = option(["--yes", ...args])
  const given = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  )
  return {
    dir: temp(),
    yes: true,
    apply: false,
    dryRun: false,
    planJson: false,
    noInstall: true,
    noOsInstall: false,
    help: false,
    list: false,
    initOnly: false,
    noInit: false,
    language: "typescript",
    template: "plain-ts",
    preset: "minimal",
    name: "demo-app",
    features: [],
    ...given,
    ...over,
  } as Resolved
}

test("json writes two-space indented JSON with a trailing newline and readJson parses it back", () => {
  expect(json({ a: 1, b: [1, 2] })).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}\n')
  const dir = temp()
  const path = join(dir, "package.json")
  writeFileSync(path, json({ name: "demo" }))
  expect(readJson(path)).toEqual({ name: "demo" })
  writeFileSync(path, "{ not json\n")
  expect(() => readJson(path)).toThrow()
})

test("javascript Web templates are renamed as a unit and lose the TypeScript dependencies", () => {
  const vite = scaffold("vite-react", "demo-app")
  const viteFiles = { ...vite.files }
  applyLanguageVariants(
    resolved([], { language: "javascript", template: "vite-react" }),
    viteFiles,
    vite,
  )
  expect(viteFiles["src/main.jsx"]).toContain('getElementById("root")')
  expect(viteFiles["src/main.jsx"]).not.toContain('getElementById("root")!')
  expect(viteFiles["src/main.tsx"]).toBeUndefined()
  expect(viteFiles["vite.config.js"]).toContain("@vitejs/plugin-react")
  expect(viteFiles["vite.config.ts"]).toBeUndefined()
  expect(viteFiles["index.html"]).toContain("/src/main.jsx")
  expect(vite.dev?.typescript).toBeUndefined()
  expect(vite.dev?.["@types/react"]).toBeUndefined()
  expect(vite.dev?.vite).toBeTruthy()

  const next = scaffold("next", "demo-app")
  const nextFiles = { ...next.files }
  applyLanguageVariants(resolved([], { language: "javascript", template: "next" }), nextFiles, next)
  expect(nextFiles["app/page.jsx"]).toContain("demo-app")
  expect(nextFiles["app/layout.jsx"]).not.toContain("React.ReactNode")
  expect(nextFiles["next.config.mjs"]).toBe("const config = {}\nexport default config\n")
  expect(nextFiles["next.config.ts"]).toBeUndefined()
  expect(next.dev?.["@types/react-dom"]).toBeUndefined()

  // TypeScript のときは何も差し替えない
  const ts = scaffold("vite-react", "demo-app")
  const tsFiles = { ...ts.files }
  applyLanguageVariants(resolved([]), tsFiles, ts)
  expect(tsFiles).toEqual(ts.files)
  expect(ts.dev?.typescript).toBeTruthy()
  // JavaScript でも Web 以外のテンプレートは差し替えの対象外
  const plain = scaffold("plain-js", "demo-app")
  const plainFiles = { ...plain.files }
  applyLanguageVariants(
    resolved([], { language: "javascript", template: "plain-js" }),
    plainFiles,
    plain,
  )
  expect(plainFiles).toEqual(plain.files)
})

test("buildPackage keeps what the user already had and adds what the selection needs", () => {
  const base: Scaffold = scaffold("plain-ts", "demo-app")
  const pkg = buildPackage(
    resolved(["--description", "問い合わせ対応を自動化する"]),
    base,
    { files: {}, scripts: { test: "bun x vitest run" }, dev: { vitest: "^4.1.12" } },
    { version: "3.2.1", private: false, scripts: { keep: "echo kept" } },
  )
  expect(pkg).toMatchObject({
    name: "demo-app",
    description: "問い合わせ対応を自動化する",
    version: "3.2.1",
    private: false,
    type: "module",
  })
  expect(pkg.packageManager).toMatch(/^bun@/)
  expect(pkg.scripts).toEqual({
    keep: "echo kept",
    dev: "bun src/index.ts",
    build: "bun build src/index.ts --outdir dist",
    test: "bun x vitest run",
  })
  expect(pkg.devDependencies).toEqual({ typescript: "^6.0.0", vitest: "^4.1.12" })
  // 公開しない構成では main / exports を足さない
  expect(pkg.exports).toBeUndefined()
  expect(pkg.workspaces).toBeUndefined()

  const fresh = buildPackage(resolved([]), scaffold("plain-ts", "demo-app"), { files: {} }, {})
  expect(fresh.version).toBe("0.1.0")
  expect(fresh.private).toBe(true)
  expect(fresh.description).toBe("")
})

test("a publishable package declares its entry points and emits type declarations", () => {
  const library = buildPackage(
    resolved(["--preset", "library", "--features", "publint,size-limit"]),
    scaffold("plain-ts", "demo-app"),
    { files: {}, package: { "size-limit": [{ path: "dist/index.js", limit: "10 kB" }] } },
    {},
  )
  expect(library.private).toBe(false)
  expect(library.main).toBe("./dist/index.js")
  expect(library.types).toBe("./dist/index.d.ts")
  expect(library.exports).toEqual({
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
  })
  expect(library.files).toEqual(["dist"])
  expect(library["size-limit"]).toEqual([{ path: "dist/index.js", limit: "10 kB" }])
  // 型宣言は build の後に作る（build を置き換えない）
  expect(library.scripts).toMatchObject({
    build: expect.stringContaining("bun build src/index.ts --outdir dist && bun x tsc"),
  })

  // 既存の main / exports / files は上書きしない
  const kept = buildPackage(
    resolved(["--preset", "library"]),
    scaffold("plain-ts", "demo-app"),
    { files: {} },
    { main: "./lib/old.js", exports: { ".": "./lib/old.js" }, files: ["lib"] },
  )
  expect(kept.main).toBe("./lib/old.js")
  expect(kept.exports).toEqual({ ".": "./lib/old.js" })
  expect(kept.files).toEqual(["lib"])

  // JavaScript の公開パッケージには types を宣言しない
  const js = buildPackage(
    resolved(["--preset", "library", "--language", "javascript", "--template", "plain-js"]),
    scaffold("plain-js", "demo-app"),
    { files: {} },
    {},
  )
  expect(js.types).toBeUndefined()
  expect(js.exports).toEqual({ ".": "./dist/index.js" })
  expect(js.scripts).toMatchObject({ build: "bun build src/index.js --outdir dist" })

  const workspace = buildPackage(
    resolved(["--template", "monorepo"]),
    scaffold("monorepo", "demo-app"),
    { files: {} },
    {},
  )
  expect(workspace.workspaces).toEqual(["apps/*", "packages/*"])
})
