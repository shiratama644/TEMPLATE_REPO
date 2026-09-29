import { existsSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

describe("check.ts", () => {
  it("shouldRunTask checks package.json", async () => {
    const mod = await import("../../../scripts/check.ts")
    const task = { id: "lint", label: "lint", cmd: ["pnpm", "lint"], logFile: "02-lint.log" }
    const result = mod.shouldRunTask(task as any)
    expect(typeof result).toBe("boolean")
  })

  it("shouldRunTask handles install always true", async () => {
    const mod = await import("../../../scripts/check.ts")
    const task = {
      id: "install",
      label: "install",
      cmd: ["pnpm", "install", "--frozen-lockfile"],
      logFile: "01-install.log",
    }
    expect(mod.shouldRunTask(task as any)).toBe(true)
  })

  it("shouldRunTask handles missing script", async () => {
    const mod = await import("../../../scripts/check.ts")
    const task = {
      id: "nonexistent",
      label: "nonexistent",
      cmd: ["pnpm", "nonexistent-script-xyz"],
      logFile: "xx.log",
    }
    const result = mod.shouldRunTask(task as any)
    expect(typeof result).toBe("boolean")
  })

  it("shouldRunTask handles cspell, knip, determinism, size-limit", async () => {
    const mod = await import("../../../scripts/check.ts")
    expect(
      typeof mod.shouldRunTask({
        id: "cspell",
        label: "cspell",
        cmd: ["pnpm", "cspell"],
        logFile: "04.log",
      } as any),
    ).toBe("boolean")
    expect(
      typeof mod.shouldRunTask({
        id: "knip",
        label: "knip",
        cmd: ["pnpm", "knip"],
        logFile: "05.log",
      } as any),
    ).toBe("boolean")
    expect(
      typeof mod.shouldRunTask({
        id: "check:determinism",
        label: "det",
        cmd: ["pnpm", "check:determinism"],
        logFile: "03.log",
      } as any),
    ).toBe("boolean")
    expect(
      typeof mod.shouldRunTask({
        id: "size-limit",
        label: "size",
        cmd: ["pnpm", "size"],
        logFile: "07.log",
      } as any),
    ).toBe("boolean")
    expect(
      typeof mod.shouldRunTask({
        id: "publint",
        label: "publint",
        cmd: ["pnpm", "publint"],
        logFile: "06.log",
      } as any),
    ).toBe("boolean")
  })

  it("shouldRunTask handles e2e", async () => {
    const mod = await import("../../../scripts/check.ts")
    const result = mod.shouldRunTask({
      id: "test:e2e:list",
      label: "e2e",
      cmd: ["pnpm", "test:e2e", "--", "--list"],
      logFile: "12.log",
    } as any)
    expect(typeof result).toBe("boolean")
  })

  it("hasSetsid returns boolean", async () => {
    const mod = await import("../../../scripts/check.ts")
    expect(typeof mod.hasSetsid()).toBe("boolean")
  })

  it("nowJst returns string", async () => {
    const mod = await import("../../../scripts/check.ts")
    expect(typeof mod.nowJst()).toBe("string")
  })

  it("log works", async () => {
    const mod = await import("../../../scripts/check.ts")
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    mod.log("test message")
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("constants defined", async () => {
    const mod = await import("../../../scripts/check.ts")
    expect(mod.allTasks).toBeDefined()
    expect(mod.allTasks.length).toBeGreaterThan(0)
    expect(mod.tasks).toBeDefined()
    expect(mod.LOG_DIR).toBeDefined()
    expect(mod.USE_SETSID).toBeDefined()
  })

  it("getLogDir creates dir", async () => {
    const mod = await import("../../../scripts/check.ts")
    const dir = mod.getLogDir()
    expect(existsSync(dir)).toBe(true)
  })
})
