import { describe, expect, it } from "vitest"
import { detectAll, detectBuildSystem, detectProjectType } from "../../../src/detector/project.ts"

describe("detectProjectType extra 100%", () => {
  it("plain via README + src", () => {
    expect(detectProjectType(["README.md", "src/index.ts"])).toBe("plain")
  })
  it("plain via src in second position", () => {
    expect(detectProjectType(["README.md", "src/utils/string.ts"])).toBe("plain")
  })
  it("unknown when no plain markers", () => {
    expect(detectProjectType(["README.md", "package.json"])).toBe("unknown")
  })
  it("hasVite with multiple files first false second true", () => {
    expect(detectProjectType(["README.md", "vite.config.ts"])).toBe("vite")
  })
  it("hasNext with multiple files", () => {
    expect(detectProjectType(["README.md", "next.config.mjs"])).toBe("next")
  })
  it("hasPackages and hasApps with multiple", () => {
    expect(
      detectProjectType(["README.md", "packages/ui/package.json", "apps/web/package.json"]),
    ).toBe("monorepo")
  })
  it("hasPackages true hasApps false", () => {
    expect(detectProjectType(["packages/ui/package.json"])).toBe("unknown")
  })
  it("hasApps true hasPackages false", () => {
    expect(detectProjectType(["apps/web/package.json"])).toBe("unknown")
  })
  it("monorepo with workspace and packages+apps", () => {
    expect(
      detectProjectType([
        "pnpm-workspace.yaml",
        "packages/ui/package.json",
        "apps/web/package.json",
      ]),
    ).toBe("monorepo")
  })
  it("monorepo with turbo and vite", () => {
    expect(detectProjectType(["turbo.json", "vite.config.ts"])).toBe("monorepo")
  })
  it("monorepo with turbo and next", () => {
    expect(detectProjectType(["turbo.json", "next.config.mjs"])).toBe("next-monorepo")
  })
  it("vite and next both present with other files", () => {
    expect(detectProjectType(["README.md", "vite.config.ts", "next.config.mjs"])).toBe("vite")
  })
})

describe("detectBuildSystem extra 100%", () => {
  it("vite with multiple files", () => {
    expect(detectBuildSystem(["README.md", "vite.config.ts"])).toBe("vite")
  })
  it("next with multiple files", () => {
    expect(detectBuildSystem(["README.md", "next.config.mjs"])).toBe("next")
  })
  it("tsc with multiple files", () => {
    expect(detectBuildSystem(["README.md", "tsconfig.json"])).toBe("tsc")
  })
  it("none with unrelated", () => {
    expect(detectBuildSystem(["README.md"])).toBe("none")
  })
})

describe("detectAll extra 100%", () => {
  it("hasVite false hasNext false", () => {
    const result = detectAll(["package.json"])
    expect(result.hasVite).toBe(false)
    expect(result.hasNext).toBe(false)
    expect(result.hasTurbo).toBe(false)
    expect(result.hasWorkspace).toBe(false)
  })
  it("hasVite true hasNext true", () => {
    const result = detectAll(["vite.config.ts", "next.config.mjs"])
    expect(result.hasVite).toBe(true)
    expect(result.hasNext).toBe(true)
  })
})
