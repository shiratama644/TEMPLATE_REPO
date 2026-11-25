// Inspired by the MIT-licensed `full` branch bootstrap manifest; rewritten for Bun.
export const featureNames = [
  "docker",
  "devcontainer",
  "termux",
  "vitest",
  "playwright",
  "coverage",
  "cspell",
  "knip",
  "publint",
  "size-limit",
  "determinism",
  "husky",
  "commitlint",
  "github-templates",
  "renovate",
  "stale-bot",
  "changesets",
] as const
export type Feature = (typeof featureNames)[number]
export type Template =
  | "plain-ts"
  | "plain-js"
  | "vite-react"
  | "next"
  | "monorepo"
  | "next-monorepo"
  | "python-cli"
  | "python-fastapi"
  | "go-cli"
  | "go-http"
  | "rust-cli"
  | "rust-axum"
export type Language = "typescript" | "javascript" | "python" | "go" | "rust"
export type Preset =
  | "minimal"
  | "recommended"
  | "full"
  | "library"
  | "vite-app"
  | "next-app"
  | "monorepo"
export const presets: Record<
  Preset,
  { template: Template; features: Feature[]; description: string }
> = {
  minimal: { template: "plain-ts", features: ["vitest"], description: "最小限の TypeScript" },
  recommended: {
    template: "plain-ts",
    features: ["vitest", "coverage", "cspell", "github-templates", "renovate"],
    description: "品質と開発効率のバランス",
  },
  full: {
    template: "plain-ts",
    features: [...featureNames],
    description: "全機能（環境に適合するもののみ）",
  },
  library: {
    template: "plain-ts",
    features: ["vitest", "coverage", "publint", "size-limit", "changesets"],
    description: "公開可能なライブラリ",
  },
  "vite-app": {
    template: "vite-react",
    features: ["docker", "devcontainer", "vitest", "playwright", "coverage", "cspell", "renovate"],
    description: "Vite + React Web",
  },
  "next-app": {
    template: "next",
    features: ["docker", "devcontainer", "vitest", "playwright", "coverage", "cspell", "renovate"],
    description: "Next.js Web",
  },
  monorepo: {
    template: "monorepo",
    features: ["vitest", "coverage", "cspell", "renovate"],
    description: "Bun workspace + Turbo",
  },
}
export const templates: Record<Language, Template[]> = {
  typescript: ["plain-ts", "vite-react", "next", "monorepo", "next-monorepo"],
  javascript: ["plain-js", "vite-react", "next"],
  python: ["python-cli", "python-fastapi"],
  go: ["go-cli", "go-http"],
  rust: ["rust-cli", "rust-axum"],
}
export const compatibleFeatures = (template: Template): readonly Feature[] => {
  if (["python", "go", "rust"].some((lang) => template.startsWith(lang)))
    return ["docker", "devcontainer", "github-templates", "renovate", "stale-bot"]
  if (!["plain-ts", "plain-js"].includes(template))
    return featureNames.filter((f) => !["publint", "size-limit", "changesets"].includes(f))
  return featureNames
}
export type Scaffold = {
  files: Record<string, string>
  deps?: Record<string, string>
  dev?: Record<string, string>
  scripts?: Record<string, string>
  package?: Record<string, unknown>
  requires?: string[]
}
/**
 * Biome の JSON 整形に合わせた出力を作る。
 * Biome は「値だけの配列」を行幅（`biome.json` の lineWidth = 100）に収まるかぎり 1 行にまとめるが、
 * `JSON.stringify(value, null, 2)` は常に展開する。放っておくと生成した直後のプロジェクトが
 * `biome check --write` を要求する状態になり、利用者が手で直すファイルが増える。
 */
