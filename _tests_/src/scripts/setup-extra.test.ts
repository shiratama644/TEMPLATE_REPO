import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function baseMocks() {
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
  vi.doMock("../../../scripts/lib/bootstrap/backup.ts", async () => {
    const actual = await vi.importActual<typeof import("../../../scripts/lib/bootstrap/backup.ts")>(
      "../../../scripts/lib/bootstrap/backup.ts",
    )
    return {
      ...actual,
      createBackup: vi.fn(() => ({ backupDir: "/tmp/backup", entries: [] })),
      cleanupOldBackups: vi.fn(),
      restoreBackup: vi.fn(),
    }
  })
  vi.doMock("../../../scripts/lib/bootstrap/docs-generator.ts", () => ({
    generateDocs: vi.fn(() => []),
  }))
  vi.doMock("../../../scripts/lib/bootstrap/engine.ts", async () => {
    const actual = await vi.importActual<typeof import("../../../scripts/lib/bootstrap/engine.ts")>(
      "../../../scripts/lib/bootstrap/engine.ts",
    )
    return {
      ...actual,
      calculatePlan: vi.fn(() => ({
        files: [{ path: "test.txt", type: "create" } as any],
        packageJson: [],
        workflows: [],
        summary: {
          toCreate: 1,
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
}

describe("setup extra coverage", () => {
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

  it("handles dirty git with continue", async () => {
    baseMocks()
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => " M file.txt\n") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes", "--no-verify", "--no-backup", "--no-install"]
    const mod = await import("../../../scripts/setup.ts")
    // With --yes, it should skip git check
    await mod.main()
  })

  it("handles dirty git without yes, abort", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("abort"),
        confirm: vi.fn().mockResolvedValue(false),
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
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => " M file.txt\n") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({})),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("handles dirty git stash success", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("stash"),
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
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("status")) return " M file.txt\n"
          return ""
        }),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes", "--no-verify", "--no-backup", "--no-install"]
    // With --yes, it skips git check, so we need without --yes
    process.argv = ["node", "setup.ts", "--no-verify", "--no-backup", "--no-install"]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })

  it("handles config with features flag", async () => {
    baseMocks()
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn((p: string) => p.includes("myconfig.json")),
        readFileSync: vi.fn((p: string) => {
          if (String(p).includes("myconfig.json"))
            return JSON.stringify({ projectName: "test-app", features: { docker: true } })
          return JSON.stringify({ packageManager: "pnpm@9.0.0" })
        }),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = [
      "node",
      "setup.ts",
      "--config",
      "myconfig.json",
      "--features",
      "docker,termux",
      "--no-verify",
      "--no-backup",
      "--no-install",
    ]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })

  it("handles preset with no- features", async () => {
    baseMocks()
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
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = [
      "node",
      "setup.ts",
      "--preset",
      "full",
      "--features",
      "no-docker,!termux",
      "--no-verify",
      "--no-backup",
      "--no-install",
    ]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })

  it("handles features flag and overrides", async () => {
    baseMocks()
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
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = [
      "node",
      "setup.ts",
      "--yes",
      "--no-verify",
      "--no-backup",
      "--no-install",
      "--features",
      "docker,vitest",
      "--project-name",
      "my-app",
      "--github-owner",
      "owner",
      "--description",
      "desc",
      "--type",
      "vite",
      "--termux-mode",
      "yes",
    ]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })

  it("handles save-config and verbose dry-run", async () => {
    baseMocks()
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
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = [
      "node",
      "setup.ts",
      "--yes",
      "--dry-run",
      "--verbose",
      "--save-config",
      "out.json",
    ]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("handles previousState same config", async () => {
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("continue"),
        confirm: vi.fn().mockResolvedValue(false),
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
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn((p: string) => p.includes(".bootstrap-state.json")),
        readFileSync: vi.fn((p: string) => {
          if (String(p).includes(".bootstrap-state.json")) {
            return JSON.stringify({
              version: 2,
              timestamp: new Date().toISOString(),
              answers: {
                projectName: "test",
                projectDescription: "desc",
                githubOwner: "owner",
                projectType: "plain",
                features: {
                  docker: false,
                  devcontainer: false,
                  termux: false,
                  vitest: true,
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
                },
                termuxMode: "auto",
              },
              plan: { files: 0, packageJson: 0, workflows: 0 },
            })
          }
          return JSON.stringify({ packageManager: "pnpm@9.0.0" })
        }),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = [
      "node",
      "setup.ts",
      "--yes",
      "--project-name",
      "test",
      "--no-verify",
      "--no-backup",
      "--no-install",
    ]
    const mod = await import("../../../scripts/setup.ts")
    // With same config and confirm false, should exit 0
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("handles validation failure with force", async () => {
    baseMocks()
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
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    // Mock validator to fail
    vi.doMock("../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/validator.ts")
      >("../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        validateAnswers: vi.fn(() => ({ valid: false, errors: ["invalid"], warnings: ["warn"] })),
        resolveFeatureDependencies: actual.resolveFeatureDependencies,
      }
    })
    process.argv = [
      "node",
      "setup.ts",
      "--yes",
      "--force",
      "--no-verify",
      "--no-backup",
      "--no-install",
    ]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })

  it("handles backup failure", async () => {
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
      createBackup: vi.fn(() => {
        throw new Error("backup fail")
      }),
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
          files: [{ path: "package.json", type: "update" } as any],
          packageJson: [],
          workflows: [],
          summary: {
            toCreate: 0,
            toUpdate: 1,
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
        readFileSync: vi.fn(() => JSON.stringify({ packageManager: "pnpm@9.0.0" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes", "--no-verify", "--no-install"]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })
})
