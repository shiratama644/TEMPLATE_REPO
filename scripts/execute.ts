/**
 * 一括起動スクリプト（すぐ実行できる形）— Node 24 LTS対応、Vite/Next.js/モノレポ汎用
 * ユーザー指示:
 * - install -> build(差分なかったらbuildキャンセルしてstart) -> start(もしサーバーも起動する必要なら色分けで)
 * - 差分なしというのは機能に影響が来る部分のみ。つまり、コメントの追加などのことを指します。
 * - Node.js 24 LTSに変更し、ViteでもNext.jsでもモノレポでもnodejs系ならなんでも開発できるように汎用性を上げる
 *
 *   pnpm start  (または `node --experimental-strip-types scripts/execute.ts`)
 *
 * 1. pnpm install --frozen-lockfile。失敗したら停止。
 * 2. build: 機能に影響する差分がなければスキップ
 *    - コメントのみ、空白のみ、ドキュメントのみの変更は差分なし扱い → buildスキップ
 *    - 機能に影響する変更あり or 成果物なし → pnpm build
 * 3. ビルド成功後、設定されたプロセスを並列起動（例: server + client、色分けログ）。
 *
 * 各プロセスの stdout/stderr はプロセスごとに色分けしてタグ付けして出力。
 * Ctrl+C等で終了したら子プロセスをすべて後始末する。
 *
 * プロジェクト固有の起動構成は EXEC_CONFIG.parallel を編集してカスタマイズ:
 * - 単一パッケージ: [{ tag: 'DEV', cmd: ['pnpm', 'dev'] }]
 * - Vite:         [{ tag: 'VITE', cmd: ['pnpm', 'dev:vite'] }] または pnpm exec vite
 * - Next.js:      [{ tag: 'NEXT', cmd: ['pnpm', 'dev:next'] }] または pnpm exec next dev
 * - Monorepo:     [{ tag: 'WEB', cmd: ['pnpm', '--filter', 'web', 'dev'] }, { tag: 'API', cmd: ['pnpm', '--filter', 'api', 'dev'] }]
 * - Turbo:        [{ tag: 'TURBO', cmd: ['pnpm', 'dev:turbo'] }]
 * - ライブラリ:    [{ tag: 'DEV', cmd: ['pnpm', 'dev:watch'] }]
 *
 * 出典: cod-web arena/01a0b161-cod-web の execute.ts を pnpm用に汎用化 + 機能差分スキップ追加 + Node 24 LTS汎用化
 */

import { spawn, spawnSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { getProjectSourceHash, isBuildCacheValid, saveBuildCache } from "./lib/cache.ts"
import { getNextBuildCommandForTermux } from "./lib/next-termux.ts"
import { getEnvironmentInfo, logEnvironmentInfo } from "./lib/termux.ts"

export type ProcessConfig = {
  tag: string
  fg: string
  cmd: string[]
  cwd?: string
}

export const RESET = "\x1b[0m"
export const DIM = "\x1b[2m"
export const YELLOW = "\x1b[33m"
export const CYAN = "\x1b[36m"
export const GREEN = "\x1b[32m"
export const MAGENTA = "\x1b[35m"
export const BLUE = "\x1b[34m"

export const colors = {
  install: { tag: "INSTALL", fg: YELLOW },
  build: { tag: "BUILD", fg: CYAN },
  server: { tag: "SERVER", fg: GREEN },
  client: { tag: "CLIENT", fg: MAGENTA },
  dev: { tag: "DEV", fg: GREEN },
  custom: { tag: "CUSTOM", fg: BLUE },
} as const

export const EXEC_CONFIG: {
  parallel: ProcessConfig[]
} = {
  parallel: [
    {
      tag: "DEV",
      fg: GREEN,
      cmd: ["pnpm", "dev"],
    },
  ],
}

export function getMaxTagLen(): number {
  return Math.max(
    ...Object.values(colors).map((c) => c.tag.length),
    ...EXEC_CONFIG.parallel.map((p) => p.tag.length),
  )
}

// For backward compatibility, but dynamic now
export const MAX_TAG_LEN = getMaxTagLen()

export function logLine(tag: string, fg: string, line: string): void {
  const text = line.replace(/\s+$/, "")
  if (text.length === 0) return
  const maxLen = getMaxTagLen()
  const pad = " ".repeat(Math.max(0, maxLen - tag.length))
  process.stdout.write(`${fg}${DIM}[${tag}]${RESET}${pad} ${fg}${text}${RESET}\n`)
}

export function hasBuildOutput(): boolean {
  const candidates = [
    "dist",
    ".next",
    "build",
    "out",
    ".output",
    ".vercel/output",
    "apps/web/dist",
    "apps/web/.next",
    "apps/web/build",
    "apps/docs/dist",
    "apps/docs/.next",
    "packages/ui/dist",
    "packages/shared/dist",
  ]

  if (candidates.some((p) => existsSync(p))) return true

  /* v8 ignore start */
  try {
    for (const dir of ["apps", "packages"]) {
      if (!existsSync(dir)) continue
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const base = `${dir}/${entry.name}`
        if (
          existsSync(`${base}/dist`) ||
          existsSync(`${base}/.next`) ||
          existsSync(`${base}/build`) ||
          existsSync(`${base}/out`)
        ) {
          return true
        }
      }
    }
  } catch {
    // ignore
  }
  /* v8 ignore stop */

  return false
}

