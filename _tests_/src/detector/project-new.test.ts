import { describe, expect, it } from "vitest"
import {
  detectAll,
  detectBuildSystem,
  detectProjectType,
  getBuildCommand,
  getDevCommand,
  getFrameworkList,
} from "../../../src/detector/project.ts"

describe("project detector new frameworks", () => {
  it("detects astro", () => {
    expect(detectProjectType(["astro.config.mjs"])).toBe("astro")
    expect(detectBuildSystem(["astro.config.mjs"])).toBe("astro")
  })
  it("detects sveltekit", () => {
    expect(detectProjectType(["svelte.config.js"])).toBe("sveltekit")
    expect(detectBuildSystem(["svelte.config.js"])).toBe("sveltekit")
  })
  it("detects nuxt", () => {
    expect(detectProjectType(["nuxt.config.ts"])).toBe("nuxt")
    expect(detectBuildSystem(["nuxt.config.ts"])).toBe("nuxt")
  })
  it("detects remix", () => {
    expect(detectProjectType(["remix.config.js"])).toBe("remix")
    expect(detectProjectType(["app/root.tsx"])).toBe("remix")
    expect(detectBuildSystem(["remix.config.js"])).toBe("remix")
  })
  it("detects hono", () => {
    expect(detectProjectType(["wrangler.toml"])).toBe("hono")
    expect(detectBuildSystem(["wrangler.toml"])).toBe("hono")
  })
  it("getBuildCommand for new frameworks", () => {
    const astro = detectAll(["astro.config.mjs"])
    expect(getBuildCommand(astro)).toContain("astro")
    const svelte = detectAll(["svelte.config.js"])
    expect(getBuildCommand(svelte)).toContain("vite")
    const nuxt = detectAll(["nuxt.config.ts"])
    expect(getBuildCommand(nuxt)).toContain("nuxt")
    const remix = detectAll(["remix.config.js"])
    expect(getBuildCommand(remix)).toContain("remix")
    const hono = detectAll(["wrangler.toml"])
    expect(getBuildCommand(hono)).toContain("wrangler")
  })
  it("getDevCommand for new frameworks", () => {
    expect(getDevCommand(detectAll(["astro.config.mjs"]))).toContain("astro")
    expect(getDevCommand(detectAll(["svelte.config.js"]))).toContain("vite")
    expect(getDevCommand(detectAll(["nuxt.config.ts"]))).toContain("nuxt")
    expect(getDevCommand(detectAll(["remix.config.js"]))).toContain("remix")
    expect(getDevCommand(detectAll(["wrangler.toml"]))).toContain("wrangler")
  })
  it("getFrameworkList", () => {
    const result = detectAll(["vite.config.ts", "astro.config.mjs", "wrangler.toml", "turbo.json"])
    const list = getFrameworkList(result)
    expect(list).toContain("vite")
    expect(list).toContain("astro")
    expect(list).toContain("hono")
    expect(list).toContain("turbo")
  })
  it("covers empty and plain", () => {
    expect(detectProjectType([])).toBe("unknown")
    expect(detectBuildSystem([])).toBe("none")
    expect(detectProjectType(["tsconfig.json"])).toBe("plain")
  })
})
