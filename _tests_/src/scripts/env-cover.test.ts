import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check-env coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("covers isNext true and isTermux true branches", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getCacheConfig: vi.fn(() => ({
        vite: { paths: ["a"] },
        next: { paths: ["b"] },
        turbo: { paths: ["c"] },
      })),
      getProjectSourceHash: vi.fn(() => "hash123"),
      logCacheStats: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      isNextJsProject: vi.fn(() => true),
      logNextTermuxInfo: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: true, isCI: true, platform: "linux" })),
      getNextJsBuildConfigForTermux: vi.fn(() => ({
        useWebpack: true,
        args: ["--webpack"],
        env: { WEBPACK: "1" },
      })),
      getViteBuildConfigForTermux: vi.fn(() => ({ isTermux: true, env: { TERMUX: "1" } })),
      logEnvironmentInfo: vi.fn(),
    }))

    const mod = await import("../../../scripts/check-env.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = mod.runCheckEnv()
    expect(result.envInfo.isTermux).toBe(true)
    expect(result.isNext).toBe(true)
    spy.mockRestore()
  })

  it("covers isNext false branch", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getCacheConfig: vi.fn(() => ({
        vite: { paths: ["a"] },
        next: { paths: ["b"] },
        turbo: { paths: ["c"] },
      })),
      getProjectSourceHash: vi.fn(() => "hash123"),
      logCacheStats: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      isNextJsProject: vi.fn(() => false),
      logNextTermuxInfo: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false, platform: "linux" })),
      getNextJsBuildConfigForTermux: vi.fn(() => ({ useWebpack: false, args: [], env: {} })),
      getViteBuildConfigForTermux: vi.fn(() => ({ isTermux: false, env: {} })),
      logEnvironmentInfo: vi.fn(),
    }))

    const mod = await import("../../../scripts/check-env.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = mod.runCheckEnv()
    expect(result.isNext).toBe(false)
    expect(result.envInfo.isTermux).toBe(false)
    spy.mockRestore()
  })

  it("covers main", async () => {
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getCacheConfig: vi.fn(() => ({
        vite: { paths: ["a"] },
        next: { paths: ["b"] },
        turbo: { paths: ["c"] },
      })),
      getProjectSourceHash: vi.fn(() => "hash123"),
      logCacheStats: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      isNextJsProject: vi.fn(() => false),
      logNextTermuxInfo: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false, platform: "linux" })),
      getNextJsBuildConfigForTermux: vi.fn(() => ({ useWebpack: false, args: [], env: {} })),
      getViteBuildConfigForTermux: vi.fn(() => ({ isTermux: false, env: {} })),
      logEnvironmentInfo: vi.fn(),
    }))
    const mod = await import("../../../scripts/check-env.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    mod.main()
    spy.mockRestore()
  })
})
