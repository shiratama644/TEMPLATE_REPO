import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("build 100% extra", () => {
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

  it("hasMonorepoStructure with pnpm-workspace.yaml", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "pnpm-workspace.yaml",
        readdirSync: () => [] as any,
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      logCacheStats: vi.fn(),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({})),
      logDetectionResult: vi.fn(),
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
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawnSync: vi.fn(() => ({ status: 0 })) }
    })
    const mod = await import("../../../scripts/build.ts")
    expect(mod.hasMonorepoStructure()).toBe(true)
  })

  it("covers vite termux log", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash123"),
      isBuildCacheValid: vi.fn(() => false),
      logCacheStats: vi.fn(),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({})),
      logDetectionResult: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "exec", "next", "build"],
        env: {},
        log: "next termux log",
        isTermux: false,
      })),
      logNextTermuxInfo: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      getViteBuildConfigForTermux: vi.fn(() => ({
        isTermux: true,
        env: {},
        reason: "termux vite reason",
      })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => typeof p === "string" && p.includes("vite.config"),
        readdirSync: actual.readdirSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawnSync: vi.fn(() => ({ status: 0 })) }
    })
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers next cache valid log", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash123"),
      isBuildCacheValid: vi.fn(() => true),
      logCacheStats: vi.fn(),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({})),
      logDetectionResult: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "exec", "next", "build"],
        env: {},
        log: "next log",
        isTermux: false,
      })),
      logNextTermuxInfo: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      getViteBuildConfigForTermux: vi.fn(() => ({ isTermux: false, env: {}, reason: "" })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => typeof p === "string" && p.includes("next.config"),
        readdirSync: actual.readdirSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawnSync: vi.fn(() => ({ status: 0 })) }
    })
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("covers tsc cache hit", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash123"),
      isBuildCacheValid: vi.fn(() => true),
      logCacheStats: vi.fn(),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/detector.ts", () => ({
      detectAll: vi.fn(() => ({})),
      logDetectionResult: vi.fn(),
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
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "tsconfig.json",
        readdirSync: actual.readdirSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawnSync: vi.fn(() => ({ status: 0 })) }
    })
    const mod = await import("../../../scripts/build.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })
})
