import { EventEmitter } from "node:events"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check.ts coverage", () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("shouldRunTask handles missing package.json", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        readFileSync: vi.fn(() => {
          throw new Error("no pkg")
        }),
        existsSync: vi.fn(() => false),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      }
    })
    const mod = await import("../../../scripts/check.ts")
    const task = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }
    expect(mod.shouldRunTask(task as any)).toBe(true)
  })

  it("shouldRunTask filters based on scripts", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        readFileSync: vi.fn(() => JSON.stringify({ scripts: { lint: "biome lint" } })),
        existsSync: vi.fn((p: string) => {
          if (p.includes("cspell.json")) return false
          if (p.includes("knip.json")) return false
          if (p.includes("check-determinism")) return false
          if (p.includes("playwright")) return false
          if (p.includes("src/index.ts")) return false
          return false
        }),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      }
    })
    const mod = await import("../../../scripts/check.ts")
    const cspellTask = {
      id: "cspell",
      label: "cspell",
      cmd: ["pnpm", "cspell"],
      logFile: "04-cspell.log",
    }
    expect(mod.shouldRunTask(cspellTask as any)).toBe(false)
    const lintTask = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }
    expect(mod.shouldRunTask(lintTask as any)).toBe(true)
    const e2eTask = {
      id: "test:e2e:list",
      label: "e2e",
      cmd: ["pnpm", "test:e2e", "--", "--list"],
      logFile: "12-e2e-list.log",
    }
    expect(mod.shouldRunTask(e2eTask as any)).toBe(false)
    const sizeTask = {
      id: "size-limit",
      label: "size",
      cmd: ["pnpm", "size"],
      logFile: "07-size-limit.log",
    }
    expect(mod.shouldRunTask(sizeTask as any)).toBe(false)
  })

  it("hasSetsid returns boolean", async () => {
    const mod = await import("../../../scripts/check.ts")
    const result = mod.hasSetsid()
    expect(typeof result).toBe("boolean")
  })

  it("runTaskNode success", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    mockChild.pid = 1234
    mockChild.kill = vi.fn()

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => mockChild),
        execSync: vi.fn(),
        spawnSync: vi.fn(() => ({ status: 0 })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ scripts: {} })),
      }
    })

    const mod = await import("../../../scripts/check.ts")
    const task = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }
    const controller = new AbortController()
    const promise = mod.runTaskNode(task as any, controller.signal)
    // simulate output then close
    setTimeout(() => {
      mockChild.stdout.emit("data", Buffer.from("output\n"))
      mockChild.stderr.emit("data", Buffer.from("err\n"))
      mockChild.emit("close", 0)
    }, 10)
    const result = await promise
    expect(result.ok).toBe(true)
    expect(result.exit).toBe(0)
  })

  it("runTaskNode handles error", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    mockChild.pid = 1234
    mockChild.kill = vi.fn()

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => mockChild),
        execSync: vi.fn(),
        spawnSync: vi.fn(() => ({ status: 0 })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ scripts: {} })),
      }
    })

    const mod = await import("../../../scripts/check.ts")
    const task = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }

    const controller1 = new AbortController()
    const promise1 = mod.runTaskNode(task as any, controller1.signal)
    setTimeout(() => {
      mockChild.emit("error", new Error("spawn error"))
    }, 10)
    const result1 = await promise1
    expect(result1.ok).toBe(false)
  })

  it("runTaskNode handles abort", async () => {
    const mockChild2 = new EventEmitter() as any
    mockChild2.stdout = new EventEmitter()
    mockChild2.stderr = new EventEmitter()
    mockChild2.pid = 1235
    mockChild2.kill = vi.fn()
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => mockChild2),
        execSync: vi.fn(),
        spawnSync: vi.fn(() => ({ status: 0 })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ scripts: {} })),
      }
    })
    const mod2 = await import("../../../scripts/check.ts")
    const task = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }
    const controller2 = new AbortController()
    const promise2 = mod2.runTaskNode(task as any, controller2.signal)
    setTimeout(() => {
      controller2.abort()
      mockChild2.emit("close", 1)
    }, 10)
    const result2 = await promise2
    expect(result2.aborted).toBe(true)
  })

  it("runTask delegates to runTaskNode", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    mockChild.pid = 1234
    mockChild.kill = vi.fn()

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => mockChild),
        execSync: vi.fn(),
        spawnSync: vi.fn(() => ({ status: 0 })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ scripts: {} })),
      }
    })

    const mod = await import("../../../scripts/check.ts")
    const task = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }
    const controller = new AbortController()
    const promise = mod.runTask(task as any, controller.signal)
    setTimeout(() => {
      mockChild.emit("close", 0)
    }, 10)
    const result = await promise
    expect(result.ok).toBe(true)
  })

  it("main handles install failure", async () => {
    let spawnCall = 0
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => {
          spawnCall++
          const child = new EventEmitter() as any
          child.stdout = new EventEmitter()
          child.stderr = new EventEmitter()
          child.pid = 100 + spawnCall
          child.kill = vi.fn()
          setTimeout(() => child.emit("close", spawnCall === 1 ? 1 : 0), 10)
          return child
        }),
        execSync: vi.fn(),
        spawnSync: vi.fn(() => ({ status: 0 })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => JSON.stringify({ scripts: { install: "pnpm install" } })),
      }
    })

    const mod = await import("../../../scripts/check.ts")
    const originalExit = process.exit

    process.exit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as any
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("exit:1")
    } finally {
      process.exit = originalExit
    }
  })

  it("main success path", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        spawn: vi.fn(() => {
          const child = new EventEmitter() as any
          child.stdout = new EventEmitter()
          child.stderr = new EventEmitter()
          child.pid = 200
          child.kill = vi.fn()
          setTimeout(() => child.emit("close", 0), 10)
          return child
        }),
        execSync: vi.fn(),
        spawnSync: vi.fn(() => ({ status: 0 })),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() =>
          JSON.stringify({ scripts: { install: "pnpm install", lint: "lint", typecheck: "tsc" } }),
        ),
      }
    })

    const mod = await import("../../../scripts/check.ts")
    const originalExit = process.exit

    process.exit = vi.fn((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as any
    try {
      await mod.main()
    } catch (e: any) {
      expect(e.message).toContain("exit:0")
    } finally {
      process.exit = originalExit
    }
  })

  it("nowJst, log, getLogDir", async () => {
    const mod = await import("../../../scripts/check.ts")
    expect(typeof mod.nowJst()).toBe("string")
    mod.log("test")
    expect(typeof mod.getLogDir()).toBe("string")
    expect(mod.LOG_DIR).toBeDefined()
  })
})
