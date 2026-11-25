import { expect, test } from "bun:test"
import {
  compatibleFeatures,
  type Feature,
  featureNames,
  featureScaffold,
  scaffold,
  type Template,
  templates,
} from "../scripts/setup-manifest.ts"

const everyTemplate = Object.values(templates).flat()
const jsTemplates = everyTemplate.filter(
  (t) => !["python", "go", "rust"].some((lang) => t.startsWith(lang)),
)
const nativeTemplates = everyTemplate.filter((t) => !jsTemplates.includes(t))
const all = [...featureNames] as Feature[]

test("compatibleFeatures keeps library-only features for plain packages and none for native ones", () => {
  expect(compatibleFeatures("plain-ts")).toEqual(featureNames)
  expect(compatibleFeatures("plain-js")).toEqual(featureNames)
  // 公開前提の道具は、入口が src/index に決まっている plain だけ
  expect(compatibleFeatures("vite-react")).toEqual(
    featureNames.filter((f) => !["publint", "size-limit", "changesets"].includes(f)),
  )
  expect(compatibleFeatures("next-monorepo")).not.toContain("publint")
  for (const template of nativeTemplates)
    expect(compatibleFeatures(template)).toEqual([
      "docker",
      "devcontainer",
      "github-templates",
      "renovate",
      "stale-bot",
    ])
})

test("scaffold builds every advertised template and refuses an unknown one", () => {
  for (const template of everyTemplate) {
    const built = scaffold(template, "demo-app")
    expect(Object.keys(built.files).length).toBeGreaterThan(0)
    expect(built.scripts?.start || built.scripts?.dev).toBeTruthy()
    // 生成物にプロジェクト名が入る（名前の無い生成物は差し替えの目印が無い）
    expect(JSON.stringify(built.files)).toContain("demo-app")
  }
  expect(scaffold("plain-ts", "demo").files["src/index.ts"]).toBe('export const name = "demo"\n')
  expect(scaffold("monorepo", "demo").files["apps/web/package.json"]).toContain('"private": true')
  expect(scaffold("next-monorepo", "demo").files["apps/web/app/page.tsx"]).toContain("demo")
  expect(() => scaffold("nope" as Template, "demo")).toThrow("未対応のテンプレート: nope")
})

test("docker picks the image, install step and command of each language", () => {
  const cases: Array<[Template, string, string]> = [
    ["plain-ts", "oven/bun:1", 'CMD ["bun", "run", "dev"]'],
    ["vite-react", "oven/bun:1", 'CMD ["bun", "run", "dev"]'],
    ["python-fastapi", "python:3.12-slim", 'CMD ["python3", "-m", "uvicorn"'],
    ["python-cli", "python:3.12-slim", 'CMD ["python3", "main.py"]'],
    ["go-http", "golang:1.23", 'CMD ["go", "run", "."]'],
    ["rust-axum", "rust:1", 'CMD ["cargo", "run"]'],
  ]
  for (const [template, image, command] of cases) {
    const files = featureScaffold(["docker"], "demo", template).files
    expect(files.Dockerfile).toContain(`FROM ${image}`)
    expect(files.Dockerfile).toContain(command)
    expect(files[".dockerignore"]).toContain(".setup-backup")
  }
  // 依存の導入はイメージの中にある道具だけ。python-cli には依存が無いので行を足さない
  expect(featureScaffold(["docker"], "demo", "plain-ts").files.Dockerfile).toContain(
    "RUN bun install",
  )
  expect(featureScaffold(["docker"], "demo", "python-fastapi").files.Dockerfile).toContain(
    "RUN pip install .",
  )
  expect(featureScaffold(["docker"], "demo", "go-cli").files.Dockerfile).toContain(
    "RUN go mod download",
  )
  expect(featureScaffold(["docker"], "demo", "rust-cli").files.Dockerfile).toContain(
    "RUN cargo fetch",
  )
  const cli = featureScaffold(["docker"], "demo", "python-cli").files.Dockerfile
  expect(cli).not.toContain("RUN")
  expect(cli).not.toContain("bun")
})

