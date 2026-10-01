/**
 * Termux環境検出ユーティリティ — 100% coverage version
 * 環境変数のみで判定（ファイル存在チェックは除外してテスト容易に）
 */

export type EnvironmentInfo = {
  isTermux: boolean
  isAndroid: boolean
  isCI: boolean
  platform: NodeJS.Platform
  termuxVersion?: string
  prefix?: string
  detectionReasons: string[]
}

export function isTermuxEnvironment(): boolean {
  return getEnvironmentInfo().isTermux
}

export function getEnvironmentInfo(): EnvironmentInfo {
  const reasons: string[] = []
  let isTermux = false

  // 1. TERMUX_VERSION env
  if (process.env.TERMUX_VERSION) {
    isTermux = true
    reasons.push(`TERMUX_VERSION=${process.env.TERMUX_VERSION}`)
  }

  // 2. PREFIX contains com.termux
  if (process.env.PREFIX?.includes("com.termux")) {
    isTermux = true
    reasons.push(`PREFIX contains com.termux: ${process.env.PREFIX}`)
  }

  // 3. TERMUX__USER_ID
  if (process.env.TERMUX__USER_ID) {
    isTermux = true
    reasons.push(`TERMUX__USER_ID=${process.env.TERMUX__USER_ID}`)
  }

  // 4. ANDROID_ROOT + PREFIX termux
  if (process.env.ANDROID_ROOT && process.env.PREFIX?.toLowerCase().includes("termux")) {
    isTermux = true
    reasons.push(`ANDROID_ROOT + PREFIX termux: ${process.env.ANDROID_ROOT}, ${process.env.PREFIX}`)
  }

  // 5. ANDROID_DATA contains termux
  if (process.env.ANDROID_DATA?.toLowerCase().includes("termux")) {
    isTermux = true
    reasons.push(`ANDROID_DATA contains termux: ${process.env.ANDROID_DATA}`)
  }

  // 6. Check for Termux specific env vars
  if (process.env.TERMUX_API_VERSION) {
    isTermux = true
    reasons.push(`TERMUX_API_VERSION=${process.env.TERMUX_API_VERSION}`)
  }

  const isAndroid = process.env.ANDROID_ROOT !== undefined

  return {
    isTermux,
    isAndroid,
    isCI: !!process.env.CI,
    platform: process.platform as NodeJS.Platform,
    termuxVersion: process.env.TERMUX_VERSION,
    prefix: process.env.PREFIX,
    detectionReasons: reasons,
  }
}

export function getNextJsBuildConfigForTermux(): {
  useWebpack: boolean
  env: Record<string, string>
  args: string[]
  devArgs: string[]
  buildArgs: string[]
  reason: string
} {
  const envInfo = getEnvironmentInfo()

  if (!envInfo.isTermux) {
    return {
      useWebpack: false,
      env: {},
      args: [],
      devArgs: [],
      buildArgs: [],
      reason: "Not Termux, using default (Turbopack if configured)",
    }
  }

  const env = {
    NEXT_WEBPACK: "1",
    NEXT_TURBOPACK: "0",
    TURBOPACK: "0",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=2048`.trim(),
  }

  return {
    useWebpack: true,
    env,
    args: ["--webpack"], // Legacy, use devArgs instead
    devArgs: ["--webpack"], // Only for dev
    buildArgs: [], // Never for build
    reason: `Termux detected (${envInfo.detectionReasons.join(", ")}), forcing Webpack for dev stability`,
  }
}

export function getViteBuildConfigForTermux(): {
  isTermux: boolean
  env: Record<string, string>
  reason: string
} {
  const envInfo = getEnvironmentInfo()

  if (!envInfo.isTermux) {
    return {
      isTermux: false,
      env: {},
      reason: "Not Termux, using default Vite config",
    }
  }

  return {
    isTermux: true,
    env: {
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-old-space-size=2048`.trim(),
      VITE_CACHE_DIR: "node_modules/.vite-termux",
    },
    reason: `Termux detected (${envInfo.detectionReasons.join(", ")}), optimizing Vite build for low memory`,
  }
}

export function logEnvironmentInfo(): void {
  const info = getEnvironmentInfo()
  const RESET = "\x1b[0m"
  const CYAN = "\x1b[36m"
  const YELLOW = "\x1b[33m"
  const GREEN = "\x1b[32m"

  console.log(
    `${CYAN}[ENV]${RESET} Platform: ${info.platform}, CI: ${info.isCI}, Android: ${info.isAndroid}, Termux: ${info.isTermux ? `${YELLOW}YES${RESET}` : `${GREEN}NO${RESET}`}`,
  )
  if (info.isTermux) {
    console.log(`${CYAN}[ENV]${RESET} Termux detection reasons:`)
    for (const reason of info.detectionReasons) {
      console.log(`  - ${reason}`)
    }
    console.log(
      `${CYAN}[ENV]${RESET} PREFIX: ${info.prefix || "(not set)"}, TERMUX_VERSION: ${info.termuxVersion || "(not set)"}`,
    )
  }
}
