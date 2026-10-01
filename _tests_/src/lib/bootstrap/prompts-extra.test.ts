import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("prompts extra coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("inferGithubOwner via git remote", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("git remote")) return "git@github.com:testowner/testrepo.git\n"
          return ""
        }),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi.fn().mockResolvedValue("my-app"),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.githubOwner).toBeTruthy()
  })

  it("inferGithubOwner via package.json", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => {
          throw new Error("no git")
        }),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p.includes("package.json"),
        readFileSync: vi.fn(() =>
          JSON.stringify({ repository: "https://github.com/pkgowner/pkgrepo" }),
        ),
      }
    })
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi
        .fn()
        .mockResolvedValueOnce("my-app")
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce("desc"),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.githubOwner).toBe("pkgowner")
  })

  it("isTermuxEnvironment true", async () => {
    const originalEnv = process.env.TERMUX_VERSION
    process.env.TERMUX_VERSION = "1.0"
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi.fn().mockResolvedValue("my-app"),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.termuxMode).toBeDefined()
    if (originalEnv) process.env.TERMUX_VERSION = originalEnv
    else delete process.env.TERMUX_VERSION
  })

  it("promptSetup handles cancel at presetChoice", async () => {
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi.fn().mockResolvedValue("my-app"),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => true),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const originalExit = process.exit

    process.exit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as any
    try {
      await mod.promptSetup(false, "/tmp")
    } catch (e: any) {
      expect(e.message).toContain("exit:0")
    } finally {
      process.exit = originalExit
    }
  })

  it("getDefaultAnswers and getMinimalAnswers and getAnswersFromPreset", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const def = mod.getDefaultAnswers("/tmp")
    expect(def.projectName).toBeTruthy()
    const minimal = mod.getMinimalAnswers("/tmp")
    expect(minimal.features.vitest).toBe(true)
    const preset = mod.getAnswersFromPreset("minimal", { projectName: "custom" }, "/tmp")
    expect(preset?.projectName).toBe("custom")
    expect(mod.getAnswersFromPreset("unknown" as any)).toBeUndefined()
  })

  it("promptSetup custom flow with termux no", async () => {
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi
        .fn()
        .mockResolvedValueOnce("custom")
        .mockResolvedValueOnce("plain")
        .mockResolvedValueOnce("no"),
      text: vi
        .fn()
        .mockResolvedValueOnce("my-app")
        .mockResolvedValueOnce("desc")
        .mockResolvedValueOnce("owner"),
      multiselect: vi
        .fn()
        .mockResolvedValueOnce(["termux"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.features.termux).toBe(false)
  })

  it("promptSetup custom flow with playwright and coverage", async () => {
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValueOnce("custom").mockResolvedValueOnce("plain"),
      text: vi
        .fn()
        .mockResolvedValueOnce("my-app")
        .mockResolvedValueOnce("desc")
        .mockResolvedValueOnce("owner"),
      multiselect: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["vitest", "coverage", "playwright"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.features.coverage).toBe(true)
    expect(answers.features.playwright).toBe(true)
  })
})
