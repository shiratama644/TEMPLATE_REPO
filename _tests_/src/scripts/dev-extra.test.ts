import { EventEmitter } from "node:events"
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

describe("dev extra coverage", () => {
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

  it("main monorepo next.js app", async () => {
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

    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "packages" || p === "apps" || p === "apps/myapp") return true
          if (p === "package.json") return true
          return false
        },
        readdirSync: (p: string) => {
          if (p === "apps") return ["myapp"] as any
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

  it("main src/index.ts without tsx", async () => {
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

  it("main src/index.ts with readFileSync throwing", async () => {
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
          throw new Error("read fail")
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

  it("main monorepo without turbo and without apps vite/next", async () => {
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
        existsSync: (p: string) => p === "packages" || p === "package.json",
        readdirSync: (p: string) => {
          if (p === "packages") return ["ui"] as any
          if (p === "apps") return [] as any
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

  it("hasMonorepoStructure with pnpm-workspace.yaml", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "pnpm-workspace.yaml",
        readdirSync: () => [] as any,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.hasMonorepoStructure()).toBe(true)
  })

  it("hasFile with various extensions", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "vite.config.ts" || p === "vite.config.mjs",
        readdirSync: actual.readdirSync,
      }
    })
    const mod = await import("../../../scripts/dev.ts")
    expect(mod.hasFile("vite.config")).toBe(true)
    expect(mod.hasFile("vite.config.mjs")).toBe(true)
    expect(mod.hasAnyFile(["vite.config", "next.config"])).toBe(true)
  })

  it("run shutdown and error handling", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.kill = vi.fn(() => {
      throw new Error("kill fail")
    })
    mockChild.on = vi.fn(() => mockChild)
    let sigintCb: any
    let sigtermCb: any
    const origOn = process.on

    process.on = vi.fn((ev: string, cb: any) => {
      if (ev === "SIGINT") sigintCb = cb
      if (ev === "SIGTERM") sigtermCb = cb
      return process as any
    }) as any
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(() => mockChild) }
    })
    const mod = await import("../../../scripts/dev.ts")
    mod.run(["echo", "hi"])
    // Trigger shutdown
    if (sigintCb) sigintCb()
    if (sigtermCb) sigtermCb()
    await new Promise((r) => setTimeout(r, 10))
    process.on = origOn
  })

  it("hasTurboInDeps catch", async () => {
    const tmp = join(tmpdir(), `dev-turbo-catch-${Date.now()}`)
    const { mkdirSync, rmSync, writeFileSync } = await import("node:fs")
    mkdirSync(tmp, { recursive: true })
    const origCwd = process.cwd()
    process.chdir(tmp)
    mkdirSync(join(tmp, "packages"), { recursive: true })
    writeFileSync(join(tmp, "packages", "a.txt"), "a")
    // No package.json, so readFileSync will throw, triggering catch returning false
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
    process.chdir(origCwd)
    rmSync(tmp, { recursive: true, force: true })
  })
})
