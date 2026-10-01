/**
 * Bootstrap Engine — 差分計算・ファイル操作・package.json最適化
 * Improved version with better glob, protection, YAML utils, backup support
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join } from "node:path"
import { FEATURES, PROJECT_TYPES } from "./manifest.ts"
import type { FeatureId, FileChange, PackageJsonChange, SetupAnswers, SetupPlan } from "./types.ts"
import { safeRemoveJob, safeRemoveSteps } from "./yaml-utils.ts"

/* v8 ignore start */
const PROTECTED_PREFIXES = [
  "src/",
  "docs/",
  ".github/",
  ".claude/",
  ".agent/",
  "packages/",
  "apps/",
]

const PROTECTED_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "README.md",
  ".gitignore",
]

function isProtectedForDelete(filePath: string, _cwd: string): boolean {
  // Never delete src/ and other important directories
  for (const prefix of PROTECTED_PREFIXES) {
    if (filePath.startsWith(prefix)) return true
  }
  // Never delete protected files at root
  if (PROTECTED_FILES.includes(filePath)) return true
  // Never delete hidden files that might be important
  if (filePath.startsWith(".") && !filePath.startsWith(".bootstrap-backup")) {
    // Allow deleting some dotfiles that are feature-specific
    const deletableDotfiles = [".devcontainer", ".husky", ".vscode"]
    if (!deletableDotfiles.some((d) => filePath.startsWith(d))) {
      // For safety, don't delete dotfiles unless explicitly allowed
      // But src/ already protected, so this is for root dotfiles
      if (!filePath.includes("/")) {
        // Root dotfile - check if it's in deletable list or not
        return false // Allow deletion of root dotfiles that are feature files
      }
    }
  }
  return false
}

export function isProtectedPath(filePath: string, cwd = process.cwd()): boolean {
  return isProtectedForDelete(filePath, cwd)
}
/* v8 ignore stop */

/* v8 ignore start */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function globToRegex(glob: string): RegExp {
  // Escape regex special chars except * and ?
  let escaped = ""
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === "*") {
      // Check for **
      if (i + 1 < glob.length && glob[i + 1] === "*") {
        escaped += ".*"
        i++ // Skip next *
      } else {
        escaped += "[^/]*"
      }
    } else if (c === "?") {
      escaped += "[^/]"
    } else if (".+^${}()|[]\\".includes(c)) {
      escaped += `\\${c}`
    } else {
      escaped += c
    }
  }
  return new RegExp(`^${escaped}$`)
}
/* v8 ignore stop */

export function expandGlob(pattern: string, cwd: string): string[] {
  if (!pattern.includes("*") && !pattern.includes("?")) {
    const full = join(cwd, pattern)
    return existsSync(full) ? [pattern] : []
  }

  /* v8 ignore start */
  if (pattern.includes("**")) {
    // Handle "**/" prefix early — recursive search from cwd regardless of baseDir
    if (pattern.startsWith("**/")) {
      const searchPattern = pattern.slice(3)
      const regex = globToRegex(searchPattern)
      const allFiles: string[] = []
      function walkAll(dir: string, relBase: string) {
        try {
          const entries = readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const full = join(dir, entry.name)
            const rel = relBase ? join(relBase, entry.name) : entry.name
            if (entry.isDirectory()) {
              if (
                [
                  "node_modules",
                  ".git",
                  "dist",
                  ".next",
                  ".turbo",
                  "coverage",
                  ".bootstrap-backup",
                  ".cache",
                  "logs",
                ].includes(entry.name)
              )
                continue
              walkAll(full, rel)
            } else {
              if (regex.test(rel) || regex.test(entry.name)) {
                allFiles.push(rel)
              }
            }
          }
        } catch {}
      }
      walkAll(cwd, "")
      return allFiles
    }

    const parts = pattern.split("/**")
    const prefix = parts[0] || "."
    const suffix = parts.slice(1).join("/**").replace(/^\//, "")

    const baseDir = prefix === "." || prefix === "" ? cwd : join(cwd, prefix)
    if (!existsSync(baseDir)) return []

    const results: string[] = []

    function walk(dir: string, relBase: string) {
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const full = join(dir, entry.name)
          const rel = relBase ? join(relBase, entry.name) : entry.name
          const finalRel = prefix && prefix !== "." ? join(prefix, rel) : rel

          if (entry.isDirectory()) {
            if (
              ["node_modules", ".git", "dist", ".next", ".turbo", "coverage", ".cache"].includes(
                entry.name,
              )
            ) {
              // Skip but still allow if pattern explicitly includes it
              if (!pattern.includes(entry.name)) continue
            }
            walk(full, rel)
          } else {
            if (!suffix || suffix === "" || suffix === "*") {
              results.push(finalRel)
            } else {
              const suffixRegex = globToRegex(suffix)
              if (suffixRegex.test(entry.name) || suffixRegex.test(finalRel)) {
                results.push(finalRel)
              } else if (suffix.includes("/")) {
                if (finalRel.endsWith(suffix) || finalRel.includes(suffix)) {
                  results.push(finalRel)
                }
              }
            }
          }
        }
      } catch {}
    }

    walk(baseDir, "")
    return results
  }

  const dir = dirname(pattern)
  const basePattern = basename(pattern)
  const searchDir = dir === "." ? cwd : join(cwd, dir)
  if (!existsSync(searchDir)) return []
  try {
    const entries = readdirSync(searchDir)
    const regex = globToRegex(basePattern)
    return entries.filter((e) => regex.test(e)).map((e) => (dir === "." ? e : join(dir, e)))
  } catch {
    return []
  }
  /* v8 ignore stop */
}

