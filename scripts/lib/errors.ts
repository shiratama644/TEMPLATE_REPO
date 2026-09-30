/**
 * Structured error handling with user-friendly messages
 * DX強化: 具体的なヒント、修復方法、関連ドキュメントへのリンク
 */

import { logErrorBox, logger } from "./logger.ts"

export class TemplateError extends Error {
  code: string
  hint?: string
  docsUrl?: string
  fix?: string

  constructor(
    message: string,
    opts: {
      code: string
      hint?: string
      docsUrl?: string
      fix?: string
      cause?: unknown
    } = { code: "UNKNOWN" },
  ) {
    super(message)
    this.name = "TemplateError"
    this.code = opts.code
    this.hint = opts.hint
    this.docsUrl = opts.docsUrl
    this.fix = opts.fix
    if (opts.cause) (this as any).cause = opts.cause
  }

  toString(): string {
    let out = `[${this.code}] ${this.message}`
    if (this.hint) out += `\n  💡 Hint: ${this.hint}`
    if (this.fix) out += `\n  🔧 Fix: ${this.fix}`
    if (this.docsUrl) out += `\n  📚 Docs: ${this.docsUrl}`
    return out
  }

  log(): void {
    const errors = [this.message]
    const hints: string[] = []
    if (this.hint) hints.push(this.hint)
    if (this.fix) hints.push(`Fix: ${this.fix}`)
    if (this.docsUrl) hints.push(`Docs: ${this.docsUrl}`)

    logErrorBox(`${this.code}`, errors, hints)

    // Also log to consola for structured output
    logger.error(`[${this.code}] ${this.message}`)
    if (this.hint) logger.info(`💡 ${this.hint}`)
    if (this.fix) logger.info(`🔧 ${this.fix}`)
    if (this.docsUrl) logger.info(`📚 ${this.docsUrl}`)
  }

  // For programmatic handling
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      hint: this.hint,
      fix: this.fix,
      docsUrl: this.docsUrl,
    }
  }
}

export const ErrorCodes = {
  SETUP_FAILED: "SETUP_FAILED",
  BUILD_FAILED: "BUILD_FAILED",
  DETECT_FAILED: "DETECT_FAILED",
  CACHE_CORRUPTED: "CACHE_CORRUPTED",
  TERMUX_UNSUPPORTED: "TERMUX_UNSUPPORTED",
  INVALID_CONFIG: "INVALID_CONFIG",
  MISSING_DEPENDENCY: "MISSING_DEPENDENCY",
  YAML_PARSE_ERROR: "YAML_PARSE_ERROR",
  BOOTSTRAP_FAILED: "BOOTSTRAP_FAILED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  GIT_DIRTY: "GIT_DIRTY",
  NODE_VERSION: "NODE_VERSION",
  PNPM_VERSION: "PNPM_VERSION",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
} as const

// Common error factories with helpful messages
export const CommonErrors = {
  gitDirty: (status: string) =>
    new TemplateError("Uncommitted changes detected", {
      code: ErrorCodes.GIT_DIRTY,
      hint: "Commit or stash your changes before running setup",
      fix: "git add -A && git commit -m 'save'  OR  git stash push -m 'backup'",
      docsUrl: "https://github.com/shiratama644/TEMPLATE_REPO#git-workflow",
    }),

  nodeVersion: (current: string, required: string) =>
    new TemplateError(`Node.js version ${current} is not supported`, {
      code: ErrorCodes.NODE_VERSION,
      hint: `This template requires Node.js ${required}`,
      fix: `Use nvm: nvm install ${required} && nvm use ${required}  OR  fnm use ${required}`,
      docsUrl: "https://nodejs.org/",
    }),

  missingDep: (dep: string) =>
    new TemplateError(`Missing dependency: ${dep}`, {
      code: ErrorCodes.MISSING_DEPENDENCY,
      hint: `The project requires ${dep} but it's not installed`,
      fix: `pnpm add ${dep}  OR  pnpm install`,
    }),

  buildFailed: (framework: string, details?: string) =>
    new TemplateError(`${framework} build failed${details ? `: ${details}` : ""}`, {
      code: ErrorCodes.BUILD_FAILED,
      hint: `Check your ${framework} configuration and dependencies`,
      fix: `pnpm install && pnpm typecheck && pnpm build --verbose`,
    }),

  invalidConfig: (file: string, reason: string) =>
    new TemplateError(`Invalid config in ${file}: ${reason}`, {
      code: ErrorCodes.INVALID_CONFIG,
      hint: `Check ${file} for syntax errors`,
      fix: `Open ${file} and fix the reported issue, or delete it to use defaults`,
    }),
}

export function handleError(error: unknown): never {
  if (error instanceof TemplateError) {
    error.log()
    // Suggest verbose for more details if not already verbose
    /* v8 ignore next 3 */
    if (!process.argv.includes("--verbose") && !process.argv.includes("-v")) {
      logger.info("💡 Run with --verbose for more details")
    }
    process.exit(1)
  }

  if (error instanceof Error) {
    logger.error(error.message)

    // Provide helpful context for common errors
    if (error.message.includes("ENOENT")) {
      logger.info("💡 File not found - check if the file exists and path is correct")
    } else if (error.message.includes("EACCES")) {
      logger.info("💡 Permission denied - check file permissions")
      logger.info("🔧 Fix: chmod +x <file>  or run with appropriate permissions")
    } else if (error.message.includes("Cannot find module")) {
      logger.info("💡 Missing dependency - run pnpm install")
    }

    /* v8 ignore next 3 */
    if (process.env.DEBUG || process.argv.includes("--verbose")) {
      logger.error(error.stack || "")
    } else {
      logger.info("💡 Run with --verbose or DEBUG=1 for stack trace")
    }
    process.exit(1)
  }

  /* v8 ignore next 3 */
  logger.error(String(error))
  logger.info("💡 Unexpected error - please report this issue")
  process.exit(1)
}

export function wrapError<T>(fn: () => T, code: string, hint?: string, fix?: string): T {
  try {
    return fn()
  } catch (e) {
    throw new TemplateError((e as Error).message, { code, hint, fix, cause: e })
  }
}

export async function wrapAsyncError<T>(
  fn: () => Promise<T>,
  code: string,
  hint?: string,
  fix?: string,
): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    throw new TemplateError((e as Error).message, { code, hint, fix, cause: e })
  }
}

// Helper to check and report multiple errors
export function reportErrors(
  title: string,
  errors: string[],
  hints: string[] = [],
  isWarning = false,
): void {
  if (errors.length === 0) return

  if (isWarning) {
    logger.warn(`${title}:`)
    for (const err of errors) logger.warn(`  • ${err}`)
    for (const hint of hints) logger.info(`💡 ${hint}`)
  } else {
    logErrorBox(title, errors, hints)
  }
}
