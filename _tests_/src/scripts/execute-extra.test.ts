import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("execute extra coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("hasBuildOutput with apps/packages", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "dist") return false
          if (p === "apps" || p === "packages") return true
          if (p === "apps/web/dist" || p === "packages/ui/dist") return true
          return false
        },
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(), spawnSync: vi.fn(() => ({ status: 0, stdout: "" })) }
    })
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.hasBuildOutput()).toBe(true)
  })

  it("hasBuildOutput with file and directory entries", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "apps" || p === "packages") return true
          if (p === "apps/web/dist") return true
          return false
        },
        readdirSync: (dir: string, _opts: any) => {
          if (dir === "apps")
            return [
              { name: "web", isDirectory: () => true },
              { name: "file.txt", isDirectory: () => false },
            ] as any
          if (dir === "packages") return [] as any
          return (actual as any).readdirSync(dir, _opts)
        },
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(), spawnSync: vi.fn(() => ({ status: 0, stdout: "" })) }
    })
    const mod2 = await import("../../../scripts/execute.ts")
    expect(mod2.hasBuildOutput()).toBe(true)
  })

  it("hasBuildOutput catch", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "apps" || p === "packages") return true
          return false
        },
        readdirSync: () => {
          throw new Error("fail")
        },
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return { ...actual, spawn: vi.fn(), spawnSync: vi.fn(() => ({ status: 0, stdout: "" })) }
    })
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.hasBuildOutput()).toBe(false)
  })

  it("isCommentOnlyDiff with various cases", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isCommentOnlyDiff("+const a = 1\n+const b = 1")).toBe(false)
    expect(mod.isCommentOnlyDiff("+// comment\n+/* comment */")).toBe(true)
    expect(mod.isCommentOnlyDiff("+# comment\n+<!-- comment -->")).toBe(true)
    expect(mod.isCommentOnlyDiff("+const a = 1\n-const a = 1")).toBe(true) // same code added and removed
    expect(mod.isCommentOnlyDiff("+const a = 1\n+const a = 1")).toBe(false) // duplicate but not same as removed
  })

  it("getChangedFiles with non-zero status", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn(() => ({ status: 1, stdout: "" })),
        spawn: vi.fn(),
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false }
    })
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.getChangedFiles()).toEqual([])
  })

  it("getDiffForFile with non-zero status", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn(() => ({ status: 1, stdout: "" })),
        spawn: vi.fn(),
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false }
    })
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.getDiffForFile("src/index.ts")).toBe("")
  })

  it("hasFunctionalDiff with non-functional only", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: (p: string) => p === "dist" }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn((cmd: string, args: string[]) => {
          if (Array.isArray(args) && args.includes("--name-only")) {
            return { status: 0, stdout: "docs/README.md\nREADME.md\n" }
          }
          return { status: 0, stdout: "" }
        }),
        spawn: vi.fn(),
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.hasFunctionalDiff()).toBe(false)
  })

  it("hasFunctionalDiff with diff empty for functional file", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: (p: string) => p === "dist" }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn((cmd: string, args: string[]) => {
          if (Array.isArray(args) && args.includes("--name-only")) {
            return { status: 0, stdout: "src/index.ts\n" }
          }
          return { status: 0, stdout: "" }
        }),
        spawn: vi.fn(),
      }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => false),
      saveBuildCache: vi.fn(),
    }))
    vi.doMock("../../../scripts/lib/next-termux.ts", () => ({
      getNextBuildCommandForTermux: vi.fn(() => ({
        cmd: ["pnpm", "build"],
        env: {},
        log: "log",
        isTermux: false,
      })),
    }))
    vi.doMock("../../../scripts/lib/termux.ts", () => ({
      getEnvironmentInfo: vi.fn(() => ({ isTermux: false, isCI: false })),
      logEnvironmentInfo: vi.fn(),
    }))
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.hasFunctionalDiff()).toBe(false)
  })
})
