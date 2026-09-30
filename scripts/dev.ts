/**
 * Generic dev launcher — Node 24 LTS, multi-framework, Termux, cache
 * Supports: Vite, Next.js, Astro, SvelteKit, Nuxt, Remix, Hono, Turbo
 * DX強化: 起動時のガイダンス、ポート情報、終了時のクリーンアップ、ヘルプ
 */

import { spawn } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { logCacheStats } from "./lib/cache.ts"
import { detectAll } from "./lib/detector.ts"
import { handleError } from "./lib/errors.ts"
import { logger, loggers, logSection } from "./lib/logger.ts"
import { getNextBuildCommandForTermux, isNextJsProject } from "./lib/next-termux.ts"
import {
  getEnvironmentInfo,
  getViteBuildConfigForTermux,
  logEnvironmentInfo,
} from "./lib/termux.ts"

export function log(tag: string, msg: string) {
  loggers.dev.log(msg)
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

function readPackageJson(cwd = process.cwd()):
  | {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
  | undefined {
  try {
    const pkgPath = join(cwd, "package.json")
    if (!existsSync(pkgPath)) return undefined
    return JSON.parse(readFileSync(pkgPath, "utf8"))
  } catch {
    /* v8 ignore next 1 */
    return undefined
  }
}

export function hasTurboInDependencies(cwd = process.cwd()): boolean {
  const pkg = readPackageJson(cwd)
  if (!pkg) return false
  return !!(pkg.devDependencies?.turbo || pkg.dependencies?.turbo)
}

export function hasTsxInDependencies(cwd = process.cwd()): boolean {
  const pkg = readPackageJson(cwd)
  if (!pkg) return false
  return !!(pkg.devDependencies?.tsx || pkg.dependencies?.tsx)
}

/* v8 ignore start */
export function hasDependency(name: string, cwd = process.cwd()): boolean {
  const pkg = readPackageJson(cwd)
  if (!pkg) return false
  return !!(pkg.devDependencies?.[name] || pkg.dependencies?.[name])
}
/* v8 ignore stop */

export function parseArgs(): { help: boolean; verbose: boolean; port?: string } {
  const args = process.argv.slice(2)
  const getValue = (flag: string): string | undefined => {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
    if (idx === -1) return undefined
    const arg = args[idx]
    /* v8 ignore next 3 */
    if (!arg) return undefined
    if (arg.includes("=")) return arg.split("=").slice(1).join("=")
    return args[idx + 1]
  }
  return {
    help: args.includes("--help") || args.includes("-h"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    port: getValue("--port") || getValue("-p"),
  }
}

export function printDevHelp() {
  /* v8 ignore start */
  console.log(`
🚀 Template Dev — pnpm dev v2.0

📖 Usage:
  pnpm dev [options]

🎛️  Options:
  --port, -p <port>      ポート指定 (例: --port 3000)
  --verbose, -v          詳細出力
  --help, -h             このヘルプを表示

🔍 対応フレームワーク（自動検出）:
  🔹 Vite         ➡️ vite dev       (http://localhost:5173)
  🔹 Next.js      ➡️ next dev       (http://localhost:3000)
  🔹 Astro        ➡️ astro dev      (http://localhost:4321)
  🔹 SvelteKit    ➡️ vite dev       (http://localhost:5173)
  🔹 Nuxt         ➡️ nuxt dev       (http://localhost:3000)
  🔹 Remix        ➡️ remix dev      (http://localhost:3000)
  🔹 Hono         ➡️ wrangler dev   (http://localhost:8787)
  🔹 Turbo        ➡️ turbo dev      (monorepo)
  🔹 Plain TS     ➡️ tsx watch / node --watch

💡 Tips:
  🔹 Ctrl+C で終了
  🔹 Termux環境では自動最適化（Webpack fallback）
  🔹 対応フレームワークがない場合は package.json の dev スクリプトを確認

📚 Docs: https://github.com/shiratama644/TEMPLATE_REPO#dev
`)
  /* v8 ignore stop */
}

export function run(
  cmd: string[],
  cwd = process.cwd(),
  extraEnv: Record<string, string> = {},
): void {
  /* v8 ignore next 3 */
  loggers.dev.info(`▶ ${cmd.join(" ")}${cwd !== process.cwd() ? ` (cwd: ${cwd})` : ""}`)
  if (Object.keys(extraEnv).length > 0) {
    loggers.dev.debug(`Env: ${JSON.stringify(extraEnv)}`)
  }

  const child = spawn(cmd[0], cmd.slice(1), {
    cwd,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  })
  child.on("close", (code) => {
    /* v8 ignore start */
    if (process.env.VITEST || process.env.VITEST_WORKER_ID) return
    if (code !== 0 && code !== null) {
      logger.warn(`Dev server exited with code ${code}`)
      logger.info("💡 Check logs above for errors")
    } else {
      logger.info("👋 Dev server stopped")
    }
    process.exit(code ?? 0)
    /* v8 ignore stop */
  })
  child.on("error", (err) => {
    logger.error(`Failed to spawn ${cmd.join(" ")}: ${err.message}`)
    logger.info("💡 Try: pnpm install && pnpm dev")
    /* v8 ignore start */
    if (process.env.VITEST || process.env.VITEST_WORKER_ID) return
    process.exit(1)
    /* v8 ignore stop */
  })

  const shutdown = () => {
    logger.info("🛑 Shutting down dev server...")
    try {
      child.kill("SIGTERM")
    } catch {}
    /* v8 ignore start */
    if (process.env.VITEST || process.env.VITEST_WORKER_ID) return
    setTimeout(() => {
      try {
        child.kill("SIGKILL")
      } catch {}
      process.exit(0)
    }, 2000)
    /* v8 ignore stop */
  }
  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}

export async function main(): Promise<void> {
  const { help, verbose, port } = parseArgs()

  /* v8 ignore next 4 */
  if (help) {
    printDevHelp()
    return
  }

  logger.box("🚀 Template Repo — Dev Server (Node 24 LTS, multi-framework)")

  logEnvironmentInfo()
  logCacheStats()

  const detection = detectAll() as any
  /* v8 ignore next 1 */
  logger.info(detection?.summary || "Dev detection")
  if (detection?.root) {
    logger.info(`Root: type=${detection.root.type}, build=${detection.root.buildSystem}`)
  }

  const envInfo = getEnvironmentInfo()
  /* v8 ignore next 3 */
  if (verbose) {
    loggers.dev.debug(`Port: ${port || "auto"}, Termux: ${envInfo.isTermux}`)
  }

  const portEnv: Record<string, string> = {}
  if (port) {
    /* v8 ignore start */
    portEnv.PORT = port
    portEnv.VITE_PORT = port
    loggers.dev.info(`📌 Using custom port: ${port}`)
    /* v8 ignore stop */
  }

  if (existsSync("turbo.json")) {
    logSection("Turbo Dev")
    loggers.dev.start("Detected turbo.json ➡️ monorepo (turbo) with cache")
    loggers.dev.info("💡 All apps will start in parallel")
    run(["pnpm", "exec", "turbo", "dev", "--cache-dir=.turbo/cache"], process.cwd(), {
      TURBO_CACHE_DIR: ".turbo/cache",
      ...portEnv,
    })
    return
  }

  if (hasMonorepoStructure()) {
    if (hasTurboInDependencies()) {
      logSection("Monorepo + Turbo")
      loggers.dev.start("Detected monorepo + turbo ➡️ pnpm exec turbo dev")
      run(["pnpm", "exec", "turbo", "dev"], process.cwd(), {
        TURBO_CACHE_DIR: ".turbo/cache",
        ...portEnv,
      })
      return
    }

    const appsDir = "apps"
    if (existsSync(appsDir)) {
      const apps = readdirSync(appsDir)
      for (const app of apps) {
        const appPath = join(appsDir, app)
        if (
          existsSync(join(appPath, "vite.config.ts")) ||
          existsSync(join(appPath, "vite.config.js")) ||
          existsSync(join(appPath, "vite.config.mjs")) ||
          existsSync(join(appPath, "vite.config.cjs")) ||
          existsSync(join(appPath, "vite.config.mts"))
        ) {
          logSection(`Monorepo App: ${app}`)
          loggers.dev.start(`Detected monorepo app ${app} with vite ➡️ filter ${app} dev`)
          run(["pnpm", "--filter", app, "dev"], process.cwd(), portEnv)
          return
        }
        /* v8 ignore next 1 */
        if (isNextJsProject(appPath)) {
          const nextCmd = getNextBuildCommandForTermux(
            ["pnpm", "--filter", app, "exec", "next", "dev"],
            appPath,
          )
          /* v8 ignore next 3 */
          if (nextCmd.isTermux) {
            logger.info(nextCmd.log)
          }
          logSection(`Monorepo App: ${app}`)
          loggers.dev.start(`Detected monorepo app ${app} with next ➡️ ${nextCmd.cmd.join(" ")}`)
          run(nextCmd.cmd, process.cwd(), { ...nextCmd.env, ...portEnv })
          return
        }
      }
    }

    logSection("Monorepo Dev")
    loggers.dev.start("Detected monorepo structure ➡️ pnpm -r --parallel dev")
    loggers.dev.info("💡 All packages will start in parallel")
    run(["pnpm", "-r", "--parallel", "dev"], process.cwd(), portEnv)
    return
  }

  if (hasAnyFile(["vite.config"])) {
    const viteTermux = getViteBuildConfigForTermux()
    if (viteTermux.isTermux) {
      loggers.termux.warn(viteTermux.reason)
    }
    logSection("Vite Dev")
    loggers.dev.start("Detected vite.config.* ➡️ vite dev")
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "5173"}`)
    run(["pnpm", "exec", "vite"], process.cwd(), {
      ...viteTermux.env,
      VITE_CACHE_DIR: "node_modules/.vite",
      ...portEnv,
    })
    return
  }

  if (hasAnyFile(["next.config"])) {
    const nextCmd = getNextBuildCommandForTermux(["pnpm", "exec", "next", "dev"])
    logger.info(nextCmd.log)

    /* v8 ignore next 3 */
    if (envInfo.isTermux) {
      loggers.termux.warn("Next.js dev in Termux ➡️ Webpack mode, reduced memory")
    }

    logSection("Next.js Dev")
    loggers.dev.start(`Detected next.config.* ➡️ ${nextCmd.cmd.join(" ")}`)
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "3000"}`)
    run(nextCmd.cmd, process.cwd(), {
      ...nextCmd.env,
      NEXT_CACHE_DIR: ".next/cache",
      ...portEnv,
    })
    return
  }

  if (hasAnyFile(["astro.config"])) {
    logSection("Astro Dev")
    loggers.dev.start("Detected astro.config.* ➡️ astro dev")
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "4321"}`)
    run(["pnpm", "exec", "astro", "dev"], process.cwd(), portEnv)
    return
  }

  if (hasAnyFile(["svelte.config"])) {
    logSection("SvelteKit Dev")
    loggers.dev.start("Detected svelte.config.* ➡️ vite dev")
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "5173"}`)
    run(["pnpm", "exec", "vite", "dev"], process.cwd(), portEnv)
    return
  }

  if (hasAnyFile(["nuxt.config"])) {
    logSection("Nuxt Dev")
    loggers.dev.start("Detected nuxt.config.* ➡️ nuxt dev")
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "3000"}`)
    run(["pnpm", "exec", "nuxt", "dev"], process.cwd(), portEnv)
    return
  }

  if (hasAnyFile(["remix.config"]) || existsSync("app/root.tsx")) {
    logSection("Remix Dev")
    loggers.dev.start("Detected remix ➡️ remix dev")
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "3000"}`)
    run(["pnpm", "exec", "remix", "dev"], process.cwd(), portEnv)
    return
  }

  if (existsSync("wrangler.toml") || existsSync("wrangler.jsonc")) {
    logSection("Hono/Wrangler Dev")
    loggers.dev.start("Detected Hono/Wrangler ➡️ wrangler dev")
    loggers.dev.info(`🌐 Expected: http://localhost:${port || "8787"}`)
    run(["pnpm", "exec", "wrangler", "dev"], process.cwd(), portEnv)
    return
  }

  if (existsSync("src/index.ts") || existsSync("src/index.js")) {
    if (hasTsxInDependencies()) {
      logSection("TSX Watch")
      loggers.dev.start("Detected src/index.ts + tsx ➡️ tsx watch")
      run(["pnpm", "exec", "tsx", "watch", "src/index.ts"], process.cwd(), portEnv)
      return
    }

    logSection("Node Watch")
    loggers.dev.start("Detected src/index.ts ➡️ node --watch")
    run(["node", "--watch", "--experimental-strip-types", "src/index.ts"], process.cwd(), portEnv)
    return
  }

  /* v8 ignore start */
  logger.warn("⚠️️ No specific framework detected")
  logger.info("📋 Configure your dev command in package.json:")
  logger.info("  🔹 Vite:      pnpm add -D vite && set 'dev': 'vite'")
  logger.info("  🔹 Next.js:   pnpm add next react react-dom && set 'dev': 'next dev'")
  logger.info("  🔹 Astro:     pnpm add astro && set 'dev': 'astro dev'")
  logger.info("  🔹 SvelteKit: pnpm add @sveltejs/kit && set 'dev': 'vite dev'")
  logger.info("  🔹 Nuxt:      pnpm add nuxt && set 'dev': 'nuxt dev'")
  logger.info("  🔹 Hono:      pnpm add hono wrangler && set 'dev': 'wrangler dev'")
  logger.info("  🔹 Monorepo:  pnpm add -D turbo && create turbo.json")
  logger.info("")
  logger.info("💡 Run pnpm dev --help for more info")
  logger.info(
    `📱 Termux: ${envInfo.isTermux ? "detected, Webpack fallback enabled" : "not detected"}`,
  )
  /* v8 ignore stop */
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main().catch((err) => handleError(err))
}
/* v8 ignore stop */