export const NON_FUNCTIONAL_PATH_PATTERNS = [
  /^docs\//,
  /^\.agent\//,
  /^\.github\//,
  /^\.husky\//,
  /^\.vscode\//,
  /^README\.md$/,
  /^AGENTS\.md$/,
  /\.md$/,
  /^\.editorconfig$/,
  /^cspell\.json$/,
  /^knip\.json$/,
  /^commitlint\.config\.(js|cjs|mjs)$/,
  /^\.gitignore$/,
  /^\.nvmrc$/,
  /^LICENSE$/,
  /^\.claude\//,
]

export const FUNCTIONAL_PATH_PATTERNS = [
  /^src\//,
  /^packages\//,
  /^apps\//,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^tsconfig/,
  /^biome\.json$/,
  /^vite\.config/,
  /^next\.config/,
  /^vitest\.config/,
  /^playwright\.config/,
  /^scripts\//,
]

export function isNonFunctionalPath(file: string): boolean {
  return NON_FUNCTIONAL_PATH_PATTERNS.some((re) => re.test(file))
}

export function isFunctionalPath(file: string): boolean {
  return FUNCTIONAL_PATH_PATTERNS.some((re) => re.test(file))
}

export function stripStringLiterals(s: string): string {
  let idx = 0
  return s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (match) => {
    const hash = `${match.length}:${match.slice(0, 10)}:${match.slice(-10)}`
    let h = 0
    for (let i = 0; i < hash.length; i++) h = (h * 31 + hash.charCodeAt(i)) | 0
    return `"__STR_${h}_${idx++}__"`
  })
}

export function isPureCommentLine(content: string): boolean {
  const commentPatterns = [
    /^\/\/.*$/,
    /^\/\*.*\*\/$/,
    /^\/\*.*$/,
    /^\*\/$/,
    /^\*[^/].*$/,
    /^\*$/,
    /^\s*\*.*$/,
    /^<!--.*-->$/,
    /^<!--.*$/,
    /^-->$/,
    /^\s*-->$/,
    /^#(?![A-Za-z0-9_$]).*$/,
    /^#$/,
  ]
  return commentPatterns.some((re) => re.test(content))
}

