import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function mockAll() {
  vi.doMock("@clack/prompts", async () => {
    const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
    return {
      ...actual,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
      select: vi.fn().mockResolvedValue("abort"),
      confirm: vi.fn().mockResolvedValue(false),
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
    generateDocs: vi.fn(() => ["docs/README.md"]),
  }))

  vi.doMock("../../../scripts/lib/bootstrap/engine.ts", async () => {
    const actual = await vi.importActual<typeof import("../../../scripts/lib/bootstrap/engine.ts")>(
      "../../../scripts/lib/bootstrap/engine.ts",
    )
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
    const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process")
    return {
      ...actual,
      execSync: vi.fn(() => ""),
    }
  })

  vi.doMock("node:fs", async () => {
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
    return {
      ...actual,
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn((p: string) => {
        if (String(p).includes("package.json"))
          return JSON.stringify({ packageManager: "pnpm@9.0.0" })
        return "{}"
      }),
      writeFileSync: vi.fn(),
    }
  })
}

describe("setup main coverage", () => {
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
    vi.doUnmock("@clack/prompts")
    vi.doUnmock("../../../scripts/lib/bootstrap/backup.ts")
    vi.doUnmock("../../../scripts/lib/bootstrap/docs-generator.ts")
    vi.doUnmock("../../../scripts/lib/bootstrap/engine.ts")
    vi.doUnmock("../../../scripts/lib/bootstrap/readme-generator.ts")
    vi.doUnmock("../../../scripts/lib/bootstrap/prompts.ts")
    vi.doUnmock("node:child_process")
    vi.doUnmock("node:fs")
  })

  it("main --yes completes", async () => {
    mockAll()
    process.argv = ["node", "setup.ts", "--yes", "--no-verify", "--no-backup", "--no-install"]
    const mod = await import("../../../scripts/setup.ts")
    await expect(mod.main()).resolves.toBeUndefined()
  })

  it("main --minimal completes", async () => {
    mockAll()
    process.argv = ["node", "setup.ts", "--minimal", "--no-verify", "--no-backup", "--no-install"]
    const mod = await import("../../../scripts/setup.ts")
    await expect(mod.main()).resolves.toBeUndefined()
  })

  it("main --preset vite-app completes", async () => {
    mockAll()
    process.argv = [
      "node",
      "setup.ts",
      "--preset",
      "vite-app",
      "--no-verify",
      "--no-backup",
      "--no-install",
    ]
    const mod = await import("../../../scripts/setup.ts")
    await expect(mod.main()).resolves.toBeUndefined()
  })

  it("main --dry-run exits 0", async () => {
    mockAll()
    process.argv = ["node", "setup.ts", "--yes", "--dry-run"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("main --version exits 0", async () => {
    vi.resetModules()
    process.argv = ["node", "setup.ts", "--version"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("main --list-presets exits 0", async () => {
    vi.resetModules()
    process.argv = ["node", "setup.ts", "--list-presets"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("process.exit:0")
    }
  })

  it("main with unknown preset exits 1", async () => {
    mockAll()
    process.argv = ["node", "setup.ts", "--preset", "unknown-preset", "--no-verify", "--no-backup"]
    const mod = await import("../../../scripts/setup.ts")
    try {
      await mod.main()
      expect.fail("should have thrown")
    } catch (e: any) {
      expect(e.message).toContain("process.exit:1")
    }
  })

  it("main with config file", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn((p: string) => {
          if (String(p).includes("myconfig.json")) return true
          if (String(p).includes("package.json")) return true
          return false
        }),
        readFileSync: vi.fn((p: string) => {
          if (String(p).includes("myconfig.json"))
            return JSON.stringify({ projectName: "test-app", projectType: "vite" })
          if (String(p).includes("package.json"))
            return JSON.stringify({ packageManager: "pnpm@9.0.0" })
          return "{}"
        }),
        writeFileSync: vi.fn(),
      }
    })
    vi.doMock("@clack/prompts", async () => {
      const actual = await vi.importActual<typeof import("@clack/prompts")>("@clack/prompts")
      return {
        ...actual,
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), message: vi.fn() },
        select: vi.fn().mockResolvedValue("abort"),
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
      return { ...actual, execSync: vi.fn(() => "") }
    })

    process.argv = [
      "node",
      "setup.ts",
      "--config",
      "myconfig.json",
      "--no-verify",
      "--no-backup",
      "--no-install",
    ]
    const mod = await import("../../../scripts/setup.ts")
    await expect(mod.main()).resolves.toBeUndefined()
  })
})
