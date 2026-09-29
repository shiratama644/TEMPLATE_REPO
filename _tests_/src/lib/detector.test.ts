import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  detectAll,
  detectBuildSystem,
  detectRootProject,
  detectWorkspace,
  logDetectionResult,
} from "../../../scripts/lib/detector.ts"

describe("detectRootProject", () => {
  it("detects empty when no files", () => {
    const tempRoot = join(tmpdir(), `detector-empty-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      const result = detectRootProject(tempRoot)
      expect(result.type).toBe("empty")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects vite", () => {
    const tempRoot = join(tmpdir(), `detector-vite-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
      const result = detectRootProject(tempRoot)
      expect(result.type).toBe("vite")
      expect(result.hasViteConfig).toBe(true)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects next", () => {
    const tempRoot = join(tmpdir(), `detector-next-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
      const result = detectRootProject(tempRoot)
      expect(result.type).toBe("next")
      expect(result.hasNextConfig).toBe(true)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects turbo", () => {
    const tempRoot = join(tmpdir(), `detector-turbo-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "turbo.json"), "{}", "utf8")
      const result = detectRootProject(tempRoot)
      expect(result.type).toBe("turbo-monorepo")
      expect(result.hasTurboJson).toBe(true)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects pnpm-monorepo with structure", () => {
    const tempRoot = join(tmpdir(), `detector-pnpm-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*", "utf8")
      mkdirSync(join(tempRoot, "packages"), { recursive: true })
      writeFileSync(join(tempRoot, "packages", "dummy.txt"), "", "utf8")
      const result = detectRootProject(tempRoot)
      expect(result.type).toBe("pnpm-monorepo")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

describe("detectBuildSystem", () => {
  it("detects turbo", () => {
    const tempRoot = join(tmpdir(), `build-turbo-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "turbo.json"), "{}", "utf8")
      expect(detectBuildSystem(tempRoot)).toBe("turbo")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects vite", () => {
    const tempRoot = join(tmpdir(), `build-vite-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
      expect(detectBuildSystem(tempRoot)).toBe("vite")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects next", () => {
    const tempRoot = join(tmpdir(), `build-next-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
      expect(detectBuildSystem(tempRoot)).toBe("next")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects tsc", () => {
    const tempRoot = join(tmpdir(), `build-tsc-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "tsconfig.json"), "{}", "utf8")
      expect(detectBuildSystem(tempRoot)).toBe("tsc")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("returns none for empty", () => {
    const tempRoot = join(tmpdir(), `build-none-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      expect(detectBuildSystem(tempRoot)).toBe("none")
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

describe("detectWorkspace", () => {
  it("detects monorepo", () => {
    const tempRoot = join(tmpdir(), `ws-mono-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      mkdirSync(join(tempRoot, "packages"), { recursive: true })
      mkdirSync(join(tempRoot, "packages", "ui"), { recursive: true })
      writeFileSync(join(tempRoot, "packages", "ui", "package.json"), "{}", "utf8")
      const result = detectWorkspace(tempRoot)
      expect(result.isMonorepo).toBe(true)
      expect(result.hasPackages).toBe(true)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("detects non-monorepo", () => {
    const tempRoot = join(tmpdir(), `ws-non-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      const result = detectWorkspace(tempRoot)
      expect(result.isMonorepo).toBe(false)
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

describe("detectAll", () => {
  it("detects all", () => {
    const tempRoot = join(tmpdir(), `detect-all-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
      const result = detectAll(tempRoot)
      expect(result.root.type).toBeDefined()
      expect(result.primaryBuildSystem).toBeDefined()
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})

describe("logDetectionResult", () => {
  it("logs without throwing", () => {
    const tempRoot = join(tmpdir(), `log-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
      const result = detectAll(tempRoot)
      expect(() => logDetectionResult(result)).not.toThrow()
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
