/**
 * 一括品質ゲート + ログ保存スクリプト（install先行 + 並列版・abort対応・hang修正）
 * cod-web arena/01a0b161-cod-web の check-all.ts を pnpm用に汎用化し、check.ts に改名
 *
 *   pnpm check  (または `node --experimental-strip-types scripts/check.ts`)
 *
 * 1. install を最初に単独実行（依存解決のため）
 * 2. 残りタスクを並列実行（速い順: lint → determinism → cspell → knip → typecheck → test:unit → coverage → build → e2e:list → security:check, publint/size-limitはnon-blocking）
 *    blocking失敗時のみ残りを abort。typecheck のように子プロセスを持つタスクでもハングしないよう、
 *    - detached プロセスグループ + setsid
 *    - abort 時に kill -TERM/-KILL -pgid でグループ全体を kill
 *    - pkill -P で子も kill
 *    - hard timeout 10分
 *    で確実に Promise.all が resolve し、summary.log が書かれて exit する。
 *
 * 出典: cod-web arena/01a0b161-cod-web scripts/check-all.ts
 */

import { execSync, spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type Task = {
  id: string
  label: string
  cmd: string[]
  logFile: string
  nonBlocking?: boolean
}

export const RESET = "\x1b[0m"
export const GREEN = "\x1b[32m"
export const RED = "\x1b[31m"
export const CYAN = "\x1b[36m"
export const YELLOW = "\x1b[33m"
export const DIM = "\x1b[2m"

export function nowJst(): string {
  return new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })
}

export function log(msg: string) {
  console.log(`${CYAN}[check]${RESET} ${msg}`)
}

export function getLogDir(): string {
  const dir = join(process.cwd(), "logs")
  mkdirSync(dir, { recursive: true })
  return dir
}

export const LOG_DIR = getLogDir()

/* v8 ignore start */
export function getLogDirSafe(): string {
  try {
    return getLogDir()
  } catch {
    return join(process.cwd(), "logs")
  }
}
/* v8 ignore stop */

export const allTasks: Task[] = [
  {
    id: "install",
    label: "pnpm install --frozen-lockfile",
    cmd: ["pnpm", "install", "--frozen-lockfile"],
    logFile: "01-install.log",
  },
  {
    id: "lint",
    label: "biome lint",
    cmd: ["pnpm", "lint"],
    logFile: "02-lint.log",
  },
  {
    id: "check:determinism",
    label: "determinism guard",
    cmd: ["pnpm", "check:determinism"],
    logFile: "03-check-determinism.log",
  },
  {
    id: "cspell",
    label: "cspell (spell check)",
    cmd: ["pnpm", "cspell"],
    logFile: "04-cspell.log",
  },
  {
    id: "knip",
    label: "knip (unused code)",
    cmd: ["pnpm", "knip"],
    logFile: "05-knip.log",
  },
  {
    id: "publint",
    label: "publint (package quality) [non-blocking]",
    cmd: ["pnpm", "publint"],
    logFile: "06-publint.log",
    nonBlocking: true,
  },
  {
    id: "size-limit",
    label: "size-limit (bundle size) [non-blocking]",
    cmd: ["pnpm", "size"],
    logFile: "07-size-limit.log",
    nonBlocking: true,
  },
  {
    id: "typecheck",
    label: "typecheck (tsc --noEmit)",
    cmd: ["pnpm", "typecheck"],
    logFile: "08-typecheck.log",
  },
  {
    id: "test:unit",
    label: "vitest run",
    cmd: ["pnpm", "test:unit"],
    logFile: "09-test-unit.log",
  },
  {
    id: "test:coverage",
    label: "vitest coverage (threshold 100%)",
    cmd: ["pnpm", "test:coverage"],
    logFile: "10-test-coverage.log",
  },
  {
    id: "build",
    label: "build (tsc + vite)",
    cmd: ["pnpm", "build"],
    logFile: "11-build.log",
  },
  {
    id: "test:e2e:list",
    label: "playwright e2e discovery --list",
    cmd: ["node", "--experimental-strip-types", "scripts/check-e2e.ts"],
    logFile: "12-e2e-list.log",
  },
  {
    id: "security:check",
    label: "security check (secrets/licenses) [non-blocking]",
    cmd: ["pnpm", "security:check"],
    logFile: "13-security-check.log",
    nonBlocking: true,
  },
]

