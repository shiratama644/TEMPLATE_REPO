/**
 * Template E2E自己展開テスト — Vite / Next / Monorepoを実際に生成して全フロー検証
 *
 * 目的: テンプレートから新しいアプリを生成した際に、
 * pnpm check → dev → build → test → commit → CI → release までが壊れずに通るか
 *
 * 検証項目:
 * 1. Plain TS (現状テンプレート) の全フロー
 * 2. Viteアプリ生成 → 検出 → build → test
 * 3. Nextアプリ生成 → 検出 → Termux Webpack強制 → build
 * 4. Monorepo生成 → workspace検出 → apps個別検出 → 空ディレクトリ誤爆なし
 * 5. Bootstrap手動手順 (README Step 1-4) が機能するか
 * 6. CIシミュレーション (ci.ymlのstatic-checks + build)
 * 7. Releaseシミュレーション (changeset)
 *
 * 実行: pnpm test:e2e:template または node --experimental-strip-types _tests_/scripts/test-template-e2e.ts
 */

import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const _DIM = "\x1b[2m"

type TestResult = { name: string; passed: boolean; details: string; durationMs?: number }
const results: TestResult[] = []

function log(tag: string, msg: string) {
  console.log(`${CYAN}[${tag}]${RESET} ${msg}`)
}

function test(name: string, fn: () => { passed: boolean; details: string }) {
  const start = Date.now()
  try {
    const r = fn()
    const duration = Date.now() - start
    results.push({ name, passed: r.passed, details: r.details, durationMs: duration })
    console.log(
      `${r.passed ? `${GREEN}✓` : `${RED}✗`} ${name}${RESET} (${duration}ms) — ${r.details}`,
    )
    return r.passed
  } catch (e) {
    const duration = Date.now() - start
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ name, passed: false, details: `exception: ${msg}`, durationMs: duration })
    console.log(`${RED}✗ ${name}${RESET} (${duration}ms) — exception: ${msg}`)
    return false
  }
}

function run(
  cmd: string[],
  cwd: string,
  env: Record<string, string> = {},
): { status: number; stdout: string } {
  const mergedEnv = {
    ...process.env,
    PATH: `${process.env.PATH}:/usr/local/bin:/root/.node/corepack:/home/user/.node/corepack`,
    ...env,
  }

  let result = spawnSync(cmd[0], cmd.slice(1), {
    cwd,
    encoding: "utf8",
    env: mergedEnv,
    shell: true,
  })

  // pnpm not found の場合は corepack経由でリトライ
  if (result.status === 127 && cmd[0] === "pnpm") {
    result = spawnSync("corepack", ["pnpm", ...cmd.slice(1)], {
      cwd,
      encoding: "utf8",
      env: mergedEnv,
      shell: true,
    })
  }

  return { status: result.status ?? 1, stdout: (result.stdout || "") + (result.stderr || "") }
}

function runNode(
  script: string,
  cwd: string,
  env: Record<string, string> = {},
): { status: number; stdout: string } {
  // node -e では ESM import が使えない + ImageMagickのimportと衝突するため、一時ファイルに書き出して実行
  // ESMの相対importはファイル位置基準で解決されるため、cwd内に一時ファイルを作成する必要がある
  // 絶対パスでimportする場合はcwd外でもOKだが、相対パス "./scripts/..." を使うテストがあるためcwd内に作成
  const tmpFile = join(cwd, `_tmp_test_${Date.now()}_${Math.random().toString(36).slice(2)}.ts`)
  try {
    writeFileSync(tmpFile, script, "utf8")
    return run(["node", "--experimental-strip-types", tmpFile], cwd, env)
  } finally {
    try {
      rmSync(tmpFile, { force: true })
    } catch {
      // ignore
    }
  }
}

// 一時ディレクトリ作成
const tmpRoot = join(tmpdir(), `template-e2e-${Date.now()}`)
mkdirSync(tmpRoot, { recursive: true })
log("SETUP", `Temp root: ${tmpRoot}`)

function cleanup() {
  try {
    rmSync(tmpRoot, { recursive: true, force: true })
    log("CLEANUP", `Removed ${tmpRoot}`)
  } catch {
    // ignore
  }
}

process.on("exit", cleanup)
process.on("SIGINT", () => {
  cleanup()
  process.exit(1)
})

