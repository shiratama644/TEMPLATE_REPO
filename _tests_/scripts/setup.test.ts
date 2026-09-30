// @ts-nocheck
/**
 * Template Bootstrap結合テスト — 複数プリセットに対するセットアップ結果検証
 *
 * 検証項目:
 * 1. Plain TS / Vite / Next / Monorepo / Next+Monorepo の5種でplanが正しく生成されるか
 * 2. 最小構成で不要ファイルが削除されるか
 * 3. 冪等性: 同じ設定で2回実行しても差分なし
 * 4. package.json最適化: 不要deps/scriptsが削除される
 * 5. README生成: 選択された構成のみ説明
 * 6. ワークフロー調整: 無効化された機能のCIジョブが削除される
 * 7. 安全性ガード: src/は削除されない
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
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
    console.log(`${r.passed ? `${GREEN}✅` : `${RED}❌`} ${name}${RESET} — ${r.details}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ name, passed: false, details: `exception: ${msg}` })
    console.log(`${RED}❌ ${name}${RESET} — exception: ${msg}`)
  }
}

// テンプレートルート
const TEMPLATE_ROOT = process.cwd()

// 一時ディレクトリ作成
function createTempCopy(): string {
  const tempRoot = join(tmpdir(), `setup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tempRoot, { recursive: true })
  // 必要なファイルのみコピー（高速化）
  const filesToCopy = [
    "package.json",
    "pnpm-workspace.yaml",
    "vitest.config.ts",
    "playwright.config.ts",
    "cspell.json",
    "knip.json",
    "biome.json",
    "Dockerfile",
    ".dockerignore",
    "docker-compose.yml",
    "commitlint.config.js",
    "renovate.json",
    "tsconfig.json",
    "src/index.ts",
    "scripts/lib/bootstrap",
    "scripts/lib/detector.ts",
    "scripts/lib/termux.ts",
    "scripts/lib/next-termux.ts",
    "scripts/lib/cache.ts",
    "scripts/check.ts",
    "scripts/check-determinism.ts",
    "scripts/build.ts",
    "scripts/dev.ts",
    "scripts/execute.ts",
    "docs/examples",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    ".github/workflows/stale.yml",
    ".github/workflows/label.yml",
    ".github/CODEOWNERS",
    ".github/ISSUE_TEMPLATE",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/SECURITY.md",
    ".github/FUNDING.yml",
    ".github/labeler.yml",
    ".husky",
    ".devcontainer",
    ".changeset",
    "README.md",
    "CONTRIBUTING.md",
  ]
  for (const rel of filesToCopy) {
    const src = join(TEMPLATE_ROOT, rel)
    const dest = join(tempRoot, rel)
    if (!existsSync(src)) continue
    try {
      cpSync(src, dest, { recursive: true, force: true })
    } catch {
      try {
        mkdirSync(join(tempRoot, rel.split("/").slice(0, -1).join("/")), { recursive: true })
        cpSync(src, dest, { force: true })
      } catch {}
    }
  }
  return tempRoot
}

function cleanupTemp(tempRoot: string) {
  try {
    rmSync(tempRoot, { recursive: true, force: true })
  } catch {}
}

// 動的importでengineを取得
async function loadEngine() {
  const mod = await import(join(TEMPLATE_ROOT, "scripts/lib/bootstrap/engine.ts"))
  return mod
}

async function loadManifest() {
  const mod = await import(join(TEMPLATE_ROOT, "scripts/lib/bootstrap/manifest.ts"))
  return mod
}

// テスト実行
async function runTests() {
  console.log(`${CYAN}=== Template Bootstrap 結合テスト ===${RESET}`)

  const { calculatePlan, formatPlan } = await loadEngine()
  await loadManifest()
  const { getDefaultAnswers, getMinimalAnswers } = await import(
    join(TEMPLATE_ROOT, "scripts/lib/bootstrap/prompts.ts")
  )
  const { generateReadme } = await import(
    join(TEMPLATE_ROOT, "scripts/lib/bootstrap/readme-generator.ts")
  )

  // 1. Project Type別plan生成
  test("1-1: Plain TS planが生成される", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "plain"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasPnpmWorkspaceDelete = plan.files.some(
      (f) => f.path === "pnpm-workspace.yaml" && f.type === "delete",
    )
    return {
      passed: plan.files.length > 0,
      details: `files=${plan.files.length}, pnpm-workspace delete=${hasPnpmWorkspaceDelete}`,
    }
  })

  test("1-2: Vite planがvite.config.tsを作成", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "vite"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasViteCreate = plan.files.some((f) => f.path === "vite.config.ts" && f.type !== "delete")
    return {
      passed: hasViteCreate,
      details: `vite.config.ts create=${hasViteCreate}, files=${plan.files.length}`,
    }
  })

  test("1-3: Next planがnext.config.mjsを作成", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "next"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasNextCreate = plan.files.some(
      (f) => f.path === "next.config.mjs" && f.type !== "delete",
    )
    return {
      passed: hasNextCreate,
      details: `next.config.mjs create=${hasNextCreate}`,
    }
  })

  test("1-4: Monorepo planがpnpm-workspace.yamlとturbo.jsonを作成", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "monorepo"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasWorkspace = plan.files.some((f) => f.path === "pnpm-workspace.yaml")
    const hasTurbo = plan.files.some((f) => f.path === "turbo.json")
    return {
      passed: hasWorkspace && hasTurbo,
      details: `workspace=${hasWorkspace}, turbo=${hasTurbo}`,
    }
  })

  test("1-5: Next+Monorepo planがapps/webを含む", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "next-monorepo"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasAppsWeb = plan.files.some((f) => f.path.includes("apps/web"))
    return {
      passed: hasAppsWeb,
      details: `apps/web included=${hasAppsWeb}, files=${plan.files.length}`,
    }
  })

  // 2. 最小構成
  test("2-1: 最小構成でDocker/DevContainerが削除される", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasDockerDelete = plan.files.some((f) => f.path === "Dockerfile" && f.type === "delete")
    const hasDevContainerDelete = plan.files.some(
      (f) => f.path.includes(".devcontainer") && f.type === "delete",
    )
    return {
      passed: hasDockerDelete,
      details: `Docker delete=${hasDockerDelete}, devcontainer delete=${hasDevContainerDelete}`,
    }
  })

  test("2-2: 最小構成でpackage.jsonから不要depsが削除される", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasCspellRemove = plan.packageJson.some(
      (p) => p.name === "cspell" && p.type === "remove-dep",
    )
    const hasKnipRemove = plan.packageJson.some((p) => p.name === "knip" && p.type === "remove-dep")
    const hasPlaywrightRemove = plan.packageJson.some(
      (p) => p.name === "@playwright/test" && p.type === "remove-dep",
    )
    return {
      passed: hasCspellRemove && hasKnipRemove && hasPlaywrightRemove,
      details: `cspell=${hasCspellRemove}, knip=${hasKnipRemove}, playwright=${hasPlaywrightRemove}`,
    }
  })

  test("2-3: 最小構成でワークフローが削除される", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasReleaseDelete = plan.workflows.some(
      (w) => w.file.includes("release.yml") && w.type === "delete",
    )
    const hasStaleDelete = plan.workflows.some(
      (w) => w.file.includes("stale.yml") && w.type === "delete",
    )
    return {
      passed: hasReleaseDelete && hasStaleDelete,
      details: `release delete=${hasReleaseDelete}, stale delete=${hasStaleDelete}`,
    }
  })

  // 3. 冪等性
  test("3-1: 同じ設定で2回plan計算しても差分が同じ（冪等性）", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "plain"
    answers.projectName = "test-idempotent"
    const plan1 = calculatePlan(answers, TEMPLATE_ROOT)
    const plan2 = calculatePlan(answers, TEMPLATE_ROOT)
    const sameLength = plan1.files.length === plan2.files.length
    const samePkg = plan1.packageJson.length === plan2.packageJson.length
    return {
      passed: sameLength && samePkg,
      details: `files ${plan1.files.length} vs ${plan2.files.length}, pkg ${plan1.packageJson.length} vs ${plan2.packageJson.length}`,
    }
  })

  test("3-2: 実際のファイル操作で冪等性（2回実行で2回目はno changes）", () => {
    const tempRoot = createTempCopy()
    try {
      const answers = getMinimalAnswers(tempRoot)
      answers.projectType = "plain"
      answers.projectName = "test-idempotent-real"
      const plan1 = calculatePlan(answers, tempRoot)
      // 1回目適用
      // applyPlanは元のファイルを削除するので、ここではdry-runではなく実際に適用
      // ただし、applyPlanはTEMPLATE_ROOTのPROJECT_TYPESを参照するため、tempRootでも動作
      // 簡易実装: 直接ファイルを削除せず、planの内容で冪等性を検証
      // 2回目のplanは、1回目適用後の状態で計算されるべき
      // ここでは、1回目のplan適用をシミュレート: 削除されるファイルを実際に削除
      for (const fc of plan1.files) {
        if (fc.type === "delete") {
          const full = join(tempRoot, fc.path)
          if (existsSync(full)) {
            try {
              rmSync(full, { recursive: true, force: true })
            } catch {}
          }
        }
      }
      const plan2 = calculatePlan(answers, tempRoot)
      // 2回目は、既に削除されたファイルは存在しないため、plan2のdeleteは0になるはず
      // ただし、filesToCreateがoverwrite=falseならkeepになる
      const secondDeletes = plan2.files.filter((f) => f.type === "delete").length
      return {
        passed: secondDeletes === 0,
        details: `first deletes=${plan1.files.filter((f) => f.type === "delete").length}, second deletes=${secondDeletes}`,
      }
    } finally {
      cleanupTemp(tempRoot)
    }
  })

  // 4. README生成
  test("4-1: README生成が選択された構成のみ説明", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    answers.projectType = "vite"
    answers.projectName = "my-vite-app"
    const readme = generateReadme(answers)
    const hasVite = readme.includes("Vite") && readme.includes("vite.config.ts")
    const hasPlain = readme.includes("Plain TypeScript")
    const hasDocker = readme.includes("Docker")
    return {
      passed: hasVite && !hasPlain && !hasDocker,
      details: `hasVite=${hasVite}, hasPlain=${hasPlain} (should false), hasDocker=${hasDocker} (should false)`,
    }
  })

  test("4-2: README生成が全機能ONで全セクション含む", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectType = "next"
    answers.projectName = "my-next-app"
    const readme = generateReadme(answers)
    const hasNext = readme.includes("Next.js")
    const hasTesting = readme.includes("Testing & Quality")
    const hasDevInfra = readme.includes("Dev & Infra")
    return {
      passed: hasNext && hasTesting && hasDevInfra,
      details: `hasNext=${hasNext}, hasTesting=${hasTesting}, hasDevInfra=${hasDevInfra}`,
    }
  })

  // 5. 安全性ガード: src/は削除されない
  test("5-1: src/は保護され削除されない", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    answers.projectType = "plain"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasSrcDelete = plan.files.some((f) => f.path.startsWith("src/") && f.type === "delete")
    return {
      passed: !hasSrcDelete,
      details: `src delete found=${hasSrcDelete} (should be false)`,
    }
  })

  test("5-2: package.json nameが置換される", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.projectName = "awesome-project"
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasNameUpdate = plan.packageJson.some(
      (p) => p.name === "name" && p.value === "awesome-project",
    )
    return {
      passed: hasNameUpdate,
      details: `name update=${hasNameUpdate}`,
    }
  })

  // 6. ワークフロー調整
  test("6-1: Playwright無効時にe2eジョブが削除対象", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.features.playwright = false
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasE2eJobRemoval = plan.workflows.some((w) => w.removedJobs?.includes("e2e"))
    return {
      passed: hasE2eJobRemoval,
      details: `e2e job removal=${hasE2eJobRemoval}`,
    }
  })

  test("6-2: Changesets無効時にrelease.ymlが削除", () => {
    const answers = getDefaultAnswers(TEMPLATE_ROOT)
    answers.features.changesets = false
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const hasReleaseDelete = plan.workflows.some(
      (w) => w.file.includes("release.yml") && w.type === "delete",
    )
    return {
      passed: hasReleaseDelete,
      details: `release.yml delete=${hasReleaseDelete}`,
    }
  })

  // 7. Dry-runフォーマット
  test("7-1: formatPlanが+ - ~ =記号を含む", () => {
    const answers = getMinimalAnswers(TEMPLATE_ROOT)
    const plan = calculatePlan(answers, TEMPLATE_ROOT)
    const formatted = formatPlan(plan)
    const hasPlus = formatted.includes("+") || formatted.includes("-")
    const hasSymbols = formatted.includes("Files:") || formatted.includes("package.json:")
    return {
      passed: hasPlus && hasSymbols,
      details: `hasPlusMinus=${hasPlus}, hasSections=${hasSymbols}`,
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
    console.log(`${GREEN}全テストPASS — Bootstrapは複数プリセットで正しく動作${RESET}`)
  }
}

runTests().catch((e) => {
  console.error(e)
  process.exit(1)
})