/* v8 ignore start */
export function shouldRunTask(task: Task): boolean {
  try {
    const pkgPath = join(process.cwd(), "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
    const scripts = pkg.scripts || {}
    if (task.cmd[0] === "pnpm" && task.cmd[1]) {
      const scriptName = task.cmd[1]
      if (scriptName === "install") return true
      if (!scripts[scriptName]) {
        return false
      }
      if (task.id === "test:e2e:list") {
        return (
          existsSync(join(process.cwd(), "playwright.config.ts")) ||
          existsSync(join(process.cwd(), "playwright.config.js"))
        )
      }
      if (task.id === "cspell") {
        return existsSync(join(process.cwd(), "cspell.json"))
      }
      if (task.id === "knip") {
        return existsSync(join(process.cwd(), "knip.json"))
      }
      if (task.id === "check:determinism") {
        return existsSync(join(process.cwd(), "scripts/check-determinism.ts"))
      }
      if (task.id === "publint") {
        return true
      }
      if (task.id === "size-limit") {
        return existsSync(join(process.cwd(), "src/index.ts"))
      }
      if (task.id === "security:check") {
        return existsSync(join(process.cwd(), "scripts/check-security.ts"))
      }
    }
    if (task.id === "test:e2e:list") {
      return (
        existsSync(join(process.cwd(), "playwright.config.ts")) ||
        existsSync(join(process.cwd(), "playwright.config.js"))
      )
    }
    return true
  } catch {
    return true
  }
}
/* v8 ignore stop */

export function getTasks(): Task[] {
  return allTasks.filter(shouldRunTask)
}

export const tasks = allTasks.filter(shouldRunTask)

export type Result = {
  id: string
  label: string
  cmd: string[]
  logFile: string
  exit: number
  durationMs: number
  startedAt: string
  finishedAt: string
  ok: boolean
  aborted?: boolean
  nonBlocking?: boolean
}

/* v8 ignore start */
export function hasSetsid(): boolean {
  try {
    // Try which (Unix) and where (Windows)
    const whichResult = spawnSync("which", ["setsid"], { stdio: "pipe" })
    if (whichResult.status === 0) return true
    const whereResult = spawnSync("where", ["setsid"], { stdio: "pipe" })
    return whereResult.status === 0
  } catch {
    return false
  }
}

export function hasCommand(cmd: string): boolean {
  try {
    const r1 = spawnSync("which", [cmd], { stdio: "pipe" })
    if (r1.status === 0) return true
    const r2 = spawnSync("where", [cmd], { stdio: "pipe" })
    return r2.status === 0
  } catch {
    return false
  }
}
/* v8 ignore stop */

export const USE_SETSID = hasSetsid()

/* v8 ignore start */
export function runTaskNode(task: Task, signal: AbortSignal): Promise<Result> {
  const startedAt = nowJst()
  const startedMs = Date.now()
  log(`${YELLOW}▶ ${task.id}${RESET} ${DIM}${task.label}${RESET} -> logs/${task.logFile}`)

  let captured = `> ${task.cmd.join(" ")}\n`
  captured += `> started: ${startedAt} (JST)\n`
  captured += `> log: logs/${task.logFile}\n`
  captured += `${"-".repeat(60)}\n`
  captured += `> use setsid: ${USE_SETSID}\n`

  return new Promise<Result>((resolve) => {
    let aborted = false
    let killTimer: ReturnType<typeof setTimeout> | null = null

    const spawnCmd = USE_SETSID ? ["setsid", ...task.cmd] : task.cmd
    const proc = spawn(spawnCmd[0], spawnCmd.slice(1), {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
      detached: false,
    })

    const killGroup = (sig: string) => {
      try {
        execSync(
          `kill -${sig} -${proc.pid} 2>/dev/null; kill -${sig} ${proc.pid} 2>/dev/null; pkill -${sig} -P ${proc.pid} 2>/dev/null`,
          {
            stdio: "ignore",
          },
        )
      } catch {}
    }

    const onAbort = () => {
      if (aborted) return
      aborted = true
      captured += `\n[check] ABORT signal received, killing ${task.id} (pid ${proc.pid})...\n`
      try {
        killGroup("TERM")
        execSync(`pkill -9 -P ${proc.pid} 2>/dev/null; echo killed children of ${proc.pid}`, {
          stdio: "ignore",
        })
      } catch {}
      try {
        proc.kill("SIGTERM")
        /* v8 ignore next 12 */
        killTimer = setTimeout(() => {
          try {
            killGroup("KILL")
          } catch {}
          try {
            proc.kill("SIGKILL")
          } catch {}
          try {
            execSync(`pkill -9 -P ${proc.pid} 2>/dev/null; kill -9 -${proc.pid} 2>/dev/null`, {
              stdio: "ignore",
            })
          } catch {}
        }, 1200)
      } catch {}
    }

    if (signal.aborted) {
      /* v8 ignore next 1 */
      onAbort()
    } else {
      signal.addEventListener("abort", onAbort, { once: true })
    }

    proc.stdout?.on("data", (chunk: Buffer) => {
      captured += chunk.toString()
    })
    proc.stderr?.on("data", (chunk: Buffer) => {
      captured += chunk.toString()
    })

    const hardTimeoutMs = 10 * 60 * 1000
    /* v8 ignore next 11 */
    const hardTimeout = setTimeout(() => {
      captured += `\n[check] HARD TIMEOUT ${hardTimeoutMs}ms, force killing ${task.id}\n`
      try {
        killGroup("KILL")
      } catch {}
      try {
        proc.kill("SIGKILL")
      } catch {}
      aborted = true
      finish(143, true)
    }, hardTimeoutMs)

    const finish = (exitCode: number, timedOut = false) => {
      clearTimeout(hardTimeout)
      if (killTimer) clearTimeout(killTimer)
      signal.removeEventListener("abort", onAbort)

      const durationMs = Date.now() - startedMs
      const finishedAt = nowJst()
      const ok = !aborted && exitCode === 0 && !timedOut

      captured += `${"-".repeat(60)}\n`
      captured += `> finished: ${finishedAt} (JST)\n`
      captured += `> duration: ${durationMs}ms\n`
      captured += `> exit: ${exitCode} ${aborted ? "(ABORTED)" : ""} ${timedOut ? "(HARD TIMEOUT)" : ""} ${ok ? "OK" : "FAILED"}\n`

      const logPath = join(LOG_DIR, task.logFile)
      writeFileSync(logPath, captured, "utf8")

      const icon = ok ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`
      const status = aborted
        ? `${RED}${timedOut ? "TIMEOUT" : "ABORTED"}${RESET}`
        : ok
          ? `${GREEN}OK${RESET}`
          : `${RED}FAILED (exit ${exitCode})${RESET}`
      log(`${icon} ${task.id} ${status} ${DIM}${durationMs}ms -> ${task.logFile}${RESET}`)

      resolve({
        id: task.id,
        label: task.label,
        cmd: task.cmd,
        logFile: task.logFile,
        exit: exitCode,
        durationMs,
        startedAt,
        finishedAt,
        ok,
        aborted,
        nonBlocking: task.nonBlocking,
      })
    }

    proc.on("close", (code) => {
      clearTimeout(hardTimeout)
      finish(code ?? 1, false)
    })

    proc.on("error", (err) => {
      captured += `\n[check] spawn error: ${err.message}\n`
      clearTimeout(hardTimeout)
      finish(1, false)
    })
  })
}
/* v8 ignore stop */

export async function runTask(task: Task, signal: AbortSignal): Promise<Result> {
  const globalBun = (globalThis as unknown as { Bun?: unknown }).Bun
  /* v8 ignore next 3 */
  if (typeof globalBun !== "undefined") {
    return runTaskNode(task, signal)
  }
  return runTaskNode(task, signal)
}

export async function main() {
  const currentTasks = getTasks()
  console.log("")
  console.log(`${CYAN}╔════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${CYAN}║  🔍 Quality Gate — pnpm check                     ║${RESET}`)
  console.log(`${CYAN}║  ${currentTasks.length} tasks, logs → ${LOG_DIR.padEnd(24)}║${RESET}`)
  console.log(`${CYAN}╚════════════════════════════════════════════════════╝${RESET}`)
  console.log("")
  log(`📦 Phase 1: install (sequential, must succeed first)`)
  log(
    `⚡ Phase 2: ${currentTasks.length - 1} tasks in PARALLEL (abort on failure, setsid=${USE_SETSID})`,
  )
  log(`📋 Order: ${currentTasks.map((t) => t.id).join(" → ")}`)
  console.log("")

  const installTask = currentTasks[0]
  const installSignal = new AbortController().signal
  const installResult = await runTask(installTask, installSignal)

  /* v8 ignore next 8 */
  if (!installResult.ok) {
    const summaryText =
      `check summary (install-first)\n` +
      `date: ${nowJst()} (JST)\n` +
      `mode: install first sequential, then parallel (fast-first)\n` +
      `FAILED at install phase\n` +
      `${"-".repeat(60)}\n` +
      `${installResult.ok ? "✔" : "✘"} ${installTask.id.padEnd(28)} FAILED exit=${installResult.exit} ${installResult.durationMs}ms -> ${installTask.logFile}\n`

    writeFileSync(join(LOG_DIR, "summary.log"), summaryText, "utf8")
    writeFileSync(
      join(LOG_DIR, "summary.json"),
      JSON.stringify(
        {
          date: nowJst(),
          mode: "install-first",
          total: 1,
          passed: 0,
          failed: 1,
          totalMs: installResult.durationMs,
          results: [installResult],
        },
        null,
        2,
      ),
      "utf8",
    )
    console.log("")
    console.log(summaryText)
    log(`${RED}✘ install failed, aborting all. See logs/ for details.${RESET}`)
    process.exit(1)
  }

  const remainingTasks = currentTasks.slice(1)
  console.log("")
  log(`${GREEN}✔ install OK (${installResult.durationMs}ms)${RESET}, starting Phase 2 parallel:`)
  log(`  ${remainingTasks.map((t) => `${YELLOW}${t.id}${RESET}`).join(", ")}`)
  console.log("")

  const controller = new AbortController()
  const { signal } = controller

  const promises = remainingTasks.map((task) => runTask(task, signal))

  let failed = false
  const wrapped = promises.map(async (p, idx) => {
    const r = await p
    const taskMeta = remainingTasks[idx]
    const isNonBlocking = taskMeta?.nonBlocking === true
    /* v8 ignore next 5 - blocking failure abort path, integration only */
    if (!r.ok && !failed && !isNonBlocking) {
      failed = true
      log(`${RED}✘ ${r.id} failed -> aborting remaining blocking tasks...${RESET}`)
      controller.abort()
    } else if (!r.ok && isNonBlocking) {
      log(`${YELLOW}⚠ ${r.id} failed but non-blocking (warning only)${RESET}`)
    }
    return r
  })

  const phase2Results = await Promise.all(wrapped)
  const allResults = [installResult, ...phase2Results]

  const totalMs = allResults.reduce((s, r) => s + r.durationMs, 0)
  const passed = allResults.filter((r) => r.ok).length
  const failedResults = allResults.filter((r) => !r.ok && !r.nonBlocking)
  const nonBlockingFailed = allResults.filter((r) => !r.ok && r.nonBlocking)

  /* v8 ignore start - summary generation, integration only */
  let summaryText = `check summary (install-first + parallel)\n`
  summaryText += `date: ${nowJst()} (JST)\n`
  summaryText += `mode: install sequential first, then ${remainingTasks.length} tasks parallel fast-first (setsid=${USE_SETSID})\n`
  summaryText += `order: ${currentTasks.map((t) => t.id).join(" -> ")}\n`
  summaryText += `total: ${allResults.length} tasks, ${passed} passed, ${failedResults.length} blocking failed, ${nonBlockingFailed.length} non-blocking failed, ${totalMs}ms\n`
  summaryText += `${"-".repeat(60)}\n`
  for (const r of allResults) {
    const st = r.aborted
      ? "ABORTED"
      : r.ok
        ? "OK"
        : `FAILED exit=${r.exit}${r.nonBlocking ? " (non-blocking)" : ""}`
    summaryText += `${r.ok ? "✔" : r.nonBlocking ? "⚠" : "✘"} ${r.id.padEnd(28)} ${st.padEnd(30)} ${r.durationMs}ms -> ${r.logFile}\n`
  }
  summaryText += `${"-".repeat(60)}\n`
  if (failedResults.length > 0) {
    summaryText += `FAILED blocking tasks:\n`
    for (const f of failedResults) {
      summaryText += `  - ${f.id}: logs/${f.logFile} ${f.aborted ? "(aborted)" : ""}\n`
    }
  }
  if (nonBlockingFailed.length > 0) {
    summaryText += `Non-blocking warnings (ignored for exit):\n`
    for (const f of nonBlockingFailed) {
      summaryText += `  - ${f.id}: logs/${f.logFile}\n`
    }
  }
  if (failedResults.length === 0 && nonBlockingFailed.length === 0) {
    summaryText += `All checks passed.\n`
  } else if (failedResults.length === 0) {
    summaryText += `All blocking checks passed (non-blocking warnings only).\n`
  }
  /* v8 ignore stop */

  writeFileSync(join(LOG_DIR, "summary.log"), summaryText, "utf8")
  writeFileSync(
    join(LOG_DIR, "summary.json"),
    JSON.stringify(
      {
        date: nowJst(),
        mode: "install-first-parallel",
        total: allResults.length,
        passed,
        failed: failedResults.length,
        totalMs,
        results: allResults,
      },
      null,
      2,
    ),
    "utf8",
  )

  console.log("")
  console.log(summaryText)
  if (failedResults.length > 0) {
    log(`${RED}✘ ${failedResults.length} task(s) failed. See logs/ for details.${RESET}`)
    /* v8 ignore next 1 */
    setTimeout(() => process.exit(1), 200)
  } else {
    log(`${GREEN}✔ All ${allResults.length} tasks passed. Logs in ${LOG_DIR}${RESET}`)
    /* v8 ignore next 1 */
    setTimeout(() => process.exit(0), 200)
  }
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main().catch((err) => {
    console.error(
      `Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
    )
    process.exit(1)
  })
}
/* v8 ignore stop */
