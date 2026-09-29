import { beforeEach, describe, expect, it, vi } from "vitest"

describe("prompts coverage", () => {
  it("promptSetup with defaults=true returns answers", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(true, "/tmp")
    expect(answers.projectName).toBeTruthy()
    expect(answers.projectType).toBe("plain")
    expect(answers.features).toBeDefined()
  })

  it("promptSetup with defaults=true uses inferred owner", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(true, process.cwd())
    expect(answers.githubOwner).toBeTruthy()
  })

  it("getDefaultAnswers handles termux detection", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const originalEnv = process.env.TERMUX_VERSION
    process.env.TERMUX_VERSION = "1.0"
    const answers = mod.getDefaultAnswers("/tmp")
    expect(answers).toBeDefined()
    if (originalEnv) process.env.TERMUX_VERSION = originalEnv
    else delete process.env.TERMUX_VERSION
  })

  it("getMinimalAnswers returns minimal with no termux", async () => {
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = mod.getMinimalAnswers("/tmp")
    expect(answers.termuxMode).toBe("no")
    expect(answers.features.vitest).toBe(true)
  })

  it("promptSetup with mocked clack prompts - preset flow", async () => {
    vi.resetModules()
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi
        .fn()
        .mockResolvedValueOnce("my-app")
        .mockResolvedValueOnce("myuser")
        .mockResolvedValueOnce("desc"),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn().mockReturnValue(false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(async (tasks: any[]) => {
        for (const t of tasks) await t.task()
      }),
    }))

    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.projectName).toBe("my-app")
    expect(answers.preset).toBe("minimal")

    vi.doUnmock("@clack/prompts")
    vi.resetModules()
  })

  it("promptSetup with mocked clack prompts - custom flow", async () => {
    vi.resetModules()
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi
        .fn()
        .mockResolvedValueOnce("custom")
        .mockResolvedValueOnce("vite")
        .mockResolvedValueOnce("auto"),
      text: vi
        .fn()
        .mockResolvedValueOnce("my-app")
        .mockResolvedValueOnce("desc")
        .mockResolvedValueOnce("myuser"),
      multiselect: vi
        .fn()
        .mockResolvedValueOnce(["docker", "termux"])
        .mockResolvedValueOnce(["vitest", "coverage"])
        .mockResolvedValueOnce(["husky"])
        .mockResolvedValueOnce(["changesets"]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn().mockReturnValue(false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(async (tasks: any[]) => {
        for (const t of tasks) await t.task()
      }),
    }))

    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.projectName).toBe("my-app")
    expect(answers.projectType).toBe("vite")
    expect(answers.features.docker).toBe(true)

    vi.doUnmock("@clack/prompts")
    vi.resetModules()
  })

  it("promptSetup handles coverage requires vitest warning", async () => {
    vi.resetModules()
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi
        .fn()
        .mockResolvedValueOnce("custom")
        .mockResolvedValueOnce("plain")
        .mockResolvedValueOnce("auto"),
      text: vi
        .fn()
        .mockResolvedValueOnce("my-app")
        .mockResolvedValueOnce("desc")
        .mockResolvedValueOnce("myuser"),
      multiselect: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["coverage"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn().mockReturnValue(false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(async (tasks: any[]) => {
        for (const t of tasks) await t.task()
      }),
    }))

    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.features.vitest).toBe(true)

    vi.doUnmock("@clack/prompts")
    vi.resetModules()
  })
})
