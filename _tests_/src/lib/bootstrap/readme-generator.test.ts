import { describe, expect, it } from "vitest"
import { generateReadme } from "../../../../scripts/lib/bootstrap/readme-generator.ts"
import type { SetupAnswers } from "../../../../scripts/lib/bootstrap/types.ts"

function makeAnswers(overrides: Partial<SetupAnswers> = {}): SetupAnswers {
  return {
    projectName: "my-app",
    projectDescription: "My awesome project",
    githubOwner: "testuser",
    projectType: "plain",
    features: {
      docker: true,
      devcontainer: false,
      termux: true,
      vitest: true,
      playwright: false,
      coverage: true,
      cspell: true,
      knip: true,
      publint: true,
      "size-limit": true,
      determinism: true,
      husky: true,
      commitlint: true,
      "github-templates": true,
      renovate: true,
      "stale-bot": false,
      changesets: true,
    } as any,
    termuxMode: "auto",
    preset: "full",
    ...overrides,
  }
}

describe("readme-generator", () => {
  it("generates readme with project name and description", () => {
    const readme = generateReadme(makeAnswers())
    expect(readme).toContain("# my-app")
    expect(readme).toContain("My awesome project")
    expect(readme).toContain("Generated with Template Bootstrap")
  })

  it("includes badges when github owner is custom", () => {
    const readme = generateReadme(makeAnswers({ githubOwner: "myuser" }))
    expect(readme).toContain("badge.svg")
    expect(readme).toContain("myuser/my-app")
  })

  it("no badges when owner is default", () => {
    const readme = generateReadme(makeAnswers({ githubOwner: "your-github-username" }))
    expect(readme).not.toContain("badge.svg")
  })

  it("includes preset info when preset set", () => {
    const readme = generateReadme(makeAnswers({ preset: "full" }))
    expect(readme).toContain("preset: full")
    expect(readme).toContain("Preset:")
  })

  it("handles minimal preset with no features", () => {
    const readme = generateReadme(
      makeAnswers({
        preset: "minimal",
        features: {
          docker: false,
          devcontainer: false,
          termux: false,
          vitest: false,
          playwright: false,
          coverage: false,
          cspell: false,
          knip: false,
          publint: false,
          "size-limit": false,
          determinism: false,
          husky: false,
          commitlint: false,
          "github-templates": false,
          renovate: false,
          "stale-bot": false,
          changesets: false,
        } as any,
      }),
    )
    expect(readme).toContain("Minimal setup")
  })

  it("handles vite project type", () => {
    const readme = generateReadme(makeAnswers({ projectType: "vite", preset: "vite-app" as any }))
    expect(readme).toContain("Vite")
    expect(readme).toContain("vite.config.ts")
  })

  it("handles next project type with termux auto", () => {
    const readme = generateReadme(
      makeAnswers({
        projectType: "next",
        preset: "next-app" as any,
        termuxMode: "auto",
        features: { termux: true, vitest: true } as any,
      }),
    )
    expect(readme).toContain("Next.js")
    expect(readme).toContain("next.config.mjs")
  })

  it("handles next termux yes", () => {
    const readme = generateReadme(
      makeAnswers({
        projectType: "next",
        termuxMode: "yes",
        features: { termux: true } as any,
      }),
    )
    expect(readme).toContain("Next.js")
  })

  it("handles next termux no", () => {
    const readme = generateReadme(
      makeAnswers({
        projectType: "next",
        termuxMode: "no",
        features: { termux: true } as any,
      }),
    )
    expect(readme).toContain("Next.js")
  })

  it("handles monorepo type", () => {
    const readme = generateReadme(
      makeAnswers({ projectType: "monorepo", preset: "monorepo" as any }),
    )
    expect(readme).toContain("Monorepo")
    expect(readme).toContain("pnpm-workspace.yaml")
  })

  it("handles next-monorepo type", () => {
    const readme = generateReadme(makeAnswers({ projectType: "next-monorepo" as any }))
    expect(readme).toContain("Monorepo")
  })

  it("handles plain type", () => {
    const readme = generateReadme(makeAnswers({ projectType: "plain" }))
    expect(readme).toContain("Plain TypeScript")
  })

  it("includes all feature groups", () => {
    const readme = generateReadme(makeAnswers())
    expect(readme).toContain("Dev & Infra")
    expect(readme).toContain("Testing & Quality")
    expect(readme).toContain("Git & Workflow")
    expect(readme).toContain("Release")
  })

  it("includes scripts for enabled features", () => {
    const readme = generateReadme(makeAnswers())
    expect(readme).toContain("pnpm test")
    expect(readme).toContain("pnpm test:coverage")
    expect(readme).toContain("pnpm cspell")
    expect(readme).toContain("pnpm knip")
    expect(readme).toContain("pnpm check:determinism")
    expect(readme).toContain("pnpm size")
    expect(readme).toContain("pnpm changeset")
    expect(readme).toContain("pnpm docker:build")
  })

  it("includes quality gates", () => {
    const readme = generateReadme(makeAnswers())
    expect(readme).toContain("Quality Gates")
    expect(readme).toContain("pnpm check")
  })

  it("includes setup instructions", () => {
    const readme = generateReadme(makeAnswers())
    expect(readme).toContain("pnpm setup")
    expect(readme).toContain("--dry-run")
  })

  it("handles no description", () => {
    const readme = generateReadme(makeAnswers({ projectDescription: undefined }))
    expect(readme).toContain("# my-app")
  })

  it("handles size-limit and publint badge", () => {
    const readme = generateReadme(
      makeAnswers({
        githubOwner: "myuser",
        features: { "size-limit": true, publint: true } as any,
      }),
    )
    expect(readme).toContain("badge.fury.io")
  })

  it("handles no size-limit badge", () => {
    const readme = generateReadme(
      makeAnswers({
        githubOwner: "myuser",
        features: { "size-limit": false, publint: false } as any,
      }),
    )
    expect(readme).not.toContain("badge.fury.io")
  })

  it("handles docker features in structure", () => {
    const readme = generateReadme(
      makeAnswers({ features: { docker: true, devcontainer: true, husky: true } as any }),
    )
    expect(readme).toContain("Dockerfile")
    expect(readme).toContain(".devcontainer")
    expect(readme).toContain(".husky")
  })

  it("handles vite type without docker", () => {
    const readme = generateReadme(
      makeAnswers({
        projectType: "vite",
        features: { docker: false, devcontainer: false, husky: false } as any,
      }),
    )
    expect(readme).toContain("Vite")
  })

  it("handles playwright feature", () => {
    const readme = generateReadme(
      makeAnswers({ features: { playwright: true, vitest: true } as any }),
    )
    expect(readme).toContain("Playwright E2E")
  })

  it("handles size-limit false but publint true", () => {
    const readme = generateReadme(
      makeAnswers({
        githubOwner: "myuser",
        features: { "size-limit": false, publint: true } as any,
      }),
    )
    expect(readme).toContain("badge.fury.io")
  })

  it("handles all presets in readme", () => {
    const presets = [
      "minimal",
      "recommended",
      "full",
      "library",
      "vite-app",
      "next-app",
      "monorepo",
    ] as const
    for (const preset of presets) {
      const readme = generateReadme(makeAnswers({ preset }))
      expect(readme).toContain("Generated with Template Bootstrap")
    }
  })
})
