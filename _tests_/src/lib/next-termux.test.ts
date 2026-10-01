import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  generateTermuxNextConfigOverride,
  getNextBuildCommandForTermux,
  isNextJsProject,
  logNextTermuxInfo,
} from "../../../scripts/lib/next-termux.ts"

describe("isNextJsProject", () => {
  it("detects next project", () => {
    const tempRoot = join(tmpdir(), `next-detect-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "next.config.mjs"), "export default {}", "utf8")
      expect(isNextJsProject(tempRoot)).toBe(true)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("returns false if no next config", () => {
    const tempRoot = join(tmpdir(), `next-detect-none-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      expect(isNextJsProject(tempRoot)).toBe(false)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

describe("getNextBuildCommandForTermux", () => {
  it("returns original when not termux and not next", () => {
    const tempRoot = join(tmpdir(), `next-termux-non-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      const result = getNextBuildCommandForTermux(["pnpm", "exec", "next", "build"], tempRoot)
      expect(result.isTermux).toBe(false)
      expect(result.cmd).toEqual(["pnpm", "exec", "next", "build"])
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("forces webpack in termux when next project (dev only)", () => {
    const tempRoot = join(tmpdir(), `next-termux-yes-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    const origEnv = process.env
    try {
      writeFileSync(join(tempRoot, "next.config.mjs"), "export default {}", "utf8")
      process.env = { ...origEnv, TERMUX_VERSION: "1.0", PREFIX: "/data/data/com.termux/files/usr" }
      const devResult = getNextBuildCommandForTermux(["next", "dev"], tempRoot)
      expect(devResult.isTermux).toBe(true)
      expect(devResult.cmd.includes("--webpack")).toBe(true)

      const buildResult = getNextBuildCommandForTermux(["next", "build"], tempRoot)
      expect(buildResult.isTermux).toBe(true)
      // build should NOT add --webpack (invalid for Next.js build)
      expect(buildResult.cmd.includes("--webpack")).toBe(false)
    } finally {
      process.env = origEnv
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("filters turbopack args in termux", () => {
    const tempRoot = join(tmpdir(), `next-termux-turbo-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    const origEnv = process.env
    try {
      writeFileSync(join(tempRoot, "next.config.mjs"), "export default {}", "utf8")
      process.env = { ...origEnv, TERMUX_VERSION: "1.0", PREFIX: "/data/data/com.termux/files/usr" }
      const buildResult = getNextBuildCommandForTermux(["next", "build", "--turbopack"], tempRoot)
      expect(buildResult.cmd.includes("--turbopack")).toBe(false)
      expect(buildResult.cmd.includes("--webpack")).toBe(false)

      const devResult = getNextBuildCommandForTermux(["next", "dev", "--turbopack"], tempRoot)
      expect(devResult.cmd.includes("--turbopack")).toBe(false)
      expect(devResult.cmd.includes("--webpack")).toBe(true)
    } finally {
      process.env = origEnv
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("does not add duplicate webpack", () => {
    const tempRoot = join(tmpdir(), `next-termux-dup-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    const origEnv = process.env
    try {
      writeFileSync(join(tempRoot, "next.config.mjs"), "export default {}", "utf8")
      process.env = { ...origEnv, TERMUX_VERSION: "1.0", PREFIX: "/data/data/com.termux/files/usr" }
      const result = getNextBuildCommandForTermux(["next", "dev", "--webpack"], tempRoot)
      const webpackCount = result.cmd.filter((c) => c === "--webpack").length
      expect(webpackCount).toBe(1)
    } finally {
      process.env = origEnv
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

describe("generateTermuxNextConfigOverride", () => {
  it("generates config override", () => {
    const config = generateTermuxNextConfigOverride()
    expect(typeof config).toBe("string")
    expect(config.length).toBeGreaterThan(0)
    expect(config.includes("Termux")).toBe(true)
  })
})

describe("logNextTermuxInfo", () => {
  it("logs without throwing", () => {
    const tempRoot = join(tmpdir(), `next-log-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      expect(() => logNextTermuxInfo(tempRoot)).not.toThrow()
      writeFileSync(join(tempRoot, "next.config.mjs"), "export default {}", "utf8")
      expect(() => logNextTermuxInfo(tempRoot)).not.toThrow()
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
