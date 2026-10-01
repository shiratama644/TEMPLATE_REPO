/**
 * Validation utilities — deep validation with branches
 */

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w-./?%&=]*)?$/
const NPM_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
const GITHUB_OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/

export function isEmail(value: string): boolean {
  if (!value || typeof value !== "string") return false
  if (value.length > 254) return false
  return EMAIL_RE.test(value)
}

export function isUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false
  if (value.length > 2048) return false
  try {
    // Try URL constructor for absolute URLs
    if (value.startsWith("http://") || value.startsWith("https://")) {
      new URL(value)
      return true
    }
    return URL_RE.test(value)
  } catch {
    return false
  }
}

export function isNpmPackageName(name: string): boolean {
  if (!name || typeof name !== "string") return false
  if (name.length > 214) return false
  if (name.startsWith(".") || name.startsWith("_") || name.startsWith("-")) return false
  if (name !== name.toLowerCase()) return false
  return NPM_NAME_RE.test(name)
}

export function isValidNpmNameStrict(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: "Name is required" }
  if (name.length > 214) return { valid: false, error: "Name too long" }
  if (name.startsWith(".") || name.startsWith("_"))
    return { valid: false, error: "Cannot start with . or _" }
  if (name !== name.toLowerCase()) return { valid: false, error: "Must be lowercase" }
  if (!NPM_NAME_RE.test(name)) return { valid: false, error: "Invalid format" }
  if (name.includes("..") || name.includes("--"))
    return { valid: false, error: "No consecutive . or -" }
  return { valid: true }
}

export function isGithubOwner(owner: string): boolean {
  if (!owner || typeof owner !== "string") return false
  if (owner === "your-github-username") return true // placeholder
  return GITHUB_OWNER_RE.test(owner)
}

export function isSemver(version: string): boolean {
  if (!version || typeof version !== "string") return false
  return SEMVER_RE.test(version)
}

export function isValidProjectType(type: string): boolean {
  return ["plain", "vite", "next", "monorepo", "next-monorepo"].includes(type)
}

export function isValidTermuxMode(mode: string): boolean {
  return ["auto", "yes", "no"].includes(mode)
}

export function validateProjectConfig(config: {
  projectName?: string
  projectType?: string
  githubOwner?: string
  termuxMode?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.projectName) {
    errors.push("projectName is required")
  } else {
    const nameCheck = isValidNpmNameStrict(config.projectName)
    if (!nameCheck.valid) errors.push(`projectName: ${nameCheck.error}`)
  }

  if (config.projectType && !isValidProjectType(config.projectType)) {
    errors.push(`Invalid projectType: ${config.projectType}`)
  }

  if (config.githubOwner && !isGithubOwner(config.githubOwner)) {
    errors.push(`Invalid githubOwner: ${config.githubOwner}`)
  }

  if (config.termuxMode && !isValidTermuxMode(config.termuxMode)) {
    errors.push(`Invalid termuxMode: ${config.termuxMode}`)
  }

  return { valid: errors.length === 0, errors }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

export function isInRange(value: number, min: number, max: number): boolean {
  if (typeof value !== "number" || Number.isNaN(value)) return false
  return value >= min && value <= max
}
