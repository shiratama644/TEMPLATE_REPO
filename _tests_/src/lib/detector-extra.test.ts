import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("detector extended frameworks", () => {
  let originalExists: any

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("detectBuildSystem supports new frameworks via fs mock", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p.endsWith("astro.config.mjs")) return true
          return false
        },
        readdirSync: actual.readdirSync,
      }
    })
    const mod = await import("../../../scripts/lib/detector.ts")
    expect(mod.detectBuildSystem("/tmp")).toBe("astro")
  })

  it("detectRootProject with astro", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p.includes("astro.config")) return true
          return actual.existsSync(p as any)
        },
        readdirSync: () => [] as any,
      }
    })
    const mod = await import("../../../scripts/lib/detector.ts")
    const root = mod.detectRootProject("/tmp")
    expect(root.type).toBe("astro")
    expect(root.hasAstroConfig).toBe(true)
  })

  it("detectExtended lists frameworks", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p.includes("vite.config")) return true
          if (p.includes("next.config")) return true
          if (p.includes("astro.config")) return true
          return false
        },
        readdirSync: () => [] as any,
      }
    })
    const mod = await import("../../../scripts/lib/detector.ts")
    const ext = mod.detectExtended("/tmp")
    expect(ext.frameworks).toContain("vite")
    expect(ext.frameworks).toContain("next")
    expect(ext.frameworks).toContain("astro")
  })

  it("detects sveltekit, nuxt, remix, hono", async () => {
    const configs = [
      { file: "svelte.config.js", expected: "sveltekit" },
      { file: "nuxt.config.ts", expected: "nuxt" },
      { file: "remix.config.js", expected: "remix" },
      { file: "wrangler.toml", expected: "hono" },
    ]
    for (const { file, expected } of configs) {
      vi.resetModules()
      vi.doMock("node:fs", async () => {
        const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
        return {
          ...actual,
          existsSync: (p: string) => p.endsWith(file),
          readdirSync: () => [] as any,
        }
      })
      const mod = await import("../../../scripts/lib/detector.ts")
      const bs = mod.detectBuildSystem("/tmp")
      expect(bs).toBe(expected)
    }
  })

  it("detectRootProject for all new frameworks", async () => {
    const cases = [
      { file: "svelte.config.js", type: "sveltekit" },
      { file: "nuxt.config.ts", type: "nuxt" },
      { file: "remix.config.js", type: "remix" },
      { file: "wrangler.toml", type: "hono" },
      { file: "tsconfig.json", type: "tsc" },
    ]
    for (const { file, type } of cases) {
      vi.resetModules()
      vi.doMock("node:fs", async () => {
        const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
        return {
          ...actual,
          existsSync: (p: string) => p.endsWith(file),
          readdirSync: () => [] as any,
        }
      })
      const mod = await import("../../../scripts/lib/detector.ts")
      const root = mod.detectRootProject("/tmp")
      expect(root.type).toBe(type)
    }
  })

  it("detectRootProject pnpm-workspace and monorepo structure", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) =>
          p.endsWith("pnpm-workspace.yaml") || p.endsWith("packages") || p.endsWith("apps"),
        readdirSync: (p: string) => {
          if (typeof p === "string" && (p.includes("packages") || p.includes("apps")))
            return ["app"] as any
          return [] as any
        },
      }
    })
    const mod = await import("../../../scripts/lib/detector.ts")
    const root = mod.detectRootProject("/tmp")
    expect(root.type).toBe("pnpm-monorepo")
  })

  it("hasRemixConfig with app/root.tsx", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => p.endsWith("app") || p.endsWith("app/root.tsx"),
        readdirSync: () => [] as any,
      }
    })
    const mod = await import("../../../scripts/lib/detector.ts")
    const bs = mod.detectBuildSystem("/tmp")
    expect(bs).toBe("remix")
  })

  it("detectExtended all frameworks", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => true,
        readdirSync: () => [] as any,
      }
    })
    const mod = await import("../../../scripts/lib/detector.ts")
    const ext = mod.detectExtended("/tmp")
    expect(ext.frameworks.length).toBeGreaterThan(5)
    expect(ext.isMonorepo).toBeDefined()
  })
})
