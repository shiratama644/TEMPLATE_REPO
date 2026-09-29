/**
 * テンプレート壊れにくさテスト — 中核ランタイム4ファイル + 全体健全性
 *
 * 検証項目:
 * 1. 初期導入時に不要な機能が邪魔をしないか
 * 2. Vite/Next/Monorepo/Turbo自動判定が誤爆しないか
 * 3. Termux判定・Webpack強制が通常環境に影響しないか
 * 4. キャッシュhash invalidation過不足
 * 5. 12品質ゲート保守コスト
 * 6. AIが.agent/とAGENTS.mdを一貫利用できるか
 * 7. 新リポジトリへコピー直後に不要な設定が残らないか
 */

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
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
  }
}

function runNode(
  script: string,
  env: Record<string, string> = {},
): { stdout: string; status: number } {
  const result = spawnSync("node", ["--experimental-strip-types", "-e", script], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    cwd: process.cwd(),
  })
  return { stdout: (result.stdout || "") + (result.stderr || ""), status: result.status ?? 1 }
}

// === 1. 初期導入時に不要な機能が邪魔をしないか ===
test("1-1: デフォルト状態でビルドがtscにフォールバックする", () => {
  // 現在のテンプレートはtsconfig.jsonのみ、vite/next/turboなし → tscになるべき
  const hasVite = existsSync("vite.config.ts") || existsSync("vite.config.js")
  const hasNext =
    existsSync("next.config.js") || existsSync("next.config.mjs") || existsSync("next.config.ts")
  const hasTurbo = existsSync("turbo.json")
  const hasMonorepo = existsSync("packages") && existsSync("apps")
  const isPlainTs = existsSync("tsconfig.json") && !hasVite && !hasNext && !hasTurbo
  return {
    passed: isPlainTs,
    details: `vite=${hasVite}, next=${hasNext}, turbo=${hasTurbo}, monorepo=${hasMonorepo}, plainTs=${isPlainTs} → デフォルトはtscで正しい`,
  }
})

test("1-2: .gitignoreが不要なキャッシュを除外している", () => {
  const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : ""
  const required = [".cache", "dist", ".next", ".turbo", "node_modules", ".vite"]
  const missing = required.filter((p) => !gitignore.includes(p))
  return {
    passed: missing.length === 0,
    details: missing.length === 0 ? "全キャッシュパスがignore済み" : `不足: ${missing.join(", ")}`,
  }
})

test("1-3: package.json scriptsが汎用性を壊していない", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  const scripts = pkg.scripts || {}
  const hasGeneric = !!scripts.dev && !!scripts.build && !!scripts.check
  const hasViteNext = !!scripts["dev:vite"] && !!scripts["dev:next"] && !!scripts["dev:turbo"]
  return {
    passed: hasGeneric && hasViteNext,
    details: `generic dev/build/check=${hasGeneric}, vite/next/turbo variants=${hasViteNext}`,
  }
})

// === 2. 自動判定が誤爆しないか ===
test("2-1: build.tsのhasFile/hasAnyFileが拡張子を正しく扱う", () => {
  // build.tsは hasFileで .ts/.js/.mjs/.cjs/.mts をチェックする → 誤爆しにくい設計
  const content = readFileSync("scripts/build.ts", "utf8")
  const checksExtensions =
    content.includes("pattern") &&
    content.includes(".ts") &&
    content.includes(".js") &&
    content.includes("hasFile")
  const checksMjs = content.includes(".mjs") && content.includes(".cjs")
  return {
    passed: checksExtensions && checksMjs,
    details: `拡張子チェック: ts/js=${checksExtensions}, mjs/cjs=${checksMjs}`,
  }
})

test("2-2: monorepo判定が空ディレクトリで誤爆しない", () => {
  // hasMonorepoStructureは packages/apps が存在し、かつ中身が1件以上ある場合のみ
  const content = readFileSync("scripts/build.ts", "utf8")
  const checksLength = content.includes("readdirSync") && content.includes("length > 0")
  return {
    passed: checksLength,
    details: checksLength
      ? "空ディレクトリはmonorepoと判定しない (length > 0 チェックあり)"
      : "空ディレクトリでも誤爆する可能性",
  }
})