export function getCodeOnly(content: string): string {
  let code = stripStringLiterals(content)
  code = code.replace(/\/\*.*?\*\//g, "")
  code = code.replace(/^\/\*+/, "").replace(/\*\/$/, "")
  const slashIdx = code.indexOf("//")
  if (slashIdx !== -1) {
    code = code.slice(0, slashIdx)
  }
  return code.trim()
}

export function isCommentOnlyDiff(diffText: string): boolean {
  const lines = diffText.split("\n")
  const addedOrRemoved = lines.filter(
    (l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"),
  )

  if (addedOrRemoved.length === 0) return true

  const addedCodeOnly: string[] = []
  const removedCodeOnly: string[] = []

  for (const line of addedOrRemoved) {
    const content = line.slice(1).trim()
    if (content.length === 0) continue

    if (isPureCommentLine(content)) continue

    const codeOnly = getCodeOnly(content)
    /* v8 ignore next 1 */
    if (codeOnly.length === 0) continue

    if (line.startsWith("+")) addedCodeOnly.push(codeOnly)
    else removedCodeOnly.push(codeOnly)
  }

  if (addedCodeOnly.length === 0 && removedCodeOnly.length === 0) return true

  // Don't sort — order matters for functional changes
  // Only consider comment-only if added and removed are identical in order
  // or if it's pure whitespace/comment
  if (
    addedCodeOnly.length === removedCodeOnly.length &&
    addedCodeOnly.every((v, i) => v === removedCodeOnly[i])
  ) {
    return true
  }

  return false
}

export function getChangedFiles(): string[] {
  try {
    // Get changed files vs HEAD (including staged and unstaged)
    const result = spawnSync("git", ["diff", "--name-only", "HEAD"], {
      encoding: "utf8",
      stdio: "pipe",
    })
    const changed = result.status === 0 ? result.stdout.split("\n").filter(Boolean) : []

    // Also include untracked files (new files not yet staged)
    let untracked: string[] = []
    try {
      const untrackedResult = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
        encoding: "utf8",
        stdio: "pipe",
      })
      if (untrackedResult.status === 0) {
        untracked = untrackedResult.stdout.split("\n").filter(Boolean)
      }
    } catch {
      // Ignore untracked check errors
    }

    // Merge and dedupe
    const all = [...new Set([...changed, ...untracked])]
    return all
  } catch {
    return []
  }
}

export function getDiffForFile(file: string): string {
  try {
    const result = spawnSync("git", ["diff", "HEAD", "--", file], {
      encoding: "utf8",
      stdio: "pipe",
    })
    if (result.status !== 0) return ""
    return result.stdout
  } catch {
    return ""
  }
}

export function hasFunctionalDiff(): boolean {
  if (!hasBuildOutput()) {
    logLine(colors.build.tag, colors.build.fg, "No build output found, build is required.")
    return true
  }

  const changedFiles = getChangedFiles()

  if (changedFiles.length === 0) {
    logLine(
      colors.build.tag,
      colors.build.fg,
      "No changed files detected (git diff HEAD is empty).",
    )
    return false
  }

  logLine(colors.build.tag, colors.build.fg, `Changed files: ${changedFiles.join(", ")}`)

  // Functional files are those that match functional patterns AND are not purely non-functional
  // But we prioritize functional: if a file is in src/packages/apps/scripts, it's functional even if .md
  // Exception: docs/, .agent/, .github/ etc are always non-functional
  const functionalFiles = changedFiles.filter((f) => {
    // Always non-functional paths take precedence
    /* v8 ignore next 1 */
    if (f.startsWith("docs/") || f.startsWith(".agent/") || f.startsWith(".claude/")) return false
    /* v8 ignore next 1 */
    if (f.startsWith(".github/") && !f.includes("workflows/")) return false
    if (isNonFunctionalPath(f) && !isFunctionalPath(f)) return false
    // If it's functional, check if it's also non-functional due to .md but in src/
    if (isFunctionalPath(f)) {
      // src/README.md is docs, but src/index.ts is functional
      /* v8 ignore start */
      if (f.endsWith(".md") && !f.endsWith(".ts") && !f.endsWith(".js")) {
        // Check if it's a README or docs file inside src
        if (f.includes("README") || f.includes("docs/")) return false
      }
      /* v8 ignore stop */
      return true
    }
    return false
  })

  /* v8 ignore start */
  const nonFunctionalOnly = changedFiles.every((f) => {
    // If any file is functional, then not non-functional only
    if (functionalFiles.includes(f)) return false
    return isNonFunctionalPath(f) || !isFunctionalPath(f)
  })
  /* v8 ignore stop */

  /* v8 ignore start */
  if (functionalFiles.length === 0 && nonFunctionalOnly) {
    logLine(
      colors.build.tag,
      colors.build.fg,
      "All changed files are non-functional (docs, .agent, *.md, config). Skipping build.",
    )
    return false
  }

  if (functionalFiles.length === 0) {
    logLine(colors.build.tag, colors.build.fg, "No functional files changed. Skipping build.")
    return false
  }
  /* v8 ignore stop */

  let hasFunctional = false
  for (const file of functionalFiles) {
    const diff = getDiffForFile(file)
    /* v8 ignore start */
    if (diff.length === 0) {
      logLine(colors.build.tag, colors.build.fg, `  ${file}: no diff (empty) → skipping`)
      continue
    }
    /* v8 ignore stop */

    const commentOnly = isCommentOnlyDiff(diff)
    if (commentOnly) {
      logLine(
        colors.build.tag,
        colors.build.fg,
        `  ${file}: comment/whitespace only → non-functional`,
      )
    } else {
      logLine(
        colors.build.tag,
        colors.build.fg,
        `  ${file}: functional change detected → build required`,
      )
      hasFunctional = true
    }
  }

  if (!hasFunctional) {
    logLine(
      colors.build.tag,
      colors.build.fg,
      "All functional files have only comment/whitespace changes. Skipping build.",
    )
    return false
  }

  return true
}

