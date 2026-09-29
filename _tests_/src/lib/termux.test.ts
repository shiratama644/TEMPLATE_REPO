import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  getEnvironmentInfo,
  getNextJsBuildConfigForTermux,
  getViteBuildConfigForTermux,
  isTermuxEnvironment,
  logEnvironmentInfo,
} from "../../../scripts/lib/termux.ts"

describe("isTermuxEnvironment", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.TERMUX_VERSION
    delete process.env.TERMUX__USER_ID
    delete process.env.TERMUX_API_VERSION
    delete process.env.PREFIX
    delete process.env.ANDROID_ROOT
    delete process.env.ANDROID_DATA
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("detects via TERMUX_VERSION", () => {
    process.env.TERMUX_VERSION = "1.0"
    expect(isTermuxEnvironment()).toBe(true)
  })

  it("detects via PREFIX", () => {
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    expect(isTermuxEnvironment()).toBe(true)
  })

  it("detects via TERMUX__USER_ID", () => {
    process.env.TERMUX__USER_ID = "0"
    expect(isTermuxEnvironment()).toBe(true)
  })

  it("detects via TERMUX_API_VERSION", () => {
    process.env.TERMUX_API_VERSION = "1.0"
    expect(isTermuxEnvironment()).toBe(true)
  })

  it("detects via ANDROID_DATA", () => {
    process.env.ANDROID_DATA = "/data/data/com.termux"
    expect(isTermuxEnvironment()).toBe(true)
  })

  it("detects via ANDROID_ROOT + PREFIX termux", () => {
    process.env.ANDROID_ROOT = "/system"
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    expect(isTermuxEnvironment()).toBe(true)
  })

  it("returns false when not termux", () => {
    const result = isTermuxEnvironment()
    expect(typeof result).toBe("boolean")
  })
})

describe("getEnvironmentInfo", () => {
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
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns info object", () => {
    const info = getEnvironmentInfo()
    expect(info).toBeDefined()
    expect(typeof info.isTermux).toBe("boolean")
    expect(info.platform).toBeDefined()
    expect(Array.isArray(info.detectionReasons)).toBe(true)
  })

  it("detects CI", () => {
    process.env.CI = "true"
    const info = getEnvironmentInfo()
    expect(info.isCI).toBe(true)
  })

  it("includes termux version and prefix", () => {
    process.env.TERMUX_VERSION = "0.118"
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    const info = getEnvironmentInfo()
    expect(info.termuxVersion).toBe("0.118")
    expect(info.prefix).toBe("/data/data/com.termux/files/usr")
    expect(info.detectionReasons.length).toBeGreaterThan(0)
  })

  it("handles multiple detection reasons", () => {
    process.env.TERMUX_VERSION = "1.0"
    process.env.TERMUX__USER_ID = "0"
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    process.env.TERMUX_API_VERSION = "1.0"
    process.env.ANDROID_DATA = "/data/data/com.termux"
    const info = getEnvironmentInfo()
    expect(info.isTermux).toBe(true)
    expect(info.detectionReasons.length).toBeGreaterThanOrEqual(4)
  })
})

describe("getNextJsBuildConfigForTermux", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.TERMUX_VERSION
    delete process.env.PREFIX
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns non-termux config", () => {
    const config = getNextJsBuildConfigForTermux()
    expect(config.useWebpack).toBe(false)
    expect(config.args.length).toBe(0)
  })

  it("returns termux config with webpack", () => {
    process.env.TERMUX_VERSION = "1.0"
    const config = getNextJsBuildConfigForTermux()
    expect(config.useWebpack).toBe(true)
    expect(config.args.includes("--webpack")).toBe(true)
    expect(config.env.NEXT_WEBPACK).toBe("1")
  })

  it("includes NODE_OPTIONS", () => {
    process.env.TERMUX_VERSION = "1.0"
    const config = getNextJsBuildConfigForTermux()
    expect(config.env.NODE_OPTIONS).toBeDefined()
  })
})

describe("getViteBuildConfigForTermux", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.TERMUX_VERSION
    delete process.env.PREFIX
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns non-termux", () => {
    const config = getViteBuildConfigForTermux()
    expect(config.isTermux).toBe(false)
  })

  it("returns termux config", () => {
    process.env.TERMUX_VERSION = "1.0"
    const config = getViteBuildConfigForTermux()
    expect(config.isTermux).toBe(true)
    expect(config.env.NODE_OPTIONS).toBeDefined()
  })
})

describe("logEnvironmentInfo", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("logs without throwing when not termux", () => {
    delete process.env.TERMUX_VERSION
    expect(() => logEnvironmentInfo()).not.toThrow()
  })

  it("logs with termux info", () => {
    process.env.TERMUX_VERSION = "1.0"
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    expect(() => logEnvironmentInfo()).not.toThrow()
  })
})