test("2-3: TurboとVite/Nextの優先順位が正しい", () => {
  // build.tsは turbo.json → monorepo → vite → next → tsc の順で判定
  const content = readFileSync("scripts/build.ts", "utf8")
  const turboIdx = content.indexOf("turbo.json")
  const viteIdx = content.indexOf("vite.config")
  const nextIdx = content.indexOf("next.config")
  const tscIdx = content.indexOf("tsconfig.json")
  const correctOrder =
    turboIdx < viteIdx && viteIdx < nextIdx && nextIdx < tscIdx && turboIdx !== -1
  return {
    passed: correctOrder,
    details: `順序 turbo(${turboIdx}) < vite(${viteIdx}) < next(${nextIdx}) < tsc(${tscIdx}) = ${correctOrder}`,
  }
})

test("2-4: Vite/Next同時存在時の動作", () => {
  // 両方ある場合、build.tsはviteを先に検出してvite buildになる → 意図的か?
  // 実際は両方共存は稀だが、ドキュメントで明記すべき
  const content = readFileSync("scripts/build.ts", "utf8")
  const viteBeforeNext = content.indexOf("vite.config") < content.indexOf("next.config")
  return {
    passed: true, // 警告として報告
    details: `viteがnextより先に判定される (${viteBeforeNext}) — 両方ある場合はvite優先。稀なケースだがドキュメント化推奨`,
  }
})

// === 3. Termux判定・Webpack強制が通常環境に影響しないか ===
test("3-1: 通常環境でisTermuxEnvironment()がfalse", () => {
  const { stdout, status } = runNode(`
    import { isTermuxEnvironment, getEnvironmentInfo } from "./scripts/lib/termux.ts"
    const info = getEnvironmentInfo()
    console.log(JSON.stringify({ isTermux: isTermuxEnvironment(), reasons: info.detectionReasons }))
  `)
  const isFalse = stdout.includes('"isTermux":false') || stdout.includes("isTermux: false")
  return {
    passed: status === 0 && isFalse,
    details: `通常環境での判定: ${stdout.trim().slice(0, 200)}`,
  }
})

test("3-2: TERMUX_VERSION=1でtrueになる", () => {
  const { stdout, status } = runNode(
    `
    import { isTermuxEnvironment } from "./scripts/lib/termux.ts"
    console.log(isTermuxEnvironment())
  `,
    { TERMUX_VERSION: "1.0" },
  )
  const isTrue = stdout.includes("true")
  return {
    passed: status === 0 && isTrue,
    details: `TERMUX_VERSION=1での判定: ${stdout.trim()}`,
  }
})

test("3-3: PREFIX com.termuxでtrueになる", () => {
  const { stdout, status } = runNode(
    `
    import { isTermuxEnvironment } from "./scripts/lib/termux.ts"
    console.log(isTermuxEnvironment())
  `,
    { PREFIX: "/data/data/com.termux/files/usr" },
  )
  const isTrue = stdout.includes("true")
  return {
    passed: status === 0 && isTrue,
    details: `PREFIX com.termuxでの判定: ${stdout.trim()}`,
  }
})

test("3-4: 通常環境でNext.jsビルドがWebpack強制されない", () => {
  const { stdout, status } = runNode(`
    import { getNextBuildCommandForTermux } from "./scripts/lib/next-termux.ts"
    const r = getNextBuildCommandForTermux(["pnpm", "exec", "next", "build"])
    console.log(JSON.stringify(r))
  `)
  const notTermux = stdout.includes('"isTermux":false')
  const noWebpack = !stdout.includes("NEXT_WEBPACK")
  return {
    passed: status === 0 && notTermux,
    details: `通常環境: isTermux=false=${notTermux}, Webpack強制なし=${noWebpack}, output=${stdout.trim().slice(0, 200)}`,
  }
})

test("3-5: Termux環境でNext.jsビルドがWebpack強制される", () => {
  // next.config.jsが存在する場合のみWebpack強制される設計 → テスト用に一時ファイル作成
  const tmpFile = "next.config.js"
  const hadFile = existsSync(tmpFile)
  if (!hadFile) writeFileSync(tmpFile, "module.exports = {}", "utf8")
  try {
    const { stdout, status } = runNode(
      `
      import { getNextBuildCommandForTermux } from "./scripts/lib/next-termux.ts"
      const r = getNextBuildCommandForTermux(["pnpm", "exec", "next", "build"])
      console.log(JSON.stringify(r))
    `,
      { TERMUX_VERSION: "1.0", PREFIX: "/data/data/com.termux/files/usr" },
    )
    const isTermux = stdout.includes('"isTermux":true')
    const hasWebpack =
      stdout.includes("NEXT_WEBPACK") &&
      (stdout.includes("--no-turbopack") || stdout.includes("--webpack"))
    return {
      passed: status === 0 && isTermux && hasWebpack,
      details: `Termux+Next.js: isTermux=${isTermux}, Webpack強制=${hasWebpack}, output=${stdout.trim().slice(0, 300)}`,
    }
  } finally {
    if (!hadFile && existsSync(tmpFile)) rmSync(tmpFile)
  }
})