test("devcontainer and the JSON features emit parseable configuration", () => {
  const js = featureScaffold(["devcontainer"], "demo", "plain-ts")
  expect(JSON.parse(js.files[".devcontainer/devcontainer.json"])).toEqual({
    name: "demo",
    image: "oven/bun:1",
    postCreateCommand: "bun install",
  })
  // 依存の導入が要らないテンプレートでは postCreateCommand を空文字で残さない
  expect(
    JSON.parse(
      featureScaffold(["devcontainer"], "demo", "python-cli").files[
        ".devcontainer/devcontainer.json"
      ],
    ),
  ).toEqual({ name: "demo", image: "python:3.12" })
  expect(
    JSON.parse(
      featureScaffold(["devcontainer"], "demo", "python-fastapi").files[
        ".devcontainer/devcontainer.json"
      ],
    ).postCreateCommand,
  ).toContain("pip install -e .")
  // 言語別の依存導入は docker と揃える（rust-cli / go-* が抜け落ちていた）
  const postCreate = (template: Template): unknown =>
    (
      JSON.parse(
        featureScaffold(["devcontainer"], "demo", template).files[
          ".devcontainer/devcontainer.json"
        ],
      ) as { postCreateCommand?: string }
    ).postCreateCommand
  expect(postCreate("rust-cli")).toBe("cargo fetch")
  expect(postCreate("rust-axum")).toBe("cargo fetch")
  expect(postCreate("go-cli")).toBe("go mod download")
  expect(postCreate("go-http")).toBe("go mod download")
  expect(postCreate("python-cli")).toBeUndefined()
  expect(postCreate("plain-js")).toBe("bun install")
  expect(postCreate("next-monorepo")).toBe("bun install")

  const configured = featureScaffold(["renovate", "cspell", "changesets"], "demo-app", "plain-ts")
  expect(JSON.parse(configured.files["renovate.json"]).extends).toEqual(["config:recommended"])
  const words = JSON.parse(configured.files["cspell.json"]).words as string[]
  expect(words).toContain("demo")
  expect(words).toContain("app")
  expect(words).toContain("knip")
  expect(JSON.parse(configured.files[".changeset/config.json"]).access).toBe("restricted")
  expect(configured.dev?.["@changesets/cli"]).toBeTruthy()
  expect(configured.scripts?.changeset).toBe("bun x changeset")
})

test("quality features add the dependencies, scripts and files they promise", () => {
  const built = featureScaffold(all, "demo", "plain-ts")
  expect(built.dev?.vitest).toBeTruthy()
  expect(built.scripts?.test).toBe("bun x vitest run")
  expect(built.dev?.["@vitest/coverage-v8"]).toBeTruthy()
  expect(built.scripts?.coverage).toBe("bun x vitest run --coverage")
  expect(built.scripts?.spell).toBe("bun x cspell .")
  expect(built.scripts?.knip).toBe("bun x knip")
  expect(built.scripts?.publint).toBe("bun run build && bun x publint")
  expect(built.scripts?.size).toBe("bun run build && bun x size-limit")
  expect(built.scripts?.["install:ci"]).toBe("bun install --frozen-lockfile")
  expect(built.scripts?.["env:termux"]).toContain("com.termux")
  expect(built.package?.["size-limit"]).toEqual([{ path: "dist/index.js", limit: "10 kB" }])
  expect(built.files[".husky/pre-commit"]).toBe("bun run check\n")
  expect(built.files[".husky/commit-msg"]).toBe('bun run lint:commit "$1"\n')
  expect(built.files["commitlint.config.mjs"]).toContain("@commitlint/config-conventional")
  expect(built.files["scripts/install_husky.ts"]).toContain("core.hooksPath")
  expect(built.files[".github/ISSUE_TEMPLATE/bug.md"]).toContain("## Reproduction")
  // package.json の書き換えで作る退避は commit させない
  expect(built.files[".gitignore"]).toContain(".setup-backup/")
  expect(featureScaffold(["knip"], "demo", "plain-ts").files["knip.jsonc"]).not.toContain(
    "coverage/**",
  )
  expect(featureScaffold(["knip", "coverage"], "demo", "plain-ts").files["knip.jsonc"]).toContain(
    "coverage/**",
  )
  // commitlint だけ、husky だけではフックを増やさない
  expect(
    featureScaffold(["commitlint"], "demo", "plain-ts").files[".husky/commit-msg"],
  ).toBeUndefined()
  expect(featureScaffold(["husky"], "demo", "plain-ts").files[".husky/commit-msg"]).toBeUndefined()
})