/* v8 ignore start */
export function spawnProcess(
  tag: string,
  fg: string,
  cmd: string[],
  cwd = process.cwd(),
  extraEnv: Record<string, string> = {},
) {
  logLine(tag, fg, `▶ Starting: ${cmd.join(" ")}${cwd !== process.cwd() ? ` (cwd: ${cwd})` : ""}`)
  if (Object.keys(extraEnv).length > 0) {
    logLine(tag, fg, `  Env: ${JSON.stringify(extraEnv)}`)
  }
  const child = spawn(cmd[0], cmd.slice(1), {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  })

  const pipeStream = (stream: NodeJS.ReadableStream | null) => {
    if (!stream) return
    let buffer = ""
    stream.on("data", (chunk: Buffer) => {
      buffer += chunk.toString()
      let nl = buffer.indexOf("\n")
      while (nl >= 0) {
        logLine(tag, fg, buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
        nl = buffer.indexOf("\n")
      }
    })
    stream.on("end", () => {
      if (buffer.length > 0) logLine(tag, fg, buffer)
    })
  }

  pipeStream(child.stdout)
  pipeStream(child.stderr)

  return child
}

export async function runCommand(
  tag: string,
  fg: string,
  cmd: string[],
  cwd = process.cwd(),
  extraEnv: Record<string, string> = {},
): Promise<number> {
  logLine(tag, fg, `Running: ${cmd.join(" ")}`)
  if (Object.keys(extraEnv).length > 0) {
    logLine(tag, fg, `  Env: ${JSON.stringify(extraEnv)}`)
  }
  return new Promise((resolve) => {
    const child = spawn(cmd[0], cmd.slice(1), {
      cwd,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        ...extraEnv,
      },
    })
    child.on("close", (code) => resolve(code ?? 0))
    child.on("error", (err) => {
      logLine(tag, fg, `Failed to spawn: ${err.message}`)
      resolve(1)
    })
  })
}

