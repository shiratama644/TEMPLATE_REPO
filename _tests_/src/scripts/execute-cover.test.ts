import { EventEmitter } from "node:events"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("execute.ts coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("hasBuildOutput true/false", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p === "dist",
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

  it("hasBuildOutput scans apps/packages", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "apps" || p === "packages") return true
          if (p === "apps/web/dist" || p === "packages/ui/.next") return true
          return false
        },
        readdirSync: (dir: string) => {
          if (dir === "apps") return [{ name: "web", isDirectory: () => true } as any]
          if (dir === "packages") return [{ name: "ui", isDirectory: () => true } as any]
          return [] as any
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

  it("hasBuildOutput handles readdirSync error", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: () => false,
        readdirSync: () => {
          throw new Error("readdir fail")
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

  it("isNonFunctionalPath and isFunctionalPath", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isNonFunctionalPath("docs/README.md")).toBe(true)
    expect(mod.isNonFunctionalPath("src/index.ts")).toBe(false)
    expect(mod.isFunctionalPath("src/index.ts")).toBe(true)
    expect(mod.isFunctionalPath("README.md")).toBe(false)
    expect(mod.isFunctionalPath("docs/README.md")).toBe(false)
  })

  it("stripStringLiterals and isPureCommentLine and getCodeOnly", async () => {
    const mod = await import("../../../scripts/execute.ts")
    const stripped = mod.stripStringLiterals(`const a = "hello world"`)
    expect(stripped).toContain("__STR_")
    expect(mod.isPureCommentLine("// comment")).toBe(true)
    expect(mod.isPureCommentLine("const a = 1")).toBe(false)
    expect(mod.getCodeOnly(`const a = 1 // comment`)).toBe("const a = 1")
    expect(mod.getCodeOnly(`/* comment */ const a = 1`)).toBe("const a = 1")
  })

  it("isCommentOnlyDiff", async () => {
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.isCommentOnlyDiff("")).toBe(true)
    expect(mod.isCommentOnlyDiff("+// comment\n-// old comment")).toBe(true)
    expect(mod.isCommentOnlyDiff("+const a = 1\n-const a = 2")).toBe(false)
    expect(mod.isCommentOnlyDiff("+\n-\n")).toBe(true)
  })

  it("getChangedFiles and getDiffForFile handle errors", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn(() => {
          throw new Error("git error")
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
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false }
    })
    const mod = await import("../../../scripts/execute.ts")
    expect(mod.getChangedFiles()).toEqual([])
    expect(mod.getDiffForFile("src/index.ts")).toBe("")
  })

  it("hasFunctionalDiff no build output", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => false }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn(() => ({ status: 0, stdout: "" })),
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
    expect(mod.hasFunctionalDiff()).toBe(true)
  })

  it("hasFunctionalDiff no changed files", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: (p: string) => p === "dist" }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn(() => ({ status: 0, stdout: "" })),
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

  it("hasFunctionalDiff with functional and non-functional", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: (p: string) => p === "dist" || p === "src" }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawnSync: vi.fn((cmd: string, args: string[]) => {
          if (Array.isArray(args) && args.includes("--name-only")) {
            return { status: 0, stdout: "src/index.ts\ndocs/README.md\n" }
          }
          if (Array.isArray(args) && args.includes("src/index.ts")) {
            return { status: 0, stdout: "+const a = 1\n" }
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
    expect(mod.hasFunctionalDiff()).toBe(true)
  })

  it("hasFunctionalDiff comment only", async () => {
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
          return { status: 0, stdout: "+// comment only\n" }
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

  it("spawnProcess", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    mockChild.kill = vi.fn()

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => mockChild),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "" })),
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
    const child = mod.spawnProcess("TEST", "\x1b[32m", ["echo", "hi"], process.cwd(), {
      EXTRA: "1",
    })
    expect(child).toBe(mockChild)
    mockChild.stdout.emit("data", Buffer.from("line1\nline2\n"))
    mockChild.stdout.emit("data", Buffer.from("partial"))
    mockChild.stdout.emit("end")
  })

  it("runCommand success", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => {
          const c = new EventEmitter() as any
          setTimeout(() => c.emit("close", 0), 10)
          return c
        }),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "" })),
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
    const mod2 = await import("../../../scripts/execute.ts")
    const code = await mod2.runCommand("TEST", "\x1b[32m", ["echo", "hi"])
    expect(code).toBe(0)
  })

  it("runCommand error", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => {
          const c = new EventEmitter() as any
          setTimeout(() => c.emit("error", new Error("spawn fail")), 10)
          return c
        }),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "" })),
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
    const code = await mod.runCommand("TEST", "\x1b[32m", ["echo", "hi"])
    expect(code).toBe(1)
  })

  it("main install fails", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => {
          const child = new EventEmitter() as any
          setTimeout(() => child.emit("close", 1), 10)
          return child
        }),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "dist" })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => true }
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
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("main full success with no parallel", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => {
          const child = new EventEmitter() as any
          setTimeout(() => child.emit("close", 0), 10)
          return child
        }),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "" })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return { ...actual, existsSync: () => true }
    })
    vi.doMock("../../../scripts/lib/cache.ts", () => ({
      getProjectSourceHash: vi.fn(() => "hash"),
      isBuildCacheValid: vi.fn(() => true),
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
    // override EXEC_CONFIG to empty

    mod.EXEC_CONFIG.parallel = []
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("logLine handles empty", async () => {
    const mod = await import("../../../scripts/execute.ts")
    mod.logLine("TEST", "\x1b[32m", "   ")
    mod.logLine("TEST", "\x1b[32m", "hello")
  })
})
