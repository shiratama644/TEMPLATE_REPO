/**
 * Project detector — detects project type from files
 * Extended: Vite, Next, Astro, SvelteKit, Nuxt, Remix, Hono, Turbo, tsc
 */

export type ProjectType =
  | "plain"
  | "vite"
  | "next"
  | "astro"
  | "sveltekit"
  | "nuxt"
  | "remix"
  | "hono"
  | "monorepo"
  | "next-monorepo"
  | "unknown"
export type BuildSystem =
  | "tsc"
  | "vite"
  | "next"
  | "astro"
  | "sveltekit"
  | "nuxt"
  | "remix"
  | "hono"
  | "turbo"
  | "none"

export type DetectionResult = {
  projectType: ProjectType
  buildSystem: BuildSystem
  isMonorepo: boolean
  hasVite: boolean
  hasNext: boolean
  hasAstro: boolean
  hasSvelteKit: boolean
  hasNuxt: boolean
  hasRemix: boolean
  hasHono: boolean
  hasTurbo: boolean
  hasWorkspace: boolean
  files: string[]
}

const VITE_CONFIG_PATTERNS = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "vite.config.mts",
]
const NEXT_CONFIG_PATTERNS = [
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "next.config.cjs",
  "next.config.mts",
]
const ASTRO_CONFIG_PATTERNS = ["astro.config.mjs", "astro.config.js", "astro.config.ts"]
const SVELTEKIT_CONFIG_PATTERNS = ["svelte.config.js", "svelte.config.ts"]
const NUXT_CONFIG_PATTERNS = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"]
const REMIX_CONFIG_PATTERNS = ["remix.config.js", "remix.config.ts"]

export function detectProjectType(files: string[]): ProjectType {
  if (!files || files.length === 0) return "unknown"

  const hasVite = files.some(
    (f) => VITE_CONFIG_PATTERNS.includes(f) || f.startsWith("vite.config."),
  )
  const hasNext = files.some(
    (f) => NEXT_CONFIG_PATTERNS.includes(f) || f.startsWith("next.config."),
  )
  const hasAstro = files.some(
    (f) => ASTRO_CONFIG_PATTERNS.includes(f) || f.startsWith("astro.config."),
  )
  const hasSvelteKit = files.some((f) => SVELTEKIT_CONFIG_PATTERNS.includes(f))
  const hasNuxt = files.some(
    (f) => NUXT_CONFIG_PATTERNS.includes(f) || f.startsWith("nuxt.config."),
  )
  const hasRemix = files.some((f) => REMIX_CONFIG_PATTERNS.includes(f) || f === "app/root.tsx")
  const hasHono = files.some((f) => f === "wrangler.toml" || f === "wrangler.jsonc")
  const hasTurbo = files.includes("turbo.json")
  const hasWorkspace = files.includes("pnpm-workspace.yaml")
  const hasPackages = files.some((f) => f.startsWith("packages/"))
  const hasApps = files.some((f) => f.startsWith("apps/"))

  const isMonorepo = hasWorkspace || (hasPackages && hasApps) || hasTurbo

  if (isMonorepo) {
    if (hasNext) return "next-monorepo"
    if (hasVite) return "monorepo"
    return "monorepo"
  }

  if (hasVite && hasNext) return "vite"
  if (hasVite) return "vite"
  if (hasNext) return "next"
  if (hasAstro) return "astro"
  if (hasSvelteKit) return "sveltekit"
  if (hasNuxt) return "nuxt"
  if (hasRemix) return "remix"
  if (hasHono) return "hono"
  if (files.includes("tsconfig.json") || files.some((f) => f.startsWith("src/"))) return "plain"

  return "unknown"
}

export function detectBuildSystem(files: string[]): BuildSystem {
  if (!files || files.length === 0) return "none"

  if (files.includes("turbo.json")) return "turbo"
  if (files.some((f) => VITE_CONFIG_PATTERNS.includes(f))) return "vite"
  if (files.some((f) => NEXT_CONFIG_PATTERNS.includes(f))) return "next"
  if (files.some((f) => ASTRO_CONFIG_PATTERNS.includes(f))) return "astro"
  if (files.some((f) => SVELTEKIT_CONFIG_PATTERNS.includes(f))) return "sveltekit"
  if (files.some((f) => NUXT_CONFIG_PATTERNS.includes(f))) return "nuxt"
  if (files.some((f) => REMIX_CONFIG_PATTERNS.includes(f))) return "remix"
  if (files.includes("wrangler.toml") || files.includes("wrangler.jsonc")) return "hono"
  if (files.includes("tsconfig.json")) return "tsc"

  return "none"
}

