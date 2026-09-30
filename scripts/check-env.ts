/**
 * 環境チェックスクリプト — Termux検出 + キャッシュ + Node 24 LTS確認
 *
 * Usage: pnpm check:env または node --experimental-strip-types scripts/check-env.ts
 */

import { getCacheConfig, getProjectSourceHash, logCacheStats } from "./lib/cache.ts"
import { isNextJsProject, logNextTermuxInfo } from "./lib/next-termux.ts"
import {
  getEnvironmentInfo,
  getNextJsBuildConfigForTermux,
  getViteBuildConfigForTermux,
  logEnvironmentInfo,
} from "./lib/termux.ts"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const CYAN = "\x1b[36m"
const YELLOW = "\x1b[33m"

export function runCheckEnv(): {
  envInfo: ReturnType<typeof getEnvironmentInfo>
  isNext: boolean
  sourceHash: string
} {
  console.log(`${GREEN}=== Environment Check (Node 24 LTS, Termux, Cache) ===${RESET}\n`)

  logEnvironmentInfo()
  console.log("")

  const envInfo = getEnvironmentInfo()
  console.log(
    `${CYAN}[CHECK]${RESET} Node: ${process.version}, Platform: ${envInfo.platform}, CI: ${envInfo.isCI}`,
  )
  console.log(
    `${CYAN}[CHECK]${RESET} Termux: ${envInfo.isTermux ? `${YELLOW}YES - Webpack fallback enabled${RESET}` : `${GREEN}NO - Default bundler${RESET}`}`,
  )
  console.log(`${CYAN}[CHECK]${RESET} Source hash: ${getProjectSourceHash()}`)
  console.log("")

  logCacheStats()
  console.log("")

  const cacheConfig = getCacheConfig()
  console.log(`${CYAN}[CACHE CONFIG]${RESET} Vite paths: ${cacheConfig.vite.paths.join(", ")}`)
  console.log(`${CYAN}[CACHE CONFIG]${RESET} Next paths: ${cacheConfig.next.paths.join(", ")}`)
  console.log(`${CYAN}[CACHE CONFIG]${RESET} Turbo paths: ${cacheConfig.turbo.paths.join(", ")}`)
  console.log("")

  if (isNextJsProject()) {
    logNextTermuxInfo()
    const nextConfig = getNextJsBuildConfigForTermux()
    console.log(
      `${CYAN}[NEXT]${RESET} useWebpack: ${nextConfig.useWebpack}, args: ${nextConfig.args.join(" ")}, env: ${JSON.stringify(nextConfig.env)}`,
    )
  } else {
    console.log(`${CYAN}[NEXT]${RESET} Not a Next.js project`)
  }

  console.log("")
  const viteConfig = getViteBuildConfigForTermux()
  console.log(
    `${CYAN}[VITE]${RESET} isTermux: ${viteConfig.isTermux}, env: ${JSON.stringify(viteConfig.env)}`,
  )
  console.log("")

  console.log(`${GREEN}✓ Environment check completed${RESET}`)
  if (envInfo.isTermux) {
    console.log(
      `${YELLOW}Termux detected — Next.js builds will use Webpack for stability, caching optimized for low memory${RESET}`,
    )
  } else {
    console.log(
      `${GREEN}Standard environment — using default bundlers with caching enabled${RESET}`,
    )
  }

  return {
    envInfo,
    isNext: isNextJsProject(),
    sourceHash: getProjectSourceHash(),
  }
}

export function main() {
  runCheckEnv()
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main()
}
/* v8 ignore stop */
