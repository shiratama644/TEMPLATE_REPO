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
export function scaffold(template: Template, name: string): Scaffold {
  const safe = name.replace(/[^a-z0-9_]/g, "_")
  if (template === "plain-ts")
    return {
      files: { "src/index.ts": `export const name = "${name}"\n` },
      dev: { typescript: "^6.0.0" },
      scripts: { dev: "bun src/index.ts", build: "bun build src/index.ts --outdir dist" },
    }
  if (template === "plain-js")
    return {
      files: { "src/index.js": `export const name = "${name}"\n` },
      scripts: { dev: "bun src/index.js", build: "bun build src/index.js --outdir dist" },
    }
  if (template === "vite-react")
    return {
      files: {
        "index.html": `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${name}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`,
        "src/main.tsx": `import React from "react"\nimport { createRoot } from "react-dom/client"\ncreateRoot(document.getElementById("root")!).render(<h1>${name}</h1>)\n`,
        "vite.config.ts": `import { defineConfig } from "vite"\nimport react from "@vitejs/plugin-react"\nexport default defineConfig({ plugins: [react()] })\n`,
      },
      deps: { react: "^19.0.0", "react-dom": "^19.0.0" },
      dev: {
        vite: "^7.0.0",
        "@vitejs/plugin-react": "^5.0.0",
        typescript: "^6.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@types/node": "^22.0.0",
      },
      scripts: { dev: "bun x vite", build: "bun x vite build", preview: "bun x vite preview" },
    }
  if (template === "next")
    return {
      files: {
        "app/layout.tsx": `export const metadata = { title: "${name}" }\nexport default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html> }\n`,
        "app/page.tsx": `export default function Page() { return <main><h1>${name}</h1></main> }\n`,
        "next.config.ts":
          'import type { NextConfig } from "next"\nconst config: NextConfig = {}\nexport default config\n',
      },
      deps: { next: "^16.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
      dev: {
        typescript: "^6.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@types/node": "^22.0.0",
      },
      scripts: { dev: "bun x next dev", build: "bun x next build", start: "bun x next start" },
    }
  if (template === "monorepo" || template === "next-monorepo") {
    const nested =
      template === "next-monorepo" ? scaffold("next", name) : scaffold("vite-react", name)
    return {
      files: {
        "turbo.json":
          JSON.stringify(
            {
              tasks: {
                build: { dependsOn: ["^build"], outputs: ["dist/**", ".next/**"] },
                dev: { cache: false, persistent: true },
                test: {},
              },
            },
            null,
            2,
          ) + "\n",
        "apps/web/package.json":
          JSON.stringify(
            {
              name: `${safe}-web`,
              private: true,
              scripts: nested.scripts,
              dependencies: nested.deps,
              devDependencies: nested.dev,
            },
            null,
            2,
          ) + "\n",
        ...Object.fromEntries(Object.entries(nested.files).map(([p, v]) => [`apps/web/${p}`, v])),
        "packages/shared/package.json":
          JSON.stringify({ name: `@${safe}/shared`, private: true }, null, 2) + "\n",
        "packages/shared/src/index.ts": "export const shared = true\n",
      },
      dev: { turbo: "^2.0.0" },
      scripts: { dev: "bun x turbo dev", build: "bun x turbo build" },
    }
  }
  if (template === "python-cli" || template === "python-fastapi")
    return {
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
    }
  if (template === "go-cli" || template === "go-http")
    return {
      files: {
        "go.mod": `module example.com/${name}\n\ngo 1.22\n`,
        "main.go":
          template === "go-cli"
            ? `package main\nimport "fmt"\nfunc main() { fmt.Println("Hello from ${name}") }\n`
            : 'package main\nimport ("fmt"; "net/http")\nfunc main() { http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { fmt.Fprintln(w,"Hello") }); http.ListenAndServe(":8080",nil) }\n',
      },
      requires: ["go"],
      scripts: { start: "go run ." },
    }
  if (template === "rust-cli" || template === "rust-axum")
    return {
      files: {
        "Cargo.toml": `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2021"\n${template === "rust-axum" ? '[dependencies]\naxum = "0.8"\ntokio = { version = "1", features = ["full"] }\n' : ""}`,
        "src/main.rs":
          template === "rust-cli"
            ? `fn main() { println!("Hello from ${name}"); }\n`
            : '#[tokio::main]\nasync fn main() { let app = axum::Router::new().route("/", axum::routing::get(|| async { "Hello" })); let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap(); axum::serve(listener, app).await.unwrap(); }\n',
      },
      requires: ["cargo"],
      scripts: { start: "cargo run" },
    }
  throw new Error(`未対応のテンプレート: ${template}`)
}
export function featureScaffold(features: Feature[], name: string, template: Template): Scaffold {
  const files: Record<string, string> = {}
  const dev: Record<string, string> = {}
  const scripts: Record<string, string> = {}
  const js = !["python", "go", "rust"].some((l) => template.startsWith(l))
  const packageFields: Record<string, unknown> = {}
  for (const f of features) {
    if (f === "docker") {
      const image = template.startsWith("python")
        ? "python:3.12-slim"
        : template.startsWith("go")
          ? "golang:1.23"
          : template.startsWith("rust")
            ? "rust:1"
            : "oven/bun:1"
      const command =
        template === "python-fastapi"
          ? '["python3", "-m", "uvicorn", "app:app", "--host", "0.0.0.0"]'
          : template === "python-cli"
            ? '["python3", "main.py"]'
            : template.startsWith("go")
              ? '["go", "run", "."]'
              : template.startsWith("rust")
                ? '["cargo", "run"]'
                : '["bun", "run", "dev"]'
      const install =
        template === "python-fastapi"
          ? "RUN pip install .\n"
          : template.startsWith("rust")
            ? "RUN cargo fetch\n"
            : template.startsWith("go")
              ? "RUN go mod download\n"
              : "RUN bun install\n"
      files.Dockerfile = `FROM ${image}\nWORKDIR /app\nCOPY . .\n${install}CMD ${command}\n`
      files[".dockerignore"] = ".git\nnode_modules\n.venv\ntarget\ndist\n.next\n.setup-backup\n"
    }
    if (f === "devcontainer") {
      const image = template.startsWith("python")
        ? "python:3.12"
        : template.startsWith("go")
          ? "golang:1.23"
          : template.startsWith("rust")
            ? "rust:1"
            : "oven/bun:1"
      const postCreateCommand = js
        ? "bun install"
        : template === "python-fastapi"
          ? "python3 -m venv .venv && .venv/bin/python -m pip install -e ."
          : template === "rust-axum"
            ? "cargo fetch"
            : undefined
      files[".devcontainer/devcontainer.json"] =
        JSON.stringify({ name, image, postCreateCommand }, null, 2) + "\n"
    }
    if (f === "renovate")
      files["renovate.json"] =
        JSON.stringify(
          {
            extends: ["config:recommended"],
            packageRules: [{ matchManagers: ["bun"], groupName: "Bun dependencies" }],
          },
          null,
          2,
        ) + "\n"
    if (f === "github-templates")
      files[".github/ISSUE_TEMPLATE/bug.md"] = "# Bug report\n\n## Reproduction\n\n## Expected\n"
    if (f === "stale-bot")
      files[".github/workflows/stale.yml"] =
        "name: Stale\non:\n  schedule:\n    - cron: '0 0 * * 0'\npermissions:\n  issues: write\n  pull-requests: write\njobs:\n  stale:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/stale@v10\n"
    if (!js && f === "changesets") continue
    if (f === "changesets") {
      dev["@changesets/cli"] = "^3.0.0"
      dev["@changesets/changelog-git"] = "^0.2.0"
      scripts.changeset = "bun x changeset"
      files[".changeset/config.json"] =
        JSON.stringify(
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
        ) + "\n"
    }
    if (!js) continue
    if (f === "vitest") {
      dev.vitest = "^3.0.0"
      scripts.test = "bun x vitest run"
    }
    if (f === "playwright") {
      dev["@playwright/test"] = "^1.0.0"
      scripts.e2e = "bun x playwright test"
      const appDir = ["monorepo", "next-monorepo"].includes(template) ? "apps/web" : "."
      const next = ["next", "next-monorepo"].includes(template)
      const web = ["vite-react", "next", "monorepo", "next-monorepo"].includes(template)
      if (web) {
        const command = next
          ? "bun x next dev --hostname 127.0.0.1 --port 4173"
          : "bun x vite --host 127.0.0.1 --port 4173 --strictPort"
        files["playwright.config.ts"] =
          `import { defineConfig } from "@playwright/test"\nexport default defineConfig({ testMatch: "**/e2e.ts", webServer: { command: "${command}", cwd: "${appDir}", url: "http://127.0.0.1:4173", reuseExistingServer: false, timeout: 60_000 } })\n`
        files["tests/e2e.ts"] =
          `import { test, expect } from "@playwright/test"\ntest("serves the generated page", async ({ request }) => { const response = await request.get("http://127.0.0.1:4173/"); expect(response.ok()).toBe(true); expect(await response.text()).toContain("${name}") })\n`
      } else {
        files["playwright.config.ts"] =
          'import { defineConfig } from "@playwright/test"\nexport default defineConfig({ testMatch: "**/e2e.ts" })\n'
        files["tests/e2e.ts"] =
          'import { test, expect } from "@playwright/test"\nimport { spawnSync } from "node:child_process"\ntest("builds the generated package", () => { expect(spawnSync("bun", ["run", "build"], { stdio: "inherit" }).status).toBe(0) })\n'
      }
    }
    if (f === "coverage") {
      dev["@vitest/coverage-v8"] = "^3.0.0"
      dev.vitest ??= "^3.0.0"
      scripts.coverage = "bun x vitest run --coverage"
    }
    if (f === "cspell") {
      dev.cspell = "^8.0.0"
      scripts.spell = "bun x cspell ."
      files["cspell.json"] =
        JSON.stringify(
          {
            version: "0.2",
            ignorePaths: [
              "node_modules/**",
              "coverage/**",
              "dist/**",
              ".next/**",
              ".turbo/**",
              "bun.lock",
            ],
            words: [
              ...new Set([
                ...featureNames,
                ...name.split("-"),
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
        ) + "\n"
    }
    if (f === "knip") {
      dev.knip = "^5.0.0"
      scripts.knip = "bun x knip"
      files["knip.jsonc"] =
        JSON.stringify(
          {
            ignore: features.includes("coverage") ? ["coverage/**"] : [],
            ignoreDependencies: [
              ...(features.includes("coverage") ? ["@vitest/coverage-v8"] : []),
              ...(features.includes("husky") ? ["husky"] : []),
            ],
          },
          null,
          2,
        ) + "\n"
    }
    if (f === "publint") {
      dev.publint = "^0.3.0"
      scripts.publint = "bun run build && bun x publint"
    }
    if (f === "size-limit") {
      dev["size-limit"] = "^11.0.0"
      dev["@size-limit/preset-small-lib"] = "^11.0.0"
      scripts.size = "bun run build && bun x size-limit"
      packageFields["size-limit"] = [{ path: "dist/index.js", limit: "10 kB" }]
    }
    if (f === "husky") {
      dev.husky = "^9.0.0"
      files[".husky/pre-commit"] = "bun run check\n"
      files["scripts/install_husky.ts"] =
        [
          'import { spawnSync } from "node:child_process"',
          'import { existsSync, lstatSync } from "node:fs"',
          'import { resolve } from "node:path"',
          'const git = (args: string[]) => spawnSync("git", args, { encoding: "utf8" })',
          'const path = git(["rev-parse", "--git-path", "hooks"])',
          'if (path.status !== 0) throw new Error("Git リポジトリが必要です")',
          'const current = git(["config", "--get", "core.hooksPath"]).stdout.trim()',
          'if (current && current !== ".husky/_") throw new Error(`既存の hooksPath を保持します: ${current}`)',
          'if (!current) for (const name of ["pre-commit", "commit-msg"]) {',
          "  const target = resolve(path.stdout.trim(), name)",
          "  if (existsSync(target) || lstatSync(target, { throwIfNoEntry: false }))",
          "    throw new Error(`既存の Git フックを上書きしません: ${name}`)",
          "}",
          "if (!current) {",
          '  const result = spawnSync("bun", ["x", "husky"], { stdio: "inherit" })',
          "  if (result.status !== 0) process.exit(result.status ?? 1)",
          "}",
        ].join("\n") + "\n"
      scripts["husky:install"] = "bun scripts/install_husky.ts"
    }
    if (f === "commitlint") {
      dev["@commitlint/cli"] = "^19.0.0"
      dev["@commitlint/config-conventional"] = "^19.0.0"
      files["commitlint.config.mjs"] =
        "export default { extends: ['@commitlint/config-conventional'] }\n"
      scripts["lint:commit"] = "bun x commitlint --edit"
    }
    if (f === "determinism") scripts["install:ci"] = "bun install --frozen-lockfile"
    if (f === "termux")
      scripts["env:termux"] =
        "bun -e \"console.log(Boolean(process.env.PREFIX?.includes('com.termux')))\""
  }
  if (js && (features.includes("vitest") || features.includes("coverage"))) {
    if (template === "plain-ts" || template === "plain-js") {
      const ext = template === "plain-ts" ? "ts" : "js"
      files[`src/index.test.${ext}`] =
        `import { expect, test } from "vitest"\nimport { name } from "./index"\ntest("generated package name", () => expect(name).toBe("${name}"))\n`
    } else {
      const source =
        template === "next"
          ? "app/page"
          : template === "next-monorepo"
            ? "apps/web/app/page"
            : template === "monorepo"
              ? "apps/web/src/main"
              : "src/main"
      files["tests/scaffold.test.ts"] =
        `import { expect, test } from "vitest"\nimport { existsSync, readFileSync } from "node:fs"\nconst path = ["${source}.tsx", "${source}.jsx"].find(existsSync)\ntest("generated project name is present", () => { if (!path) throw new Error("Entry file is missing"); expect(readFileSync(path, "utf8")).toContain("${name}") })\n`
    }
  }
  if (features.includes("commitlint") && features.includes("husky"))
    files[".husky/commit-msg"] = 'bun run lint:commit "$1"\n'
  files[".gitignore"] = "node_modules/\n.venv/\ntarget/\ndist/\n.next/\n.turbo/\n.setup-backup/\n"
  return { files, dev, scripts, package: packageFields }
}
