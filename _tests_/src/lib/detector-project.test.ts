import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  detectAll,
  detectApps,
  detectBuildSystem,
  detectRootProject,
  detectWorkspace,
  logDetectionResult,
} from "../../../scripts/lib/detector.ts"

describe("detector 100% coverage", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = join(tmpdir(), `detector-100-${Date.now()}-${Math.random()}`)
    mkdirSync(tempRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it("detects turbo", () => {
    writeFileSync(join(tempRoot, "turbo.json"), "{}", "utf8")
    expect(detectBuildSystem(tempRoot)).toBe("turbo")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("turbo-monorepo")
  })

  it("detects vite", () => {
    writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
    expect(detectBuildSystem(tempRoot)).toBe("vite")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("vite")
  })

  it("detects next", () => {
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    expect(detectBuildSystem(tempRoot)).toBe("next")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("next")
  })

  it("detects tsc", () => {
    writeFileSync(join(tempRoot, "tsconfig.json"), "{}", "utf8")
    expect(detectBuildSystem(tempRoot)).toBe("tsc")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("tsc")
  })

  it("detects none", () => {
    expect(detectBuildSystem(tempRoot)).toBe("none")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("empty")
  })

  it("detects vite and next both", () => {
    writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("vite")
    expect(root.hasViteConfig).toBe(true)
    expect(root.hasNextConfig).toBe(true)
  })

  it("detects pnpm monorepo with packages", () => {
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*", "utf8")
    mkdirSync(join(tempRoot, "packages"), { recursive: true })
    mkdirSync(join(tempRoot, "packages", "pkg-a"), { recursive: true })
    writeFileSync(join(tempRoot, "packages", "pkg-a", "package.json"), "{}", "utf8")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("pnpm-monorepo")
    const ws = detectWorkspace(tempRoot)
    expect(ws.isMonorepo).toBe(true)
    expect(ws.hasPackages).toBe(true)
  })

  it("detects pnpm monorepo with apps", () => {
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "packages:\n  - apps/*", "utf8")
    mkdirSync(join(tempRoot, "apps"), { recursive: true })
    mkdirSync(join(tempRoot, "apps", "web"), { recursive: true })
    writeFileSync(join(tempRoot, "apps", "web", "vite.config.ts"), "", "utf8")
    const ws = detectWorkspace(tempRoot)
    expect(ws.isMonorepo).toBe(true)
    expect(ws.hasApps).toBe(true)
    expect(ws.apps[0].buildSystem).toBe("vite")
  })

  it("detects pnpm-workspace only empty", () => {
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "", "utf8")
    const root = detectRootProject(tempRoot)
    expect(root.type).toBe("pnpm-monorepo")
  })

  it("detectAll empty", () => {
    const result = detectAll(tempRoot)
    expect(result.isEmpty).toBe(true)
    expect(result.summary.includes("Empty")).toBe(true)
  })

  it("detectAll turbo monorepo", () => {
    writeFileSync(join(tempRoot, "turbo.json"), "{}", "utf8")
    mkdirSync(join(tempRoot, "apps"), { recursive: true })
    mkdirSync(join(tempRoot, "apps", "web"), { recursive: true })
    writeFileSync(join(tempRoot, "apps", "web", "next.config.mjs"), "", "utf8")
    const result = detectAll(tempRoot)
    expect(result.root.type).toBe("turbo-monorepo")
    expect(result.primaryBuildSystem).toBe("turbo")
    expect(result.summary.includes("Turbo")).toBe(true)
  })

  it("detectAll pnpm monorepo", () => {
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "", "utf8")
    mkdirSync(join(tempRoot, "packages"), { recursive: true })
    mkdirSync(join(tempRoot, "packages", "a"), { recursive: true })
    writeFileSync(join(tempRoot, "packages", "a", "vite.config.ts"), "", "utf8")
    const result = detectAll(tempRoot)
    expect(result.workspace.isMonorepo).toBe(true)
    expect(result.primaryBuildSystem).toBe("vite")
    expect(result.summary.includes("PNPM")).toBe(true)
  })

  it("detectAll vite+next warning", () => {
    writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
    writeFileSync(join(tempRoot, "next.config.mjs"), "", "utf8")
    const result = detectAll(tempRoot)
    expect(result.summary.includes("WARNING")).toBe(true)
  })

  it("detectAll vite only", () => {
    writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
    const result = detectAll(tempRoot)
    expect(result.summary.includes("vite")).toBe(true)
  })

  it("detectApps returns all", () => {
    mkdirSync(join(tempRoot, "packages"), { recursive: true })
    mkdirSync(join(tempRoot, "packages", "a"), { recursive: true })
    mkdirSync(join(tempRoot, "apps"), { recursive: true })
    mkdirSync(join(tempRoot, "apps", "b"), { recursive: true })
    const apps = detectApps(tempRoot)
    expect(apps.length).toBe(2)
  })

  it("logDetectionResult logs", () => {
    const result = detectAll(tempRoot)
    logDetectionResult(result)
    writeFileSync(join(tempRoot, "turbo.json"), "{}", "utf8")
    mkdirSync(join(tempRoot, "apps", "web"), { recursive: true })
    const result2 = detectAll(tempRoot)
    logDetectionResult(result2)
  })

  it("detects hasPackageJson", () => {
    writeFileSync(join(tempRoot, "package.json"), "{}", "utf8")
    const root = detectRootProject(tempRoot)
    expect(root.hasPackageJson).toBe(true)
  })

  it("detectWorkspace empty packages/apps", () => {
    mkdirSync(join(tempRoot, "packages"), { recursive: true })
    mkdirSync(join(tempRoot, "apps"), { recursive: true })
    const ws = detectWorkspace(tempRoot)
    expect(ws.isMonorepo).toBe(false)
  })

  it("detectAll with no buildSystem apps", () => {
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "", "utf8")
    mkdirSync(join(tempRoot, "packages"), { recursive: true })
    mkdirSync(join(tempRoot, "packages", "a"), { recursive: true })
    const result = detectAll(tempRoot)
    expect(result.primaryBuildSystem).toBe("none")
  })
})
