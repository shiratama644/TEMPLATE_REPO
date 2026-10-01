import { describe, expect, it } from "vitest"
import {
  detectAll,
  detectBuildSystem,
  detectProjectType,
  getBuildCommand,
  getDevCommand,
  isMonorepo,
} from "../../../src/detector/project.ts"

describe("detectProjectType", () => {
  it("detects plain via tsconfig", () => {
    expect(detectProjectType(["tsconfig.json"])).toBe("plain")
  })
  it("detects plain via src/", () => {
    expect(detectProjectType(["src/index.ts"])).toBe("plain")
  })
  it("detects plain via both tsconfig and src", () => {
    expect(detectProjectType(["tsconfig.json", "src/index.ts"])).toBe("plain")
  })
  it("detects vite", () => {
    expect(detectProjectType(["vite.config.ts"])).toBe("vite")
    expect(detectProjectType(["vite.config.js"])).toBe("vite")
    expect(detectProjectType(["vite.config.mjs"])).toBe("vite")
    expect(detectProjectType(["vite.config.cjs"])).toBe("vite")
  })
  it("detects next", () => {
    expect(detectProjectType(["next.config.mjs"])).toBe("next")
    expect(detectProjectType(["next.config.js"])).toBe("next")
    expect(detectProjectType(["next.config.ts"])).toBe("next")
  })
  it("detects monorepo via workspace+turbo", () => {
    expect(detectProjectType(["pnpm-workspace.yaml", "turbo.json"])).toBe("monorepo")
  })
  it("detects monorepo via packages+apps", () => {
    expect(detectProjectType(["packages/ui/package.json", "apps/web/package.json"])).toBe(
      "monorepo",
    )
  })
  it("detects monorepo via workspace alone", () => {
    expect(detectProjectType(["pnpm-workspace.yaml"])).toBe("monorepo")
  })
  it("detects monorepo via turbo alone", () => {
    expect(detectProjectType(["turbo.json"])).toBe("monorepo")
  })
  it("detects monorepo via packages+apps without workspace", () => {
    expect(detectProjectType(["packages/a/package.json", "apps/b/package.json"])).toBe("monorepo")
  })
  it("detects monorepo with vite", () => {
    expect(detectProjectType(["pnpm-workspace.yaml", "vite.config.ts"])).toBe("monorepo")
  })
  it("detects next-monorepo", () => {
    expect(detectProjectType(["pnpm-workspace.yaml", "turbo.json", "next.config.mjs"])).toBe(
      "next-monorepo",
    )
  })
  it("detects next-monorepo via workspace+next", () => {
    expect(detectProjectType(["pnpm-workspace.yaml", "next.config.mjs"])).toBe("next-monorepo")
  })
  it("detects next-monorepo via turbo+next", () => {
    expect(detectProjectType(["turbo.json", "next.config.mjs"])).toBe("next-monorepo")
  })
  it("handles vite + next both present — prefers vite", () => {
    expect(detectProjectType(["vite.config.ts", "next.config.mjs"])).toBe("vite")
  })
  it("returns unknown for empty", () => {
    expect(detectProjectType([])).toBe("unknown")
    expect(detectProjectType(null as any)).toBe("unknown")
    expect(detectProjectType(undefined as any)).toBe("unknown")
  })
  it("returns unknown for unrelated files", () => {
    expect(detectProjectType(["README.md", "package.json"])).toBe("unknown")
  })
})

describe("detectBuildSystem", () => {
  it("detects turbo", () => {
    expect(detectBuildSystem(["turbo.json"])).toBe("turbo")
  })
  it("detects vite", () => {
    expect(detectBuildSystem(["vite.config.ts"])).toBe("vite")
    expect(detectBuildSystem(["vite.config.js"])).toBe("vite")
  })
  it("detects next", () => {
    expect(detectBuildSystem(["next.config.mjs"])).toBe("next")
    expect(detectBuildSystem(["next.config.js"])).toBe("next")
  })
  it("detects tsc", () => {
    expect(detectBuildSystem(["tsconfig.json"])).toBe("tsc")
  })
  it("returns none for empty", () => {
    expect(detectBuildSystem([])).toBe("none")
    expect(detectBuildSystem(null as any)).toBe("none")
    expect(detectBuildSystem(undefined as any)).toBe("none")
  })
  it("prefers turbo over others", () => {
    expect(detectBuildSystem(["turbo.json", "vite.config.ts", "next.config.mjs"])).toBe("turbo")
  })
  it("prefers vite over next and tsc", () => {
    expect(detectBuildSystem(["vite.config.ts", "next.config.mjs", "tsconfig.json"])).toBe("vite")
  })
  it("prefers next over tsc", () => {
    expect(detectBuildSystem(["next.config.mjs", "tsconfig.json"])).toBe("next")
  })
})

