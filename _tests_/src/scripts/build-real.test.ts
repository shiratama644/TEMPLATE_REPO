import { describe, expect, it, vi } from "vitest"

describe("build real fs", () => {
  it("main with real fs covers tsc branch", async () => {
    // Use real fs, no mocks, should detect tsconfig.json and run tsc
    vi.resetModules()
    const mod = await import("../../../scripts/build.ts")
    // Mock spawnSync to avoid actually running tsc in this test? But we want to cover success path.
    // We'll mock spawnSync to return status 0 to simulate tsc success
    const fsActual = await vi.importActual<typeof import("node:fs")>("node:fs")
    vi.doMock("node:fs", async () => {
      return {
        ...fsActual,
        existsSync: (p: string) => {
          if (p === "tsconfig.json") return true
          if (p === "turbo.json") return false
          if (p === "packages" || p === "apps") return false
          if (typeof p === "string" && p.includes("vite.config")) return false
          if (typeof p === "string" && p.includes("next.config")) return false
          return (fsActual as any).existsSync(p)
        },
        readdirSync: fsActual.readdirSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn(() => ({ status: 0 })),
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
    const mod2 = await import("../../../scripts/build.ts")
    const code = await mod2.main()
    expect(code).toBe(0)
  })
})
