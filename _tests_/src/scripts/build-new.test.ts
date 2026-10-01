import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("build.ts new frameworks", () => {
  let originalArgv: string[]
  beforeEach(() => {
    originalArgv = [...process.argv]
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  const mockCommon = () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      logCacheStats: vi.fn(),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({
        summary: "test",
        root: { type: "vite", buildSystem: "vite" },
        workspace: { isMonorepo: false },
        allApps: [],
      })),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "exec", "next", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
      logNextTermuxInfo: vi.fn(),
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
      TemplateError: class extends Error {
        constructor(msg: string, opts: any) {
          super(msg)
          ;(this as any).code = opts?.code
        }
      },
      ErrorCodes: { BUILD_FAILED: "BUILD_FAILED" },
      handleError: vi.fn(),
    }))
  }

  const mockFs = (existsFn: (p: string) => boolean) => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: existsFn,
        readdirSync: actual.readdirSync,
      }
    })
  }

  const mockSpawn = (status: number) => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawnSync: vi.fn(() => ({ status })) }
    })
  }

  it("covers astro branch", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("astro.config"))
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers astro failure", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("astro.config"))
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers sveltekit branch", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("svelte.config"))
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers sveltekit failure", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("svelte.config"))
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers nuxt branch", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("nuxt.config"))
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers nuxt failure", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("nuxt.config"))
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers remix branch", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && (p.includes("remix.config") || p === "app/root.tsx"))
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers remix failure", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && (p.includes("remix.config") || p === "app/root.tsx"))
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers hono branch", async () => {
    mockCommon()
    mockFs((p) => p === "wrangler.toml" || p === "wrangler.jsonc")
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers turbo failure", async () => {
    mockCommon()
    mockFs((p) => p === "turbo.json")
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers vite failure", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("vite.config"))
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers next failure", async () => {
    mockCommon()
    mockFs((p) => typeof p === "string" && p.includes("next.config"))
    mockSpawn(1)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("covers help flag", async () => {
    mockCommon()
    process.argv = ["node", "build.ts", "--help"]
    mockFs(() => false)
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers cache hit with force", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => true),
      logCacheStats: vi.fn(),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({
        summary: "test",
        root: { type: "vite", buildSystem: "vite" },
        workspace: { isMonorepo: false },
        allApps: [],
      })),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "exec", "next", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
      logNextTermuxInfo: vi.fn(),
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
    process.argv = ["node", "build.ts", "--force"]
    mockFs((p) => p === "tsconfig.json")
    mockSpawn(0)
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })
})