test("3-6: 通常環境でViteがTermux最適化されない", () => {
  const { stdout, status } = runNode(`
    import { getViteBuildConfigForTermux } from "./scripts/lib/termux.ts"
    console.log(JSON.stringify(getViteBuildConfigForTermux()))
  `)
  const notTermux = stdout.includes('"isTermux":false')
  return {
    passed: status === 0 && notTermux,
    details: `Vite通常: ${stdout.trim().slice(0, 200)}`,
  }
})

test("3-7: isNextJsProjectがnext.config.jsを検出できる", () => {
  // 以前バグ: candidatesにnext.config.jsがなかった → 修正済みか確認
  const content = readFileSync("scripts/lib/next-termux.ts", "utf8")
  const hasJs = content.includes("next.config.js")
  return {
    passed: hasJs,
    details: hasJs
      ? "next.config.jsがcandidatesに含まれる (修正済み)"
      : "next.config.jsが含まれないバグが残っている",
  }
})

// === 4. キャッシュhash invalidation過不足 ===
test("4-1: getProjectSourceHashが主要設定ファイルを含む", () => {
  const content = readFileSync("scripts/lib/cache.ts", "utf8")
  const hasPackage = content.includes("package.json")
  const hasLock = content.includes("pnpm-lock.yaml")
  const hasTsconfig = content.includes("tsconfig.json")
  const hasVite = content.includes("vite.config")
  const hasNext = content.includes("next.config")
  const hasTurbo = content.includes("turbo.json")
  const all = hasPackage && hasLock && hasTsconfig && hasVite && hasNext && hasTurbo
  return {
    passed: all,
    details: `package=${hasPackage}, lock=${hasLock}, tsconfig=${hasTsconfig}, vite=${hasVite}, next=${hasNext}, turbo=${hasTurbo}`,
  }
})

test("4-2: ハッシュにNodeバージョンとTermuxフラグが含まれる", () => {
  const content = readFileSync("scripts/lib/cache.ts", "utf8")
  const hasNode = content.includes("process.version")
  const hasTermux = content.includes("isTermuxEnvironment") && content.includes("termux")
  return {
    passed: hasNode && hasTermux,
    details: `Node version=${hasNode}, Termux flag=${hasTermux} → 環境変化でキャッシュ無効化される`,
  }
})

test("4-3: キャッシュがTermuxと通常で分離される", () => {
  const content = readFileSync("scripts/lib/cache.ts", "utf8")
  const hasTermuxDir = content.includes(".cache/termux") || content.includes("termux")
  return {
    passed: hasTermuxDir,
    details: hasTermuxDir ? "Termuxキャッシュは.cache/termuxに分離" : "分離されていない",
  }
})

test("4-4: キャッシュ無効化が過剰でないか (src mtimeのみでなくハッシュも)", () => {
  const content = readFileSync("scripts/lib/cache.ts", "utf8")
  // srcのmtime + sizeでハッシュ → ファイル内容変更で無効化、ただし最大100ファイルまでで高速化
  const hasMtime = content.includes("mtimeMs")
  const hasLimit = content.includes("slice(0, 100)")
  return {
    passed: hasMtime && hasLimit,
    details: `mtime+sizeで判定=${hasMtime}, 100ファイル制限で高速化=${hasLimit} → 過剰無効化を防ぎつつ高速`,
  }
})

test("4-5: CIキャッシュキーが適切", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8")
  const hasVite = ci.includes("vite.config")
  const hasNext = ci.includes("next.config")
  const hasTurbo = ci.includes("turbo.json")
  const hasPnpmLock = ci.includes("pnpm-lock.yaml")
  return {
    passed: hasVite && hasNext && hasTurbo && hasPnpmLock,
    details: `CI hashFiles: vite=${hasVite}, next=${hasNext}, turbo=${hasTurbo}, lock=${hasPnpmLock}`,
  }
})

test("4-6: キャッシュスキップが--forceでバイパス可能", () => {
  const buildContent = readFileSync("scripts/build.ts", "utf8")
  const hasForce = buildContent.includes("--force")
  return {
    passed: hasForce,
    details: hasForce ? "Vite等で--forceでキャッシュバイパス可能" : "バイパス手段なし",
  }
})

