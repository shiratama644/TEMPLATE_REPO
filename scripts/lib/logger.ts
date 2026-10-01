/**
 * Structured Logger — consola ベースの統一ロガー
 * DX強化: 見やすい出力、タイミング、進捗、テーブル、Termux対応
 */

import { consola, createConsola } from "consola"

export type LogLevel = "silent" | "error" | "warn" | "log" | "info" | "debug" | "trace" | "verbose"

/* v8 ignore start */
function detectTermux(): boolean {
  try {
    if (process.env.TERMUX_VERSION) return true
    if (process.env.PREFIX?.includes("com.termux")) return true
    return false
  } catch {
    return false
  }
}

const isTermux = detectTermux()
const isCI = !!process.env.CI
const isVerbose = process.argv.includes("--verbose") || process.argv.includes("-v")
const isDebug = !!process.env.DEBUG || isVerbose

export const logger = createConsola({
  level: isVerbose ? 5 : isCI ? 3 : 4,
  formatOptions: {
    date: false,
    colors: !isTermux,
    compact: isTermux,
  },
})
/* v8 ignore stop */

// Enhanced tagged logger with timing and better UX
export function createTaggedLogger(tag: string) {
  const startTimes = new Map<string, number>()

  return {
    log: (msg: string, ...args: any[]) => logger.log(`[${tag}] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => logger.info(`[${tag}] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => logger.warn(`[${tag}] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => logger.error(`[${tag}] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => {
      /* v8 ignore start */
      if (isDebug) logger.debug(`[${tag}] ${msg}`, ...args)
      /* v8 ignore stop */
    },
    success: (msg: string, ...args: any[]) => logger.success(`[${tag}] ${msg}`, ...args),
    fail: (msg: string, ...args: any[]) => logger.fail(`[${tag}] ${msg}`, ...args),
    ready: (msg: string, ...args: any[]) => logger.ready(`[${tag}] ${msg}`, ...args),
    start: (msg: string, ...args: any[]) => logger.start(`[${tag}] ${msg}`, ...args),
    box: (msg: string) => logger.box(`[${tag}] ${msg}`),

    // Timing helpers for better DX
    time: (label: string) => {
      startTimes.set(label, Date.now())
      logger.start(`[${tag}] ⏱ ${label}...`)
    },
    timeEnd: (label: string) => {
      const start = startTimes.get(label)
      if (start) {
        const duration = Date.now() - start
        logger.success(`[${tag}] ⏱ ${label} completed in ${formatDuration(duration)}`)
        startTimes.delete(label)
        return duration
      }
      return 0
    },

    // Step logging for multi-step processes
    step: (current: number, total: number, msg: string) => {
      logger.log(`[${tag}] [${current}/${total}] ${msg}`)
    },

    // Table logging for structured data
    table: (data: Record<string, any>) => {
      const entries = Object.entries(data)
      const maxKey = Math.max(...entries.map(([k]) => k.length))
      for (const [key, value] of entries) {
        logger.log(`[${tag}] ${key.padEnd(maxKey)} : ${value}`)
      }
    },
  }
}

export const loggers = {
  build: createTaggedLogger("BUILD"),
  dev: createTaggedLogger("DEV"),
  cache: createTaggedLogger("CACHE"),
  detect: createTaggedLogger("DETECT"),
  env: createTaggedLogger("ENV"),
  termux: createTaggedLogger("TERMUX"),
  check: createTaggedLogger("CHECK"),
  setup: createTaggedLogger("SETUP"),
  bootstrap: createTaggedLogger("BOOTSTRAP"),
  verify: createTaggedLogger("VERIFY"),
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

export function logBox(title: string, messages: string[]): void {
  const content = [title, "", ...messages].join("\n")
  logger.box(content)
}

// Enhanced box with better formatting
export function logSuccessBox(title: string, details: string[]): void {
  const content = [`✓ ${title}`, "", ...details].join("\n")
  logger.box(content)
}

export function logErrorBox(title: string, errors: string[], hints: string[] = []): void {
  const content = [
    `✗ ${title}`,
    "",
    ...errors.map((e) => `  • ${e}`),
    ...(hints.length ? ["", "💡 Hints:", ...hints.map((h) => `  • ${h}`)] : []),
  ].join("\n")
  logger.box(content)
}

export function logProgress(current: number, total: number, label?: string): void {
  const percent = Math.round((current / total) * 100)
  const barLength = 20
  const filled = Math.round((current / total) * barLength)
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled)
  logger.log(`${label ? `[${label}] ` : ""}${bar} ${percent}% (${current}/${total})`)
}

// Grouped logging for better readability
export function logGroup(title: string, items: string[], icon = "📋"): void {
  logger.info(`${icon} ${title}:`)
  for (const item of items) {
    logger.log(`  • ${item}`)
  }
}

export function logSection(title: string): void {
  logger.log("")
  logger.info(`━━━ ${title} ━━━`)
}

export { consola }
export default logger
