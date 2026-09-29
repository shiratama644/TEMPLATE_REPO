/**
 * Feature Manifest Pattern — 宣言的な機能定義
 * 各機能が「関連ファイル・依存関係・scripts・CIジョブ・競合」を宣言
 */

export type ProjectTypeId = "plain" | "vite" | "next" | "monorepo" | "next-monorepo"

export type FeatureId =
  | "docker"
  | "devcontainer"
  | "termux"
  | "vitest"
  | "playwright"
  | "coverage"
  | "cspell"
  | "knip"
  | "publint"
  | "size-limit"
  | "determinism"
  | "husky"
  | "commitlint"
  | "github-templates"
  | "renovate"
  | "stale-bot"
  | "changesets"

export type FeatureGroup =
  | "project-type"
  | "dev-infra"
  | "testing-quality"
  | "git-workflow"
  | "release"

export type PresetId =
  | "minimal"
  | "recommended"
  | "full"
  | "library"
  | "vite-app"
  | "next-app"
  | "monorepo"

export type FilePattern = string // exact path or glob-like (e.g. ".devcontainer/**")

export type FeatureDefinition = {
  id: FeatureId
  name: string
  description: string
  group: Exclude<FeatureGroup, "project-type">
  defaultEnabled: boolean
  /** Files that belong to this feature — removed if disabled */
  files: FilePattern[]
  /** npm dependencies (both deps and devDeps checked) to remove if disabled */
  dependencies?: string[]
  /** package.json scripts to remove if disabled */
  scripts?: string[]
  /** CI job names to remove if disabled (matches job key in ci.yml) */
  ciJobs?: string[]
  /** CI step name substrings to remove (e.g. "CSpell", "Knip") */
  ciSteps?: string[]
  /** Features that conflict — if this enabled, those must be disabled */
  conflicts?: FeatureId[]
  /** Whether this feature requires another feature */
  requires?: FeatureId[]
  /** Human-readable impact / why you might want it */
  impact?: string
  /** Icon for CLI display */
  icon?: string
}

export type ProjectTypeDefinition = {
  id: ProjectTypeId
  name: string
  description: string
  icon?: string
  /** Files to create when this type is selected */
  filesToCreate: Array<{
    path: string
    content?: string // inline content, if not fromExample
    fromExample?: string // path to example file to copy
    overwrite?: boolean // if false, don't overwrite existing user file
  }>
  /** Files to remove when this type is selected */
  filesToRemove: FilePattern[]
  /** Dependencies to add (will be added to package.json devDeps or deps) */
  dependenciesToAdd?: Array<{
    name: string
    version: string
    dev: boolean
  }>
  /** package.json scripts to add/ensure */
  scriptsToAdd?: Record<string, string>
  /** Default features to enable for this project type */
  defaultFeatures?: Partial<Record<FeatureId, boolean>>
}

export type PresetDefinition = {
  id: PresetId
  name: string
  description: string
  icon?: string
  projectType: ProjectTypeId
  features: Record<FeatureId, boolean>
  termuxMode: "auto" | "yes" | "no"
}

export type SetupAnswers = {
  projectName: string
  projectDescription?: string
  githubOwner?: string
  projectType: ProjectTypeId
  features: Record<FeatureId, boolean>
  termuxMode: "auto" | "yes" | "no"
  preset?: PresetId
}

export type FileChange = {
  path: string
  type: "create" | "update" | "delete" | "keep"
  reason: string
  featureId?: FeatureId | ProjectTypeId
  contentPreview?: string
}

export type PackageJsonChange = {
  type: "add-dep" | "remove-dep" | "add-script" | "remove-script" | "update-field"
  name: string
  value?: string
  reason: string
}

export type SetupPlan = {
  files: FileChange[]
  packageJson: PackageJsonChange[]
  workflows: Array<{
    file: string
    type: "update" | "delete" | "keep"
    reason: string
    removedJobs?: string[]
    removedSteps?: string[]
  }>
  placeholders: Array<{
    file: string
    replacements: Record<string, string>
  }>
  summary: {
    totalFiles: number
    toCreate: number
    toUpdate: number
    toDelete: number
    toKeep: number
    packageChanges: number
    workflowChanges: number
  }
}

export type CliOptions = {
  dryRun: boolean
  yes: boolean
  defaults: boolean
  verbose: boolean
  force: boolean
  noInstall: boolean
  noVerify: boolean
  noBackup: boolean
  help: boolean
  version: boolean
  listPresets: boolean
  preset?: PresetId
  projectName?: string
  projectType?: ProjectTypeId
  features?: string // comma-separated
  termuxMode?: "auto" | "yes" | "no"
  githubOwner?: string
  description?: string
  config?: string
  saveConfig?: string
  minimal: boolean
}

export type SetupState = {
  version: number
  timestamp: string
  answers: SetupAnswers
  plan: {
    files: number
    packageJson: number
    workflows: number
  }
  backupDir?: string
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export type BackupEntry = {
  originalPath: string
  backupPath: string
  type: "file" | "dir"
}
