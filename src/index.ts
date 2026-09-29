/**
 * Template repo entry — meaningful library with multiple modules
 */

export const templateVersion = "2.0.0"

export function hello(name: string): string {
  if (!name) return "Hello, world!"
  return `Hello, ${name}!`
}

export * from "./cache/lru.ts"
export * from "./detector/project.ts"
export * from "./utils/result.ts"
// Re-exports
export * from "./utils/string.ts"
export * from "./utils/validation.ts"

import { err, ok, type Result } from "./utils/result.ts"
// Utility: create project config with validation
import { validateProjectConfig } from "./utils/validation.ts"

export type ProjectConfig = {
  projectName: string
  projectType: "plain" | "vite" | "next" | "monorepo" | "next-monorepo"
  githubOwner?: string
  termuxMode?: "auto" | "yes" | "no"
}

export function createProjectConfig(input: Partial<ProjectConfig>): Result<ProjectConfig> {
  const validation = validateProjectConfig(input as unknown as Record<string, unknown>)
  if (!validation.valid) {
    return err(new Error(`Invalid config: ${validation.errors.join(", ")}`))
  }

  const config: ProjectConfig = {
    projectName: input.projectName!,
    projectType: input.projectType || "plain",
    githubOwner: input.githubOwner,
    termuxMode: input.termuxMode || "auto",
  }

  return ok(config)
}

export function getProjectDisplayName(config: ProjectConfig): string {
  const typeLabels: Record<string, string> = {
    plain: "📚 Plain TS",
    vite: "⚡ Vite",
    next: "▲ Next.js",
    monorepo: "🏗️ Monorepo",
    "next-monorepo": "▲🏗️ Next.js + Monorepo",
  }
  const label = typeLabels[config.projectType] || config.projectType
  return `${config.projectName} (${label})`
}

export function formatProjectSummary(config: ProjectConfig): string {
  const lines: string[] = []
  lines.push(`Project: ${config.projectName}`)
  lines.push(`Type: ${config.projectType}`)
  if (config.githubOwner) lines.push(`Owner: ${config.githubOwner}`)
  if (config.termuxMode) lines.push(`Termux: ${config.termuxMode}`)
  return lines.join("\n")
}
