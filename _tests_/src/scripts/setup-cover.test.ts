import { existsSync, readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("setup.ts coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("parseArgs covers all flags", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const opts = mod.parseArgs([
      "--dry-run",
      "--yes",
      "-y",
      "--defaults",
      "--verbose",
      "-v",
      "--force",
      "--no-install",
      "--no-verify",
      "--no-backup",
      "--help",
      "-h",
      "--version",
      "--list-presets",
      "--minimal",
      "--preset",
      "vite-app",
      "--project-name",
      "my-app",
      "--type",
      "vite",
      "--features",
      "docker,vitest",
      "--termux-mode",
      "auto",
      "--github-owner",
      "myuser",
      "--description",
      "desc",
      "--config",
      "config.json",
      "--save-config",
      "out.json",
    ])
    expect(opts.dryRun).toBe(true)
    expect(opts.yes).toBe(true)
    expect(opts.defaults).toBe(true)
    expect(opts.verbose).toBe(true)
    expect(opts.force).toBe(true)
    expect(opts.noInstall).toBe(true)
    expect(opts.noVerify).toBe(true)
    expect(opts.noBackup).toBe(true)
    expect(opts.help).toBe(true)
    expect(opts.version).toBe(true)
    expect(opts.listPresets).toBe(true)
    expect(opts.minimal).toBe(true)
    expect(opts.preset).toBe("vite-app")
    expect(opts.projectName).toBe("my-app")
    expect(opts.projectType).toBe("vite")
    expect(opts.features).toBe("docker,vitest")
    expect(opts.termuxMode).toBe("auto")
    expect(opts.githubOwner).toBe("myuser")
    expect(opts.description).toBe("desc")
    expect(opts.config).toBe("config.json")
    expect(opts.saveConfig).toBe("out.json")
  })

  it("parseArgs handles = syntax", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const opts = mod.parseArgs(["--preset=next-app", "--project-name=my-next"])
    expect(opts.preset).toBe("next-app")
    expect(opts.projectName).toBe("my-next")
  })

  it("checkGitStatus handles clean and error", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const result = mod.checkGitStatus(process.cwd())
    expect(result).toHaveProperty("clean")

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => {
          throw new Error("git error")
        }),
      }
    })
    vi.resetModules()
    const mod2 = await import("../../../scripts/setup.ts")
    const result2 = mod2.checkGitStatus("/nonexistent")
    expect(result2.clean).toBe(true)
  })

  it("loadConfigFile handles missing and invalid", async () => {
    const mod = await import("../../../scripts/setup.ts")
    expect(mod.loadConfigFile("/nonexistent.json")).toBeNull()

    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: () => true,
        readFileSync: () => "{ invalid json",
      }
    })
    vi.resetModules()
    const mod2 = await import("../../../scripts/setup.ts")
    expect(mod2.loadConfigFile("some.json")).toBeNull()
  })

  it("loadPreviousState handles missing", async () => {
    const mod = await import("../../../scripts/setup.ts")
    expect(mod.loadPreviousState("/tmp/nonexistent-xyz")).toBeNull()
  })

  it("printHelp and VERSION", async () => {
    const mod = await import("../../../scripts/setup.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    mod.printHelp()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    expect(mod.VERSION).toBe("2.0.0")
  })

  it("covers main with --help flag mocked exit", async () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit")
    }) as any
    vi.doMock("@clack/prompts", () => ({
      intro: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
      select: vi.fn(),
      text: vi.fn(),
      multiselect: vi.fn(),
      confirm: vi.fn(),
      isCancel: vi.fn().mockReturnValue(false),
      cancel: vi.fn(),
      outro: vi.fn(),
      spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
      tasks: vi.fn(),
    }))

    const mod = await import("../../../scripts/setup.ts")
    const originalArgv = process.argv
    process.argv = ["node", "setup.ts", "--help"]
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toBe("exit")
    }
    process.argv = originalArgv
    mockExit.mockRestore()
    vi.resetModules()
  })
})
