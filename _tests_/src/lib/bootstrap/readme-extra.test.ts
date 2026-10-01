import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("readme-generator extra coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doUnmock("../../../../scripts/lib/bootstrap/manifest.ts")
    vi.doUnmock("../../../../scripts/lib/bootstrap/presets.ts")
  })
  afterEach(() => {
    vi.doUnmock("../../../../scripts/lib/bootstrap/manifest.ts")
    vi.doUnmock("../../../../scripts/lib/bootstrap/presets.ts")
  })

  it("covers no icon branches", async () => {
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          plain: {
            id: "plain",
            name: "Plain",
            description: "plain desc",
            filesToRemove: [],
            filesToCreate: [],
          },
        },
        FEATURES: {
          docker: {
            id: "docker",
            name: "Docker",
            description: "docker",
            group: "dev-infra",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
        },
      }
    })
    vi.doMock("../../../../scripts/lib/bootstrap/presets.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/presets.ts")
      >("../../../../scripts/lib/bootstrap/presets.ts")
      return {
        ...actual,
        PRESETS: {
          minimal: {
            id: "minimal",
            name: "Minimal",
            description: "minimal desc",
            projectType: "plain",
            features: { docker: true } as any,
            termuxMode: "no",
          },
        },
      }
    })

    const mod = await import("../../../../scripts/lib/bootstrap/readme-generator.ts")
    const answers = {
      projectName: "my-app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "plain" as any,
      features: { docker: true } as any,
      termuxMode: "no" as any,
      preset: "minimal" as any,
    }
    const readme = mod.generateReadme(answers)
    expect(readme).toContain("my-app")
    expect(readme).toContain("Project Type")
  })

  it("covers termux mode branches and no preset icon", async () => {
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          plain: {
            id: "plain",
            name: "Plain",
            description: "plain desc",
            filesToRemove: [],
            filesToCreate: [],
          },
          vite: {
            id: "vite",
            name: "Vite",
            description: "vite desc",
            filesToRemove: [],
            filesToCreate: [],
          },
          next: {
            id: "next",
            name: "Next",
            description: "next desc",
            filesToRemove: [],
            filesToCreate: [],
          },
        },
        FEATURES: {
          termux: {
            id: "termux",
            name: "Termux",
            description: "termux",
            group: "dev-infra",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
          vitest: {
            id: "vitest",
            name: "Vitest",
            description: "vitest",
            group: "testing-quality",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
        },
      }
    })
    vi.doMock("../../../../scripts/lib/bootstrap/presets.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/presets.ts")
      >("../../../../scripts/lib/bootstrap/presets.ts")
      return {
        ...actual,
        PRESETS: {
          minimal: {
            id: "minimal",
            name: "Minimal",
            description: "minimal desc",
            projectType: "plain",
            features: { termux: true } as any,
            termuxMode: "no" as any,
          },
        },
      }
    })

    const mod = await import("../../../../scripts/lib/bootstrap/readme-generator.ts")
    // termux yes
    let readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "next" as any,
      features: { termux: true } as any,
      termuxMode: "yes" as any,
    })
    expect(readme).toContain("Termux")

    // termux auto
    readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "next" as any,
      features: { termux: true } as any,
      termuxMode: "auto" as any,
    })
    expect(readme).toContain("Termux")

    // termux no
    readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "next" as any,
      features: { termux: true } as any,
      termuxMode: "no" as any,
    })
    expect(readme).toContain("Next")

    // plain without termux
    readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "plain" as any,
      features: {} as any,
      termuxMode: "no" as any,
    })
    expect(readme).toContain("Plain")
  })

  it("covers all feature groups empty", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/readme-generator.ts")
    const readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "",
      githubOwner: "your-github-username",
      projectType: "plain" as any,
      features: {} as any,
      termuxMode: "no" as any,
    })
    expect(readme).toContain("Minimal setup")
  })

  it("covers preset not found and termux else branch", async () => {
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/manifest.ts")
      >("../../../../scripts/lib/bootstrap/manifest.ts")
      return {
        ...actual,
        PROJECT_TYPES: {
          plain: {
            id: "plain",
            name: "Plain",
            description: "plain desc",
            filesToRemove: [],
            filesToCreate: [],
          },
        },
        FEATURES: {
          termux: {
            id: "termux",
            name: "Termux",
            description: "termux",
            group: "dev-infra",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
        },
      }
    })
    vi.doMock("../../../../scripts/lib/bootstrap/presets.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/presets.ts")
      >("../../../../scripts/lib/bootstrap/presets.ts")
      return {
        ...actual,
        PRESETS: {},
      }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/readme-generator.ts")
    // preset set but not found in PRESETS
    let readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "plain" as any,
      features: { termux: true } as any,
      termuxMode: "custom" as any,
      preset: "unknown-preset" as any,
    })
    expect(readme).toContain("app")

    // termux with custom mode to hit "" branch
    readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "plain" as any,
      features: { termux: true } as any,
      termuxMode: "custom" as any,
    })
    expect(readme).toContain("Termux")
  })

  it("covers icon fallback for all groups", async () => {
    vi.doMock("../../../../scripts/lib/bootstrap/manifest.ts", async () => {
      return {
        PROJECT_TYPES: {
          plain: {
            id: "plain",
            name: "Plain",
            description: "plain",
            filesToRemove: [],
            filesToCreate: [],
          },
        },
        FEATURES: {
          docker: {
            id: "docker",
            name: "Docker",
            description: "docker",
            group: "dev-infra",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
          vitest: {
            id: "vitest",
            name: "Vitest",
            description: "vitest",
            group: "testing-quality",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
          husky: {
            id: "husky",
            name: "Husky",
            description: "husky",
            group: "git-workflow",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
          changesets: {
            id: "changesets",
            name: "Changesets",
            description: "changesets",
            group: "release",
            defaultEnabled: true,
            files: [],
            dependencies: [],
            scripts: [],
          },
        },
      }
    })
    vi.doMock("../../../../scripts/lib/bootstrap/presets.ts", async () => {
      return { PRESETS: {} }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/readme-generator.ts")
    const readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "plain" as any,
      features: { docker: true, vitest: true, husky: true, changesets: true } as any,
      termuxMode: "no" as any,
    })
    expect(readme).toContain("Docker")
    expect(readme).toContain("Vitest")
    expect(readme).toContain("Husky")
    expect(readme).toContain("Changesets")
  })

  it("covers next without termux", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/readme-generator.ts")
    const readme = mod.generateReadme({
      projectName: "app",
      projectDescription: "desc",
      githubOwner: "owner",
      projectType: "next" as any,
      features: { termux: false } as any,
      termuxMode: "no" as any,
    })
    expect(readme).toContain("Next.js")
    expect(readme).not.toContain("Termux: Disabled")
  })
})
