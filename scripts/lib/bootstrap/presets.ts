/**
 * Presets — 事前定義されたセットアップ構成
 */

import { FEATURES } from "./manifest.ts"
import type { FeatureId, PresetDefinition } from "./types.ts"

function allEnabled(): Record<FeatureId, boolean> {
  return Object.fromEntries(
    Object.entries(FEATURES).map(([id, def]) => [id, def.defaultEnabled]),
  ) as Record<FeatureId, boolean>
}

export const PRESETS: Record<string, PresetDefinition> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Plain TS + Vitest only — smallest possible",
    icon: "○",
    projectType: "plain",
    features: {
      docker: false,
      devcontainer: false,
      termux: false,
      vitest: true,
      playwright: false,
      coverage: false,
      cspell: false,
      knip: false,
      publint: false,
      "size-limit": false,
      determinism: false,
      husky: false,
      commitlint: false,
      "github-templates": false,
      renovate: false,
      "stale-bot": false,
      changesets: false,
    },
    termuxMode: "no",
  },
  recommended: {
    id: "recommended",
    name: "Recommended",
    description: "Plain TS + testing + quality + git workflow — balanced",
    icon: "★",
    projectType: "plain",
    features: {
      docker: false,
      devcontainer: false,
      termux: true,
      vitest: true,
      playwright: false,
      coverage: true,
      cspell: true,
      knip: true,
      publint: true,
      "size-limit": true,
      determinism: true,
      husky: true,
      commitlint: true,
      "github-templates": true,
      renovate: true,
      "stale-bot": false,
      changesets: false,
    },
    termuxMode: "auto",
  },
  full: {
    id: "full",
    name: "Full",
    description: "All features enabled — maximum DX",
    icon: "●",
    projectType: "plain",
    features: allEnabled(),
    termuxMode: "auto",
  },
  library: {
    id: "library",
    name: "Library",
    description: "Publishable library — publint, size-limit, changesets",
    icon: "⬔",
    projectType: "plain",
    features: {
      docker: false,
      devcontainer: false,
      termux: false,
      vitest: true,
      playwright: false,
      coverage: true,
      cspell: true,
      knip: true,
      publint: true,
      "size-limit": true,
      determinism: true,
      husky: true,
      commitlint: true,
      "github-templates": true,
      renovate: true,
      "stale-bot": false,
      changesets: true,
    },
    termuxMode: "no",
  },
  "vite-app": {
    id: "vite-app",
    name: "Vite App",
    description: "Vite SPA with testing and quality tools",
    icon: "⚡︎",
    projectType: "vite",
    features: {
      docker: true,
      devcontainer: true,
      termux: true,
      vitest: true,
      playwright: true,
      coverage: true,
      cspell: true,
      knip: true,
      publint: false,
      "size-limit": false,
      determinism: true,
      husky: true,
      commitlint: true,
      "github-templates": true,
      renovate: true,
      "stale-bot": true,
      changesets: false,
    },
    termuxMode: "auto",
  },
  "next-app": {
    id: "next-app",
    name: "Next.js App",
    description: "Next.js SSR/SSG with Docker and E2E",
    icon: "▲",
    projectType: "next",
    features: {
      docker: true,
      devcontainer: true,
      termux: true,
      vitest: true,
      playwright: true,
      coverage: true,
      cspell: true,
      knip: true,
      publint: false,
      "size-limit": false,
      determinism: true,
      husky: true,
      commitlint: true,
      "github-templates": true,
      renovate: true,
      "stale-bot": true,
      changesets: false,
    },
    termuxMode: "auto",
  },
  monorepo: {
    id: "monorepo",
    name: "Monorepo",
    description: "Turborepo monorepo with apps/* and packages/*",
    icon: "⧉",
    projectType: "next-monorepo",
    features: {
      docker: true,
      devcontainer: true,
      termux: true,
      vitest: true,
      playwright: true,
      coverage: true,
      cspell: true,
      knip: true,
      publint: false,
      "size-limit": false,
      determinism: true,
      husky: true,
      commitlint: true,
      "github-templates": true,
      renovate: true,
      "stale-bot": true,
      changesets: true,
    },
    termuxMode: "auto",
  },
}

/* v8 ignore next 1 */
export const ALL_PRESET_IDS = Object.keys(PRESETS) as Array<keyof typeof PRESETS>

export function getPreset(id: string): PresetDefinition | undefined {
  return PRESETS[id]
}

export function listPresets(): PresetDefinition[] {
  return Object.values(PRESETS)
}

export function getPresetChoices() {
  return listPresets().map((p) => ({
    value: p.id,
    label: `${p.icon} ${p.name}`,
    hint: p.description,
  }))
}

export function applyPresetToAnswers(
  presetId: string,
  base: { projectName?: string; githubOwner?: string; projectDescription?: string },
): import("./types.ts").SetupAnswers | undefined {
  const preset = getPreset(presetId)
  if (!preset) return undefined
  return {
    projectName: base.projectName || "my-app",
    projectDescription: base.projectDescription || "My awesome project",
    githubOwner: base.githubOwner || "your-github-username",
    projectType: preset.projectType,
    features: { ...preset.features },
    termuxMode: preset.termuxMode,
    preset: preset.id,
  }
}
