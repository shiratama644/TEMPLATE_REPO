/**
 * Generic build launcher — Node 24 LTS, multi-framework, Termux, cache
 * Supports: Vite, Next.js, Astro, SvelteKit, Nuxt, Remix, Hono, Turbo
 * DX強化: 見やすい進捗、タイミング、キャッシュヒント、エラー時の対処法
 */

import { spawnSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import {
  getProjectSourceHash,
  isBuildCacheValid,
  logCacheStats,
  saveBuildCache,
} from "./lib/cache.ts"
import { detectAll } from "./lib/detector.ts"
import { CommonErrors, handleError } from "./lib/errors.ts"
import { formatDuration, logger, loggers, logSection } from "./lib/logger.ts"
import { getNextBuildCommandForTermux, logNextTermuxInfo } from "./lib/next-termux.ts"
import {
  getEnvironmentInfo,
  getViteBuildConfigForTermux,
  logEnvironmentInfo,
} from "./lib/termux.ts"

export function log(tag: string, msg: string) {
  loggers.build.log(msg)
}

export function hasFile(pattern: string): boolean {
  const candidates = [
    pattern,
    `${pattern}.ts`,
    `${pattern}.js`,
    `${pattern}.mjs`,
    `${pattern}.cjs`,
    `${pattern}.mts`,
  ]
  return candidates.some((p) => existsSync(p))
}

export function hasAnyFile(patterns: string[]): boolean {
  return patterns.some((p) => existsSync(p) || hasFile(p))
}

export function hasMonorepoStructure(): boolean {
  try {
    const hasPackages = existsSync("packages") && readdirSync("packages").length > 0
    const hasApps = existsSync("apps") && readdirSync("apps").length > 0
    const hasWorkspaces = existsSync("pnpm-workspace.yaml")
    return hasPackages || hasApps || hasWorkspaces
  } catch {
    /* v8 ignore next 1 */
    return existsSync("pnpm-workspace.yaml")
  }
}

export function parseArgs(): { force: boolean; verbose: boolean; help: boolean } {
  const args = process.argv.slice(2)
  return {
    force: args.includes("--force") || args.includes("-f"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    help: args.includes("--help") || args.includes("-h"),
  }
}

export function printBuildHelp() {
  /* v8 ignore start */
  console.log(`
📦 Template Build — pnpm build v2.0

📖 Usage:
  pnpm build [options]

🎛️  Options:
  --force, -f            キャッシュを無視して強制ビルド
  --verbose, -v          詳細出力
  --help, -h             このヘルプを表示

🔍 対応フレームワーク（自動検出）:
  • Vite         → vite build
  • Next.js      → next build
  • Astro        → astro build
  • SvelteKit    → vite build
  • Nuxt         → nuxt build
  • Remix        → remix build
  • Hono         → tsc --noEmit
  • Turbo        → turbo build
  • Monorepo     → pnpm -r build

💡 Tips:
  • キャッシュヒット時はスキップ（--forceで強制実行）
  • Termux環境では自動最適化
  • CIでは自動的にverboseモード

📚 Docs: https://github.com/shiratama644/TEMPLATE_REPO#build
`)
  /* v8 ignore stop */
}

export function run(
  cmd: string[],
  cwd = process.cwd(),
  extraEnv: Record<string, string> = {},
): number {
  loggers.build.info(`▶ ${cmd.join(" ")}${cwd !== process.cwd() ? ` (cwd: ${cwd})` : ""}`)
  if (Object.keys(extraEnv).length > 0) {
    loggers.build.debug(`Env: ${JSON.stringify(extraEnv)}`)
  }

  const result = spawnSync(cmd[0], cmd.slice(1), {
    cwd,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  })
  return result.status ?? 1
}

export async function main(): Promise<number> {
  const { force, verbose, help } = parseArgs()

  /* v8 ignore next 4 */
  if (help) {
    printBuildHelp()
    return 0
  }

  logger.box("📦 Template Repo — Build (Node 24 LTS, multi-framework)")

  logEnvironmentInfo()
  logCacheStats()

  const detection = detectAll() as any
  logger.info(detection?.summary || "Build detection")
  if (detection?.root) {
    logger.info(`Root: type=${detection.root.type}, build=${detection.root.buildSystem}`)
  }
  /* v8 ignore next 3 */
  if (detection?.workspace?.length) {
    logger.info(`Workspace: ${detection.workspace.length} app(s) detected`)
  }

  const envInfo = getEnvironmentInfo()
  const sourceHash = getProjectSourceHash()
  /* v8 ignore next 4 */
  if (verbose) {
    loggers.build.debug(`Args: ${process.argv.slice(2).join(" ")}`)
    loggers.build.debug(`Source hash: ${sourceHash}`)
  }
  loggers.build.info(
    `Source: hash=${sourceHash.slice(0, 8)}..., Termux=${envInfo.isTermux}, CI=${envInfo.isCI}`,
  )

  const startMs = Date.now()
  loggers.build.time("build")

  if (existsSync("turbo.json")) {
    const cacheValid = isBuildCacheValid("turbo")
    if (cacheValid) {
      loggers.build.info(
        `Turbo cache valid (hash=${sourceHash.slice(0, 8)}...), running anyway for safety`,
      )
    }

    logSection("Turbo Build")
    loggers.build.start("Detected turbo.json → pnpm exec turbo build")
    const code = run(
      ["pnpm", "exec", "turbo", "build", "--cache-dir=.turbo/cache"],
      process.cwd(),
      { TURBO_CACHE_DIR: ".turbo/cache" },
    )
    if (code === 0) {
      saveBuildCache("turbo", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Turbo build failed")
      logger.info("💡 Check turbo.json configuration")
      logger.info("🔧 Try: pnpm install && pnpm build --verbose")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasMonorepoStructure()) {
    logSection("Monorepo Build")
    loggers.build.start("Detected monorepo → pnpm -r build")
    const code = run(["pnpm", "-r", "build"])
    if (code === 0) {
      saveBuildCache("monorepo", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Monorepo build failed")
      logger.info("💡 Check each package's build script")
      logger.info("🔧 Try: pnpm -r build --verbose")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasAnyFile(["vite.config"])) {
    const viteTermux = getViteBuildConfigForTermux()
    if (viteTermux.isTermux) {
      loggers.termux.warn(viteTermux.reason)
    }

    const cacheValid = isBuildCacheValid("vite")
    if (cacheValid && !envInfo.isTermux) {
      if (!force) {
        loggers.build.success(`Cache hit (hash=${sourceHash.slice(0, 8)}...) → skipping`)
        loggers.build.info("💡 Use --force to bypass cache")
        return 0
      }
      loggers.build.info("Force flag detected, bypassing cache")
    }

    logSection("Vite Build")
    loggers.build.start("Detected vite.config.* → vite build")
    const code = run(["pnpm", "exec", "vite", "build"], process.cwd(), {
      ...viteTermux.env,
      VITE_CACHE_DIR: "node_modules/.vite",
    })
    if (code === 0) {
      saveBuildCache("vite", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Vite build failed")
      logger.info("💡 Check vite.config.* and entry points")
      logger.info("🔧 Try: pnpm typecheck && pnpm build --verbose")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasAnyFile(["next.config"])) {
    logNextTermuxInfo()
    const nextTermux = getNextBuildCommandForTermux(["pnpm", "exec", "next", "build"])
    logger.info(nextTermux.log)

    const cacheValid = isBuildCacheValid("next")
    if (cacheValid && !envInfo.isTermux) {
      loggers.build.info(
        `Next.js cache valid (hash=${sourceHash.slice(0, 8)}...) but running for .next/cache`,
      )
    }

    logSection("Next.js Build")
    loggers.build.start(`Detected next.config.* → ${nextTermux.cmd.join(" ")}`)
    const code = run(nextTermux.cmd, process.cwd(), {
      ...nextTermux.env,
      NEXT_CACHE_DIR: ".next/cache",
      WEBPACK_CACHE: "1",
    })
    if (code === 0) {
      saveBuildCache("next", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Next.js build failed")
      logger.info("💡 Check next.config.* and pages/app directory")
      logger.info("🔧 Try: pnpm typecheck && pnpm build --verbose")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasAnyFile(["astro.config"])) {
    logSection("Astro Build")
    loggers.build.start("Detected astro.config.* → astro build")
    const code = run(["pnpm", "exec", "astro", "build"])
    if (code === 0) {
      saveBuildCache("astro", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Astro build failed")
      logger.info("💡 Check astro.config.* and src/ directory")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasAnyFile(["svelte.config"])) {
    logSection("SvelteKit Build")
    loggers.build.start("Detected svelte.config.* → vite build")
    const code = run(["pnpm", "exec", "vite", "build"])
    if (code === 0) {
      saveBuildCache("sveltekit", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("SvelteKit build failed")
      logger.info("💡 Check svelte.config.* and src/routes/")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasAnyFile(["nuxt.config"])) {
    logSection("Nuxt Build")
    loggers.build.start("Detected nuxt.config.* → nuxt build")
    const code = run(["pnpm", "exec", "nuxt", "build"])
    if (code === 0) {
      saveBuildCache("nuxt", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Nuxt build failed")
      logger.info("💡 Check nuxt.config.* and pages/ directory")
      /* v8 ignore stop */
    }
    return code
  }

  if (hasAnyFile(["remix.config"]) || existsSync("app/root.tsx")) {
    logSection("Remix Build")
    loggers.build.start("Detected remix → remix build")
    const code = run(["pnpm", "exec", "remix", "build"])
    if (code === 0) {
      saveBuildCache("remix", Date.now() - startMs)
      loggers.build.timeEnd("build")
    } else {
      /* v8 ignore start */
      logger.error("Remix build failed")
      logger.info("💡 Check remix.config.* and app/ directory")
      /* v8 ignore stop */
    }
    return code
  }

  if (existsSync("wrangler.toml") || existsSync("wrangler.jsonc")) {
    logSection("Hono/Wrangler Check")
    loggers.build.start("Detected Hono/Wrangler → build check")
    const code = run(["pnpm", "exec", "tsc", "--noEmit"])
    /* v8 ignore next 3 */
    if (code === 0) {
      saveBuildCache("hono", Date.now() - startMs)
      loggers.build.timeEnd("build")
    }
    return code
  }

  if (existsSync("tsconfig.json")) {
    const cacheValid = isBuildCacheValid("tsc")
    if (cacheValid && !force) {
      loggers.build.success(`Cache hit (hash=${sourceHash.slice(0, 8)}...) → skipping tsc`)
      loggers.build.info("💡 Use --force to bypass cache")
      return 0
    }
    /* v8 ignore next 3 */
    if (force && cacheValid) {
      loggers.build.info("Force flag detected, bypassing cache")
    }

    logSection("TypeScript Check")
    loggers.build.start("Detected tsconfig.json → tsc check")
    const check = run(["pnpm", "exec", "tsc", "--noEmit"])
    if (check !== 0) {
      /* v8 ignore start */
      logger.error("TypeScript check failed")
      logger.info("💡 Run pnpm typecheck --verbose for details")
      logger.info("🔧 Fix type errors and try again")
      return check
      /* v8 ignore stop */
    }
    logger.success(`✓ Build check passed in ${formatDuration(Date.now() - startMs)}`)
    saveBuildCache("tsc", Date.now() - startMs)
    return 0
  }

  /* v8 ignore start */
  loggers.build.warn("No build config found, nothing to build")
  loggers.build.info(
    "💡 Supported: vite.config.*, next.config.*, astro.config.*, svelte.config.*, nuxt.config.*, remix.config.*, wrangler.toml, tsconfig.json, turbo.json",
  )
  /* v8 ignore stop */
  return 0
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => handleError(err))
}
/* v8 ignore stop */