export function biomeJson(value: unknown, lineWidth = 100): string {
  const scalar = /^[ \t]*(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null),?$/u
  const opens = /^.*\[[ \t]*$/u
  const closes = /^[ \t]*\],?$/u
  const lines = JSON.stringify(value, null, 2).split("\n")
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const head = opens.exec(lines[i])?.[0].trimEnd()
    if (!head) {
      out.push(lines[i])
      continue
    }
    const items: string[] = []
    let j = i + 1
    while (j < lines.length && scalar.test(lines[j])) {
      items.push(lines[j].trim().replace(/,$/u, ""))
      j++
    }
    const tail = closes.exec(lines[j] ?? "")?.[0].trim()
    const oneLine = tail && items.length > 0 ? `${head}${items.join(", ")}${tail}` : ""
    if (oneLine && oneLine.length <= lineWidth) {
      out.push(oneLine)
      i = j
    } else {
      out.push(lines[i])
    }
  }
  return `${out.join("\n")}\n`
}

type TemplateBuilder = (name: string, safe: string, template: Template) => Scaffold
const plainTs: TemplateBuilder = (name) => ({
  files: { "src/index.ts": `export const name = "${name}"\n` },
  dev: { typescript: "^6.0.0" },
  scripts: { dev: "bun src/index.ts", build: "bun build src/index.ts --outdir dist" },
})
const plainJs: TemplateBuilder = (name) => ({
  files: { "src/index.js": `export const name = "${name}"\n` },
  scripts: { dev: "bun src/index.js", build: "bun build src/index.js --outdir dist" },
})
const viteReact: TemplateBuilder = (name) => ({
  files: {
    "index.html": `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${name}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`,
    "src/main.tsx": `import React from "react"\nimport { createRoot } from "react-dom/client"\n\ncreateRoot(document.getElementById("root")!).render(<h1>${name}</h1>)\n`,
    "vite.config.ts": `import react from "@vitejs/plugin-react"\nimport { defineConfig } from "vite"\nexport default defineConfig({ plugins: [react()] })\n`,
  },
  deps: { react: "^19.0.0", "react-dom": "^19.0.0" },
  dev: {
    vite: "^7.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    typescript: "^6.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^24.0.0",
  },
  scripts: { dev: "bun x vite", build: "bun x vite build", preview: "bun x vite preview" },
})
const next: TemplateBuilder = (name) => ({
  files: {
    "app/layout.tsx": `export const metadata = { title: "${name}" }\nexport default function Layout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}\n`,
    "app/page.tsx": `export default function Page() {\n  return (\n    <main>\n      <h1>${name}</h1>\n    </main>\n  )\n}\n`,
    "next.config.ts":
      'import type { NextConfig } from "next"\n\nconst config: NextConfig = {}\nexport default config\n',
  },
  deps: { next: "^16.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
  dev: {
    typescript: "^6.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^24.0.0",
  },
  scripts: { dev: "bun x next dev", build: "bun x next build", start: "bun x next start" },
})
const monorepo: TemplateBuilder = (name, safe, template) => {
  const nested =
    template === "next-monorepo" ? scaffold("next", name) : scaffold("vite-react", name)
  return {
    files: {
      "turbo.json": biomeJson({
        tasks: {
          build: { dependsOn: ["^build"], outputs: ["dist/**", ".next/**"] },
          dev: { cache: false, persistent: true },
          test: {},
        },
      }),
      "apps/web/package.json": `${JSON.stringify(
        {
          name: `${safe}-web`,
          private: true,
          scripts: nested.scripts,
          dependencies: nested.deps,
          devDependencies: nested.dev,
        },
        null,
        2,
      )}\n`,
      ...Object.fromEntries(Object.entries(nested.files).map(([p, v]) => [`apps/web/${p}`, v])),
      "packages/shared/package.json": `${JSON.stringify({ name: `@${safe}/shared`, private: true }, null, 2)}\n`,
      "packages/shared/src/index.ts": "export const shared = true\n",
    },
    dev: { turbo: "^2.0.0" },
    scripts: { dev: "bun x turbo dev", build: "bun x turbo build" },
  }
}
const python: TemplateBuilder = (name, _safe, template) => ({
  files: {
    "pyproject.toml": `[project]\nname = "${name}"\nversion = "0.1.0"\nrequires-python = ">=3.11"\n${template === "python-fastapi" ? 'dependencies = ["fastapi", "uvicorn"]\n' : ""}`,
    [template === "python-cli" ? "main.py" : "app.py"]:
      template === "python-cli"
        ? `print("Hello from ${name}")\n`
        : 'from fastapi import FastAPI\napp = FastAPI()\n@app.get("/")\ndef index():\n    return {"message": "Hello"}\n',
    "scripts/start.ts":
      template === "python-cli"
        ? 'const exe = process.platform === "win32" ? "python" : "python3"\nconst child = Bun.spawn([exe, "main.py"], { stdin: "inherit", stdout: "inherit", stderr: "inherit" })\nprocess.exit(await child.exited)\n'
        : 'const exe = process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python"\nconst child = Bun.spawn([exe, "-m", "uvicorn", "app:app", "--reload"], { stdin: "inherit", stdout: "inherit", stderr: "inherit" })\nprocess.exit(await child.exited)\n',
  },
  requires: ["python3"],
  scripts: {
    start: "bun scripts/start.ts",
  },
})
const go: TemplateBuilder = (name, _safe, template) => ({
  files: {
    "go.mod": `module example.com/${name}\n\ngo 1.22\n`,
    "main.go":
      template === "go-cli"
        ? `package main\nimport "fmt"\nfunc main() { fmt.Println("Hello from ${name}") }\n`
        : 'package main\nimport ("fmt"; "net/http")\nfunc main() { http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { fmt.Fprintln(w,"Hello") }); http.ListenAndServe(":8080",nil) }\n',
  },
  requires: ["go"],
  scripts: { start: "go run ." },
})
const rust: TemplateBuilder = (name, _safe, template) => ({
  files: {
    "Cargo.toml": `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2021"\n${template === "rust-axum" ? '[dependencies]\naxum = "0.8"\ntokio = { version = "1", features = ["full"] }\n' : ""}`,
    "src/main.rs":
      template === "rust-cli"
        ? `fn main() { println!("Hello from ${name}"); }\n`
        : '#[tokio::main]\nasync fn main() { let app = axum::Router::new().route("/", axum::routing::get(|| async { "Hello" })); let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap(); axum::serve(listener, app).await.unwrap(); }\n',
  },
  requires: ["cargo"],
  scripts: { start: "cargo run" },
})
const templateBuilders: Record<Template, TemplateBuilder> = {
  "plain-ts": plainTs,
  "plain-js": plainJs,
  "vite-react": viteReact,
  next,
  monorepo,
  "next-monorepo": monorepo,
  "python-cli": python,
  "python-fastapi": python,
  "go-cli": go,
  "go-http": go,
  "rust-cli": rust,
  "rust-axum": rust,
}
export function scaffold(template: Template, name: string): Scaffold {
  const safe = name.replace(/[^a-z0-9_]/g, "_")
  const build = templateBuilders[template]
  if (!build) throw new Error(`未対応のテンプレート: ${template}`)
  return build(name, safe, template)
}
type FeatureContext = {
  name: string
  template: Template
  js: boolean
  features: Feature[]
  files: Record<string, string>
  dev: Record<string, string>
  scripts: Record<string, string>
  packageFields: Record<string, unknown>
}
// テンプレートを問わず使える機能。それ以外は JS 系のテンプレート（c.js）だけで有効。
const universalFeatures = new Set<Feature>([
  "docker",
  "devcontainer",
  "renovate",
  "github-templates",
  "stale-bot",
])
const featureBuilders: Partial<Record<Feature, (c: FeatureContext) => void>> = {
  docker(c) {
    const image = c.template.startsWith("python")
      ? "python:3.12-slim"
      : c.template.startsWith("go")
        ? "golang:1.23"
        : c.template.startsWith("rust")
          ? "rust:1"
          : "oven/bun:1"
    const command =
      c.template === "python-fastapi"
        ? '["python3", "-m", "uvicorn", "app:app", "--host", "0.0.0.0"]'
        : c.template === "python-cli"
          ? '["python3", "main.py"]'
          : c.template.startsWith("go")
            ? '["go", "run", "."]'
            : c.template.startsWith("rust")
              ? '["cargo", "run"]'
              : '["bun", "run", "dev"]'
    // 依存の導入はイメージの中にある道具だけを使う。python-cli は依存が無いので行を足さない
    const install = c.js
      ? "RUN bun install\n"
      : c.template === "python-fastapi"
        ? "RUN pip install .\n"
        : c.template.startsWith("rust")
          ? "RUN cargo fetch\n"
          : c.template.startsWith("go")
            ? "RUN go mod download\n"
            : ""
    c.files.Dockerfile = `FROM ${image}\nWORKDIR /app\nCOPY . .\n${install}CMD ${command}\n`
    c.files[".dockerignore"] = ".git\nnode_modules\n.venv\ntarget\ndist\n.next\n.setup-backup\n"
  },
  devcontainer(c) {
    const image = c.template.startsWith("python")
      ? "python:3.12"
      : c.template.startsWith("go")
        ? "golang:1.23"
        : c.template.startsWith("rust")
          ? "rust:1"
          : "oven/bun:1"
    // docker と同じ基準で依存の導入コマンドを決める。python-cli は依存が無いので書かない
    const postCreateCommand = c.js
      ? "bun install"
      : c.template === "python-fastapi"
        ? "python3 -m venv .venv && .venv/bin/python -m pip install -e ."
        : c.template.startsWith("rust")
          ? "cargo fetch"
          : c.template.startsWith("go")
            ? "go mod download"
            : undefined
    c.files[".devcontainer/devcontainer.json"] =
      `${JSON.stringify({ name: c.name, image, postCreateCommand }, null, 2)}\n`
  },
  renovate(c) {
    c.files["renovate.json"] = biomeJson({
      extends: ["config:recommended"],
      packageRules: [{ matchManagers: ["bun"], groupName: "Bun dependencies" }],
    })
  },
  "github-templates"(c) {
    c.files[".github/ISSUE_TEMPLATE/bug.md"] = "# Bug report\n\n## Reproduction\n\n## Expected\n"
  },
  "stale-bot"(c) {
    c.files[".github/workflows/stale.yml"] =
      "name: Stale\non:\n  schedule:\n    - cron: '0 0 * * 0'\npermissions:\n  issues: write\n  pull-requests: write\njobs:\n  stale:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/stale@1e223db275d687790206a7acac4d1a11bd6fe629 # v10\n"
  },
  changesets(c) {
    c.dev["@changesets/cli"] = "^3.0.0"
    c.dev["@changesets/changelog-git"] = "^0.2.0"
    c.scripts.changeset = "bun x changeset"
    c.files[".changeset/config.json"] = `${JSON.stringify(
      {
        $schema: "https://unpkg.com/@changesets/config@2.3.0/schema.json",
        changelog: "@changesets/changelog-git",
        commit: false,
        fixed: [],
        linked: [],
        access: "restricted",
        baseBranch: "main",
        updateInternalDependencies: "patch",
        ignore: [],
      },
      null,
      2,
    )}\n`
  },
  vitest(c) {
    c.dev.vitest = "^4.1.12"
    c.scripts.test = "bun x vitest run"
  },
  playwright(c) {
    c.dev["@playwright/test"] = "^1.0.0"
    c.scripts.e2e = "bun x playwright test"
    const appDir = ["monorepo", "next-monorepo"].includes(c.template) ? "apps/web" : "."
    const next = ["next", "next-monorepo"].includes(c.template)
    const web = ["vite-react", "next", "monorepo", "next-monorepo"].includes(c.template)
    if (web) {
      const command = next
        ? "bun x next dev --hostname 127.0.0.1 --port 4173"
        : "bun x vite --host 127.0.0.1 --port 4173 --strictPort"
      c.files["playwright.config.ts"] =
        `import { defineConfig } from "@playwright/test"\nexport default defineConfig({\n  testMatch: "**/e2e.ts",\n  webServer: {\n    command: "${command}",\n    cwd: "${appDir}",\n    url: "http://127.0.0.1:4173",\n    reuseExistingServer: false,\n    timeout: 60_000,\n  },\n})\n`
      c.files["_tests_/e2e.ts"] =
        `import { expect, test } from "@playwright/test"\n\ntest("serves the generated page", async ({ request }) => {\n  const response = await request.get("http://127.0.0.1:4173/")\n  expect(response.ok()).toBe(true)\n  expect(await response.text()).toContain("${c.name}")\n})\n`
    } else {
      c.files["playwright.config.ts"] =
        'import { defineConfig } from "@playwright/test"\nexport default defineConfig({ testMatch: "**/e2e.ts" })\n'
      c.files["_tests_/e2e.ts"] =
        'import { spawnSync } from "node:child_process"\nimport { expect, test } from "@playwright/test"\n\ntest("builds the generated package", () => {\n  expect(spawnSync("bun", ["run", "build"], { stdio: "inherit" }).status).toBe(0)\n})\n'
    }
  },
  coverage(c) {
    c.dev["@vitest/coverage-v8"] = "^4.1.12"
    c.dev.vitest ??= "^4.1.12"
    c.scripts.coverage = "bun x vitest run --coverage"
  },
  cspell(c) {
    c.dev.cspell = "^8.0.0"
    c.scripts.spell = "bun x cspell ."
    c.files["cspell.json"] = `${JSON.stringify(
      {
        version: "0.2",
        ignorePaths: [
          "**/node_modules/**",
          "**/coverage/**",
          "**/dist/**",
          "**/out/**",
          "**/.next/**",
          "**/.turbo/**",
          "bun.lock",
        ],
        words: [
          ...new Set([
            ...featureNames,
            ...c.name.split("-"),
            "bun",
            "tsx",
            "tsconfig",
            "monorepo",
            "uvicorn",
            "golang",
            "nextjs",
          ]),
        ],
      },
      null,
      2,
    )}\n`
  },
  knip(c) {
    c.dev.knip = "^5.0.0"
    c.scripts.knip = "bun x knip"
    c.files["knip.jsonc"] = biomeJson({
      ignore: c.features.includes("coverage") ? ["coverage/**"] : [],
      ignoreDependencies: [
        ...(c.features.includes("coverage") ? ["@vitest/coverage-v8"] : []),
        ...(c.features.includes("husky") ? ["husky"] : []),
      ],
    })
  },
  publint(c) {
    c.dev.publint = "^0.3.0"
    c.scripts.publint = "bun run build && bun x publint"
  },
  "size-limit"(c) {
    c.dev["size-limit"] = "^11.0.0"
    c.dev["@size-limit/preset-small-lib"] = "^11.0.0"
    c.scripts.size = "bun run build && bun x size-limit"
    c.packageFields["size-limit"] = [{ path: "dist/index.js", limit: "10 kB" }]
  },
  husky(c) {
    c.dev.husky = "^9.0.0"
    c.files[".husky/pre-commit"] = "bun run check\n"
    c.files["scripts/install_husky.ts"] =
      [
        'import { spawnSync } from "node:child_process"',
        'import { existsSync, lstatSync } from "node:fs"',
        'import { resolve } from "node:path"',
        "",
        'const git = (args: string[]) => spawnSync("git", args, { encoding: "utf8" })',
        'const path = git(["rev-parse", "--git-path", "hooks"])',
        'if (path.status !== 0) throw new Error("Git リポジトリが必要です")',
        'const current = git(["config", "--get", "core.hooksPath"]).stdout.trim()',
        'if (current && current !== ".husky/_") throw new Error(`既存の hooksPath を保持します: ${current}`)',
        "if (!current) {",
        '  for (const name of ["pre-commit", "commit-msg"]) {',
        "    const target = resolve(path.stdout.trim(), name)",
        "    if (existsSync(target) || lstatSync(target, { throwIfNoEntry: false }))",
        "      throw new Error(`既存の Git フックを上書きしません: ${name}`)",
        "  }",
        "}",
        "if (!current) {",
        '  const result = spawnSync("bun", ["x", "husky"], { stdio: "inherit" })',
        "  if (result.status !== 0) process.exit(result.status ?? 1)",
        "}",
      ].join("\n") + "\n"
    c.scripts["husky:install"] = "bun scripts/install_husky.ts"
  },
  commitlint(c) {
    c.dev["@commitlint/cli"] = "^19.0.0"
    c.dev["@commitlint/config-conventional"] = "^19.0.0"
    c.files["commitlint.config.mjs"] =
      'export default { extends: ["@commitlint/config-conventional"] }\n'
    c.scripts["lint:commit"] = "bun x commitlint --edit"
  },
  determinism(c) {
    c.scripts["install:ci"] = "bun install --frozen-lockfile"
  },
  termux(c) {
    c.scripts["env:termux"] =
      "bun -e \"console.log(Boolean(process.env.PREFIX?.includes('com.termux')))\""
  },
}
/**
 * husky の pre-commit が呼ぶ `check` を、生成後に実在する script だけで組む。
 * 無い script を呼ぶフックは commit のたびに失敗するので、ここで存在を確認する。
 */
function addCheckScript(c: FeatureContext): void {
  if (!c.scripts["husky:install"]) return
  const base = scaffold(c.template, c.name).scripts ?? {}
  const gates = ["build", "test", "spell", "knip"].filter((name) => base[name] || c.scripts[name])
  c.scripts.check = gates.map((name) => `bun run ${name}`).join(" && ")
}
/** vitest / coverage を選んだときの、生成物の名前を確認するテスト。 */
function addTestFiles(c: FeatureContext): void {
  if (!(c.js && (c.features.includes("vitest") || c.features.includes("coverage")))) return
  if (c.template === "plain-ts" || c.template === "plain-js") {
    const ext = c.template === "plain-ts" ? "ts" : "js"
    c.files[`src/index.test.${ext}`] =
      `import { expect, test } from "vitest"\nimport { name } from "./index"\n\ntest("generated package name", () => expect(name).toBe("${c.name}"))\n`
    return
  }
  const source =
    c.template === "next"
      ? "app/page"
      : c.template === "next-monorepo"
        ? "apps/web/app/page"
        : c.template === "monorepo"
          ? "apps/web/src/main"
          : "src/main"
  c.files["_tests_/scaffold.test.ts"] =
    `import { existsSync, readFileSync } from "node:fs"\nimport { expect, test } from "vitest"\n\nconst path = ["${source}.tsx", "${source}.jsx"].find(existsSync)\ntest("generated project name is present", () => {\n  if (!path) throw new Error("Entry file is missing")\n  expect(readFileSync(path, "utf8")).toContain("${c.name}")\n})\n`
}
export function featureScaffold(features: Feature[], name: string, template: Template): Scaffold {
  const c: FeatureContext = {
    name,
    template,
    js: !["python", "go", "rust"].some((l) => template.startsWith(l)),
    features,
    files: {},
    dev: {},
    scripts: {},
    packageFields: {},
  }
  for (const f of features) {
    const build = featureBuilders[f]
    if (!build) continue
    if (!c.js && !universalFeatures.has(f)) continue
    build(c)
  }
  addTestFiles(c)
  addCheckScript(c)
  if (features.includes("commitlint") && features.includes("husky"))
    c.files[".husky/commit-msg"] = 'bun run lint:commit "$1"\n'
  c.files[".gitignore"] = "node_modules/\n.venv/\ntarget/\ndist/\n.next/\n.turbo/\n.setup-backup/\n"
  return { files: c.files, dev: c.dev, scripts: c.scripts, package: c.packageFields }
}
