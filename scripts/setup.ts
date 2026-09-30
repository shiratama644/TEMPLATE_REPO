#!/usr/bin/env node

/**
 * Template Bootstrap CLI — pnpm setup
 * Improved version with presets, backup, rollback, config file, better UX
 *
 * Usage:
 *   pnpm setup              # interactive with preset selection
 *   pnpm setup --dry-run    # preview changes
 *   pnpm setup --yes        # use defaults, skip prompts
 *   pnpm setup --minimal    # minimal preset
 *   pnpm setup --preset vite-app --project-name my-app
 *   pnpm setup --list-presets
 *   pnpm setup --help
 */

import { execSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as p from "@clack/prompts"
import { cleanupOldBackups, createBackup, restoreBackup } from "./lib/bootstrap/backup.ts"
import { generateDocs } from "./lib/bootstrap/docs-generator.ts"
import { applyPlan, calculatePlan, formatPlan } from "./lib/bootstrap/engine.ts"
import { FEATURES, PROJECT_TYPES } from "./lib/bootstrap/manifest.ts"
import { getPreset, listPresets, PRESETS } from "./lib/bootstrap/presets.ts"
import {
  getAnswersFromPreset,
  getDefaultAnswers,
  getMinimalAnswers,
  promptSetup,
} from "./lib/bootstrap/prompts.ts"
import { generateReadme } from "./lib/bootstrap/readme-generator.ts"
import type { CliOptions, SetupAnswers, SetupState } from "./lib/bootstrap/types.ts"
import { resolveFeatureDependencies, validateAnswers } from "./lib/bootstrap/validator.ts"

export const VERSION = "2.0.0"

export function printHelp() {
  /* v8 ignore start */
  console.log(`
🚀 Template Bootstrap CLI — pnpm setup v${VERSION}
   AI Agentによるソフトウェア開発を規律立てて進めるためのテンプレート

📖 Usage:
  pnpm setup [options]

⚡ Quick Start:
  pnpm setup                              # 対話式セットアップ（推奨）
  pnpm setup --dry-run                    # 変更をプレビュー
  pnpm setup --yes                        # デフォルトで即実行
  pnpm setup --preset vite-app            # プリセット使用

🎛️  Options:
  --dry-run              変更をプレビュー（ファイルは変更しない）
  --yes, -y              デフォルト値を使用、プロンプトをスキップ
  --minimal              最小構成（plain TS + vitestのみ）
  --preset <id>          プリセット使用: ${Object.keys(PRESETS).join(", ")}
  --list-presets         利用可能なプリセットを一覧表示

  --project-name <name>  プロジェクト名 (例: my-app)
  --type <type>          プロジェクトタイプ: plain, vite, next, monorepo
  --features <list>      機能をカンマ区切りで指定 (例: docker,vitest,cspell)
  --termux-mode <mode>   Termuxモード: auto, yes, no
  --github-owner <owner> GitHubオーナー名
  --description <desc>   プロジェクト説明

  --config <path>        JSON設定ファイルから読み込み
  --save-config <path>   設定をJSONファイルに保存

  --force                Gitチェックや安全ガードをバイパス
  --no-install           pnpm install検証をスキップ
  --no-verify            typecheck/lint検証をスキップ
  --no-backup            バックアップ作成をスキップ
  --verbose, -v          詳細出力
  --help, -h             このヘルプを表示
  --version              バージョン表示

💡 Examples:
  pnpm setup                                              # 対話式（推奨）
  pnpm setup --dry-run                                    # プレビュー
  pnpm setup --yes --project-name my-app                  # デフォルトで即実行
  pnpm setup --preset vite-app --project-name my-vite     # Viteプリセット
  pnpm setup --preset next-app --github-owner myuser      # Next.jsプリセット
  pnpm setup --type vite --features docker,vitest         # カスタム構成

🎨 Presets:
${listPresets()
  .map(
    (preset) =>
      `  ${preset.id.padEnd(16)} ${preset.icon || "📦"} ${preset.name.padEnd(20)} — ${preset.description}`,
  )
  .join("\n")}

📁 Project Types:
${Object.entries(PROJECT_TYPES)
  .map(
    ([id, def]) =>
      `  ${id.padEnd(16)} ${def.icon || "📦"} ${def.name.padEnd(20)} — ${def.description}`,
  )
  .join("\n")}

🧩 Features:
${Object.entries(FEATURES)
  .map(([id, def]) => `  ${id.padEnd(20)} ${def.icon || "•"} ${def.name} (${def.group})`)
  .join("\n")}

🔧 For more info: https://github.com/shiratama644/TEMPLATE_REPO
`)
  /* v8 ignore stop */
}

export function parseArgs(argv: string[] = process.argv.slice(2)): CliOptions {
  /* v8 ignore next 6 */
  const args = argv
  const getValue = (flag: string): string | undefined => {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
    if (idx === -1) return undefined
    const arg = args[idx]
    if (arg.includes("=")) return arg.split("=").slice(1).join("=")
    return args[idx + 1]
  }

  const hasFlag = (flag: string, short?: string) =>
    args.includes(flag) || (short ? args.includes(short) : false)

  return {
    dryRun: hasFlag("--dry-run"),
    yes: hasFlag("--yes", "-y"),
    defaults: hasFlag("--defaults"),
    verbose: hasFlag("--verbose", "-v"),
    force: hasFlag("--force"),
    noInstall: hasFlag("--no-install"),
    noVerify: hasFlag("--no-verify"),
    noBackup: hasFlag("--no-backup"),
    help: hasFlag("--help", "-h"),
    version: hasFlag("--version"),
    listPresets: hasFlag("--list-presets"),
    preset: getValue("--preset") as CliOptions["preset"],
    projectName: getValue("--project-name"),
    projectType: getValue("--type") as CliOptions["projectType"],
    features: getValue("--features"),
    termuxMode: getValue("--termux-mode") as CliOptions["termuxMode"],
    githubOwner: getValue("--github-owner"),
    description: getValue("--description"),
    config: getValue("--config"),
    saveConfig: getValue("--save-config"),
    minimal: hasFlag("--minimal"),
  }
}

export function checkGitStatus(cwd = process.cwd()): { clean: boolean; status: string } {
  try {
    const status = execSync("git status --porcelain", { cwd, encoding: "utf8", stdio: "pipe" })
    return {
      clean: status.trim() === "",
      status,
    }
  } catch {
    return { clean: true, status: "" }
  }
}

export function loadConfigFile(path: string, cwd = process.cwd()): Partial<SetupAnswers> | null {
  try {
    const fullPath = path.startsWith("/") ? path : join(cwd, path)
    if (!existsSync(fullPath)) {
      console.error(`Config file not found: ${fullPath}`)
      return null
    }
    const content = readFileSync(fullPath, "utf8")
    return JSON.parse(content) as Partial<SetupAnswers>
  } catch (e) {
    console.error(`Failed to load config: ${e}`)
    return null
  }
}

export function loadPreviousState(cwd = process.cwd()): SetupState | null {
  try {
    const statePath = join(cwd, ".bootstrap-state.json")
    if (!existsSync(statePath)) return null
    const content = readFileSync(statePath, "utf8")
    return JSON.parse(content) as SetupState
  } catch {
    return null
  }
}

export async function main() {
  const options = parseArgs()
  const cwd = process.cwd()

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  if (options.version) {
    console.log(`v${VERSION}`)
    process.exit(0)
  }

  /* v8 ignore next 10 */
  if (options.listPresets) {
    console.log("\nAvailable presets:\n")
    for (const preset of listPresets()) {
      console.log(`${preset.icon || ""} ${preset.id.padEnd(15)} — ${preset.name}`)
      console.log(`  ${preset.description}`)
      console.log(
        `  Type: ${preset.projectType}, Features: ${Object.entries(preset.features)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ")}`,
      )
      console.log("")
    }
    process.exit(0)
  }

  let configAnswers: Partial<SetupAnswers> | null = null
  if (options.config) {
    configAnswers = loadConfigFile(options.config, cwd)
    if (!configAnswers) process.exit(1)
    p.log.info(`Loaded config from ${options.config}`)
  }

  const previousState = loadPreviousState(cwd)
  if (previousState && !options.force && !options.dryRun) {
    p.log.info(
      `Previous bootstrap found: ${previousState.answers.projectName} (${previousState.answers.projectType}) at ${previousState.timestamp}`,
    )
  }

  const git = checkGitStatus(cwd)
  if (!git.clean && !options.force && !options.yes && !options.defaults && !options.dryRun) {
    p.log.warn("Uncommitted changes detected:")
    console.log(git.status)
    const action = await p.select({
      message: "You have uncommitted changes. What to do?",
      options: [
        { value: "continue", label: "Continue", hint: "Proceed, may delete files" },
        { value: "stash", label: "Stash & continue", hint: "git stash push -m 'bootstrap backup'" },
        { value: "abort", label: "Abort", hint: "Commit or stash manually first" },
      ],
      initialValue: "abort",
    })
    if (p.isCancel(action) || action === "abort") {
      p.cancel("Setup aborted due to uncommitted changes")
      process.exit(0)
    }
    /* v8 ignore next 5 */
    if (action === "stash") {
      try {
        execSync("git stash push -m 'bootstrap backup' --include-untracked", {
          cwd,
          stdio: "inherit",
        })
        p.log.success("Stashed changes")
      } catch {
        p.log.error("Failed to stash")
        process.exit(1)
      }
    }
  } else if (!git.clean && options.dryRun) {
    p.log.info("Dry-run: ignoring uncommitted changes check")
  }

  let answers: SetupAnswers

  /* v8 ignore start */
  if (options.config && configAnswers) {
    const base = getDefaultAnswers(cwd)
    answers = {
      projectName: options.projectName || (configAnswers.projectName as string) || base.projectName,
      projectDescription:
        options.description ||
        (configAnswers.projectDescription as string) ||
        base.projectDescription,
      githubOwner: options.githubOwner || (configAnswers.githubOwner as string) || base.githubOwner,
      projectType:
        (options.projectType as any) || (configAnswers.projectType as any) || base.projectType,
      features: configAnswers.features || base.features,
      termuxMode:
        (options.termuxMode as any) || (configAnswers.termuxMode as any) || base.termuxMode,
      preset: configAnswers.preset,
    }
    if (options.features) {
      const featureList = options.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
      const allFeatures = Object.fromEntries(
        Object.keys(FEATURES).map((id) => [id, false]),
      ) as Record<string, boolean>
      for (const f of featureList) {
        if (f in allFeatures) allFeatures[f] = true
      }
      answers.features = allFeatures as any
    }
    p.log.info("Using config file + CLI overrides")
    /* v8 ignore stop */
  } else if (options.preset) {
    const preset = getPreset(options.preset)
    if (!preset) {
      p.log.error(`Unknown preset: ${options.preset}. Use --list-presets to see available.`)
      process.exit(1)
    }
    const presetAnswers = getAnswersFromPreset(
      options.preset,
      {
        projectName: options.projectName,
        githubOwner: options.githubOwner,
        projectDescription: options.description,
        projectType: options.projectType as any,
        termuxMode: options.termuxMode as any,
      },
      cwd,
    )
    /* v8 ignore next 1 */
    if (!presetAnswers) {
      /* v8 ignore start */
      p.log.error("Failed to apply preset")
      process.exit(1)
      /* v8 ignore stop */
    }
    answers = presetAnswers

    /* v8 ignore start */
    if (options.features) {
      const featureList = options.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
      const featRecord = answers.features as Record<string, boolean>
      for (const f of featureList) {
        if (f.startsWith("no-") || f.startsWith("!")) {
          const fid = f.replace(/^(no-|!)/, "")
          if (fid in featRecord) featRecord[fid] = false
        } else {
          if (f in featRecord) featRecord[f] = true
        }
      }
    }
    /* v8 ignore stop */
    /* v8 ignore next 1 */
    p.log.info(`${preset.icon || ""} Using preset: ${preset.name}`)
  } else if (options.minimal) {
    /* v8 ignore start */
    answers = getMinimalAnswers(cwd)
    if (options.projectName) answers.projectName = options.projectName
    if (options.githubOwner) answers.githubOwner = options.githubOwner
    if (options.description) answers.projectDescription = options.description
    if (options.projectType) answers.projectType = options.projectType as any
    if (options.termuxMode) answers.termuxMode = options.termuxMode as any
    p.log.info("Using minimal preset (plain TS + vitest)")
    /* v8 ignore stop */
  } else if (options.yes || options.defaults) {
    const isMinimal = options.minimal
    /* v8 ignore next 3 */
    if (isMinimal) {
      answers = getMinimalAnswers(cwd)
      p.log.info("Using minimal preset (plain TS + vitest)")
    } else {
      answers = getDefaultAnswers(cwd)
      if (options.projectName) answers.projectName = options.projectName
      if (options.githubOwner) answers.githubOwner = options.githubOwner
      if (options.description) answers.projectDescription = options.description
      if (options.projectType) answers.projectType = options.projectType as any
      if (options.termuxMode) answers.termuxMode = options.termuxMode as any
      if (options.features) {
        const featureList = options.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
        for (const f of featureList) {
          if (f in answers.features) (answers.features as any)[f] = true
        }
      }
      p.log.info("Using defaults (all features enabled, plain TS)")
    }
  } else {
    // TUI mode using Ink - fallback to clack if not TTY or fails
    if (process.stdout.isTTY && process.stdin.isTTY) {
      try {
        p.log.info("🎨 Launching TUI (Ink) - ESC to cancel")
        const { runTUI } = await import("./lib/bootstrap/tui-runner.ts")
        const tuiResult = await runTUI(cwd)
        if (tuiResult) {
          answers = tuiResult
        } else {
          p.log.warn("TUI cancelled, falling back to CLI prompts")
          answers = await promptSetup(false, cwd)
        }
      } catch (e) {
        p.log.warn(
          `TUI failed (${e instanceof Error ? e.message : String(e)}), falling back to CLI`,
        )
        answers = await promptSetup(false, cwd)
      }
    } else {
      answers = await promptSetup(false, cwd)
    }
  }

  if (options.projectName && !options.config) answers.projectName = options.projectName
  if (options.githubOwner) answers.githubOwner = options.githubOwner
  if (options.description) answers.projectDescription = options.description
  if (options.projectType) answers.projectType = options.projectType as any
  if (options.termuxMode) answers.termuxMode = options.termuxMode as any

  answers.features = resolveFeatureDependencies(answers.features)

  const validation = validateAnswers(answers)
  if (!validation.valid) {
    p.log.error("Validation failed:")
    for (const err of validation.errors) {
      console.log(`  - ${err}`)
    }
    if (!options.force) process.exit(1)
    p.log.warn("Continuing due to --force")
  }
  if (validation.warnings.length) {
    for (const warn of validation.warnings) {
      p.log.warn(warn)
    }
  }

  if (previousState && !options.force && !options.dryRun) {
    const prev = previousState.answers
    const same =
      prev.projectName === answers.projectName &&
      prev.projectType === answers.projectType &&
      prev.githubOwner === answers.githubOwner &&
      JSON.stringify(prev.features) === JSON.stringify(answers.features) &&
      prev.termuxMode === answers.termuxMode

    if (same) {
      p.log.info(
        "Already bootstrapped with same config — no changes needed (use --force to re-apply)",
      )
      const shouldContinue = await p.confirm({
        message: "Re-apply anyway?",
        initialValue: false,
      })
      /* v8 ignore next 4 */
      if (p.isCancel(shouldContinue) || !shouldContinue) {
        p.outro("✓ Already up to date")
        process.exit(0)
      }
    } else {
      p.log.info("Config differs from previous bootstrap — will apply changes")
      /* v8 ignore start */
      const changedFeatures = Object.entries(answers.features)
        .filter(([id, enabled]) => prev.features[id as keyof typeof prev.features] !== enabled)
        .map(
          ([id, enabled]) =>
            `${id}: ${prev.features[id as keyof typeof prev.features] ? "ON" : "OFF"} → ${enabled ? "ON" : "OFF"}`,
        )
      /* v8 ignore stop */

      /* v8 ignore next 1 */
      if (changedFeatures.length) {
        p.log.info(`Feature changes: ${changedFeatures.join(", ")}`)
      }
      /* v8 ignore next 3 */
      if (prev.projectType !== answers.projectType) {
        p.log.info(`Project type: ${prev.projectType} → ${answers.projectType}`)
      }
    }
  }

  const plan = calculatePlan(answers, cwd)

  if (options.dryRun) {
    console.log(formatPlan(plan, { colors: true, verbose: options.verbose }))
    p.log.info("Dry-run: no files changed")
    if (options.verbose) {
      const readmePreview = generateReadme(answers)
      console.log("\n=== Generated README.md preview (first 80 lines) ===\n")
      console.log(readmePreview.split("\n").slice(0, 80).join("\n"))
      console.log("\n... (truncated)")
    }
    process.exit(0)
  }

  if (!options.yes && !options.defaults && !options.preset && !options.minimal) {
    console.log(formatPlan(plan, { colors: true, verbose: options.verbose }))
    const confirm = await p.confirm({
      message: `Apply changes? Project: ${answers.projectName} (${answers.projectType}) — ${plan.summary.toCreate} create, ${plan.summary.toUpdate} update, ${plan.summary.toDelete} delete`,
      initialValue: true,
    })
    if (p.isCancel(confirm) || !confirm) {
      p.cancel("Setup cancelled")
      process.exit(0)
    }
  } else {
    console.log(formatPlan(plan, { colors: true, verbose: options.verbose }))
  }

  let backupDir: string | undefined
  if (!options.noBackup) {
    const spinner = p.spinner()
    spinner.start("Creating backup...")
    try {
      const filesToBackup = [
        ...plan.files.filter((f) => f.type === "delete" || f.type === "update").map((f) => f.path),
        "package.json",
        ".github/workflows/ci.yml",
      ]
      const result = createBackup(filesToBackup, cwd)
      backupDir = result.backupDir
      spinner.stop(`Backup created: ${backupDir} (${result.entries.length} files)`)
    } catch (e) {
      spinner.stop("Backup failed, continuing without backup")
      console.warn(e)
    }
  }

  const tasks = p.tasks([
    {
      title: "Applying file changes",
      task: async () => {
        applyPlan(plan, answers, cwd, false)
        return `Files: ${plan.summary.toCreate} created, ${plan.summary.toUpdate} updated, ${plan.summary.toDelete} deleted`
      },
    },
    {
      title: "Generating README.md",
      task: async () => {
        const readmePath = join(cwd, "README.md")
        const newReadme = generateReadme(answers)
        writeFileSync(readmePath, newReadme, "utf8")
        return "README.md generated"
      },
    },
    {
      title: "Generating docs/ for new repository",
      task: async () => {
        const created = generateDocs(answers, cwd)
        return `docs/ transformed for new project: ${created.length} files (${created.join(", ")})`
      },
    },
    {
      title: "Saving bootstrap state",
      task: async () => {
        const statePath = join(cwd, ".bootstrap-state.json")
        const state: SetupState = {
          version: 2,
          timestamp: new Date().toISOString(),
          answers,
          plan: {
            files: plan.files.length,
            packageJson: plan.packageJson.length,
            workflows: plan.workflows.length,
          },
          backupDir,
        }
        writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8")

        if (options.saveConfig) {
          /* v8 ignore next 3 */
          const configPath = options.saveConfig.startsWith("/")
            ? options.saveConfig
            : join(cwd, options.saveConfig)
          writeFileSync(configPath, JSON.stringify(answers, null, 2) + "\n", "utf8")
        }

        cleanupOldBackups(cwd, 5)

        return `State saved to .bootstrap-state.json${options.saveConfig ? ` and ${options.saveConfig}` : ""}`
      },
    },
  ])

  try {
    await tasks

    if (!options.noVerify) {
      p.log.info("Running self-verification...")

      /* v8 ignore start */
      try {
        const pkgPath = join(cwd, "package.json")
        if (existsSync(pkgPath)) {
          JSON.parse(readFileSync(pkgPath, "utf8"))
          p.log.success("package.json is valid JSON")
        }
      } catch (e) {
        p.log.error(`package.json validation failed: ${e}`)
      }
      /* v8 ignore stop */

      if (!options.noInstall && options.verbose) {
        try {
          p.log.info("Running pnpm install...")
          execSync("pnpm install --frozen-lockfile", { cwd, stdio: "inherit" })
          p.log.success("pnpm install succeeded")
        } catch {
          p.log.warn("pnpm install failed — you may need to run it manually")
        }
      }

      /* v8 ignore start */
      try {
        p.log.info("Running pnpm typecheck...")
        execSync("pnpm typecheck", { cwd, stdio: "pipe" })
        p.log.success("typecheck passed")
      } catch (e) {
        p.log.warn(`typecheck failed (may be expected if deps not installed)`)
        if (options.verbose) console.log(e)
      }

      try {
        p.log.info("Running pnpm lint...")
        execSync("pnpm lint", { cwd, stdio: "pipe" })
        p.log.success("lint passed")
      } catch (e) {
        p.log.warn(`lint failed`)
        if (options.verbose) console.log(e)
      }
      /* v8 ignore stop */
    }

    p.outro(`✓ Setup complete! Project: ${answers.projectName} (${answers.projectType})`)

    console.log("\n📋 Summary:")
    console.log(`  Project: ${answers.projectName}`)
    console.log(`  Type: ${answers.projectType} (${PROJECT_TYPES[answers.projectType].name})`)
    if (answers.preset) console.log(`  Preset: ${answers.preset}`)
    console.log(`  Owner: ${answers.githubOwner}`)
    console.log(
      `  Files: ${plan.summary.toCreate} created, ${plan.summary.toUpdate} updated, ${plan.summary.toDelete} deleted, ${plan.summary.toKeep} kept`,
    )
    console.log(`  Package: ${plan.summary.packageChanges} changes`)
    console.log(`  Workflows: ${plan.summary.workflowChanges} changes`)
    if (backupDir) console.log(`  Backup: ${backupDir}`)
    console.log("")

    /* v8 ignore start */
    console.log("Next steps:")
    console.log("  pnpm install        # ensure deps are synced")
    console.log("  pnpm dev            # start dev server")
    console.log("  pnpm check          # run quality gates")
    if (answers.features.changesets)
      console.log("  pnpm changeset      # create changeset for release")
    console.log("")
    console.log(
      `Enabled (${Object.entries(answers.features).filter(([, v]) => v).length}): ${
        Object.entries(answers.features)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ") || "none"
      }`,
    )
    console.log(
      `Disabled (${Object.entries(answers.features).filter(([, v]) => !v).length}): ${
        Object.entries(answers.features)
          .filter(([, v]) => !v)
          .map(([k]) => k)
          .join(", ") || "none"
      }`,
    )
    console.log("")

    if (git.status && !git.clean) {
      console.log("⚠️  You had uncommitted changes before setup. Review diff:")
      console.log("  git status")
      console.log("  git diff")
      if (backupDir) console.log(`  Backup at ${backupDir} can be restored if needed`)
    }
    /* v8 ignore stop */
    /* v8 ignore start */
  } catch (e) {
    p.log.error(`Setup failed: ${e}`)
    if (e instanceof Error) console.error(e.stack)

    if (backupDir && !options.noBackup) {
      const shouldRestore = await p.confirm({
        message: `Setup failed. Restore from backup ${backupDir}?`,
        initialValue: true,
      })
      if (!p.isCancel(shouldRestore) && shouldRestore) {
        try {
          restoreBackup(backupDir, cwd)
          p.log.success("Restored from backup")
        } catch (restoreErr) {
          /* v8 ignore next 1 */
          p.log.error(`Restore failed: ${restoreErr}`)
        }
      }
    }

    process.exit(1)
  }
  /* v8 ignore stop */
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
/* v8 ignore stop */