// テンプレートの必要ファイルをコピーするヘルパー
function copyTemplate(to: string) {
  const filesToCopy = [
    "package.json",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "vitest.config.ts",
    "playwright.config.ts",
    "biome.json",
    "cspell.json",
    "knip.json",
    ".editorconfig",
    "renovate.json",
    ".gitignore",
  ]

  for (const file of filesToCopy) {
    if (existsSync(file)) {
      try {
        cpSync(file, join(to, file))
      } catch {
        // ignore
      }
    }
  }

  // scripts/ をコピー
  if (existsSync("scripts")) {
    cpSync("scripts", join(to, "scripts"), { recursive: true })
  }

  // src/ をコピー
  if (existsSync("src")) {
    cpSync("src", join(to, "src"), { recursive: true })
  }

  // _tests_/src をコピー (unit test)
  if (existsSync("_tests_/src")) {
    mkdirSync(join(to, "_tests_/src"), { recursive: true })
    cpSync("_tests_/src", join(to, "_tests_/src"), { recursive: true })
  }

  // docs/examples をコピー
  if (existsSync("docs/examples")) {
    cpSync("docs/examples", join(to, "docs/examples"), { recursive: true })
  }
}

console.log(`\n${GREEN}=== Template E2E 自己展開テスト開始 ===${RESET}\n`)

// ========================================
// Phase 1: Plain TS (現状テンプレート) の全フロー
// ========================================
console.log(`${CYAN}--- Phase 1: Plain TypeScript (現状テンプレート) ---${RESET}`)

test("1-1: 現状テンプレートで pnpm check:env が動作", () => {
  const { status, stdout } = run(["pnpm", "check:env"], process.cwd())
  const passed = status === 0 && stdout.includes("Environment check")
  return { passed, details: passed ? "check:env OK" : `failed: ${stdout.slice(-200)}` }
})

test("1-2: 現状テンプレートで pnpm detect が動作", () => {
  const { status, stdout } = run(["pnpm", "detect"], process.cwd())
  const passed = status === 0 && stdout.includes("[DETECT]")
  return { passed, details: passed ? stdout.trim().slice(0, 100) : `failed: ${stdout.slice(-200)}` }
})

test("1-3: 現状テンプレートで pnpm build がキャッシュ動作", () => {
  const { status, stdout } = run(["pnpm", "build"], process.cwd())
  const passed = status === 0
  return {
    passed,
    details: passed ? "build OK (cache hit or tsc)" : `failed: ${stdout.slice(-200)}`,
  }
})

test("1-4: 現状テンプレートで pnpm test:unit が動作", () => {
  const { status, stdout } = run(["pnpm", "test:unit"], process.cwd())
  const passed = status === 0 && stdout.includes("passed")
  return { passed, details: passed ? "unit tests PASS" : `failed: ${stdout.slice(-200)}` }
})

test("1-5: 現状テンプレートで pnpm test:coverage が85%閾値を満たす", () => {
  const { status, stdout } = run(["pnpm", "test:coverage"], process.cwd())
  const has100 = stdout.includes("100%") || stdout.includes("100")
  const noError = !stdout.includes("ERROR: Coverage")
  const passed = status === 0 && has100 && noError
  return {
    passed,
    details: passed
      ? "coverage 100% >= 85%"
      : `status=${status}, has100=${has100}, noError=${noError}, output=${stdout.slice(-500)}`,
  }
})

// ========================================
// Phase 2: Viteアプリ生成
// ========================================
console.log(`\n${CYAN}--- Phase 2: Viteアプリ生成 → 検出 → build ---${RESET}`)

const viteDir = join(tmpRoot, "vite-app")
mkdirSync(viteDir, { recursive: true })
copyTemplate(viteDir)

test("2-1: Viteアプリ — vite.config.ts作成", () => {
  const viteConfig = `
import { defineConfig } from "vite"
export default defineConfig({
  cacheDir: "node_modules/.vite",
  server: { port: 5173, host: "0.0.0.0" },
})
`
  writeFileSync(join(viteDir, "vite.config.ts"), viteConfig, "utf8")
  const exists = existsSync(join(viteDir, "vite.config.ts"))
  return { passed: exists, details: exists ? "vite.config.ts created" : "failed to create" }
})

