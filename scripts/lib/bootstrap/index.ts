/**
 * Bootstrap lib — public API
 */

export * from "./backup.ts"
export * from "./docs-generator.ts"
export * from "./engine.ts"
export * from "./manifest.ts"
export * from "./presets.ts"
export * from "./prompts.ts"
export * from "./readme-generator.ts"
export * from "./types.ts"
export * from "./validator.ts"
export * from "./yaml-utils.ts"

export const BOOTSTRAP_VERSION = "2.0.0"
export function getBootstrapModules() {
  return [
    "backup",
    "docs-generator",
    "engine",
    "manifest",
    "presets",
    "prompts",
    "readme-generator",
    "types",
    "validator",
    "yaml-utils",
  ]
}
