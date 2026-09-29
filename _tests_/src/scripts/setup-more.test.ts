import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("setup more coverage", () => {
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

  it("config file not found exits 1", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => "{}"),
        writeFileSync: vi.fn(),
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
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

    process.argv = ["node", "setup.ts", "--config", "nonexistent.json"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
      expect.fail("should exit")
    } catch (e: any) {
      expect(e.message).toContain("process.exit:1")
    }
  })

  it("stash fails exits 1", async () => {
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
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("status")) return " M file.txt\n"
          if (String(cmd).includes("stash")) throw new Error("stash fail")
          return ""
        }),
      }
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
    process.argv = ["node", "setup.ts"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
      expect.fail("should exit")
    } catch (e: any) {
      expect(e.message).toContain("process.exit:1")
    }
  })

  it("dry-run with dirty git", async () => {
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
      return {
        ...actual,
        promptSetup: vi.fn(async () => actual.getDefaultAnswers(process.cwd())),
        getDefaultAnswers: actual.getDefaultAnswers,
        getMinimalAnswers: actual.getMinimalAnswers,
        getAnswersFromPreset: actual.getAnswersFromPreset,
      }
    })
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
        readFileSync: vi.fn(() => "{}"),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--dry-run"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("validation fails without force exits 1", async () => {
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
    vi.doMock("../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../scripts/lib/bootstrap/validator.ts")
      >("../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        validateAnswers: vi.fn(() => ({ valid: false, errors: ["err"], warnings: [] })),
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
    process.argv = ["node", "setup.ts", "--yes", "--no-verify", "--no-backup", "--no-install"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
      expect.fail("should exit")
    } catch (e: any) {
      expect(e.message).toContain("process.exit:1")
    }
  })

  it("handles cancel at confirm", async () => {
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
    process.argv = ["node", "setup.ts"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("handles save-config absolute path and verification", async () => {
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
      return {
        ...actual,
        execSync: vi.fn(() => {
          throw new Error("fail")
        }),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn((p: string) => p.includes("package.json")),
        readFileSync: vi.fn(() => JSON.stringify({ name: "test" })),
        writeFileSync: vi.fn(),
      }
    })
    process.argv = ["node", "setup.ts", "--yes", "--save-config", "/tmp/out.json", "--verbose"]
    const mod = await import("../../../scripts/setup.ts")
    await mod.main()
  })
})