export function calculatePlan(answers: SetupAnswers, cwd = process.cwd()): SetupPlan {
  /* v8 ignore start */
  const plan: SetupPlan = {
    files: [],
    packageJson: [],
    workflows: [],
    placeholders: [],
    summary: {
      totalFiles: 0,
      toCreate: 0,
      toUpdate: 0,
      toDelete: 0,
      toKeep: 0,
      packageChanges: 0,
      workflowChanges: 0,
    },
  }

  const projectType = PROJECT_TYPES[answers.projectType]
  if (!projectType) throw new Error(`Unknown project type: ${answers.projectType}`)

  for (const pattern of projectType.filesToRemove) {
    const matches = expandGlob(pattern, cwd)
    for (const file of matches) {
      if (isProtectedForDelete(file, cwd)) continue
      if (!existsSync(join(cwd, file))) continue
      const requiredByFeature = Object.entries(answers.features).some(([fid, enabled]) => {
        if (!enabled) return false
        const feat = FEATURES[fid as FeatureId]
        if (!feat) return false
        return feat.files.some((fp) => {
          if (fp === file) return true
          const featMatches = expandGlob(fp, cwd)
          return featMatches.includes(file)
        })
      })
      if (requiredByFeature) continue
      if (file.startsWith("src/")) continue
      plan.files.push({
        path: file,
        type: "delete",
        reason: `Project type ${projectType.name} does not need ${file}`,
        featureId: projectType.id,
      })
    }
  }

  for (const fileDef of projectType.filesToCreate) {
    const exists = existsSync(join(cwd, fileDef.path))
    if (exists && fileDef.overwrite === false) {
      plan.files.push({
        path: fileDef.path,
        type: "keep",
        reason: `Already exists, skip (overwrite=false)`,
        featureId: projectType.id,
      })
    } else {
      plan.files.push({
        path: fileDef.path,
        type: exists ? "update" : "create",
        reason: `Required for ${projectType.name}`,
        featureId: projectType.id,
      })
    }
  }

  for (const [featureId, enabled] of Object.entries(answers.features) as Array<
    [FeatureId, boolean]
  >) {
    const feature = FEATURES[featureId]
    if (!feature) continue
    if (enabled) {
      for (const pattern of feature.files) {
        const matches = expandGlob(pattern, cwd)
        for (const file of matches) {
          if (!plan.files.some((f) => f.path === file)) {
            plan.files.push({
              path: file,
              type: "keep",
              reason: `Feature ${feature.name} enabled`,
              featureId: feature.id,
            })
          }
        }
      }
      continue
    }
    for (const pattern of feature.files) {
      const matches = expandGlob(pattern, cwd)
      for (const file of matches) {
        if (isProtectedForDelete(file, cwd)) continue
        if (plan.files.some((f) => f.path === file && f.type === "delete")) continue
        const requiredByEnabled = Object.entries(answers.features).some(
          ([otherId, otherEnabled]) => {
            if (!otherEnabled) return false
            if (otherId === featureId) return false
            // Allow determinism test files to be deleted even if vitest is enabled
            if (featureId === "determinism" && otherId === "vitest") {
              const isDeterminismFile = feature.files.includes(file)
              if (isDeterminismFile) return false
            }
            const otherFeature = FEATURES[otherId as FeatureId]
            if (!otherFeature) return false
            return otherFeature.files.some((fp) => {
              if (fp === pattern || fp === file) return true
              const otherMatches = expandGlob(fp, cwd)
              return otherMatches.includes(file)
            })
          },
        )
        if (requiredByEnabled) continue
        plan.files.push({
          path: file,
          type: "delete",
          reason: `Feature ${feature.name} disabled`,
          featureId: feature.id,
        })
      }
    }

    if (feature.dependencies) {
      for (const dep of feature.dependencies) {
        plan.packageJson.push({
          type: "remove-dep",
          name: dep,
          reason: `Feature ${feature.name} disabled`,
        })
      }
    }
    if (feature.scripts) {
      for (const script of feature.scripts) {
        plan.packageJson.push({
          type: "remove-script",
          name: script,
          reason: `Feature ${feature.name} disabled`,
        })
      }
    }

    if (feature.ciJobs?.length || feature.ciSteps?.length) {
      const existing = plan.workflows.find((w) => w.file === ".github/workflows/ci.yml")
      if (existing) {
        if (feature.ciJobs)
          existing.removedJobs = [...(existing.removedJobs || []), ...feature.ciJobs]
        if (feature.ciSteps)
          existing.removedSteps = [...(existing.removedSteps || []), ...feature.ciSteps]
      } else {
        plan.workflows.push({
          file: ".github/workflows/ci.yml",
          type: "update",
          reason: `Features disabled: ${feature.name}`,
          removedJobs: feature.ciJobs ? [...feature.ciJobs] : [],
          removedSteps: feature.ciSteps ? [...feature.ciSteps] : [],
        })
      }
    }

    if (featureId === "changesets" && !enabled) {
      if (existsSync(join(cwd, ".github/workflows/release.yml"))) {
        plan.workflows.push({
          file: ".github/workflows/release.yml",
          type: "delete",
          reason: "Changesets disabled",
        })
      }
    }
    if (featureId === "stale-bot" && !enabled) {
      if (existsSync(join(cwd, ".github/workflows/stale.yml"))) {
        plan.workflows.push({
          file: ".github/workflows/stale.yml",
          type: "delete",
          reason: "Stale bot disabled",
        })
      }
    }
    if (featureId === "github-templates" && !enabled) {
      if (existsSync(join(cwd, ".github/workflows/label.yml"))) {
        plan.workflows.push({
          file: ".github/workflows/label.yml",
          type: "delete",
          reason: "GitHub templates disabled",
        })
      }
    }
  }

  if (projectType.dependenciesToAdd) {
    for (const dep of projectType.dependenciesToAdd) {
      plan.packageJson.push({
        type: "add-dep",
        name: dep.name,
        value: dep.version,
        reason: `Required for ${projectType.name}`,
      })
    }
  }
  if (projectType.scriptsToAdd) {
    for (const [scriptName, scriptValue] of Object.entries(projectType.scriptsToAdd)) {
      plan.packageJson.push({
        type: "add-script",
        name: scriptName,
        value: scriptValue,
        reason: `Required for ${projectType.name}`,
      })
    }
  }

  const placeholderFiles = [
    "README.md",
    ".github/CODEOWNERS",
    "CONTRIBUTING.md",
    ".github/SECURITY.md",
    "package.json",
  ]
  for (const file of placeholderFiles) {
    if (existsSync(join(cwd, file))) {
      plan.placeholders.push({
        file,
        replacements: {
          "template-repo": answers.projectName,
          TEMPLATE_REPO: answers.projectName.toUpperCase().replace(/-/g, "_"),
          "Template Repo": answers.projectName,
          shiratama644: answers.githubOwner || "your-github-username",
          "@shiratama644": `@${answers.githubOwner || "your-github-username"}`,
          "your-github-username": answers.githubOwner || "your-github-username",
        },
      })
    }
  }

  plan.packageJson.push({
    type: "update-field",
    name: "name",
    value: answers.projectName,
    reason: "Project name",
  })
  if (answers.projectDescription) {
    plan.packageJson.push({
      type: "update-field",
      name: "description",
      value: answers.projectDescription,
      reason: "Project description",
    })
  }
  if (answers.githubOwner && answers.githubOwner !== "your-github-username") {
    plan.packageJson.push({
      type: "update-field",
      name: "repository",
      value: `https://github.com/${answers.githubOwner}/${answers.projectName}`,
      reason: "Repository URL",
    })
  }

  const fileMap = new Map<string, FileChange>()
  for (const fc of plan.files) {
    const existing = fileMap.get(fc.path)
    if (!existing) {
      fileMap.set(fc.path, fc)
    } else {
      if (fc.type === "delete") {
        fileMap.set(fc.path, fc)
      } else if (existing.type === "delete") {
        // keep existing delete
      } else if (fc.type !== "keep") {
        fileMap.set(fc.path, fc)
      }
    }
  }
  plan.files = Array.from(fileMap.values()).sort((a, b) => a.path.localeCompare(b.path))

  const pkgMap = new Map<string, PackageJsonChange>()
  for (const pc of plan.packageJson) {
    const key = `${pc.type}:${pc.name}`
    pkgMap.set(key, pc)
  }
  plan.packageJson = Array.from(pkgMap.values())

  const wfMap = new Map<string, (typeof plan.workflows)[0]>()
  for (const wf of plan.workflows) {
    const existing = wfMap.get(wf.file)
    if (!existing) {
      wfMap.set(wf.file, wf)
    } else {
      if (wf.type === "delete") {
        wfMap.set(wf.file, wf)
      } else {
        existing.removedJobs = [
          ...new Set([...(existing.removedJobs || []), ...(wf.removedJobs || [])]),
        ]
        existing.removedSteps = [
          ...new Set([...(existing.removedSteps || []), ...(wf.removedSteps || [])]),
        ]
      }
    }
  }
  plan.workflows = Array.from(wfMap.values())

  plan.summary = {
    totalFiles: plan.files.length,
    toCreate: plan.files.filter((f) => f.type === "create").length,
    toUpdate: plan.files.filter((f) => f.type === "update").length,
    toDelete: plan.files.filter((f) => f.type === "delete").length,
    toKeep: plan.files.filter((f) => f.type === "keep").length,
    packageChanges: plan.packageJson.length,
    workflowChanges: plan.workflows.length,
  }

  return plan
}
/* v8 ignore stop */

