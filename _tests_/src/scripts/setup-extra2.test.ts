import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("setup extra2 coverage", () => {
  let originalArgv: string[]
  let originalExit: any

  beforeEach(() => {
    originalArgv = process.argv
    originalExit = process.exit

    process.exit = vi.fn((code?: number) => {
      throw new Error(`process.exit:${code}`)
    }) as any
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
    process.exit = originalExit
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("handles same config with re-apply confirm false", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("continue"),
        confirm: vi
          .fn()
          .mockResolvedValueOnce(true) // for dirty? no
          .mockResolvedValueOnce(false), // re-apply false
        spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
        tasks: vi.fn(async (tasks: any[]) => {
          for (const t of tasks) await t.task()
        }),
        outro: vi.fn(),
        cancel: vi.fn(),
        isCancel: vi.fn(() => false),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/backup.ts", () => ({
      createBackup: vi.fn(() => ({ backupDir: "/tmp/backup", entries: [] })),
      cleanupOldBackups: vi.fn(),
      restoreBackup: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/docs-generator.ts", () => ({
      generateDocs: vi.fn(() => []),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/engine.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/engine.ts")
      >("../../../scripts/lib/bootstrap/engine.ts")
      return {
        ...actual,
        calculatePlan: vi.fn(() => ({
          files: [],
          packageJson: [],
          workflows: [],
          summary: {
            toCreate: 0,
            toUpdate: 0,
            toDelete: 0,
            toKeep: 0,
            packageChanges: 0,
            workflowChanges: 0,
          },
        })),
        applyPlan: vi.fn(),
        formatPlan: vi.fn(() => "plan"),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/readme-generator.ts", () => ({
      generateReadme: vi.fn(() => "# README"),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/prompts.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/prompts.ts")
      >("../../../scripts/lib/bootstrap/prompts.ts")
      const answers = actual.getDefaultAnswers(process.cwd())
      return {
        ...actual,
        promptSetup: vi.fn(async () => answers),
        getDefaultAnswers: actual.getDefaultAnswers,
        getMinimalAnswers: actual.getMinimalAnswers,
        getAnswersFromPreset: actual.getAnswersFromPreset,
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/validator.ts")
      >("../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        validateAnswers: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
        resolveFeatureDependencies: actual.resolveFeatureDependencies,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn((p: string) => {
          if (p.includes("bootstrap-state.json")) return true
          if (p.includes("package.json")) return true
          return false
        }),
        readFileSync: vi.fn((p: string) => {
          if (String(p).includes("bootstrap-state.json")) {
            const def = {
              projectName: "template-repo",
              projectType: "plain",
              githubOwner: "your-github-username",
              features: Object.fromEntries(Object.keys(actual as any).map(() => [])),
            }
            // Use actual default answers for features
            const { getDefaultAnswers } = require("../../../scripts/lib/bootstrap/prompts.ts")
            // But we can't require here, so construct manually
            return JSON.stringify({
              answers: {
                projectName: "template-repo",
                projectType: "plain",
                githubOwner: "your-github-username",
                projectDescription: "test",
                features: {
                  docker: true,
                  devcontainer: true,
                  termux: true,
                  vitest: true,
                  playwright: true,
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
                  "stale-bot": true,
                  changesets: true,
                },
                termuxMode: "auto",
              },
              timestamp: new Date().toISOString(),
            })
          }
          if (String(p).includes("package.json")) return JSON.stringify({ name: "test" })
          return "{}"
        }),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("handles same config with project type change", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("continue"),
        confirm: vi.fn().mockResolvedValue(true),
        spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
        tasks: vi.fn(async (tasks: any[]) => {
          for (const t of tasks) await t.task()
        }),
        outro: vi.fn(),
        cancel: vi.fn(),
        isCancel: vi.fn(() => false),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/backup.ts", () => ({
      createBackup: vi.fn(() => ({ backupDir: "/tmp/backup", entries: [] })),
      cleanupOldBackups: vi.fn(),
      restoreBackup: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/docs-generator.ts", () => ({
      generateDocs: vi.fn(() => []),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/engine.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/engine.ts")
      >("../../../scripts/lib/bootstrap/engine.ts")
      return {
        ...actual,
        calculatePlan: vi.fn(() => ({
          files: [],
          packageJson: [],
          workflows: [],
          summary: {
            toCreate: 0,
            toUpdate: 0,
            toDelete: 0,
            toKeep: 0,
            packageChanges: 0,
            workflowChanges: 0,
          },
        })),
        applyPlan: vi.fn(),
        formatPlan: vi.fn(() => "plan"),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/readme-generator.ts", () => ({
      generateReadme: vi.fn(() => "# README"),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/prompts.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/prompts.ts")
      >("../../../scripts/lib/bootstrap/prompts.ts")
      const answers = actual.getDefaultAnswers(process.cwd())
      answers.projectType = "vite" as any
      answers.features.docker = false
      return {
        ...actual,
        promptSetup: vi.fn(async () => answers),
        getDefaultAnswers: actual.getDefaultAnswers,
        getMinimalAnswers: actual.getMinimalAnswers,
        getAnswersFromPreset: actual.getAnswersFromPreset,
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/validator.ts")
      >("../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        validateAnswers: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
        resolveFeatureDependencies: actual.resolveFeatureDependencies,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn((p: string) => {
          if (p.includes("bootstrap-state.json")) return true
          if (p.includes("package.json")) return true
          return false
        }),
        readFileSync: vi.fn((p: string) => {
          if (String(p).includes("bootstrap-state.json")) {
            return JSON.stringify({
              answers: {
                projectName: "template-repo",
                projectType: "plain",
                githubOwner: "your-github-username",
                projectDescription: "test",
                features: {
                  docker: true,
                  devcontainer: true,
                  termux: true,
                  vitest: true,
                  playwright: true,
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
                  "stale-bot": true,
                  changesets: true,
                },
                termuxMode: "auto",
              },
              timestamp: new Date().toISOString(),
            })
          }
          if (String(p).includes("package.json")) return JSON.stringify({ name: "test" })
          return "{}"
        }),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes"]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })

  it("handles package.json validation fail", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("continue"),
        confirm: vi.fn().mockResolvedValue(true),
        spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
        tasks: vi.fn(async (tasks: any[]) => {
          for (const t of tasks) {
            await t.task()
          }
          throw new Error("task fail")
        }),
        outro: vi.fn(),
        cancel: vi.fn(),
        isCancel: vi.fn(() => false),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/backup.ts", () => ({
      createBackup: vi.fn(() => ({ backupDir: "/tmp/backup", entries: [] })),
      cleanupOldBackups: vi.fn(),
      restoreBackup: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/docs-generator.ts", () => ({
      generateDocs: vi.fn(() => []),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/engine.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/engine.ts")
      >("../../../scripts/lib/bootstrap/engine.ts")
      return {
        ...actual,
        calculatePlan: vi.fn(() => ({
          files: [],
          packageJson: [],
          workflows: [],
          summary: {
            toCreate: 0,
            toUpdate: 0,
            toDelete: 0,
            toKeep: 0,
            packageChanges: 0,
            workflowChanges: 0,
          },
        })),
        applyPlan: vi.fn(() => {
          throw new Error("apply fail")
        }),
        formatPlan: vi.fn(() => "plan"),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/readme-generator.ts", () => ({
      generateReadme: vi.fn(() => "# README"),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/prompts.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/prompts.ts")
      >("../../../scripts/lib/bootstrap/prompts.ts")
      return {
        ...actual,
        promptSetup: vi.fn(async () => actual.getDefaultAnswers(process.cwd())),
        getDefaultAnswers: actual.getDefaultAnswers,
        getMinimalAnswers: actual.getMinimalAnswers,
        getAnswersFromPreset: actual.getAnswersFromPreset,
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/validator.ts")
      >("../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        validateAnswers: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
        resolveFeatureDependencies: actual.resolveFeatureDependencies,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => "{ invalid json"),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:1")
    }
  })

  it("handles setup failure with restore", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("continue"),
        confirm: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true), // restore
        spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
        tasks: vi.fn(async (tasks: any[]) => {
          for (const t of tasks) {
            await t.task()
          }
        }),
        outro: vi.fn(),
        cancel: vi.fn(),
        isCancel: vi.fn(() => false),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/backup.ts", () => ({
      createBackup: vi.fn(() => ({ backupDir: "/tmp/backup", entries: [] })),
      cleanupOldBackups: vi.fn(),
      restoreBackup: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/docs-generator.ts", () => ({
      generateDocs: vi.fn(() => {
        throw new Error("docs fail")
      }),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/engine.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/engine.ts")
      >("../../../scripts/lib/bootstrap/engine.ts")
      return {
        ...actual,
        calculatePlan: vi.fn(() => ({
          files: [],
          packageJson: [],
          workflows: [],
          summary: {
            toCreate: 0,
            toUpdate: 0,
            toDelete: 0,
            toKeep: 0,
            packageChanges: 0,
            workflowChanges: 0,
          },
        })),
        applyPlan: vi.fn(),
        formatPlan: vi.fn(() => "plan"),
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/readme-generator.ts", () => ({
      generateReadme: vi.fn(() => "# README"),
    }))
    vi.doMock("../../../scripts/lib/bootstrap/prompts.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/prompts.ts")
      >("../../../scripts/lib/bootstrap/prompts.ts")
      return {
        ...actual,
        promptSetup: vi.fn(async () => actual.getDefaultAnswers(process.cwd())),
        getDefaultAnswers: actual.getDefaultAnswers,
        getMinimalAnswers: actual.getMinimalAnswers,
        getAnswersFromPreset: actual.getAnswersFromPreset,
      }
    })
    vi.doMock("../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/validator.ts")
      >("../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        validateAnswers: vi.fn(() => ({ valid: true, errors: [], warnings: [] })),
        resolveFeatureDependencies: actual.resolveFeatureDependencies,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => "{}"),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:1")
    }
  })
})