export async function main(): Promise<number> {
  const envInfo = getEnvironmentInfo()
  logEnvironmentInfo()
  const sourceHash = getProjectSourceHash()
  logLine(
    colors.build.tag,
    colors.build.fg,
    `Source hash: ${sourceHash}, Termux: ${envInfo.isTermux}, CI: ${envInfo.isCI}`,
  )

  if (envInfo.isTermux) {
    const nextCmd = getNextBuildCommandForTermux()
    logLine(
      colors.build.tag,
      colors.build.fg,
      `Termux detected, Next.js build will use Webpack: ${nextCmd.log}`,
    )
  }

  logLine(
    colors.install.tag,
    colors.install.fg,
    "Installing dependencies... (pnpm install --frozen-lockfile)",
  )
  const installCode = await runCommand(colors.install.tag, colors.install.fg, [
    "pnpm",
    "install",
    "--frozen-lockfile",
  ])
  if (installCode !== 0) {
    logLine(colors.install.tag, colors.install.fg, `✘ Install failed with code ${installCode}`)
    return installCode
  }
  logLine(colors.install.tag, colors.install.fg, "✔ Install succeeded.")

  const needBuild = hasFunctionalDiff()

  const cacheValid = isBuildCacheValid("execute")
  if (cacheValid && !needBuild) {
    logLine(
      colors.build.tag,
      colors.build.fg,
      `✔ Build cache valid (hash=${sourceHash}), skipping build (キャッシュヒット)`,
    )
  }

  if (!needBuild) {
    logLine(
      colors.build.tag,
      colors.build.fg,
      "✔ No functional diff detected and build output exists. Skipping build (差分なし、buildキャンセルしてstart).",
    )
  } else {
    const startMs = Date.now()
    const nextTermux = getNextBuildCommandForTermux(["pnpm", "build"])
    const buildCmd = ["pnpm", "build"]
    let buildEnv: Record<string, string> = {}

    if (envInfo.isTermux && nextTermux.isTermux) {
      logLine(colors.build.tag, colors.build.fg, `Termux + Next.js detected, forcing Webpack build`)
      logLine(colors.build.tag, colors.build.fg, nextTermux.log)
      buildEnv = nextTermux.env
    }

    logLine(
      colors.build.tag,
      colors.build.fg,
      `Starting production build... (${buildCmd.join(" ")})`,
    )
    const buildCode = await runCommand(
      colors.build.tag,
      colors.build.fg,
      buildCmd,
      process.cwd(),
      buildEnv,
    )
    if (buildCode !== 0) {
      logLine(
        colors.build.tag,
        colors.build.fg,
        `✘ Build failed with code ${buildCode}. Servers will not be started.`,
      )
      return buildCode
    }
    saveBuildCache("execute", Date.now() - startMs)
    logLine(colors.build.tag, colors.build.fg, "✔ Build succeeded.")
  }

  logLine(
    colors.build.tag,
    colors.build.fg,
    `Starting ${EXEC_CONFIG.parallel.length} parallel process(es)...`,
  )
  const children: ReturnType<typeof spawn>[] = []
  for (const p of EXEC_CONFIG.parallel) {
    const child = spawnProcess(p.tag, p.fg, p.cmd, p.cwd)
    children.push(child)
  }

  if (children.length === 0) {
    logLine(colors.build.tag, colors.build.fg, "No parallel processes configured. Exiting.")
    return 0
  }

  const shutdown = (signal: string) => {
    logLine(colors.build.tag, colors.build.fg, `Received ${signal}. Terminating child processes...`)
    for (const child of children) {
      try {
        child.kill("SIGTERM")
      } catch {
        /* already exited */
      }
    }
    setTimeout(() => {
      for (const child of children) {
        try {
          child.kill("SIGKILL")
        } catch {}
      }
      process.exit(0)
    }, 2000)
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  const exits = await Promise.all(
    children.map(
      (child, idx) =>
        new Promise<{ tag: string; code: number | null }>((resolve) => {
          child.on("close", (code) => resolve({ tag: EXEC_CONFIG.parallel[idx].tag, code }))
          child.on("error", () => resolve({ tag: EXEC_CONFIG.parallel[idx].tag, code: 1 }))
        }),
    ),
  )

  for (const e of exits) {
    logLine(colors.build.tag, colors.build.fg, `${e.tag} exited with code ${e.code}`)
  }

  const failed = exits.filter((e) => e.code !== 0 && e.code !== null)
  if (failed.length > 0) {
    logLine(colors.build.tag, colors.build.fg, `✘ ${failed.length} process(es) failed.`)
    return 1
  }

  return 0
}
/* v8 ignore stop */

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(
        `Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
      )
      process.exit(1)
    })
}
/* v8 ignore stop */
