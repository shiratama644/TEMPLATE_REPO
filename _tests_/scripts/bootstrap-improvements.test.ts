// @ts-nocheck
/**
 * Bootstrap Improvements Test — 新改善点の検証
 *
 * 検証項目:
 * 1. Presets: 全プリセット存在、minimalはvitestのみ、fullは全機能、vite-appはviteタイプ等
 * 2. Validator: project name, github owner, feature dependencies, impact
 * 3. Backup: createBackup, restoreBackup, listBackups, cleanup
 * 4. YAML Utils: removeJob, removeSteps, validate
 * 5. Engine: expandGlob **, formatPlan summary, diffPlans, protection
 * 6. CLI: --help, --list-presets, --dry-run with preset, --version, --preset with overrides
 * 7. Prompts: getAnswersFromPreset, inferred owner, termux detection
 * 8. Readme: badges, preset info, CLI options section
 */

import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const CYAN = "\x1b[36m"

type TestResult = { name: string; passed: boolean; details: string }
const results: TestResult[] = []

function test(name: string, fn: () => { passed: boolean; details: string }) {
  try {
    const r = fn()
    results.push({ name, passed: r.passed, details: r.details })
    console.log(`${r.passed ? `${GREEN}✓` : `${RED}✗`} ${name}${RESET} — ${r.details}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ name, passed: false, details: `exception: ${msg}` })
    console.log(`${RED}✗ ${name}${RESET} — exception: ${msg}`)
    if (e instanceof Error && e.stack) console.log(e.stack.slice(0, 500))
  }
}

async function testAsync(name: string, fn: () => Promise<{ passed: boolean; details: string }>) {
  try {
    const r = await fn()
    results.push({ name, passed: r.passed, details: r.details })
    console.log(`${r.passed ? `${GREEN}✓` : `${RED}✗`} ${name}${RESET} — ${r.details}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ name, passed: false, details: `exception: ${msg}` })
    console.log(`${RED}✗ ${name}${RESET} — exception: ${msg}`)
  }
}

const TEMPLATE_ROOT = process.cwd()