describe("detectAll", () => {
  it("returns full detection result vite", () => {
    const result = detectAll(["vite.config.ts", "package.json"])
    expect(result.projectType).toBe("vite")
    expect(result.buildSystem).toBe("vite")
    expect(result.hasVite).toBe(true)
    expect(result.hasNext).toBe(false)
    expect(result.isMonorepo).toBe(false)
    expect(result.files).toEqual(["vite.config.ts", "package.json"])
  })
  it("detects monorepo flags", () => {
    const result = detectAll(["pnpm-workspace.yaml", "turbo.json", "vite.config.ts"])
    expect(result.isMonorepo).toBe(true)
    expect(result.hasWorkspace).toBe(true)
    expect(result.hasTurbo).toBe(true)
    expect(result.hasVite).toBe(true)
  })
  it("detects next flags", () => {
    const result = detectAll(["next.config.mjs"])
    expect(result.hasNext).toBe(true)
    expect(result.hasVite).toBe(false)
  })
  it("detects empty", () => {
    const result = detectAll([])
    expect(result.projectType).toBe("unknown")
    expect(result.buildSystem).toBe("none")
    expect(result.isMonorepo).toBe(false)
  })
})

describe("isMonorepo", () => {
  it("checks monorepo true", () => {
    expect(isMonorepo(["pnpm-workspace.yaml", "turbo.json"])).toBe(true)
    expect(isMonorepo(["pnpm-workspace.yaml", "next.config.mjs"])).toBe(true)
    expect(isMonorepo(["turbo.json", "next.config.mjs"])).toBe(true)
    expect(isMonorepo(["packages/ui/package.json", "apps/web/package.json"])).toBe(true)
  })
  it("checks monorepo false", () => {
    expect(isMonorepo(["vite.config.ts"])).toBe(false)
    expect(isMonorepo(["next.config.mjs"])).toBe(false)
    expect(isMonorepo(["tsconfig.json"])).toBe(false)
    expect(isMonorepo([])).toBe(false)
  })
})

describe("getBuildCommand", () => {
  it("returns turbo build", () => {
    const result = detectAll(["turbo.json"])
    expect(getBuildCommand(result)).toEqual(["pnpm", "exec", "turbo", "build"])
  })
  it("returns vite build", () => {
    const result = detectAll(["vite.config.ts"])
    expect(getBuildCommand(result)).toEqual(["pnpm", "exec", "vite", "build"])
  })
  it("returns next build", () => {
    const result = detectAll(["next.config.mjs"])
    expect(getBuildCommand(result)).toEqual(["pnpm", "exec", "next", "build"])
  })
  it("returns next build without webpack even for termux (build does not support --webpack)", () => {
    const result = detectAll(["next.config.mjs"])
    expect(getBuildCommand(result, { isTermux: true })).toEqual(["pnpm", "exec", "next", "build"])
  })
  it("returns next build without webpack when not termux", () => {
    const result = detectAll(["next.config.mjs"])
    expect(getBuildCommand(result, { isTermux: false })).toEqual(["pnpm", "exec", "next", "build"])
  })
  it("returns tsc", () => {
    const result = detectAll(["tsconfig.json"])
    expect(getBuildCommand(result)).toEqual(["pnpm", "exec", "tsc"])
  })
  it("returns default", () => {
    const result = detectAll([])
    expect(getBuildCommand(result)).toEqual(["pnpm", "build"])
  })
})

describe("getDevCommand", () => {
  it("returns turbo dev", () => {
    expect(getDevCommand(detectAll(["turbo.json"]))).toEqual(["pnpm", "exec", "turbo", "dev"])
  })
  it("returns vite dev", () => {
    expect(getDevCommand(detectAll(["vite.config.ts"]))).toEqual(["pnpm", "exec", "vite"])
  })
  it("returns next dev", () => {
    expect(getDevCommand(detectAll(["next.config.mjs"]))).toEqual(["pnpm", "exec", "next", "dev"])
  })
  it("returns tsc watch", () => {
    expect(getDevCommand(detectAll(["tsconfig.json"]))).toEqual(["pnpm", "exec", "tsc", "--watch"])
  })
  it("returns default dev", () => {
    expect(getDevCommand(detectAll([]))).toEqual(["pnpm", "dev"])
  })
})