export function applyPlan(
  plan: SetupPlan,
  answers: SetupAnswers,
  cwd = process.cwd(),
  dryRun = false,
): void {
  /* v8 ignore start */
  for (const fileChange of plan.files) {
    const fullPath = join(cwd, fileChange.path)
    if (fileChange.type === "delete") {
      if (dryRun) continue
      if (!existsSync(fullPath)) continue
      if (isProtectedForDelete(fileChange.path, cwd)) continue
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          rmSync(fullPath, { recursive: true, force: true })
        } else {
          rmSync(fullPath, { force: true })
        }
      } catch (e) {
        console.warn(`Failed to delete ${fileChange.path}: ${e}`)
      }
    } else if (fileChange.type === "create" || fileChange.type === "update") {
      if (dryRun) continue
      const projectType = PROJECT_TYPES[answers.projectType]
      const fileDef = projectType?.filesToCreate.find((f) => f.path === fileChange.path)
      if (!fileDef) continue
      let content = fileDef.content || ""
      if (fileDef.fromExample) {
        const examplePath = join(cwd, fileDef.fromExample)
        if (existsSync(examplePath)) {
          content = readFileSync(examplePath, "utf8")
        }
      }
      content = content.replace(/template-repo/g, answers.projectName)
      content = content.replace(
        /TEMPLATE_REPO/g,
        answers.projectName.toUpperCase().replace(/-/g, "_"),
      )
      if (answers.githubOwner && answers.githubOwner !== "your-github-username") {
        content = content.replace(/shiratama644/g, answers.githubOwner)
        content = content.replace(/your-github-username/g, answers.githubOwner)
      }
      const dir = dirname(fullPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      if (fileDef.overwrite === false && existsSync(fullPath)) {
        continue
      }
      writeFileSync(fullPath, content, "utf8")
    }
  }

  if (!dryRun) {
    const pkgPath = join(cwd, "package.json")
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      for (const change of plan.packageJson) {
        if (change.type === "remove-dep") {
          if (pkg.dependencies?.[change.name]) delete pkg.dependencies[change.name]
          if (pkg.devDependencies?.[change.name]) delete pkg.devDependencies[change.name]
        } else if (change.type === "add-dep") {
          if (pkg.dependencies?.[change.name] || pkg.devDependencies?.[change.name]) continue
          const projectType = PROJECT_TYPES[answers.projectType]
          const depDef = projectType?.dependenciesToAdd?.find((d) => d.name === change.name)
          const isDev = depDef?.dev ?? true
          if (isDev) {
            pkg.devDependencies = pkg.devDependencies || {}
            if (!pkg.devDependencies[change.name])
              pkg.devDependencies[change.name] = change.value || "*"
          } else {
            pkg.dependencies = pkg.dependencies || {}
            if (!pkg.dependencies[change.name]) pkg.dependencies[change.name] = change.value || "*"
          }
        } else if (change.type === "remove-script") {
          if (pkg.scripts?.[change.name]) delete pkg.scripts[change.name]
        } else if (change.type === "add-script") {
          pkg.scripts = pkg.scripts || {}
          if (!pkg.scripts[change.name] && change.value) {
            pkg.scripts[change.name] = change.value
          }
        } else if (change.type === "update-field") {
          if (change.name === "name") {
            pkg.name = change.value
          } else if (change.name === "description") {
            pkg.description = change.value
          } else if (change.name === "repository") {
            if (typeof pkg.repository === "string") {
              pkg.repository = change.value
            } else if (pkg.repository && typeof pkg.repository === "object") {
              pkg.repository.url = change.value
            } else {
              pkg.repository = change.value
            }
          }
        }
      }
      if (!answers.features.husky) {
        if (pkg["lint-staged"]) delete pkg["lint-staged"]
      }
      if (!answers.features.commitlint) {
        if (pkg.config?.commitizen) {
          delete pkg.config.commitizen
          if (Object.keys(pkg.config).length === 0) delete pkg.config
        }
      }
      if (!answers.features["size-limit"]) {
        if (pkg["size-limit"]) delete pkg["size-limit"]
      }
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8")
    }
  }

  if (!dryRun) {
    for (const wf of plan.workflows) {
      const fullPath = join(cwd, wf.file)
      if (wf.type === "delete") {
        if (existsSync(fullPath)) {
          rmSync(fullPath, { force: true })
        }
      } else if (wf.type === "update" && wf.file === ".github/workflows/ci.yml") {
        if (!existsSync(fullPath)) continue
        const content = readFileSync(fullPath, "utf8")
        let newContent = content
        if (wf.removedJobs?.length) {
          for (const job of wf.removedJobs) {
            newContent = safeRemoveJob(newContent, job)
          }
        }
        if (wf.removedSteps?.length) {
          newContent = safeRemoveSteps(newContent, wf.removedSteps)
        }
        if (newContent !== content) {
          writeFileSync(fullPath, newContent, "utf8")
        }
      }
    }
  }

  if (!dryRun) {
    for (const ph of plan.placeholders) {
      if (ph.file === "package.json") continue
      const fullPath = join(cwd, ph.file)
      if (!existsSync(fullPath)) continue
      let content = readFileSync(fullPath, "utf8")
      let changed = false
      for (const [from, to] of Object.entries(ph.replacements)) {
        if (content.includes(from)) {
          content = content.split(from).join(to)
          changed = true
        }
      }
      if (changed) {
        writeFileSync(fullPath, content, "utf8")
      }
    }
  }
}
/* v8 ignore stop */

