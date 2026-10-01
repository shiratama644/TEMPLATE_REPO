/**
 * CLI Prompts — @clack/prompts を使用
 * Improved with preset selection, github owner inference, better grouping
 */

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import * as p from "@clack/prompts"
import { FEATURES, PROJECT_TYPES } from "./manifest.ts"
import { getPreset, getPresetChoices } from "./presets.ts"
import type { FeatureId, PresetId, ProjectTypeId, SetupAnswers } from "./types.ts"
import { resolveFeatureDependencies } from "./validator.ts"

/* v8 ignore start */
function inferGithubOwner(cwd: string): string | undefined {
  try {
    const remote = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).trim()
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/)
    if (match) return match[1]
  } catch {}
  try {
    const pkgPath = `${cwd}/package.json`
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      const repo = pkg.repository
      const url = typeof repo === "string" ? repo : repo?.url || ""
      const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
      if (match) return match[1]
    }
  } catch {}
  return undefined
}

function inferProjectDescription(cwd: string): string | undefined {
  try {
    const pkgPath = `${cwd}/package.json`
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      if (
        pkg.description &&
        pkg.description !==
          "AI Agentによるソフトウェア開発を規律立てて進めるためのテンプレートリポジトリ"
      ) {
        return pkg.description
      }
    }
  } catch {}
  return undefined
}

function isTermuxEnvironment(): boolean {
  try {
    if (process.env.TERMUX_VERSION) return true
    if (process.env.PREFIX?.includes("com.termux")) return true
    if (existsSync("/data/data/com.termux")) return true
    if (process.platform === "android") return true
  } catch {}
  return false
}
/* v8 ignore stop */

