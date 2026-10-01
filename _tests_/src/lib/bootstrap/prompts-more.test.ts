import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("prompts more coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("inferGithubOwner via package.json object repository", async () => {
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
          JSON.stringify({ repository: { url: "https://github.com/objowner/objrepo" } }),
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
    expect(answers.githubOwner).toBe("objowner")
  })

  it("inferGithubOwner returns undefined when no match", async () => {
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
        readFileSync: vi.fn(() => JSON.stringify({ repository: "https://gitlab.com/owner/repo" })),
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
    expect(answers.githubOwner).toBe("your-github-username")
  })

  it("inferProjectDescription returns description", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p.includes("package.json"),
        readFileSync: vi.fn(() => JSON.stringify({ description: "Custom description" })),
      }
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
    const answers = await mod.promptSetup(true, "/tmp")
    expect(answers.projectDescription).toBe("Custom description")
  })

  it("isTermux via PREFIX", async () => {
    const origPrefix = process.env.PREFIX
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
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
    expect(answers.termuxMode).toBeDefined()
    if (origPrefix) process.env.PREFIX = origPrefix
    else delete process.env.PREFIX
  })

  it("promptSetup defaults true", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn(),
      text: vi.fn(),
      multiselect: vi.fn(),
      confirm: vi.fn(),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(true, "/tmp")
    expect(answers.projectName).toBeTruthy()
  })

  it("promptSetup preset flow with cancel at projectName", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    let call = 0
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi.fn().mockImplementation(() => {
        call++
        if (call === 1) return "my-app"
        return undefined
      }),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn((val) => val === undefined),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const origExit = process.exit

    process.exit = vi.fn((c?: number) => {
      throw new Error(`exit:${c}`)
    }) as any
    try {
      await mod.promptSetup(false, "/tmp")
    } catch (e: any) {
      expect(e.message).toContain("exit:0")
    } finally {
      process.exit = origExit
    }
  })

  it("promptSetup custom flow coverage without vitest", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    vi.doMock("../../../../scripts/lib/bootstrap/validator.ts", async () => {
      const actual = await vi.importActual<
        typeof import("../../../../scripts/lib/bootstrap/validator.ts")
      >("../../../../scripts/lib/bootstrap/validator.ts")
      return {
        ...actual,
        resolveFeatureDependencies: (f: any) => f, // don't auto-enable vitest to test warning branch
      }
    })
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
        .mockResolvedValueOnce(["coverage"]) // coverage without vitest
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.features.vitest).toBe(true) // auto-enabled via warning branch
    expect(answers.features.coverage).toBe(true)
  })

  it("promptSetup custom flow playwright without vitest", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
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
        .mockResolvedValueOnce(["playwright"]) // playwright without vitest
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn(() => false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = await mod.promptSetup(false, "/tmp")
    expect(answers.features.playwright).toBe(true)
  })

  it("promptSetup custom flow cancel at various multiselects", async () => {
    const cancels = ["devInfra", "testing", "git", "release"]
    for (const cancelAt of cancels) {
      vi.resetModules()
      vi.doMock("node:child_process", async () => {
        const actual =
          await vi.importActual<typeof import("node:child_process")>("node:child_process")
        return { ...actual, execSync: vi.fn(() => "") }
      })
      vi.doMock("node:fs", async () => {
        const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
        return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
      })
      let multiCall = 0
      vi.doMock("@clack/prompts", () => ({
        intro: vi.fn(),
        log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
        select: vi.fn().mockResolvedValueOnce("custom").mockResolvedValueOnce("plain"),
        text: vi
          .fn()
          .mockResolvedValueOnce("my-app")
          .mockResolvedValueOnce("desc")
          .mockResolvedValueOnce("owner"),
        multiselect: vi.fn().mockImplementation(() => {
          multiCall++
          if (
            (cancelAt === "devInfra" && multiCall === 1) ||
            (cancelAt === "testing" && multiCall === 2) ||
            (cancelAt === "git" && multiCall === 3) ||
            (cancelAt === "release" && multiCall === 4)
          ) {
            return Symbol.for("cancel")
          }
          return []
        }),
        confirm: vi.fn().mockResolvedValue(true),
        isCancel: vi.fn((v) => typeof v === "symbol"),
        cancel: vi.fn(),
        outro: vi.fn(),
        spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
        tasks: vi.fn(),
      }))
      const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
      const origExit = process.exit

      process.exit = vi.fn((c?: number) => {
        throw new Error(`exit:${c}`)
      }) as any
      try {
        await mod.promptSetup(false, "/tmp")
        expect.fail("should exit")
      } catch (e: any) {
        expect(e.message).toContain("exit:0")
      } finally {
        process.exit = origExit
      }
    }
  })

  it("promptSetup preset with githubOwner cancel", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, execSync: vi.fn(() => "") }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false, readFileSync: vi.fn(() => "{}") }
    })
    let textCall = 0
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn().mockResolvedValue("minimal"),
      text: vi.fn().mockImplementation(() => {
        textCall++
        if (textCall === 1) return "my-app"
        if (textCall === 2) return undefined // cancel at githubOwner
        return "desc"
      }),
      multiselect: vi.fn().mockResolvedValue([]),
      confirm: vi.fn().mockResolvedValue(true),
      isCancel: vi.fn((v) => v === undefined),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const origExit = process.exit

    process.exit = vi.fn((c?: number) => {
      throw new Error(`exit:${c}`)
    }) as any
    try {
      await mod.promptSetup(false, "/tmp")
    } catch (e: any) {
      expect(e.message).toContain("exit:0")
    } finally {
      process.exit = origExit
    }
  })

  it("getDefaultAnswers with git remote success", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("git remote")) return "https://github.com/owner/repo.git"
          return ""
        }),
      }
    })
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = mod.getDefaultAnswers("/tmp")
    expect(answers.githubOwner).toBe("owner")
  })

  it("getDefaultAnswers with git remote failure", async () => {
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
    const mod = await import("../../../../scripts/lib/bootstrap/prompts.ts")
    const answers = mod.getDefaultAnswers("/tmp")
    expect(answers.githubOwner).toBe("your-github-username")
  })
})