test("husky's pre-commit only calls scripts that the generated project really has", () => {
  for (const template of jsTemplates) {
    for (const features of [
      ["husky"],
      ["husky", "vitest"],
      ["husky", "cspell", "knip"],
      all,
    ] as Feature[][]) {
      const extra = featureScaffold(features, "demo", template)
      const check = extra.scripts?.check
      expect(check).toBeTruthy()
      const scripts = { ...scaffold(template, "demo").scripts, ...extra.scripts }
      for (const call of (check as string).split(" && ")) {
        const name = call.replace(/^bun run /, "")
        expect(scripts[name], `${template} ${features.join(",")}: ${name}`).toBeTruthy()
      }
    }
  }
  // husky を選ばなければ check も作らない
  expect(featureScaffold(["vitest"], "demo", "plain-ts").scripts?.check).toBeUndefined()
  expect(featureScaffold(all, "demo", "python-cli").scripts?.check).toBeUndefined()
})

test("native templates only receive the features that work there", () => {
  for (const template of nativeTemplates) {
    const built = featureScaffold(all, "demo", template)
    expect(built.dev?.vitest).toBeUndefined()
    expect(built.files["cspell.json"]).toBeUndefined()
    expect(built.files[".husky/pre-commit"]).toBeUndefined()
    expect(built.files["renovate.json"]).toBeTruthy()
    expect(built.files[".github/workflows/stale.yml"]).toContain("actions/stale@")
    expect(built.files[".github/ISSUE_TEMPLATE/bug.md"]).toBeTruthy()
    expect(built.files.Dockerfile).toBeTruthy()
    // 生成物は常に .gitignore を持つ（node_modules 等は言語を問わず出る）
    expect(built.files[".gitignore"]).toContain("node_modules/")
  }
})

test("playwright serves web apps and only builds packages", () => {
  const web = featureScaffold(["playwright"], "demo", "vite-react")
  expect(web.files["playwright.config.ts"]).toContain("webServer")
  expect(web.files["playwright.config.ts"]).toContain("bun x vite --host 127.0.0.1 --port 4173")
  expect(web.files["_tests_/e2e.ts"]).toContain("demo")

  const next = featureScaffold(["playwright"], "demo", "next-monorepo")
  expect(next.files["playwright.config.ts"]).toContain("bun x next dev")
  expect(next.files["playwright.config.ts"]).toContain('cwd: "apps/web"')

  const pkg = featureScaffold(["playwright"], "demo", "plain-ts")
  expect(pkg.files["playwright.config.ts"]).not.toContain("webServer")
  expect(pkg.files["_tests_/e2e.ts"]).toContain('spawnSync("bun", ["run", "build"]')
})

test("vitest and coverage add a smoke test that names the generated entry file", () => {
  expect(featureScaffold(["vitest"], "demo", "plain-ts").files["src/index.test.ts"]).toContain(
    'expect(name).toBe("demo")',
  )
  expect(featureScaffold(["coverage"], "demo", "plain-js").files["src/index.test.js"]).toContain(
    'from "vitest"',
  )
  const entries: Array<[Template, string]> = [
    ["vite-react", "src/main"],
    ["next", "app/page"],
    ["monorepo", "apps/web/src/main"],
    ["next-monorepo", "apps/web/app/page"],
  ]
  for (const [template, entry] of entries) {
    const file = featureScaffold(["vitest"], "demo", template).files["_tests_/scaffold.test.ts"]
    expect(file).toContain(`${entry}.tsx`)
    expect(file).toContain(`${entry}.jsx`)
    expect(file).toContain('"demo"')
  }
  // テスト機能を選ばなければテストファイルも増やさない
  expect(featureScaffold(["cspell"], "demo", "plain-ts").files["src/index.test.ts"]).toBeUndefined()
  expect(
    featureScaffold(["vitest"], "demo", "python-cli").files["src/index.test.ts"],
  ).toBeUndefined()
})
