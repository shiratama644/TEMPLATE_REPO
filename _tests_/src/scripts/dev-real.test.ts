import { EventEmitter } from "node:events"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
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

describe("dev real fs coverage", () => {
  let tmp: string
  let origCwd: string
  let originalExit: any
  let originalOn: any

  beforeEach(() => {
    tmp = join(tmpdir(), `dev-real-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    origCwd = process.cwd()
    process.chdir(tmp)
    originalExit = process.exit
    originalOn = process.on

    process.exit = vi.fn() as any

    process.on = vi.fn() as any
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.chdir(origCwd)
    rmSync(tmp, { recursive: true, force: true })
    process.exit = originalExit
    process.on = originalOn
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("turbo.json", async () => {
    writeFileSync(join(tmp, "turbo.json"), "{}")
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("monorepo with turbo dep", async () => {
    mkdirSync(join(tmp, "packages"), { recursive: true })
    writeFileSync(join(tmp, "packages", "a.txt"), "a")
    writeFileSync(join(tmp, "package.json"), JSON.stringify({ dependencies: { turbo: "1.0.0" } }))
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("monorepo vite app", async () => {
    mkdirSync(join(tmp, "apps", "myapp"), { recursive: true })
    writeFileSync(join(tmp, "apps", "myapp", "vite.config.ts"), "")
    writeFileSync(join(tmp, "package.json"), JSON.stringify({}))
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("monorepo next app", async () => {
    mkdirSync(join(tmp, "apps", "myapp"), { recursive: true })
    writeFileSync(join(tmp, "package.json"), JSON.stringify({}))
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
        cmd: ["pnpm", "--filter", "myapp", "exec", "next", "dev"],
        env: {},
        log: "next log termux",
        isTermux: true,
      })),
      isNextJsProject: vi.fn(() => true),
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("monorepo generic", async () => {
    mkdirSync(join(tmp, "packages"), { recursive: true })
    writeFileSync(join(tmp, "packages", "a.txt"), "a")
    writeFileSync(join(tmp, "package.json"), JSON.stringify({}))
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("vite", async () => {
    writeFileSync(join(tmp, "vite.config.ts"), "")
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("next", async () => {
    writeFileSync(join(tmp, "next.config.js"), "")
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("src/index.ts with tsx", async () => {
    mkdirSync(join(tmp, "src"), { recursive: true })
    writeFileSync(join(tmp, "src", "index.ts"), "console.log('hi')")
    writeFileSync(join(tmp, "package.json"), JSON.stringify({ devDependencies: { tsx: "1.0.0" } }))
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("src/index.ts without tsx", async () => {
    mkdirSync(join(tmp, "src"), { recursive: true })
    writeFileSync(join(tmp, "src", "index.ts"), "console.log('hi')")
    writeFileSync(join(tmp, "package.json"), JSON.stringify({}))
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })

  it("src/index.ts read fail", async () => {
    mkdirSync(join(tmp, "src"), { recursive: true })
    writeFileSync(join(tmp, "src", "index.ts"), "console.log('hi')")
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
        existsSync: (p: string) => p.includes("src/index.ts"),
        readdirSync: () => [] as any,
        readFileSync: () => {
          throw new Error("fail")
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

  it("no framework", async () => {
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

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild()) }
    })
    const mod = await import("../../../scripts/dev.ts")
    await mod.main()
  })
})