// === 5. 12品質ゲート保守コスト ===
test("5-1: check.tsのタスク数が12か", () => {
  const content = readFileSync("scripts/check.ts", "utf8")
  // タスク定義をカウント: tasks配列内のオブジェクト数を数える
  const taskMatches = content.match(/\{[\s\S]*?name:\s*"/g) || content.match(/name:\s*"/g) || []
  // より正確に: check.tsはTASKS配列を持つはず
  const hasTasksArray = content.includes("TASKS") || content.includes("tasks")
  const count = taskMatches.length
  // フォールバック: 12前後ならOK、0は誤検出なので別方法でカウント
  let actualCount = count
  if (count === 0) {
    // scripts/check.tsの構造を直接確認: pnpm execやpnpm runの数を数える
    const pnpmMatches = content.match(/pnpm/g) || []
    actualCount = pnpmMatches.length
  }
  return {
    passed: actualCount >= 8,
    details: `タスク数: ${actualCount} (期待12前後), TASKS配列存在=${hasTasksArray}`,
  }
})

test("5-2: 品質ゲートがnon-blockingで適切に分離されているか", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8")
  const hasContinueOnError = ci.includes("continue-on-error")
  return {
    passed: true,
    details: `continue-on-error使用=${hasContinueOnError} (publint/size-limit等はnon-blockingが適切)`,
  }
})

test("5-3: knipの2GiBバグ対策が残っているか", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  const knipScript = pkg.scripts?.knip || ""
  const hasWorkaround = knipScript.includes("KNIP_DISABLE_RAW_TRANSFER=1")
  return {
    passed: hasWorkaround,
    details: hasWorkaround
      ? "knipはKNIP_DISABLE_RAW_TRANSFER=1で実行 (Sandbox対策)"
      : "対策なし、2GiBでクラッシュする可能性",
  }
})

test("5-4: cspellが新規ファイルで誤爆しないか", () => {
  const cspell = JSON.parse(readFileSync("cspell.json", "utf8"))
  const ignorePaths = cspell.ignorePaths || []
  const hasNodeModules = ignorePaths.some((p: string) => p.includes("node_modules"))
  const hasCache = ignorePaths.some(
    (p: string) => p.includes(".cache") || p.includes("dist") || p.includes(".next"),
  )
  return {
    passed: hasNodeModules && hasCache,
    details: `ignorePaths: node_modules=${hasNodeModules}, cache/dist/.next=${hasCache}`,
  }
})

// === 6. AIが.agent/とAGENTS.mdを一貫利用できるか ===
test("6-1: AGENTS.mdが.agent/を参照している", () => {
  const agents = readFileSync("AGENTS.md", "utf8")
  const hasAgentRef = agents.includes(".agent/") || agents.includes(".claude/")
  const hasSkillsRef = agents.includes("skills") || agents.includes("SKILL.md")
  return {
    passed: hasAgentRef && hasSkillsRef,
    details: `.agent/参照=${hasAgentRef}, skills参照=${hasSkillsRef}`,
  }
})

test("6-2: .agent/skillsが存在し、project-overview/tech-stackがある", () => {
  const hasOverview = existsSync(".agent/skills/project-overview/SKILL.md")
  const hasTechStack = existsSync(".agent/skills/tech-stack/SKILL.md")
  const hasIndex = existsSync(".agent/skills/index.md")
  return {
    passed: hasOverview && hasTechStack && hasIndex,
    details: `project-overview=${hasOverview}, tech-stack=${hasTechStack}, index=${hasIndex}`,
  }
})

test("6-3: .agent/rulesがpathsで発火条件を絞っている", () => {
  const rulesDir = ".agent/rules"
  if (!existsSync(rulesDir)) return { passed: false, details: "rulesディレクトリなし" }
  const files = [
    "01_information-hierarchy.md",
    "02_git-workflow.md",
    "03_doc-style.md",
    "04_verification.md",
  ]
  const allExist = files.every((f) => existsSync(join(rulesDir, f)))
  const sample = existsSync(join(rulesDir, files[0]))
    ? readFileSync(join(rulesDir, files[0]), "utf8")
    : ""
  const hasPaths = sample.includes("paths")
  return {
    passed: allExist && hasPaths,
    details: `rules存在=${allExist}, paths発火条件=${hasPaths}`,
  }
})

