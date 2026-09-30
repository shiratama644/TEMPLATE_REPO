/**
 * README Generator — 選択された構成のみを説明するシンプルなドキュメントに再生成
 * Improved with badges, better structure, preset info
 */

import { FEATURES, PROJECT_TYPES } from "./manifest.ts"
import { PRESETS } from "./presets.ts"
import type { SetupAnswers } from "./types.ts"

export function generateReadme(answers: SetupAnswers): string {
  const projectType = PROJECT_TYPES[answers.projectType]
  const enabledFeatures = Object.entries(answers.features)
    .filter(([, enabled]) => enabled)
    .map(([id]) => FEATURES[id as keyof typeof FEATURES])
    .filter(Boolean)

  const devInfra = enabledFeatures.filter((f) => f.group === "dev-infra")
  const testing = enabledFeatures.filter((f) => f.group === "testing-quality")
  const git = enabledFeatures.filter((f) => f.group === "git-workflow")
  const release = enabledFeatures.filter((f) => f.group === "release")

  const lines: string[] = []
  lines.push(`# ${answers.projectName}`)
  lines.push("")
  if (answers.projectDescription) {
    lines.push(answers.projectDescription)
    lines.push("")
  }

  if (answers.githubOwner && answers.githubOwner !== "your-github-username") {
    lines.push(
      `[![CI](https://github.com/${answers.githubOwner}/${answers.projectName}/actions/workflows/ci.yml/badge.svg)](https://github.com/${answers.githubOwner}/${answers.projectName}/actions/workflows/ci.yml)`,
    )
    if (answers.features["size-limit"] || answers.features.publint) {
      lines.push(
        `[![npm version](https://badge.fury.io/js/${answers.projectName}.svg)](https://badge.fury.io/js/${answers.projectName})`,
      )
    }
    lines.push("")
  }

  lines.push(
    `> Generated with Template Bootstrap — Project type: **${projectType.icon || ""} ${projectType.name}**${answers.preset ? ` (preset: ${answers.preset})` : ""}`,
  )
  lines.push("")

  if (answers.preset) {
    const preset = PRESETS[answers.preset]
    if (preset) {
      lines.push(`> Preset: **${preset.icon || ""} ${preset.name}** — ${preset.description}`)
      lines.push("")
    }
  }

  lines.push("## Stack")
  lines.push("")
  lines.push(
    `- **Project Type**: ${projectType.icon || ""} ${projectType.name} — ${projectType.description}`,
  )
  if (answers.termuxMode !== "no" && answers.features.termux) {
    lines.push(
      `- **Termux**: ${answers.termuxMode} mode ${answers.termuxMode === "yes" ? "(always enabled)" : answers.termuxMode === "auto" ? "(auto-detect)" : ""}`,
    )
  }
  lines.push(`- **Package Manager**: pnpm 12.6.0`)
  lines.push(`- **Node**: >=24.0.0`)
  lines.push("")

  lines.push("## Features")
  lines.push("")
  if (devInfra.length) {
    lines.push("### Dev & Infra")
    lines.push("")
    for (const f of devInfra) {
      lines.push(`- ${f.icon || ""} **${f.name}**: ${f.description}`)
    }
    lines.push("")
  }
  if (testing.length) {
    lines.push("### Testing & Quality")
    lines.push("")
    for (const f of testing) {
      lines.push(`- ${f.icon || ""} **${f.name}**: ${f.description}`)
    }
    lines.push("")
  }
  if (git.length) {
    lines.push("### Git & Workflow")
    lines.push("")
    for (const f of git) {
      lines.push(`- ${f.icon || ""} **${f.name}**: ${f.description}`)
    }
    lines.push("")
  }
  if (release.length) {
    lines.push("### Release")
    lines.push("")
    for (const f of release) {
      lines.push(`- ${f.icon || ""} **${f.name}**: ${f.description}`)
    }
    lines.push("")
  }

  if (!devInfra.length && !testing.length && !git.length && !release.length) {
    lines.push("Minimal setup — no optional features enabled.")
    lines.push("")
    lines.push("Run `pnpm setup` to add features.")
    lines.push("")
  }

  lines.push("## Development")
  lines.push("")
  lines.push("```bash")
  lines.push("pnpm install")
  lines.push("pnpm dev      # auto-detects framework (Vite/Next/Turbo)")
  lines.push("pnpm build    # auto-detects framework")
  lines.push("pnpm check    # quality gates (typecheck, lint, tests, etc)")
  lines.push("```")
  lines.push("")

  lines.push("### Available Scripts")
  lines.push("")
  lines.push("| Script | Description |")
  lines.push("|---|---|")
  lines.push("| `pnpm dev` | Start dev server (auto-detects Vite/Next/Turbo) |")
  lines.push("| `pnpm build` | Build (auto-detects) |")
  lines.push("| `pnpm typecheck` | TypeScript check |")
  lines.push("| `pnpm lint` | Biome lint |")
  lines.push("| `pnpm lint:fix` | Biome lint + auto-fix |")
  if (answers.features.vitest) {
    lines.push("| `pnpm test` / `test:unit` | Vitest unit tests |")
  }
  if (answers.features.coverage) {
    lines.push("| `pnpm test:coverage` | Coverage (85% threshold) |")
  }
  if (answers.features.playwright) {
    lines.push("| `pnpm test:e2e` | Playwright E2E |")
  }
  if (answers.features.cspell) {
    lines.push("| `pnpm cspell` | Spell check |")
  }
  if (answers.features.knip) {
    lines.push("| `pnpm knip` | Unused code detection |")
  }
  if (answers.features.determinism) {
    lines.push("| `pnpm check:determinism` | Determinism guard |")
  }
  lines.push("| `pnpm check` | All quality gates (install → parallel checks) |")
  lines.push("| `pnpm check:env` | Environment check (Termux detection, cache stats) |")
  if (answers.features.docker) {
    lines.push("| `pnpm docker:build` | Docker build |")
    lines.push("| `pnpm docker:run` | Docker run |")
    lines.push("| `pnpm docker:compose` | Docker compose up |")
  }
  if (answers.features.changesets) {
    lines.push("| `pnpm changeset` | Create changeset |")
    lines.push("| `pnpm changeset:version` | Version packages |")
    lines.push("| `pnpm changeset:publish` | Publish |")
  }
  if (answers.features["size-limit"]) {
    lines.push("| `pnpm size` | Bundle size check |")
  }
  lines.push("| `pnpm setup` | Re-run bootstrap (idempotent) |")
  lines.push("")

  if (answers.projectType === "vite") {
    lines.push("### Vite")
    lines.push("")
    lines.push("- Config: `vite.config.ts` (from `docs/examples/vite.config.example.ts`)")
    lines.push("- Entry: `index.html` → `src/main.ts` → `src/index.ts`")
    lines.push("- Dev: `pnpm dev` → Vite dev server on http://localhost:5173")
    lines.push("- Build: `pnpm build` → `dist/`")
    lines.push("- Preview: `pnpm preview` → preview production build")
    lines.push("")
  } else if (answers.projectType === "next") {
    lines.push("### Next.js")
    lines.push("")
    lines.push("- Config: `next.config.mjs` (from `docs/examples/next.config.example.mjs`)")
    lines.push("- App Router: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`")
    lines.push("- Dev: `pnpm dev` → Next dev server on http://localhost:3000")
    lines.push("- Build: `pnpm build` → `.next/`")
    lines.push("- Start: `pnpm start:next` → production server")
    if (answers.features.termux) {
      lines.push(
        `- Termux: ${answers.termuxMode === "auto" ? "Auto-detects Termux and forces Webpack (`--webpack`)" : answers.termuxMode === "yes" ? "Always forces Webpack for Termux stability" : "Disabled"}`,
      )
    }
    lines.push("")
  } else if (answers.projectType === "monorepo" || answers.projectType === "next-monorepo") {
    lines.push("### Monorepo")
    lines.push("")
    lines.push("- Workspace: `pnpm-workspace.yaml` with `packages/*` and `apps/*`")
    lines.push("- Turbo: `turbo.json` for task orchestration")
    lines.push("- Dev: `pnpm dev` → `turbo dev` or `pnpm -r --parallel dev`")
    lines.push("- Build: `pnpm build` → `turbo build`")
    lines.push("- Check: `pnpm check:turbo` → `turbo run check`")
    if (answers.projectType === "next-monorepo") {
      lines.push("- Example apps: `apps/web` (Next.js on 3000), `packages/ui` (shared)")
    } else {
      lines.push("- Example: `apps/web` (Vite on 3000), `packages/ui` (shared)")
    }
    lines.push("")
  } else {
    lines.push("### Plain TypeScript")
    lines.push("")
    lines.push("- Entry: `src/index.ts`")
    lines.push("- Build: `tsc` (no output for template, add your build)")
    lines.push("- Dev: `pnpm dev:watch` → watch mode")
    lines.push("")
  }

  lines.push("## Project Structure")
  lines.push("")
  lines.push("```")
  lines.push("src/           # Source code (protected, never deleted by setup)")
  lines.push("scripts/       # Build/dev/check scripts (generic, framework-agnostic)")
  if (answers.features.vitest) {
    lines.push("_tests_/       # Tests (same structure as src/)")
  }
  if (answers.features.docker) {
    lines.push("Dockerfile     # Docker multi-stage (Node 24)")
    lines.push("docker-compose.yml")
  }
  if (answers.features.devcontainer) {
    lines.push(".devcontainer/ # Dev Container (VSCode + Codespaces)")
  }
  if (answers.projectType !== "plain") {
    if (answers.projectType === "vite") {
      lines.push("vite.config.ts # Vite config (Termux-aware, cached)")
      lines.push("index.html     # Vite entry")
    }
    if (answers.projectType === "next") {
      lines.push("next.config.mjs # Next.js config (Termux Webpack fallback)")
      lines.push("app/           # Next.js App Router")
    }
    if (answers.projectType.includes("monorepo")) {
      lines.push("pnpm-workspace.yaml")
      lines.push("turbo.json")
      lines.push("packages/      # Shared packages")
      lines.push("  ui/          # @repo/ui example")
      lines.push("apps/          # Apps")
      lines.push("  web/         # web app example")
    }
  }
  if (answers.features.husky) {
    lines.push(".husky/        # Git hooks (pre-commit: lint + cspell)")
  }
  lines.push(".github/")
  lines.push("  workflows/   # CI, release, label, stale")
  lines.push("  ISSUE_TEMPLATE/")
  lines.push("docs/          # task-list, planning, complete")
  lines.push("```")
  lines.push("")

  lines.push("## Quality Gates")
  lines.push("")
  lines.push("`pnpm check` runs:")
  lines.push("")
  const checks: string[] = []
  checks.push("- `install` — pnpm install --frozen-lockfile (sequential first)")
  checks.push("- `lint` — Biome")
  if (answers.features.determinism) checks.push("- `check:determinism` — forbidden API detection")
  if (answers.features.cspell) checks.push("- `cspell` — spell check")
  if (answers.features.knip) checks.push("- `knip` — unused code")
  if (answers.features.publint) checks.push("- `publint` — package quality")
  if (answers.features["size-limit"]) checks.push("- `size-limit` — bundle size")
  checks.push("- `typecheck` — tsc --noEmit")
  if (answers.features.vitest) checks.push("- `test:unit` — Vitest")
  if (answers.features.coverage) checks.push("- `test:coverage` — 85% threshold")
  checks.push("- `build` — auto-detects framework")
  if (answers.features.playwright) checks.push("- `test:e2e:list` — Playwright --list")
  for (const c of checks) lines.push(c)
  lines.push("")
  lines.push(
    "All tasks run install first, then 11 in parallel (fast-first, setsid, abort on fail).",
  )
  lines.push("")

  lines.push("## Setup")
  lines.push("")
  lines.push("This project was bootstrapped with `pnpm setup`.")
  lines.push("")
  lines.push("To re-run setup (idempotent, safe, with backup):")
  lines.push("")
  lines.push("```bash")
  lines.push("pnpm setup              # interactive with preset selection")
  lines.push("pnpm setup --dry-run    # preview changes (+ create, ~ update, - delete, = keep)")
  lines.push("pnpm setup --yes        # use defaults, skip prompts")
  lines.push("pnpm setup --minimal    # minimal preset (plain TS + vitest)")
  lines.push("pnpm setup --preset vite-app --project-name my-vite-app  # use preset via CLI")
  lines.push("pnpm setup --list-presets  # list available presets")
  lines.push("```")
  lines.push("")
  lines.push("### CLI Options")
  lines.push("")
  lines.push("```")
  lines.push("Options:")
  lines.push("  --dry-run              Preview changes without applying")
  lines.push("  --yes, -y              Use defaults, skip prompts")
  lines.push("  --defaults             Same as --yes")
  lines.push("  --minimal              Minimal preset (plain TS + vitest only)")
  lines.push(
    "  --preset <id>          Use preset: minimal, recommended, full, library, vite-app, next-app, monorepo",
  )
  lines.push("  --list-presets         List available presets")
  lines.push("  --project-name <name>  Project name (e.g. my-app)")
  lines.push("  --type <type>          Project type: plain, vite, next, monorepo, next-monorepo")
  lines.push("  --features <list>      Comma-separated features (e.g. docker,devcontainer,vitest)")
  lines.push("  --termux-mode <mode>   Termux mode: auto, yes, no")
  lines.push("  --github-owner <owner> GitHub owner/username")
  lines.push("  --description <desc>   Project description")
  lines.push("  --config <path>        Load config from JSON file")
  lines.push("  --save-config <path>   Save answers to JSON file")
  lines.push("  --force                Bypass git status check and safety guards")
  lines.push("  --no-install           Skip pnpm install verification")
  lines.push("  --no-verify            Skip typecheck/lint verification")
  lines.push("  --no-backup            Skip backup creation")
  lines.push("  --verbose, -v          Verbose output")
  lines.push("  --help, -h             Show help")
  lines.push("  --version              Show version")
  lines.push("```")
  lines.push("")

  if (answers.features.docker) {
    lines.push("### Docker")
    lines.push("")
    lines.push("```bash")
    lines.push("pnpm docker:build    # build image")
    lines.push("pnpm docker:run      # run container on 3000")
    lines.push("pnpm docker:compose # compose up with volume cache")
    lines.push("```")
    lines.push("")
  }

  lines.push("## License")
  lines.push("")
  lines.push("MIT")
  lines.push("")

  return lines.join("\n")
}