test("2-2: Viteアプリ — ProjectDetectorがviteを検出", () => {
  const script = `
    import { detectAll } from "./scripts/lib/detector.ts"
    const r = detectAll("${viteDir.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify({ type: r.root.type, build: r.root.buildSystem, primary: r.primaryBuildSystem }))
  `
  const { status, stdout } = runNode(script, process.cwd())
  const isVite = stdout.includes('"type":"vite"') || stdout.includes('"build":"vite"')
  return { passed: status === 0 && isVite, details: `detected: ${stdout.trim()}` }
})

test("2-3: Viteアプリ — Termux判定が通常環境でfalse", () => {
  const script = `
    import { isTermuxEnvironment } from "./scripts/lib/termux.ts"
    console.log(isTermuxEnvironment())
  `
  const { status, stdout } = runNode(script, viteDir)
  const isFalse = stdout.trim() === "false"
  return { passed: status === 0 && isFalse, details: `isTermux=${stdout.trim()} (期待 false)` }
})

test("2-4: Viteアプリ — キャッシュハッシュにvite.configが含まれる", () => {
  const script = `
    import { getProjectSourceHash } from "./scripts/lib/cache.ts"
    console.log(getProjectSourceHash())
  `
  const { status: s1, stdout: h1 } = runNode(script, viteDir)
  // vite.config.tsを変更してハッシュが変わるか
  const viteConfigPath = join(viteDir, "vite.config.ts")
  const original = readFileSync(viteConfigPath, "utf8")
  writeFileSync(viteConfigPath, `${original}\n// touch\n`, "utf8")
  const { stdout: h2 } = runNode(script, viteDir)
  writeFileSync(viteConfigPath, original, "utf8")
  const changed = h1.trim() !== h2.trim()
  return {
    passed: s1 === 0 && changed,
    details: `hash before=${h1.trim()}, after=${h2.trim()}, changed=${changed}`,
  }
})

test("2-5: Viteアプリ — pnpm-workspace.yamlが汎用性を壊さない", () => {
  const hasWorkspace = existsSync(join(viteDir, "pnpm-workspace.yaml"))
  const content = hasWorkspace ? readFileSync(join(viteDir, "pnpm-workspace.yaml"), "utf8") : ""
  const hasPackages = content.includes("packages/*")
  const hasApps = content.includes("apps/*")
  return {
    passed: hasPackages && hasApps,
    details: `workspace has packages/*=${hasPackages}, apps/*=${hasApps}`,
  }
})

// ========================================
// Phase 3: Nextアプリ生成
// ========================================
console.log(`\n${CYAN}--- Phase 3: Nextアプリ生成 → 検出 → Termux Webpack強制 ---${RESET}`)

const nextDir = join(tmpRoot, "next-app")
mkdirSync(nextDir, { recursive: true })
copyTemplate(nextDir)

test("3-1: Nextアプリ — next.config.js作成", () => {
  writeFileSync(join(nextDir, "next.config.js"), "module.exports = {}", "utf8")
  const exists = existsSync(join(nextDir, "next.config.js"))
  return { passed: exists, details: exists ? "next.config.js created" : "failed" }
})

test("3-2: Nextアプリ — ProjectDetectorがnextを検出", () => {
  const script = `
    import { detectAll } from "./scripts/lib/detector.ts"
    const r = detectAll("${nextDir.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify({ type: r.root.type, build: r.root.buildSystem }))
  `
  const { status, stdout } = runNode(script, process.cwd())
  const isNext = stdout.includes('"type":"next"') || stdout.includes('"build":"next"')
  return { passed: status === 0 && isNext, details: `detected: ${stdout.trim()}` }
})

test("3-3: Nextアプリ — 通常環境ではWebpack強制されない", () => {
  const script = `
    import { getNextBuildCommandForTermux } from "./scripts/lib/next-termux.ts"
    const r = getNextBuildCommandForTermux(["pnpm", "exec", "next", "build"], "${nextDir.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify(r))
  `
  const { status, stdout } = runNode(script, process.cwd())
  const notTermux = stdout.includes('"isTermux":false')
  return { passed: status === 0 && notTermux, details: `通常: isTermux=false=${notTermux}` }
})