export async function promptSetup(defaults: boolean, cwd = process.cwd()): Promise<SetupAnswers> {
  const dirName = basename(cwd)
  /* v8 ignore next 1 */
  const defaultProjectName = dirName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-app"
  const inferredOwner = inferGithubOwner(cwd) || "your-github-username"
  const inferredDescription = inferProjectDescription(cwd) || "My awesome project"
  const termuxDetected = isTermuxEnvironment()

  if (defaults) {
    return {
      projectName: defaultProjectName,
      projectDescription: inferredDescription,
      githubOwner: inferredOwner,
      projectType: "plain",
      features: Object.fromEntries(
        Object.entries(FEATURES).map(([id, def]) => [id, def.defaultEnabled]),
      ) as Record<FeatureId, boolean>,
      /* v8 ignore next 1 */
      termuxMode: termuxDetected ? "yes" : "auto",
    }
  }

  /* v8 ignore start */
  p.intro("🚀 Template Bootstrap — pnpm setup")

  if (termuxDetected) {
    p.log.info("📱 Termux environment detected — will optimize for Termux")
  }

  const presetChoice = (await p.select({
    message: "Choose a preset or customize?",
    options: [
      ...getPresetChoices(),
      { value: "custom", label: "🎨 Custom", hint: "Manually select project type & features" },
    ],
    initialValue: "recommended" as PresetId | "custom",
  })) as PresetId | "custom"

  /* v8 ignore next 3 */
  if (p.isCancel(presetChoice)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  if (presetChoice !== "custom") {
    const preset = getPreset(presetChoice)
    if (preset) {
      p.log.info(`${preset.icon || ""} Using preset: ${preset.name} — ${preset.description}`)

      const projectName = (await p.text({
        message: "📦 Project name?",
        placeholder: defaultProjectName,
        defaultValue: defaultProjectName,
        validate: (value) => {
          if (!value) return "✗ Project name is required (e.g. my-awesome-app)"
          if (value !== value.toLowerCase())
            return "✗ Must be lowercase — npm requires lowercase package names"
          if (!/^[a-z0-9-_@/]+$/.test(value))
            return "✗ Only lowercase letters, numbers, dash, underscore, @, / allowed"
          if (value.length > 214) return "✗ Name too long — max 214 characters"
          if (value.startsWith("-") || value.startsWith("_"))
            return "✗ Cannot start with dash or underscore"
          return undefined
        },
      })) as string

      /* v8 ignore next 3 */
      if (p.isCancel(projectName)) {
        p.cancel("Setup cancelled")
        process.exit(0)
      }

      const githubOwner = (await p.text({
        message: "👤 GitHub owner / username?",
        placeholder: inferredOwner,
        defaultValue: inferredOwner,
        validate: (value) => {
          if (!value) return undefined
          if (value === "your-github-username") return undefined
          if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(value)) {
            return "✗ Invalid GitHub username — alphanumeric and hyphens only, 1-39 chars"
          }
          return undefined
        },
      })) as string

      /* v8 ignore next 3 */
      if (p.isCancel(githubOwner)) {
        p.cancel("Setup cancelled")
        process.exit(0)
      }

      const projectDescription = (await p.text({
        message: "📝 Project description?",
        placeholder: preset.description,
        defaultValue: inferredDescription,
        validate: (value) => {
          if (value && value.length > 200)
            return `✗ Too long (${value.length}/200) — keep it concise`
          return undefined
        },
      })) as string

      /* v8 ignore next 3 */
      if (p.isCancel(projectDescription)) {
        p.cancel("Setup cancelled")
        process.exit(0)
      }

      return {
        projectName: (projectName as string) || defaultProjectName,
        projectDescription: (projectDescription as string) || inferredDescription,
        githubOwner: (githubOwner as string) || inferredOwner,
        projectType: preset.projectType,
        features: { ...preset.features },
        termuxMode: preset.termuxMode,
        preset: preset.id,
      }
    }
  }

  const projectName = (await p.text({
    message: "📦 Project name?",
    placeholder: defaultProjectName,
    defaultValue: defaultProjectName,
    validate: (value) => {
      if (!value) return "✗ Project name is required (e.g. my-awesome-app)"
      if (value !== value.toLowerCase()) return "✗ Must be lowercase — npm requires it"
      if (!/^[a-z0-9-_@/]+$/.test(value))
        return "✗ Only lowercase letters, numbers, dash, underscore, @, / allowed"
      if (value.length > 214) return "✗ Name too long — max 214 characters"
      if (value.startsWith("-") || value.startsWith("_"))
        return "✗ Cannot start with dash or underscore"
      return undefined
    },
  })) as string

  /* v8 ignore next 3 */
  if (p.isCancel(projectName)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const projectDescription = (await p.text({
    message: "📝 Project description?",
    placeholder: inferredDescription,
    defaultValue: inferredDescription,
    validate: (value) => {
      if (value && value.length > 200) return `✗ Too long (${value.length}/200) — keep it concise`
      return undefined
    },
  })) as string

  /* v8 ignore next 3 */
  if (p.isCancel(projectDescription)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const githubOwner = (await p.text({
    message: "👤 GitHub owner / username?",
    placeholder: inferredOwner,
    defaultValue: inferredOwner,
    validate: (value) => {
      if (!value) return undefined
      if (value === "your-github-username") return undefined
      if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(value)) {
        return "✗ Invalid GitHub username format"
      }
      return undefined
    },
  })) as string

  /* v8 ignore next 3 */
  if (p.isCancel(githubOwner)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const projectType = (await p.select({
    message: "🏗️ Project type?",
    options: Object.entries(PROJECT_TYPES).map(([id, def]) => ({
      value: id as ProjectTypeId,
      label: `${def.icon || "📦"} ${def.name}`.trim(),
      hint: def.description,
    })),
    initialValue: "plain" as ProjectTypeId,
  })) as ProjectTypeId

  /* v8 ignore next 3 */
  if (p.isCancel(projectType)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const devInfraFeatures = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "dev-infra")
    .map(([id, def]) => ({
      value: id as FeatureId,
      label: `${def.icon || ""} ${def.name}`.trim(),
      hint: `${def.description} — ${def.impact || ""}`.trim(),
    }))

  const selectedDevInfra = (await p.multiselect({
    message: "Dev & Infra features? (space to toggle, enter to confirm)",
    options: devInfraFeatures,
    initialValues: devInfraFeatures
      .filter((opt) => {
        const typeDef = PROJECT_TYPES[projectType]
        if (typeDef.defaultFeatures && opt.value in typeDef.defaultFeatures) {
          return typeDef.defaultFeatures[opt.value as FeatureId]
        }
        return FEATURES[opt.value].defaultEnabled
      })
      .map((opt) => opt.value),
    required: false,
  })) as FeatureId[]

  /* v8 ignore next 3 */
  if (p.isCancel(selectedDevInfra)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  let termuxMode: "auto" | "yes" | "no" = "auto"
  if (selectedDevInfra.includes("termux")) {
    const mode = (await p.select({
      message: "Termux optimization mode?",
      options: [
        { value: "auto", label: "🤖 Auto", hint: "Detect automatically (recommended)" },
        { value: "yes", label: "✓ Yes", hint: "Always enable Termux optimizations" },
        { value: "no", label: "✗ No", hint: "Disable, but keep files" },
      ],
      initialValue: termuxDetected ? "yes" : "auto",
    })) as "auto" | "yes" | "no"
    /* v8 ignore next 3 */
    if (p.isCancel(mode)) {
      p.cancel("Setup cancelled")
      process.exit(0)
    }
    termuxMode = mode
  }

  const testingFeatures = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "testing-quality")
    .map(([id, def]) => ({
      value: id as FeatureId,
      label: `${def.icon || ""} ${def.name}`.trim(),
      hint: `${def.description}${def.impact ? ` — ${def.impact}` : ""}`,
    }))

  const selectedTesting = (await p.multiselect({
    message: "Testing & Quality features?",
    options: testingFeatures,
    initialValues: testingFeatures
      .filter((opt) => {
        const def = FEATURES[opt.value]
        const typeDef = PROJECT_TYPES[projectType]
        if (typeDef.defaultFeatures && opt.value in typeDef.defaultFeatures) {
          return typeDef.defaultFeatures[opt.value as FeatureId]
        }
        return def.defaultEnabled
      })
      .map((opt) => opt.value),
    required: false,
  })) as FeatureId[]

  /* v8 ignore next 3 */
  if (p.isCancel(selectedTesting)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const gitFeatures = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "git-workflow")
    .map(([id, def]) => ({
      value: id as FeatureId,
      label: `${def.icon || ""} ${def.name}`.trim(),
      hint: def.description,
    }))

  const selectedGit = (await p.multiselect({
    message: "Git & Workflow features?",
    options: gitFeatures,
    initialValues: gitFeatures
      .filter((opt) => FEATURES[opt.value].defaultEnabled)
      .map((opt) => opt.value),
    required: false,
  })) as FeatureId[]

  /* v8 ignore next 3 */
  if (p.isCancel(selectedGit)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const releaseFeatures = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "release")
    .map(([id, def]) => ({
      value: id as FeatureId,
      label: `${def.icon || ""} ${def.name}`.trim(),
      hint: def.description,
    }))

  const selectedRelease = (await p.multiselect({
    message: "Release features?",
    options: releaseFeatures,
    initialValues: releaseFeatures
      .filter((opt) => FEATURES[opt.value].defaultEnabled)
      .map((opt) => opt.value),
    required: false,
  })) as FeatureId[]

  /* v8 ignore next 3 */
  if (p.isCancel(selectedRelease)) {
    p.cancel("Setup cancelled")
    process.exit(0)
  }

  const allSelected = new Set([
    ...selectedDevInfra,
    ...selectedTesting,
    ...selectedGit,
    ...selectedRelease,
  ])

  let features = Object.fromEntries(
    Object.keys(FEATURES).map((id) => [id, allSelected.has(id as FeatureId)]),
  ) as Record<FeatureId, boolean>

  features = resolveFeatureDependencies(features)

  if (termuxMode === "no") {
    features.termux = false
  }

  if (features.coverage && !features.vitest) {
    p.log.warn("Coverage requires Vitest — auto-enabled Vitest")
    features.vitest = true
  }
  if (features.playwright && !features.vitest) {
    p.log.info("💡 Tip: Playwright E2E works best with Vitest for unit tests")
  }

  return {
    projectName: (projectName as string) || defaultProjectName,
    projectDescription: (projectDescription as string) || inferredDescription,
    githubOwner: (githubOwner as string) || inferredOwner,
    projectType,
    features,
    termuxMode,
  }
}
/* v8 ignore stop */

export function getDefaultAnswers(cwd = process.cwd()): SetupAnswers {
  const dirName = basename(cwd)
  /* v8 ignore next 1 */
  const defaultProjectName = dirName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-app"
  const inferredOwner = (() => {
    try {
      const remote = execSync("git remote get-url origin", {
        cwd,
        encoding: "utf8",
        stdio: "pipe",
      }).trim()
      const match = remote.match(/github\.com[:/]([^/]+)\//)
      if (match) return match[1]
    } catch {}
    return "your-github-username"
  })()

  return {
    projectName: defaultProjectName,
    projectDescription: "My awesome project",
    githubOwner: inferredOwner,
    projectType: "plain",
    features: Object.fromEntries(
      Object.entries(FEATURES).map(([id, def]) => [id, def.defaultEnabled]),
    ) as Record<FeatureId, boolean>,
    termuxMode: "auto",
  }
}

export function getMinimalAnswers(cwd = process.cwd()): SetupAnswers {
  const dirName = basename(cwd)
  /* v8 ignore next 1 */
  const defaultProjectName = dirName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-app"
  return {
    projectName: defaultProjectName,
    projectDescription: "My awesome project",
    githubOwner: "your-github-username",
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
  }
}

export function getAnswersFromPreset(
  presetId: PresetId,
  overrides: Partial<SetupAnswers> = {},
  cwd = process.cwd(),
): SetupAnswers | undefined {
  const preset = getPreset(presetId)
  if (!preset) return undefined

  const dirName = basename(cwd)
  /* v8 ignore next 1 */
  const defaultProjectName = dirName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-app"

  return {
    projectName: overrides.projectName || defaultProjectName,
    projectDescription: overrides.projectDescription || "My awesome project",
    githubOwner: overrides.githubOwner || "your-github-username",
    projectType: overrides.projectType || preset.projectType,
    features: overrides.features || { ...preset.features },
    termuxMode: overrides.termuxMode || preset.termuxMode,
    preset: preset.id,
  }
}
