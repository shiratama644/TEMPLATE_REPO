import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("dev.ts new frameworks", () => {
  let origArgv: string[]
  beforeEach(() => {
    origArgv = [...process.argv]
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    process.argv = origArgv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  const mockCommon = () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      logCacheStats: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({ summary: "test", root: { type: "vite", buildSystem: "vite" } })),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "exec", "next", "dev"],
        env: {},
        log: "log",
        isTermux: false,
      })),
      isNextJsProject: vi.fn(() => false),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      getViteBuildConfigForTermux: vi.fn(() => ({ isTermux: false, env: {}, reason: "" })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/logger.ts", () => ({
      logger: {
        info: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        box: vi.fn(),
      },
      loggers: {
        build: {
          log: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          success: vi.fn(),
          fail: vi.fn(),
          start: vi.fn(),
          time: vi.fn(),
          timeEnd: vi.fn(),
          step: vi.fn(),
          table: vi.fn(),
          box: vi.fn(),
          ready: vi.fn(),
        },
        dev: {
          log: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          success: vi.fn(),
          fail: vi.fn(),
          start: vi.fn(),
          time: vi.fn(),
          timeEnd: vi.fn(),
          step: vi.fn(),
          table: vi.fn(),
          box: vi.fn(),
          ready: vi.fn(),
        },
        cache: { log: vi.fn(), info: vi.fn(), warn: vi.fn() },
        termux: { log: vi.fn(), info: vi.fn(), warn: vi.fn() },
      },
      formatDuration: (ms: number) => `${ms}ms`,
      logSection: vi.fn(),
      logGroup: vi.fn(),
      logBox: vi.fn(),
      logSuccessBox: vi.fn(),
      logErrorBox: vi.fn(),
      logProgress: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/errors.ts", () => ({
      handleError: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => ({
          on: vi.fn(),
          kill: vi.fn(),
        })) as any,
      }
    })
  }

  it("covers astro", async () => {
    mockCommon()
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => typeof p === "string" && p.includes("astro.config"),
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
    expect(mod.hasFile).toBeDefined()
  })

  it("covers sveltekit", async () => {
    mockCommon()
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => typeof p === "string" && p.includes("svelte.config"),
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("covers nuxt", async () => {
    mockCommon()
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => typeof p === "string" && p.includes("nuxt.config"),
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("covers remix", async () => {
    mockCommon()
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) =>
          typeof p === "string" && (p.includes("remix.config") || p === "app/root.tsx"),
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("covers hono", async () => {
    mockCommon()
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "wrangler.toml",
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("covers help flag", async () => {
    mockCommon()
    process.argv = ["node", "dev.ts", "--help"]
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: () => false,
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
    expect(mod.parseArgs().help).toBe(true)
  })

  it("covers port flag", async () => {
    mockCommon()
    process.argv = ["node", "dev.ts", "--port", "3000"]
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "turbo.json",
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    const args = mod.parseArgs()
    expect(args.port).toBe("3000")
    await mod.main()
  })

  it("covers verbose flag", async () => {
    mockCommon()
    process.argv = ["node", "dev.ts", "--verbose"]
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "turbo.json",
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.parseArgs().verbose).toBe(true)
    await mod.main()
  })

  it("covers port with equals", async () => {
    mockCommon()
    process.argv = ["node", "dev.ts", "--port=4000"]
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: () => false,
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.parseArgs().port).toBe("4000")
  })
})