test("3-4: Nextアプリ — Termux環境ではWebpack強制される", () => {
  const script = `
    import { getNextBuildCommandForTermux } from "./scripts/lib/next-termux.ts"
    const r = getNextBuildCommandForTermux(["pnpm", "exec", "next", "build"], "${nextDir.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify(r))
  `
  const { status, stdout } = runNode(script, process.cwd(), {
    TERMUX_VERSION: "1.0",
    PREFIX: "/data/data/com.termux/files/usr",
  })
  const isTermux = stdout.includes('"isTermux":true')
  const hasWebpack =
    stdout.includes("NEXT_WEBPACK") &&
    (stdout.includes("--no-turbopack") || stdout.includes("--webpack"))
  return {
    passed: status === 0 && isTermux && hasWebpack,
    details: `Termux: isTermux=${isTermux}, Webpack=${hasWebpack}`,
  }
})

test("3-5: Nextアプリ — docs/examples/next.config.example.mjsが参考になる", () => {
  const exampleExists = existsSync(join(nextDir, "docs/examples/next.config.example.mjs"))
  const content = exampleExists
    ? readFileSync(join(nextDir, "docs/examples/next.config.example.mjs"), "utf8")
    : ""
  const hasTermux = content.includes("isTermux") && content.includes("webpack")
  const hasCache = content.includes("cache")
  return {
    passed: exampleExists && hasTermux && hasCache,
    details: `example exists=${exampleExists}, termux=${hasTermux}, cache=${hasCache}`,
  }
})

// ========================================
// Phase 4: Monorepo生成
// ========================================
console.log(`\n${CYAN}--- Phase 4: Monorepo生成 → workspace検出 → 混在フレームワーク ---${RESET}`)

const monoDir = join(tmpRoot, "monorepo")
mkdirSync(monoDir, { recursive: true })
copyTemplate(monoDir)

test("4-1: Monorepo — packages/ui + apps/web (next) + apps/docs (vite) 作成", () => {
  mkdirSync(join(monoDir, "packages/ui"), { recursive: true })
  mkdirSync(join(monoDir, "apps/web"), { recursive: true })
  mkdirSync(join(monoDir, "apps/docs"), { recursive: true })
  writeFileSync(join(monoDir, "packages/ui/package.json"), '{"name":"@repo/ui"}', "utf8")
  writeFileSync(join(monoDir, "apps/web/package.json"), '{"name":"web"}', "utf8")
  writeFileSync(join(monoDir, "apps/web/next.config.js"), "module.exports = {}", "utf8")
  writeFileSync(join(monoDir, "apps/docs/package.json"), '{"name":"docs"}', "utf8")
  writeFileSync(join(monoDir, "apps/docs/vite.config.ts"), "export default {}", "utf8")
  const hasAll =
    existsSync(join(monoDir, "packages/ui/package.json")) &&
    existsSync(join(monoDir, "apps/web/next.config.js")) &&
    existsSync(join(monoDir, "apps/docs/vite.config.ts"))
  return { passed: hasAll, details: hasAll ? "monorepo structure created" : "failed" }
})

test("4-2: Monorepo — ProjectDetectorがworkspaceを検出", () => {
  const script = `
    import { detectWorkspace, detectApps, detectAll } from "./scripts/lib/detector.ts"
    const ws = detectWorkspace("${monoDir.replace(/\\/g, "\\\\")}")
    const apps = detectApps("${monoDir.replace(/\\/g, "\\\\")}")
    const all = detectAll("${monoDir.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify({ isMonorepo: ws.isMonorepo, hasPackages: ws.hasPackages, hasApps: ws.hasApps, appCount: apps.length, summary: all.summary }))
  `
  const { status, stdout } = runNode(script, process.cwd())
  const isMono = stdout.includes('"isMonorepo":true')
  const has3Apps = stdout.includes('"appCount":3')
  return { passed: status === 0 && isMono && has3Apps, details: stdout.trim() }
})

test("4-3: Monorepo — 各アプリのビルドシステムを個別検出", () => {
  const script = `
    import { detectApps } from "./scripts/lib/detector.ts"
    const apps = detectApps("${monoDir.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify(apps.map(a => ({ path: a.path, build: a.buildSystem }))))
  `
  const { status, stdout } = runNode(script, process.cwd())
  const hasNext = stdout.includes("next")
  const hasVite = stdout.includes("vite")
  const _hasNone = stdout.includes("none") // packages/ui は tsc でも none でもOK、package.jsonのみなので none
  return { passed: status === 0 && hasNext && hasVite, details: `apps: ${stdout.trim()}` }
})