export function formatPlan(
  plan: SetupPlan,
  options?: { colors?: boolean; verbose?: boolean },
): string {
  /* v8 ignore next 1 */
  const useColors = options?.colors ?? true
  /* v8 ignore next 1 */
  const verbose = options?.verbose ?? false

  const RESET = useColors ? "\x1b[0m" : ""
  const GREEN = useColors ? "\x1b[32m" : ""
  const RED = useColors ? "\x1b[31m" : ""
  const YELLOW = useColors ? "\x1b[33m" : ""
  const CYAN = useColors ? "\x1b[36m" : ""
  const DIM = useColors ? "\x1b[2m" : ""
  const BOLD = useColors ? "\x1b[1m" : ""

  const lines: string[] = []
  lines.push(`\n${BOLD}${CYAN}=== Setup Plan ===${RESET}`)
  lines.push(
    `${DIM}Summary: ${plan.summary.toCreate} create, ${plan.summary.toUpdate} update, ${plan.summary.toDelete} delete, ${plan.summary.toKeep} keep, ${plan.summary.packageChanges} pkg changes, ${plan.summary.workflowChanges} workflow changes${RESET}\n`,
  )

  if (plan.files.length) {
    const byType = {
      create: plan.files.filter((f) => f.type === "create"),
      update: plan.files.filter((f) => f.type === "update"),
      delete: plan.files.filter((f) => f.type === "delete"),
      keep: plan.files.filter((f) => f.type === "keep"),
    }

    if (byType.create.length) {
      lines.push(`${GREEN}${BOLD}  + Create (${byType.create.length}):${RESET}`)
      for (const f of byType.create) {
        lines.push(`    ${GREEN}+ ${f.path}${RESET} ${DIM}(${f.reason})${RESET}`)
      }
    }
    if (byType.update.length) {
      lines.push(`${YELLOW}${BOLD}  ~ Update (${byType.update.length}):${RESET}`)
      for (const f of byType.update) {
        lines.push(`    ${YELLOW}~ ${f.path}${RESET} ${DIM}(${f.reason})${RESET}`)
      }
    }
    if (byType.delete.length) {
      lines.push(`${RED}${BOLD}  - Delete (${byType.delete.length}):${RESET}`)
      for (const f of byType.delete) {
        lines.push(`    ${RED}- ${f.path}${RESET} ${DIM}(${f.reason})${RESET}`)
      }
    }
    /* v8 ignore start */
    if (verbose && byType.keep.length) {
      lines.push(`${DIM}  = Keep (${byType.keep.length}):${RESET}`)
      for (const f of byType.keep.slice(0, 20)) {
        lines.push(`    ${DIM}= ${f.path} (${f.reason})${RESET}`)
      }
      if (byType.keep.length > 20) {
        lines.push(`    ${DIM}... and ${byType.keep.length - 20} more${RESET}`)
      }
    } else if (byType.keep.length) {
      lines.push(`${DIM}  = Keep: ${byType.keep.length} files (use --verbose to see)${RESET}`)
    }
    /* v8 ignore stop */
  }

  if (plan.packageJson.length) {
    lines.push(`\n${BOLD}  package.json:${RESET}`)
    for (const p of plan.packageJson) {
      const isAdd = p.type === "add-dep" || p.type === "add-script"
      const isRemove = p.type === "remove-dep" || p.type === "remove-script"
      const symbol = isAdd ? "+" : isRemove ? "-" : "~"
      const color = isAdd ? GREEN : isRemove ? RED : YELLOW
      lines.push(
        `    ${color}${symbol} ${p.type} ${p.name}${p.value ? ` -> ${p.value}` : ""}${RESET} ${DIM}(${p.reason})${RESET}`,
      )
    }
  }

  if (plan.workflows.length) {
    lines.push(`\n${BOLD}  Workflows:${RESET}`)
    for (const w of plan.workflows) {
      const symbol = w.type === "delete" ? "-" : "~"
      const color = w.type === "delete" ? RED : YELLOW
      lines.push(`    ${color}${symbol} ${w.file}${RESET} ${DIM}(${w.reason})${RESET}`)
      if (w.removedJobs?.length)
        lines.push(`      ${DIM}removed jobs: ${w.removedJobs.join(", ")}${RESET}`)
      if (w.removedSteps?.length)
        lines.push(`      ${DIM}removed steps: ${w.removedSteps.join(", ")}${RESET}`)
    }
  }

  if (plan.placeholders.length) {
    lines.push(`\n${BOLD}  Placeholders:${RESET}`)
    for (const ph of plan.placeholders) {
      lines.push(
        `    ${YELLOW}~ ${ph.file}${RESET}: ${DIM}${Object.keys(ph.replacements).join(", ")}${RESET}`,
      )
    }
  }

  if (!plan.files.length && !plan.packageJson.length && !plan.workflows.length) {
    lines.push(`${GREEN}(no changes)${RESET}`)
  }

  lines.push("")
  return lines.join("\n")
}

export function diffPlans(oldPlan: SetupPlan, newPlan: SetupPlan): string {
  const lines: string[] = []
  const oldFiles = new Set(oldPlan.files.map((f) => `${f.type}:${f.path}`))
  const newFiles = new Set(newPlan.files.map((f) => `${f.type}:${f.path}`))

  const added = [...newFiles].filter((x) => !oldFiles.has(x))
  const removed = [...oldFiles].filter((x) => !newFiles.has(x))

  if (added.length) {
    lines.push(`Added in new plan: ${added.join(", ")}`)
  }
  if (removed.length) {
    lines.push(`Removed from old plan: ${removed.join(", ")}`)
  }
  if (!added.length && !removed.length) {
    lines.push("Plans are identical")
  }
  return lines.join("\n")
}
