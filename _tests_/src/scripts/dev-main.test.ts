import { EventEmitter } from "node:events"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function mockChild() {
  const child = new EventEmitter() as any
  child.kill = vi.fn()
  child.on = vi.fn((ev: string, cb: any) => {
    if (ev === "close") setTimeout(() => cb(0), 5)
    return child
  })
  return child
}

describe("dev.ts main coverage", () => {
  let originalExit: any
  let originalOn: any
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    originalExit = process.exit
    originalOn = process.on

    process.exit = vi.fn() as any

    process.on = vi.fn() as any
  })
  afterEach(() => {
    process.exit = originalExit
    process.on = originalOn
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("main turbo.json", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
        existsSync: (p: string) => p === "turbo.json",
        readdirSync: () => [] as any,
        readFileSync: actual.readFileSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("main monorepo with turbo dep", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
        existsSync: (p: string) =>
          p === "packages" || p === "pnpm-workspace.yaml" || p === "package.json",
        readdirSync: () => ["app"] as any,
        readFileSync: (p: string) => {
          if (String(p).includes("package.json"))
            return JSON.stringify({ dependencies: { turbo: "1.0.0" } })
          return actual.readFileSync(p as any)
        },
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("main monorepo vite app", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
          if (p === "packages") return true
          if (p === "apps") return true
          if (p.includes("vite.config")) return true
          if (p === "package.json") return true
          return false
        },
        readdirSync: (p: string) => {
          if (p === "apps") return ["myapp"] as any
          if (p === "packages") return ["ui"] as any
          return [] as any
        },
        readFileSync: (p: string) => {
          if (String(p).includes("package.json")) return JSON.stringify({})
          return actual.readFileSync(p as any)
        },
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("main vite", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
      getEnvironmentInfo: vi.fn(() => ({ isTermux: true, isCI: false })),
      getViteBuildConfigForTermux: vi.fn(() => ({
        isTermux: true,
        env: {},
        reason: "termux reason",
      })),
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
        existsSync: (p: string) => typeof p === "string" && p.includes("vite.config"),
        readdirSync: () => [] as any,
        readFileSync: actual.readFileSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("main next.js", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
        log: "next log",
        isTermux: true,
      })),
      isNextJsProject: vi.fn(() => false),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: true, isCI: false })),
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
        existsSync: (p: string) => typeof p === "string" && p.includes("next.config"),
        readdirSync: () => [] as any,
        readFileSync: actual.readFileSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("main src/index.ts with tsx", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
        existsSync: (p: string) => p.includes("src/index.ts") || p === "package.json",
        readdirSync: () => [] as any,
        readFileSync: (p: string) => {
          if (String(p).includes("package.json"))
            return JSON.stringify({ devDependencies: { tsx: "1.0.0" } })
          return actual.readFileSync(p as any)
        },
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("main no framework", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({ logCacheStats: vi.fn() }))
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
        existsSync: () => false,
        readdirSync: () => [] as any,
        readFileSync: actual.readFileSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("run handles spawn error and signals", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.kill = vi.fn()
    mockChild.on = vi.fn((ev: string, cb: any) => {
      if (ev === "error") setTimeout(() => cb(new Error("fail")), 5)
      return mockChild
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => mockChild),
      }
    })
    const origVitest = process.env.VITEST
    const origWorker = process.env.VITEST_WORKER_ID
    delete process.env.VITEST
    delete process.env.VITEST_WORKER_ID
    const mod = await import("../../../scripts/dev.ts")
    mod.run(["echo", "hi"], process.cwd(), { EXTRA: "1" })
    await new Promise((r) => setTimeout(r, 20))
    expect(process.exit).toHaveBeenCalled()
    if (origVitest !== undefined) process.env.VITEST = origVitest
    if (origWorker !== undefined) process.env.VITEST_WORKER_ID = origWorker
  })
})
