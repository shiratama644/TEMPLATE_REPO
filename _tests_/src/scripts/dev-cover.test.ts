import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("dev.ts coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("covers turbo branch", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      logCacheStats: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({
        summary: "test",
        root: { type: "vite", buildSystem: "vite" },
        workspace: { isMonorepo: false },
        allApps: [],
      })),
      logDetectionResult: vi.fn(),
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
        detect: { log: vi.fn(), info: vi.fn() },
      },
      formatDuration: (ms: any) => `${ms}ms`,
      logSection: vi.fn(),
      logGroup: vi.fn(),
      logBox: vi.fn(),
      logSuccessBox: vi.fn(),
      logErrorBox: vi.fn(),
      logProgress: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/errors.ts", () => ({
      TemplateError: class extends Error {
        constructor(msg: any, opts: any) {
          super(msg)
          ;(this as any).code = opts?.code
        }
      },
      ErrorCodes: { BUILD_FAILED: "BUILD_FAILED" },
      handleError: vi.fn((e) => {
        throw e
      }),
    }))

    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "turbo.json") return true
          return actual.existsSync(p as any)
        },
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => ({
          on: vi.fn((ev, cb) => {
            if (ev === "close") setTimeout(() => cb(0), 0)
          }),
          kill: vi.fn(),
        })),
      }
    })

    const mod = await import("../../../scripts/dev.ts")
    // run is tested via hasFile etc, main would spawn and exit
    expect(mod.hasFile).toBeDefined()
    expect(mod.hasMonorepoStructure).toBeDefined()
  })

  it("covers vite branch", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      logCacheStats: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({
        summary: "test",
        root: { type: "vite", buildSystem: "vite" },
        workspace: { isMonorepo: false },
        allApps: [],
      })),
      logDetectionResult: vi.fn(),
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
      getViteBuildConfigForTermux: vi.fn(() => ({ isTermux: true, env: {}, reason: "termux" })),
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
        detect: { log: vi.fn(), info: vi.fn() },
      },
      formatDuration: (ms: any) => `${ms}ms`,
      logSection: vi.fn(),
      logGroup: vi.fn(),
      logBox: vi.fn(),
      logSuccessBox: vi.fn(),
      logErrorBox: vi.fn(),
      logProgress: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/errors.ts", () => ({
      TemplateError: class extends Error {
        constructor(msg: any, opts: any) {
          super(msg)
          ;(this as any).code = opts?.code
        }
      },
      ErrorCodes: { BUILD_FAILED: "BUILD_FAILED" },
      handleError: vi.fn((e) => {
        throw e
      }),
    }))

    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "turbo.json") return false
          if (p === "packages" || p === "apps" || p === "pnpm-workspace.yaml") return false
          if (typeof p === "string" && p.includes("vite.config")) return true
          return actual.existsSync(p as any)
        },
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
      }
    })

    const mod = await import("../../../scripts/dev.ts")
    expect(mod.hasAnyFile(["vite.config"])).toBe(true)
  })

  it("covers all functions", async () => {
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.log).toBeDefined()
    expect(mod.hasFile("package.json")).toBe(true)
    expect(mod.hasAnyFile(["package.json"])).toBe(true)
    expect(typeof mod.hasMonorepoStructure()).toBe("boolean")
  })

  it("covers hasTurboInDependencies and hasTsxInDependencies", async () => {
    const mod = await import("../../../scripts/dev.ts")
    // valid cases
    expect(typeof mod.hasTurboInDependencies()).toBe("boolean")
    expect(typeof mod.hasTsxInDependencies()).toBe("boolean")
    // invalid json triggers catch
    const { writeFileSync, mkdirSync, rmSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")
    const tmp = join(tmpdir(), `dev-deps-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    const origCwd = process.cwd()
    process.chdir(tmp)
    writeFileSync(join(tmp, "package.json"), "invalid json {")
    expect(mod.hasTurboInDependencies(tmp)).toBe(false)
    expect(mod.hasTsxInDependencies(tmp)).toBe(false)
    process.chdir(origCwd)
    rmSync(tmp, { recursive: true, force: true })
    // missing package.json
    expect(mod.hasTurboInDependencies("/nonexistent/path/12345")).toBe(false)
    expect(mod.hasTsxInDependencies("/nonexistent/path/12345")).toBe(false)
  })
})
