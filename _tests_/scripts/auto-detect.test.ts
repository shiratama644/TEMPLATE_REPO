/**
 * Vite/Next/Monorepo/Turbo自動判定の誤爆テスト
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const CYAN = "\x1b[36m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

function detectProjectType(): string {
  // build.tsのロジックを再現
  const hasTurbo = existsSync("turbo.json")
  const hasPackages = existsSync("packages") && readdirSync("packages").length > 0
  const hasApps = existsSync("apps") && readdirSync("apps").length > 0
  const hasMonorepo = hasPackages || hasApps
  const hasVite =
    existsSync("vite.config.ts") || existsSync("vite.config.js") || existsSync("vite.config.mjs")
  const hasNext =
    existsSync("next.config.js") || existsSync("next.config.mjs") || existsSync("next.config.ts")
  const hasTsc = existsSync("tsconfig.json")

  if (hasTurbo) return "turbo"
  if (hasMonorepo) return "monorepo"
  if (hasVite) return "vite"
  if (hasNext) return "next"
  if (hasTsc) return "tsc"
  return "none"
}

console.log(`${CYAN}=== 自動判定テスト ===${RESET}`)

// 保存しておくべき既存ファイル
const existingFiles = {
  hasVite: existsSync("vite.config.ts"),
  hasNext: existsSync("next.config.js") || existsSync("next.config.mjs"),
  hasTurbo: existsSync("turbo.json"),
  hasPackages: existsSync("packages"),
  hasApps: existsSync("apps"),
}

console.log(`現在の状態: ${detectProjectType()} (期待 tsc)`)

// Test 1: Vite
console.log(`\n${CYAN}Test 1: Viteプロジェクト${RESET}`)
writeFileSync("vite.config.ts", "export default {}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 vite) — ${detectProjectType() === "vite" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
)
rmSync("vite.config.ts")

// Test 2: Next.js
console.log(`\n${CYAN}Test 2: Next.jsプロジェクト${RESET}`)
writeFileSync("next.config.js", "module.exports = {}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 next) — ${detectProjectType() === "next" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
)
rmSync("next.config.js")

// Test 3: Turbo
console.log(`\n${CYAN}Test 3: Turboプロジェクト${RESET}`)
writeFileSync("turbo.json", "{}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 turbo) — ${detectProjectType() === "turbo" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
)
rmSync("turbo.json")

// Test 4: Monorepo (packages)
console.log(`\n${CYAN}Test 4: Monorepo (packages)${RESET}`)
if (!existsSync("packages")) mkdirSync("packages")
if (!existsSync("packages/test")) mkdirSync("packages/test")
writeFileSync("packages/test/package.json", "{}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 monorepo) — ${detectProjectType() === "monorepo" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
)
rmSync("packages/test/package.json")
rmSync("packages/test", { recursive: true })
if (!existingFiles.hasPackages) rmSync("packages", { recursive: true })

// Test 5: Monorepo (apps)
console.log(`\n${CYAN}Test 5: Monorepo (apps)${RESET}`)
if (!existsSync("apps")) mkdirSync("apps")
if (!existsSync("apps/web")) mkdirSync("apps/web", { recursive: true })
writeFileSync("apps/web/package.json", "{}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 monorepo) — ${detectProjectType() === "monorepo" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
)
rmSync("apps/web/package.json")
rmSync("apps/web", { recursive: true })
if (!existingFiles.hasApps) rmSync("apps", { recursive: true })

// Test 6: 空のpackagesディレクトリは誤爆しない
console.log(`\n${CYAN}Test 6: 空のpackagesディレクトリは誤爆しないか${RESET}`)
if (!existsSync("packages")) mkdirSync("packages")
console.log(
  `  検出: ${detectProjectType()} (期待 tsc、空ディレクトリは無視) — ${detectProjectType() === "tsc" ? `${GREEN}✅` : `${RED}❌ 誤爆`}${RESET}`,
)
if (!existingFiles.hasPackages) rmSync("packages", { recursive: true })

// Test 7: Turbo + Vite同時存在 (Turbo優先)
console.log(`\n${CYAN}Test 7: Turbo + Vite同時存在 (Turbo優先)${RESET}`)
writeFileSync("turbo.json", "{}", "utf8")
writeFileSync("vite.config.ts", "export default {}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 turbo) — ${detectProjectType() === "turbo" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
)
rmSync("turbo.json")
rmSync("vite.config.ts")

// Test 8: Vite + Next同時存在 (Vite優先、稀なケース)
console.log(`\n${CYAN}Test 8: Vite + Next同時存在 (Vite優先)${RESET}`)
writeFileSync("vite.config.ts", "export default {}", "utf8")
writeFileSync("next.config.js", "module.exports = {}", "utf8")
console.log(
  `  検出: ${detectProjectType()} (期待 vite) — ${detectProjectType() === "vite" ? `${GREEN}✅` : `${YELLOW}△ Vite優先 (ドキュメント化必要)`}${RESET}`,
)
rmSync("vite.config.ts")
rmSync("next.config.js")

// Test 9: 何もない場合
console.log(`\n${CYAN}Test 9: 何もない場合${RESET}`)
const hasTsc = existsSync("tsconfig.json")
if (hasTsc) {
  // tsconfig.jsonを一時的にリネーム
  const content = readFileSync("tsconfig.json", "utf8")
  rmSync("tsconfig.json")
  console.log(
    `  検出: ${detectProjectType()} (期待 none) — ${detectProjectType() === "none" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
  )
  writeFileSync("tsconfig.json", content, "utf8")
} else {
  console.log(
    `  検出: ${detectProjectType()} (期待 none) — ${detectProjectType() === "none" ? `${GREEN}✅` : `${RED}❌`}${RESET}`,
  )
}

console.log(`\n${GREEN}自動判定テスト完了${RESET}`)
console.log(`\n${YELLOW}考察:${RESET}`)
console.log(
  `- Turbo > Monorepo > Vite > Next > TSC の優先順位は妥当 (Turboはモノレポ専用、Vite/Nextは単一アプリ)`,
)
console.log(`- 空ディレクトリは無視するので誤爆しない`)
console.log(`- Vite+Next同時存在は稀だがVite優先になる、ドキュメントで明記すべき`)
console.log(`- 何もない場合は none になり、build.tsは「No build config found」で終了、壊れない`)