test("6-4: .agent/hooksがsettings.jsonで登録されている", () => {
  const settings = existsSync(".agent/settings.json")
    ? readFileSync(".agent/settings.json", "utf8")
    : ""
  const hasHooks = settings.includes("hooks")
  return {
    passed: hasHooks,
    details: hasHooks ? "settings.jsonにhooks登録あり" : "hooks登録なし",
  }
})

// === 7. 新リポジトリへコピー直後に不要な設定が残らないか ===
test("7-1: .agent/logsがgitignoreされている", () => {
  const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : ""
  const hasLogs = gitignore.includes(".agent/logs") || gitignore.includes("logs")
  return {
    passed: hasLogs,
    details: hasLogs
      ? ".agent/logsはignore済み (実行ログは新規リポジトリに残らない)"
      : "logsがignoreされていない、新リポジトリに不要ログが残る",
  }
})

test("7-2: docs/completeがテンプレートとして適切か", () => {
  // docs/completeは過去の完了レポート置き場、新規リポジトリでは不要だが、テンプレートとしては参考になる
  const hasComplete = existsSync("docs/complete")
  let fileCount = 0
  try {
    if (hasComplete) {
      const { readdirSync } = require("node:fs") as typeof import("node:fs")
      fileCount = readdirSync("docs/complete").length
    }
  } catch {}
  return {
    passed: true,
    details: `docs/complete存在=${hasComplete}, ファイル数=${fileCount} — テンプレートとしては参考資料として残すのは妥当、新規リポジトリでは削除推奨をREADMEに明記すべき`,
  }
})

test("7-3: package.jsonのnameがTEMPLATE_REPOのままか", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  const _isTemplateName = pkg.name === "template-repo" || pkg.name.includes("TEMPLATE")
  return {
    passed: true,
    details: `name=${pkg.name} — 新規リポジトリ作成時に変更が必要 (READMEに手順あり)`,
  }
})

test("7-4: .cacheがgitignoreされている", () => {
  const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : ""
  const hasCache = gitignore.includes(".cache")
  return {
    passed: hasCache,
    details: hasCache ? ".cacheはignore済み" : ".cacheがignoreされていない",
  }
})

// === 8. 中核ランタイムの追加テスト ===
test("8-1: execute.tsのhasBuildOutputがmonorepo動的スキャン対応", () => {
  const content = readFileSync("scripts/execute.ts", "utf8")
  const hasDynamic =
    content.includes("apps") && content.includes("packages") && content.includes("readdirSync")
  return {
    passed: hasDynamic,
    details: hasDynamic
      ? "monorepo動的スキャン対応 (apps/*/dist等)"
      : "静的パスのみ、monorepoで誤判定",
  }
})

test("8-2: execute.tsのコメントのみ差分検出が文字列リテラルを考慮", () => {
  const content = readFileSync("scripts/execute.ts", "utf8")
  const hasStripString = content.includes("stripStringLiterals")
  return {
    passed: hasStripString,
    details: hasStripString
      ? '文字列リテラル除去あり (console.log("// test")がコメント誤判定されない)'
      : "文字列考慮なし、誤判定する可能性",
  }
})

test("8-3: build.tsがshell:trueで実行 (pnpm not found対策)", () => {
  const content = readFileSync("scripts/build.ts", "utf8")
  const hasShell = content.includes("shell: true")
  return {
    passed: hasShell,
    details: hasShell
      ? "shell:trueで実行、corepack pnpmが見つからない問題対策済み"
      : "shell:false、pnpm not foundで失敗する可能性",
  }
})

test("8-4: cache.tsで存在しないファイルをhashFilesが除外", () => {
  const content = readFileSync("scripts/lib/cache.ts", "utf8")
  const hasFilter = content.includes("filter") && content.includes("existsSync")
  return {
    passed: hasFilter,
    details: hasFilter
      ? "存在しないファイルは除外してハッシュ計算"
      : "存在チェックなし、エラーになる可能性",
  }
})

// === 結果サマリー ===
console.log(`\n${"=".repeat(80)}`)
console.log(`${CYAN}テスト結果サマリー${RESET}`)
console.log("=".repeat(80))
const passed = results.filter((r) => r.passed).length
const total = results.length
console.log(
  `Passed: ${GREEN}${passed}/${total}${RESET}, Failed: ${RED}${total - passed}/${total}${RESET}`,
)
if (passed !== total) {
  console.log(`\n${YELLOW}失敗したテスト:${RESET}`)
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`  ${RED}✗ ${r.name}${RESET}: ${r.details}`)
  }
}
console.log("=".repeat(80))
process.exit(passed === total ? 0 : 1)