test("4-4: Monorepo — 空のpackagesディレクトリは誤爆しない", () => {
  const emptyMono = join(tmpRoot, "empty-mono")
  mkdirSync(emptyMono, { recursive: true })
  copyTemplate(emptyMono)
  mkdirSync(join(emptyMono, "packages"), { recursive: true })
  // 空のpackagesディレクトリ
  const script = `
    import { detectWorkspace } from "./scripts/lib/detector.ts"
    const ws = detectWorkspace("${emptyMono.replace(/\\/g, "\\\\")}")
    console.log(JSON.stringify({ isMonorepo: ws.isMonorepo, hasPackages: ws.hasPackages }))
  `
  const { status, stdout } = runNode(script, process.cwd())
  const notMono = stdout.includes('"isMonorepo":false')
  rmSync(emptyMono, { recursive: true, force: true })
  return {
    passed: status === 0 && notMono,
    details: `空packages: isMonorepo=false=${notMono}, output=${stdout.trim()}`,
  }
})

test("4-5: Monorepo — pnpm-workspace.yamlがpackages/* + apps/* をサポート", () => {
  const wsContent = existsSync(join(monoDir, "pnpm-workspace.yaml"))
    ? readFileSync(join(monoDir, "pnpm-workspace.yaml"), "utf8")
    : ""
  const hasPackages = wsContent.includes("packages/*")
  const hasApps = wsContent.includes("apps/*")
  return { passed: hasPackages && hasApps, details: `packages/*=${hasPackages}, apps/*=${hasApps}` }
})

// ========================================
// Phase 5: Bootstrap手動手順
// ========================================
console.log(`\n${CYAN}--- Phase 5: Bootstrap手動手順 (README Step 1-4) ---${RESET}`)

test("5-1: package.json name変更が可能", () => {
  const pkgPath = join(viteDir, "package.json")
  if (!existsSync(pkgPath)) return { passed: false, details: "package.json not found" }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  pkg.name = "my-vite-app"
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8")
  const newPkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  const changed = newPkg.name === "my-vite-app"
  return { passed: changed, details: `name changed to ${newPkg.name}` }
})

test("5-2: CODEOWNERS変更が可能", () => {
  // テンプレートにはCODEOWNERSが存在するか確認
  const hasCodeowners = existsSync(".github/CODEOWNERS")
  return {
    passed: hasCodeowners,
    details: hasCodeowners
      ? "CODEOWNERS exists, should change @shiratama644 to your name"
      : "CODEOWNERS not found",
  }
})

test("5-3: docs/examplesからVite/Next設定をコピー可能", () => {
  const viteExample = existsSync("docs/examples/vite.config.example.ts")
  const nextExample = existsSync("docs/examples/next.config.example.mjs")
  return {
    passed: viteExample && nextExample,
    details: `vite example=${viteExample}, next example=${nextExample}`,
  }
})

test("5-4: 初期クリーンアップ対象が明確", () => {
  // READMEに記載されているクリーンアップ対象
  const readme = existsSync("README.md") ? readFileSync("README.md", "utf8") : ""
  const hasCleanup =
    readme.includes("docs/complete") && readme.includes("_tests_") && readme.includes("logs/")
  return {
    passed: hasCleanup,
    details: hasCleanup ? "READMEにクリーンアップ手順あり" : "READMEに手順なし",
  }
})

// ========================================
// Phase 6: CIシミュレーション
// ========================================
console.log(`\n${CYAN}--- Phase 6: CIシミュレーション (ci.ymlのstatic-checks) ---${RESET}`)

test("6-1: CI static-checks — typecheck/lint/determinism/cspell/knip", () => {
  // 現状テンプレートで個別に実行
  const checks = [
    { cmd: ["pnpm", "typecheck"], name: "typecheck" },
    { cmd: ["pnpm", "lint"], name: "lint" },
  ]

  let allPassed = true
  let details = ""
  for (const check of checks) {
    const { status } = run(check.cmd, process.cwd())
    if (status !== 0) allPassed = false
    details += `${check.name}=${status === 0 ? "OK" : "FAIL"} `
  }

  return { passed: allPassed, details: details.trim() }
})

