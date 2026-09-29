import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("termux fallback detection", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.TERMUX_VERSION
    delete process.env.PREFIX
    delete process.env.TERMUX__USER_ID
    delete process.env.TERMUX_API_VERSION
    delete process.env.ANDROID_ROOT
    delete process.env.ANDROID_DATA
    delete process.env.CI
    delete process.env.NODE_OPTIONS
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("log with isTermux true but no prefix/version", async () => {
    process.env.TERMUX_VERSION = "1.0"
    delete process.env.PREFIX
    const { logEnvironmentInfo } = await import("../../../scripts/lib/termux.ts")
    expect(() => logEnvironmentInfo()).not.toThrow()
  })

  it("log with isTermux true via ANDROID_DATA no prefix/version fallback", async () => {
    process.env.ANDROID_DATA = "/data/data/com.termux"
    delete process.env.PREFIX
    delete process.env.TERMUX_VERSION
    const { logEnvironmentInfo, getEnvironmentInfo } = await import(
      "../../../scripts/lib/termux.ts"
    )
    const info = getEnvironmentInfo()
    expect(info.isTermux).toBe(true)
    expect(info.prefix).toBeUndefined()
    expect(info.termuxVersion).toBeUndefined()
    expect(() => logEnvironmentInfo()).not.toThrow()
  })

  it("log with isTermux true with multiple reasons", async () => {
    process.env.TERMUX_VERSION = "1.0"
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    process.env.TERMUX__USER_ID = "0"
    process.env.ANDROID_DATA = "/data/data/com.termux"
    process.env.TERMUX_API_VERSION = "1.0"
    const { logEnvironmentInfo, getEnvironmentInfo } = await import(
      "../../../scripts/lib/termux.ts"
    )
    const info = getEnvironmentInfo()
    expect(info.detectionReasons.length).toBeGreaterThan(3)
    expect(() => logEnvironmentInfo()).not.toThrow()
  })

  it("getNextJsBuildConfigForTermux with termux", async () => {
    process.env.TERMUX_VERSION = "1.0"
    const { getNextJsBuildConfigForTermux } = await import("../../../scripts/lib/termux.ts")
    const config = getNextJsBuildConfigForTermux()
    expect(config.useWebpack).toBe(true)
    expect(config.args.includes("--webpack")).toBe(true)
  })

  it("getViteBuildConfigForTermux with termux", async () => {
    process.env.TERMUX_VERSION = "1.0"
    const { getViteBuildConfigForTermux } = await import("../../../scripts/lib/termux.ts")
    const config = getViteBuildConfigForTermux()
    expect(config.isTermux).toBe(true)
  })

  it("getNextJsBuildConfigForTermux with NODE_OPTIONS", async () => {
    process.env.TERMUX_VERSION = "1.0"
    process.env.NODE_OPTIONS = "--max-old-space-size=4096"
    const { getNextJsBuildConfigForTermux } = await import("../../../scripts/lib/termux.ts")
    const config = getNextJsBuildConfigForTermux()
    expect(config.env.NODE_OPTIONS).toContain("--max-old-space-size=4096")
  })
})
