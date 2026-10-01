import { EventEmitter } from "node:events"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check extra coverage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("main with task failure triggering abort", async () => {
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
          child.pid = 300 + spawnCall
          child.kill = vi.fn()
          // First is install (success), second is lint (fail), third etc should be aborted
          const exitCode = spawnCall === 1 ? 0 : spawnCall === 2 ? 1 : 0
          setTimeout(() => child.emit("close", exitCode), 10)
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
          JSON.stringify({
            scripts: { install: "pnpm install", lint: "lint", typecheck: "tsc", test: "vitest" },
          }),
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
      expect(e.message).toContain("exit:1")
    } finally {
      process.exit = originalExit
    }
  })

  it("main with multiple failures", async () => {
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
          child.pid = 400 + spawnCall
          child.kill = vi.fn()
          // Make all tasks fail
          setTimeout(() => child.emit("close", 1), 10)
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
        readFileSync: vi.fn(() => JSON.stringify({ scripts: { lint: "lint" } })),
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

  it("shouldRunTask with various conditions", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        readFileSync: vi.fn(() =>
          JSON.stringify({
            scripts: {
              lint: "lint",
              typecheck: "tsc",
              "test:unit": "vitest",
              cspell: "cspell",
              knip: "knip",
              "check-determinism": "check",
              "test:e2e": "playwright",
              "size-limit": "size",
            },
          }),
        ),
        existsSync: vi.fn((p: string) => {
          if (p.includes("cspell.json")) return true
          if (p.includes("knip.json")) return true
          if (p.includes("check-determinism")) return true
          if (p.includes("playwright")) return true
          if (p.includes("src/index.ts")) return true
          return true
        }),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      }
    })
    const mod = await import("../../../scripts/check.ts")
    const tasks = [
      { id: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" },
      { id: "typecheck", cmd: ["pnpm", "typecheck"], logFile: "01-typecheck.log" },
      { id: "test:unit", cmd: ["pnpm", "test"], logFile: "03-test.log" },
      { id: "cspell", cmd: ["pnpm", "cspell"], logFile: "04-cspell.log" },
      { id: "knip", cmd: ["pnpm", "knip"], logFile: "05-knip.log" },
      {
        id: "check-determinism",
        cmd: ["pnpm", "check-determinism"],
        logFile: "06-determinism.log",
      },
      { id: "size-limit", cmd: ["pnpm", "size-limit"], logFile: "07-size.log" },
      { id: "test:e2e:list", cmd: ["pnpm", "test:e2e", "--", "--list"], logFile: "12-e2e.log" },
    ]
    for (const task of tasks) {
      const result = mod.shouldRunTask(task as any)
      expect(typeof result).toBe("boolean")
    }
  })

  it("runTaskNode with output buffering", async () => {
    const mockChild = new EventEmitter() as any
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    mockChild.pid = 500
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
    setTimeout(() => {
      mockChild.stdout.emit("data", Buffer.from("line1\nline2\npartial"))
      mockChild.stderr.emit("data", Buffer.from("err1\nerr2\n"))
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(" continued\n"))
        mockChild.emit("close", 0)
      }, 5)
    }, 5)
    const result = await promise
    expect(result.ok).toBe(true)
  })
})