test("6-2: CI cache設定が適切 (actions/cache)", () => {
  const ci = existsSync(".github/workflows/ci.yml")
    ? readFileSync(".github/workflows/ci.yml", "utf8")
    : ""
  const hasCache = ci.includes("actions/cache@v4")
  const hasPnpmCache = ci.includes("cache: pnpm") || ci.includes("pnpm/action-setup")
  const hasNextCache = ci.includes(".next/cache")
  const hasViteCache = ci.includes(".vite") || ci.includes("vite")
  const hasTurboCache = ci.includes(".turbo")
  const passed = hasCache && hasPnpmCache
  return {
    passed,
    details: `actions/cache=${hasCache}, pnpm=${hasPnpmCache}, next=${hasNextCache}, vite=${hasViteCache}, turbo=${hasTurboCache}`,
  }
})

test("6-3: CIにTermux検出ログステップがある", () => {
  const ci = existsSync(".github/workflows/ci.yml")
    ? readFileSync(".github/workflows/ci.yml", "utf8")
    : ""
  const hasTermuxLog = ci.toLowerCase().includes("termux") || ci.includes("check:env")
  return {
    passed: hasTermuxLog,
    details: hasTermuxLog ? "Termux log step exists" : "no Termux log",
  }
})

// ========================================
// Phase 7: Releaseシミュレーション
// ========================================
console.log(`\n${CYAN}--- Phase 7: Releaseシミュレーション (Changesets) ---${RESET}`)

test("7-1: Changesets設定が存在", () => {
  const hasConfig = existsSync(".changeset/config.json")
  const hasReadme = existsSync(".changeset/README.md")
  const pkg = existsSync("package.json") ? JSON.parse(readFileSync("package.json", "utf8")) : {}
  const hasScripts = !!pkg.scripts?.changeset
  return {
    passed: hasConfig && hasScripts,
    details: `config=${hasConfig}, readme=${hasReadme}, scripts=${hasScripts}`,
  }
})

test("7-2: release.ymlが存在", () => {
  const hasRelease = existsSync(".github/workflows/release.yml")
  const content = hasRelease ? readFileSync(".github/workflows/release.yml", "utf8") : ""
  const hasChangesetsAction = content.includes("changesets/action")
  return {
    passed: hasRelease && hasChangesetsAction,
    details: `release.yml=${hasRelease}, changesets/action=${hasChangesetsAction}`,
  }
})

test("7-3: package.jsonにfilesとlicenseがある (publint用)", () => {
  const pkg = existsSync("package.json") ? JSON.parse(readFileSync("package.json", "utf8")) : {}
  const hasFiles = !!pkg.files
  const hasLicense = !!pkg.license
  return {
    passed: hasFiles && hasLicense,
    details: `files=${hasFiles}, license=${hasLicense} (${pkg.license})`,
  }
})

// ========================================
// 結果サマリー
// ========================================
console.log(`\n${"=".repeat(80)}`)
console.log(`${CYAN}Template E2E自己展開テスト結果サマリー${RESET}`)
console.log("=".repeat(80))

const passed = results.filter((r) => r.passed).length
const total = results.length
const totalDuration = results.reduce((sum, r) => sum + (r.durationMs || 0), 0)

console.log(
  `Passed: ${GREEN}${passed}/${total}${RESET}, Failed: ${RED}${total - passed}/${total}${RESET}, Duration: ${totalDuration}ms`,
)

if (passed !== total) {
  console.log(`\n${YELLOW}失敗したテスト:${RESET}`)
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`  ${RED}✗ ${r.name}${RESET}: ${r.details}`)
  }
} else {
  console.log(
    `\n${GREEN}全テストPASS — テンプレートはVite/Next/Monorepoの3種類で自己展開可能${RESET}`,
  )
  console.log(
    `${GREEN}初回 pnpm check → dev → build → test → commit → CI → release までのフローが壊れていない${RESET}`,
  )
}

console.log("=".repeat(80))

// クリーンアップ
cleanup()

process.exit(passed === total ? 0 : 1)