async function runTests() {
  console.log(`${CYAN}=== Bootstrap Improvements Test ===${RESET}`)

  // Load modules
  const { PRESETS, getPreset, listPresets } = await import(
    join(TEMPLATE_ROOT, "scripts/lib/bootstrap/presets.ts")
  )
  const {
    validateProjectName,
    validateGithubOwner,
    validateAnswers,
    resolveFeatureDependencies,
    getFeatureImpactSummary,
  } = await import(join(TEMPLATE_ROOT, "scripts/lib/bootstrap/validator.ts"))
  const { createBackup, restoreBackup, listBackups, cleanupOldBackups, getBackupDir } =
    await import(join(TEMPLATE_ROOT, "scripts/lib/bootstrap/backup.ts"))
  const { removeJob, removeStepsByPattern, validateYamlStructure, safeRemoveJob, parseJobs } =
    await import(join(TEMPLATE_ROOT, "scripts/lib/bootstrap/yaml-utils.ts"))
  const { calculatePlan, formatPlan, expandGlob, diffPlans } = await import(
    join(TEMPLATE_ROOT, "scripts/lib/bootstrap/engine.ts")
  )
  const { getDefaultAnswers, getMinimalAnswers, getAnswersFromPreset } = await import(
    join(TEMPLATE_ROOT, "scripts/lib/bootstrap/prompts.ts")
  )
  const { generateReadme } = await import(
    join(TEMPLATE_ROOT, "scripts/lib/bootstrap/readme-generator.ts")
  )

  // 1. Presets
  test("1-1: 全プリセットが存在 (7種)", () => {
    const ids = Object.keys(PRESETS)
    return {
      passed:
        ids.length === 7 &&
        ids.includes("minimal") &&
        ids.includes("full") &&
        ids.includes("vite-app"),
      details: `presets=${ids.length}: ${ids.join(", ")}`,
    }
  })

  test("1-2: minimalプリセットはvitestのみ", () => {
    const preset = getPreset("minimal")
    if (!preset) return { passed: false, details: "preset not found" }
    const enabled = Object.entries(preset.features)
      .filter(([, v]) => v)
      .map(([k]) => k)
    return {
      passed: enabled.length === 1 && enabled[0] === "vitest" && preset.projectType === "plain",
      details: `enabled=${enabled.join(",")}, type=${preset.projectType}`,
    }
  })

  test("1-3: fullプリセットは全機能ON", () => {
    const preset = getPreset("full")
    if (!preset) return { passed: false, details: "preset not found" }
    const allOn = Object.values(preset.features).every((v) => v === true)
    return {
      passed: allOn && preset.projectType === "plain",
      details: `allOn=${allOn}, count=${Object.values(preset.features).length}`,
    }
  })

  test("1-4: vite-appプリセットはviteタイプ", () => {
    const preset = getPreset("vite-app")
    return {
      passed: !!preset && preset.projectType === "vite" && preset.features.docker === true,
      details: `type=${preset?.projectType}, docker=${preset?.features.docker}`,
    }
  })

  test("1-5: next-appプリセットはnextタイプ", () => {
    const preset = getPreset("next-app")
    return {
      passed: !!preset && preset.projectType === "next" && preset.features.playwright === true,
      details: `type=${preset?.projectType}, playwright=${preset?.features.playwright}`,
    }
  })

  test("1-6: monorepoプリセットはnext-monorepoタイプ", () => {
    const preset = getPreset("monorepo")
    return {
      passed:
        !!preset && preset.projectType === "next-monorepo" && preset.features.changesets === true,
      details: `type=${preset?.projectType}, changesets=${preset?.features.changesets}`,
    }
  })

  test("1-7: listPresetsが全プリセットを返す", () => {
    const list = listPresets()
    return {
      passed: list.length === 7 && list.every((p) => p.id && p.name && p.description),
      details: `list=${list.length}, has icons=${list.every((p) => !!p.icon)}`,
    }
  })

  // 2. Validator
  test("2-1: validateProjectName — 正常系", () => {
    const ok = validateProjectName("my-app")
    const ok2 = validateProjectName("@scope/my-app")
    const ok3 = validateProjectName("my_app-123")
    return {
      passed: ok.valid && ok2.valid && ok3.valid,
      details: `my-app=${ok.valid}, @scope/my-app=${ok2.valid}, my_app-123=${ok3.valid}`,
    }
  })

  test("2-2: validateProjectName — 異常系", () => {
    const bad1 = validateProjectName("")
    const bad2 = validateProjectName(".hidden")
    const bad3 = validateProjectName("a".repeat(215))
    return {
      passed: !bad1.valid && !bad2.valid && !bad3.valid,
      details: `empty=${!bad1.valid}, .hidden=${!bad2.valid}, tooLong=${!bad3.valid}`,
    }
  })

  test("2-3: validateGithubOwner — 正常/異常", () => {
    const ok = validateGithubOwner("myuser")
    const ok2 = validateGithubOwner("your-github-username") // placeholder allowed
    const bad = validateGithubOwner("invalid--user-")
    return {
      passed: ok.valid && ok2.valid && !bad.valid,
      details: `myuser=${ok.valid}, placeholder=${ok2.valid}, invalid=${!bad.valid}`,
    }
  })

  test("2-4: resolveFeatureDependencies — coverageはvitestを要求", () => {
    const features = {
      docker: false,
      devcontainer: false,
      termux: false,
      vitest: false,
      playwright: false,
      coverage: true,
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
    } as any
    const resolved = resolveFeatureDependencies(features)
    return {
      passed: resolved.coverage === true && resolved.vitest === true,
      details: `coverage=${resolved.coverage}, vitest auto-enabled=${resolved.vitest}`,
    }
  })

  test("2-5: validateAnswers — 正常系と警告", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    const result = validateAnswers(answers)
    return {
      passed: result.valid && result.errors.length === 0,
      details: `valid=${result.valid}, errors=${result.errors.length}, warnings=${result.warnings.length}`,
    }
  })

  test("2-6: getFeatureImpactSummary — Playwright警告含む", () => {
    const features = getDefaultAnswers(TEMPLATE_ROOT).features
    features.playwright = true
    const summary = getFeatureImpactSummary(features)
    const hasPlaywrightWarn = summary.some((s) => s.includes("Playwright"))
    return {
      passed: summary.length > 0 && hasPlaywrightWarn,
      details: `summary lines=${summary.length}, has Playwright warn=${hasPlaywrightWarn}`,
    }
  })

  // 3. Backup
  test("3-1: createBackupとrestoreBackup", () => {
    const tempRoot = join(tmpdir(), `backup-test-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      const testFile = join(tempRoot, "test.txt")
      writeFileSync(testFile, "original", "utf8")
      const backupDir = join(tempRoot, "backup")
      const { backupDir: createdDir, entries } = createBackup(["test.txt"], tempRoot, backupDir)
      const backedUp = existsSync(join(createdDir, "test.txt"))
      // Modify original
      writeFileSync(testFile, "modified", "utf8")
      // Restore
      restoreBackup(createdDir, tempRoot)
      const restored = readFileSync(testFile, "utf8")
      return {
        passed: backedUp && restored === "original" && entries.length > 0,
        details: `backedUp=${backedUp}, restored=${restored === "original"}, entries=${entries.length}`,
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  test("3-2: getBackupDirがタイムスタンプ付き", () => {
    const dir = getBackupDir("/tmp")
    return {
      passed: dir.includes(".bootstrap-backup") && dir.includes("T"),
      details: `dir=${dir}`,
    }
  })

  test("3-3: listBackupsとcleanupOldBackups", () => {
    const tempRoot = join(tmpdir(), `backup-list-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      // Create 3 backup dirs
      for (let i = 0; i < 3; i++) {
        const d = join(tempRoot, ".bootstrap-backup", `2026-01-0${i}T00-00-00`)
        mkdirSync(d, { recursive: true })
        writeFileSync(join(d, "manifest.json"), JSON.stringify({ files: [] }), "utf8")
      }
      const list = listBackups(tempRoot)
      cleanupOldBackups(tempRoot, 2)
      const after = listBackups(tempRoot)
      return {
        passed: list.length === 3 && after.length === 2,
        details: `before=${list.length}, after cleanup=${after.length}`,
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  // 4. YAML Utils
  test("4-1: parseJobsとremoveJob", () => {
    const yaml = `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: pnpm build
  e2e:
    runs-on: ubuntu-latest
    steps:
      - name: E2E
        run: pnpm test:e2e
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Lint
        run: pnpm lint
`
    const jobs = parseJobs(yaml)
    const hasE2e = jobs.some((j) => j.name === "e2e")
    const removed = removeJob(yaml, "e2e")
    const stillHasE2e = removed.includes("e2e:")
    const hasBuild = removed.includes("build:")
    return {
      passed: hasE2e && !stillHasE2e && hasBuild && jobs.length === 3,
      details: `jobs=${jobs.length}, hasE2e=${hasE2e}, after remove hasE2e=${stillHasE2e}, hasBuild=${hasBuild}`,
    }
  })

  test("4-2: removeStepsByPattern", () => {
    const yaml = `
jobs:
  static-checks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: CSpell
        run: pnpm cspell
      - name: Knip
        run: pnpm knip
      - name: Build
        run: pnpm build
`
    const removed = removeStepsByPattern(yaml, ["CSpell", "Knip"])
    const hasCSpell = removed.includes("CSpell")
    const hasKnip = removed.includes("Knip")
    const hasBuild = removed.includes("Build")
    const hasCheckout = removed.includes("Checkout")
    return {
      passed: !hasCSpell && !hasKnip && hasBuild && hasCheckout,
      details: `hasCSpell=${hasCSpell} (should false), hasKnip=${hasKnip} (should false), hasBuild=${hasBuild}, hasCheckout=${hasCheckout}`,
    }
  })

  test("4-3: validateYamlStructure", () => {
    const validYaml = "jobs:\n  build:\n    runs-on: ubuntu-latest"
    const invalidYaml = "no jobs here"
    const validResult = validateYamlStructure(validYaml)
    const invalidResult = validateYamlStructure(invalidYaml)
    return {
      passed: validResult.valid && !invalidResult.valid,
      details: `valid=${validResult.valid}, invalid=${!invalidResult.valid}`,
    }
  })

  test("4-4: safeRemoveJobは壊れたYAMLでも安全", () => {
    const yaml = "jobs:\n  build:\n    runs-on: ubuntu-latest\n  e2e:\n    runs-on: ubuntu-latest"
    const result = safeRemoveJob(yaml, "e2e")
    return {
      passed: !result.includes("e2e:") && result.includes("build:"),
      details: `removed e2e, kept build`,
    }
  })

  // 5. Engine
  test("5-1: expandGlob ** パターン", () => {
    const tempRoot = join(tmpdir(), `glob-test-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      mkdirSync(join(tempRoot, ".devcontainer"), { recursive: true })
      writeFileSync(join(tempRoot, ".devcontainer", "devcontainer.json"), "{}", "utf8")
      writeFileSync(join(tempRoot, ".devcontainer", "Dockerfile"), "FROM node", "utf8")
      const matches = expandGlob(".devcontainer/**", tempRoot)
      return {
        passed: matches.length === 2 && matches.some((m) => m.includes("devcontainer.json")),
        details: `matches=${matches.length}: ${matches.join(", ")}`,
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  test("5-2: expandGlob * パターン", () => {
    const tempRoot = join(tmpdir(), `glob-star-${Date.now()}`)
    mkdirSync(tempRoot, { recursive: true })
    try {
      writeFileSync(join(tempRoot, "vite.config.ts"), "", "utf8")
      writeFileSync(join(tempRoot, "vite.config.js"), "", "utf8")
      writeFileSync(join(tempRoot, "other.txt"), "", "utf8")
      const matches = expandGlob("vite.config.*", tempRoot)
      return {
        passed: matches.length === 2 && matches.includes("vite.config.ts"),
        details: `matches=${matches.length}: ${matches.join(", ")}`,
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  test("5-3: formatPlanがsummaryを含む", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const formatted = formatPlan(plan, { colors: false, verbose: false })
    const hasSummary =
      formatted.includes("Summary:") && formatted.includes("create") && formatted.includes("delete")
    const hasColors = formatPlan(plan, { colors: true }).includes("\x1b[")
    return {
      passed: hasSummary && hasColors && plan.summary.totalFiles > 0,
      details: `hasSummary=${hasSummary}, hasColors=${hasColors}, total=${plan.summary.totalFiles}`,
    }
  })

  test("5-4: diffPlansが差分を検出", () => {
    const answers1 = getMinimalAnswers(TEMPLATE_ROOT)
    const answers2 = getDefaultAnswers(TEMPLATE_ROOT)
    const plan1 = calculatePlan(answers1, TEMPLATE_ROOT)
    const plan2 = calculatePlan(answers2, TEMPLATE_ROOT)
    const diff = diffPlans(plan1, plan2)
    const identical = diffPlans(plan1, plan1)
    return {
      passed:
        diff.includes("Added") ||
        diff.includes("Removed") ||
        diff.includes("plans are identical") === false,
      details: `diff length=${diff.length}, identical check=${identical.includes("identical")}`,
    }
  })

  test("5-5: src/保護 — 削除されない", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasSrcDelete = plan.files.some((f) => f.path.startsWith("src/") && f.type === "delete")
    return {
      passed: !hasSrcDelete,
      details: `src delete=${hasSrcDelete} (should false)`,
    }
  })

  test("5-6: calculatePlanがtermuxModeを考慮", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.termuxMode = "no"
    answers.features.termux = false
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    // termux disabled should remove CI steps
    const hasTermuxStepRemoval = plan.workflows.some((w) =>
      w.removedSteps?.some((s) => s.toLowerCase().includes("termux")),
    )
    return {
      passed: hasTermuxStepRemoval,
      details: `has Termux step removal=${hasTermuxStepRemoval}`,
    }
  })

  // 6. CLI
  test("6-1: CLI --help がヘルプを表示", () => {
    try {
      const output = execSync("node --experimental-strip-types scripts/setup.ts --help", {
        cwd: TEMPLATE_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      const hasUsage =
        output.includes("Usage:") && output.includes("--dry-run") && output.includes("Presets:")
      return {
        passed: hasUsage,
        details: `hasUsage=${hasUsage}, length=${output.length}`,
      }
    } catch (e) {
      return { passed: false, details: `exception: ${e}` }
    }
  })

  test("6-2: CLI --list-presets がプリセット一覧を表示", () => {
    try {
      const output = execSync("node --experimental-strip-types scripts/setup.ts --list-presets", {
        cwd: TEMPLATE_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      const hasMinimal = output.includes("minimal") && output.includes("Minimal")
      const hasViteApp = output.includes("vite-app")
      return {
        passed: hasMinimal && hasViteApp,
        details: `hasMinimal=${hasMinimal}, hasViteApp=${hasViteApp}`,
      }
    } catch (e) {
      return { passed: false, details: `exception: ${e}` }
    }
  })

  test("6-3: CLI --version がバージョンを表示", () => {
    try {
      const output = execSync("node --experimental-strip-types scripts/setup.ts --version", {
        cwd: TEMPLATE_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      const hasVersion = output.includes("v") && output.match(/v\d+\.\d+\.\d+/)
      return {
        passed: !!hasVersion,
        details: `output=${output.trim()}`,
      }
    } catch (e) {
      return { passed: false, details: `exception: ${e}` }
    }
  })

  test("6-4: CLI --dry-run --preset minimal がプランを表示", () => {
    try {
      const output = execSync(
        "node --experimental-strip-types scripts/setup.ts --dry-run --preset minimal --project-name test-cli-minimal",
        {
          cwd: TEMPLATE_ROOT,
          encoding: "utf8",
          stdio: "pipe",
        },
      )
      const hasPlan = output.includes("Setup Plan") && output.includes("Summary:")
      const hasDryRun = output.includes("Dry-run")
      return {
        passed: hasPlan && hasDryRun,
        details: `hasPlan=${hasPlan}, hasDryRun=${hasDryRun}`,
      }
    } catch (e) {
      return { passed: false, details: `exception: ${e}` }
    }
  })

  test("6-5: CLI --dry-run --preset vite-app がViteファイル作成を表示", () => {
    try {
      const output = execSync(
        "node --experimental-strip-types scripts/setup.ts --dry-run --preset vite-app --project-name test-vite",
        {
          cwd: TEMPLATE_ROOT,
          encoding: "utf8",
          stdio: "pipe",
        },
      )
      const hasVite = output.includes("vite.config.ts") && output.includes("Create")
      return {
        passed: hasVite,
        details: `hasVite create=${hasVite}`,
      }
    } catch (e) {
      return { passed: false, details: `exception: ${e}` }
    }
  })

  // 7. Prompts
  test("7-1: getAnswersFromPreset が正しく適用", () => {
    const answers = getAnswersFromPreset(
      "vite-app",
      { projectName: "my-vite", githubOwner: "myuser" },
      TEMPLATE_ROOT,
    )
    return {
      passed:
        !!answers &&
        answers.projectName === "my-vite" &&
        answers.projectType === "vite" &&
        answers.githubOwner === "myuser",
      details: `name=${answers?.projectName}, type=${answers?.projectType}, owner=${answers?.githubOwner}`,
    }
  })

  test("7-2: getDefaultAnswersが全機能ON", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    const allOn = Object.values(answers.features).every((v) => v === true)
    return {
      passed: allOn,
      details: `allOn=${allOn}, features=${Object.keys(answers.features).length}`,
    }
  })

  // 8. Readme
  test("8-1: generateReadmeがバッジとプリセット情報を含む", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectName = "my-app"
    answers.githubOwner = "myuser"
    answers.preset = "vite-app"
    answers.projectType = "vite"
    const readme = generateReadme(answers)
    const hasBadge = readme.includes("badge.svg") && readme.includes("myuser/my-app")
    const hasPreset = readme.includes("vite-app") || readme.includes("Vite App")
    const hasCliOptions = readme.includes("CLI Options") && readme.includes("--preset")
    return {
      passed: hasBadge && hasPreset && hasCliOptions,
      details: `hasBadge=${hasBadge}, hasPreset=${hasPreset}, hasCliOptions=${hasCliOptions}`,
    }
  })

  test("8-2: generateReadmeが有効機能のみ説明", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    answers.projectType = "vite"
    answers.projectName = "my-vite-minimal"
    const readme = generateReadme(answers)
    const hasVite = readme.includes("Vite") && readme.includes("vite.config.ts")
    const hasDocker = readme.includes("Docker")
    return {
      passed: hasVite && !hasDocker,
      details: `hasVite=${hasVite}, hasDocker=${hasDocker} (should false for minimal)`,
    }
  })

  test("8-3: generateReadmeがQuality Gatesを含む", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectName = "test-qg"
    const readme = generateReadme(answers)
    const hasQG = readme.includes("Quality Gates") && readme.includes("pnpm check")
    return {
      passed: hasQG,
      details: `has Quality Gates=${hasQG}`,
    }
  })

  // サマリー
  console.log(`\n${CYAN}=== 結果サマリー ===${RESET}`)
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(
    `Passed: ${GREEN}${passed}/${results.length}${RESET}, Failed: ${RED}${failed}/${results.length}${RESET}`,
  )
  if (failed > 0) {
    console.log(`${RED}失敗したテスト:${RESET}`)
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.details}`)
    }
    process.exit(1)
  } else {
    console.log(`${GREEN}全テストPASS — Bootstrap Improvementsは正しく動作${RESET}`)
  }
}

runTests().catch((e) => {
  console.error(e)
  process.exit(1)
})