export function detectAll(files: string[]): DetectionResult {
  const projectType = detectProjectType(files)
  const buildSystem = detectBuildSystem(files)

  return {
    projectType,
    buildSystem,
    isMonorepo: projectType === "monorepo" || projectType === "next-monorepo",
    hasVite: files.some(
      (f) =>
        VITE_CONFIG_PATTERNS.includes(f) || f.startsWith("vite.config.") || f === "vite.config.ts",
    ),
    hasNext: files.some(
      (f) =>
        NEXT_CONFIG_PATTERNS.includes(f) || f.startsWith("next.config.") || f === "next.config.js",
    ),
    hasAstro: files.some((f) => ASTRO_CONFIG_PATTERNS.includes(f)),
    hasSvelteKit: files.some((f) => SVELTEKIT_CONFIG_PATTERNS.includes(f)),
    hasNuxt: files.some((f) => NUXT_CONFIG_PATTERNS.includes(f)),
    hasRemix: files.some((f) => REMIX_CONFIG_PATTERNS.includes(f)),
    hasHono: files.some((f) => f === "wrangler.toml" || f === "wrangler.jsonc"),
    hasTurbo: files.includes("turbo.json"),
    hasWorkspace: files.includes("pnpm-workspace.yaml"),
    files,
  }
}

export function isMonorepo(files: string[]): boolean {
  return detectProjectType(files) === "monorepo" || detectProjectType(files) === "next-monorepo"
}

export function getBuildCommand(
  result: DetectionResult,
  _options?: { isTermux?: boolean },
): string[] {
  if (result.buildSystem === "turbo") return ["pnpm", "exec", "turbo", "build"]
  if (result.buildSystem === "vite") return ["pnpm", "exec", "vite", "build"]
  if (result.buildSystem === "next") return ["pnpm", "exec", "next", "build"]
  if (result.buildSystem === "astro") return ["pnpm", "exec", "astro", "build"]
  if (result.buildSystem === "sveltekit") return ["pnpm", "exec", "vite", "build"]
  if (result.buildSystem === "nuxt") return ["pnpm", "exec", "nuxt", "build"]
  if (result.buildSystem === "remix") return ["pnpm", "exec", "remix", "build"]
  if (result.buildSystem === "hono") return ["pnpm", "exec", "wrangler", "deploy"]
  if (result.buildSystem === "tsc") return ["pnpm", "exec", "tsc"]
  return ["pnpm", "build"]
}

export function getDevCommand(result: DetectionResult, options?: { isTermux?: boolean }): string[] {
  if (result.buildSystem === "turbo") return ["pnpm", "exec", "turbo", "dev"]
  if (result.buildSystem === "vite") return ["pnpm", "exec", "vite"]
  if (result.buildSystem === "next") {
    /* v8 ignore next 3 */
    if (options?.isTermux) {
      return ["pnpm", "exec", "next", "dev", "--webpack"]
    }
    return ["pnpm", "exec", "next", "dev"]
  }
  if (result.buildSystem === "astro") return ["pnpm", "exec", "astro", "dev"]
  if (result.buildSystem === "sveltekit") return ["pnpm", "exec", "vite", "dev"]
  if (result.buildSystem === "nuxt") return ["pnpm", "exec", "nuxt", "dev"]
  if (result.buildSystem === "remix") return ["pnpm", "exec", "remix", "dev"]
  if (result.buildSystem === "hono") return ["pnpm", "exec", "wrangler", "dev"]
  if (result.buildSystem === "tsc") return ["pnpm", "exec", "tsc", "--watch"]
  return ["pnpm", "dev"]
}

/* v8 ignore start */
export function getFrameworkList(result: DetectionResult): string[] {
  const list: string[] = []
  if (result.hasVite) list.push("vite")
  if (result.hasNext) list.push("next")
  if (result.hasAstro) list.push("astro")
  if (result.hasSvelteKit) list.push("sveltekit")
  if (result.hasNuxt) list.push("nuxt")
  if (result.hasRemix) list.push("remix")
  if (result.hasHono) list.push("hono")
  if (result.hasTurbo) list.push("turbo")
  return list
}
/* v8 ignore stop */
