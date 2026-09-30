/**
 * Next.js Termux対応 — 100% coverage simple version
 */

import { existsSync } from "node:fs"
import { join } from "node:path"
import { getNextJsBuildConfigForTermux, isTermuxEnvironment } from "./termux.ts"

export function isNextJsProject(cwd = process.cwd()): boolean {
  const candidates = [
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
    "next.config.ts",
    "next.config.mts",
  ]
  for (let i = 0; i < candidates.length; i++) {
    if (existsSync(join(cwd, candidates[i]))) return true
  }
  return false
}

export function getNextBuildCommandForTermux(
  originalArgs: string[] = ["next", "build"],
  cwd = process.cwd(),
): {
  cmd: string[]
  env: Record<string, string>
  isTermux: boolean
  log: string
  isDev: boolean
} {
  const isTermux = isTermuxEnvironment()
  const termuxConfig = getNextJsBuildConfigForTermux()

  if (!isTermux || !isNextJsProject(cwd)) {
    return {
      cmd: originalArgs,
      env: {},
      isTermux: false,
      log: "Not Termux or not Next.js, using original command",
      isDev: false,
    }
  }

  const cmd: string[] = []
  for (let i = 0; i < originalArgs.length; i++) {
    const arg = originalArgs[i]
    if (arg !== "--turbopack" && arg !== "--turbo" && arg !== "--no-turbopack") {
      cmd.push(arg)
    }
  }

  let hasWebpack = false
  for (let i = 0; i < cmd.length; i++) {
    if (cmd[i] === "--webpack") hasWebpack = true
  }

  // More precise dev detection: must contain "next" and "dev" together
  const hasNext = originalArgs.some((a) => a.includes("next"))
  const hasDev =
    originalArgs.includes("dev") ||
    originalArgs.includes("dev:next") ||
    originalArgs.some((a) => a === "dev" || a.includes("next dev"))
  const isDevCommand = hasNext && hasDev

  // Only add --webpack for dev commands, never for build
  const isBuildCommand = originalArgs.includes("build")
  if (!hasWebpack && isDevCommand && !isBuildCommand) {
    cmd.push("--webpack")
  }

  const log = isDevCommand
    ? `Next.js dev detected in Termux → forcing Webpack (--webpack) for stability`
    : `Next.js build detected in Termux → using Webpack env fallback (no --webpack flag for build)`

  return {
    cmd,
    env: termuxConfig.env,
    isTermux: true,
    log,
    isDev: isDevCommand,
  }
}

export function shouldPatchNextConfigForTermux(configPath?: string): boolean {
  if (!isTermuxEnvironment()) return false

  const cwd = process.cwd()
  if (configPath) {
    return existsSync(configPath)
  }

  const candidates = [
    join(cwd, "next.config.js"),
    join(cwd, "next.config.ts"),
    join(cwd, "next.config.mjs"),
    join(cwd, "next.config.cjs"),
    join(cwd, "next.config.mts"),
  ]
  for (let i = 0; i < candidates.length; i++) {
    if (existsSync(candidates[i])) return true
  }
  return false
}

export function generateTermuxNextConfigOverride(): string {
  return `
 // Termux対応: Webpack強制設定
 // This override disables Turbopack in Termux for stability
 const isTermux = process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux') || process.env.TERMUX__USER_ID;
 const termuxConfig = isTermux
   ? {
       experimental: {
         // Disable Turbopack in Termux
         turbo: undefined,
       },
       // Reduce memory usage in Termux
       webpack: (config, { isServer }) => {
         if (!isServer) {
           config.optimization = {
             ...config.optimization,
             splitChunks: false,
           };
         }
         return config;
       },
     }
   : {};
 export default termuxConfig;
 `.trim()
}

export function logNextTermuxInfo(cwd = process.cwd()): void {
  const isTermux = isTermuxEnvironment()
  const isNext = isNextJsProject(cwd)

  if (!isNext) {
    console.log(`[NEXT-TERMUX] Not a Next.js project`)
    return
  }

  if (!isTermux) {
    console.log(`[NEXT-TERMUX] Next.js project detected, not Termux`)
    return
  }

  const config = getNextJsBuildConfigForTermux()
  console.log(`[NEXT-TERMUX] Termux + Next.js detected! Reason: ${config.reason}`)
}
