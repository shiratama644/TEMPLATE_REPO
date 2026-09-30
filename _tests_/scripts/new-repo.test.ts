/**
 * 新リポジトリへコピー直後の不要設定チェック + 全体健全性
 */

import { existsSync, readFileSync } from "node:fs"

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"

console.log(`${CYAN}=== 新リポジトリコピー直後の不要設定チェック ===${RESET}`)

const checks = [
  {
    name: "package.json nameがtemplate-repoのまま",
    file: "package.json",
    check: () => {
      const pkg = JSON.parse(readFileSync("package.json", "utf8"))
      return pkg.name === "template-repo"
    },
    shouldBe: true,
    action: "新規リポジトリ作成時に変更が必要、READMEに手順あり",
  },
  {
    name: ".agent/logsが存在するか (テンプレートには含まれるが新規では空であるべき)",
    file: ".agent/logs",
    check: () => existsSync(".agent/logs"),
    shouldBe: false, // 新規では空が理想だが、テンプレートにはREADME的なものがあるかも
    action: "gitignore済みなのでコピーされても実害なし、ただし初期は空が望ましい",
  },
  {
    name: "docs/completeが存在しない (旧形式、planning/complete/が正本)",
    file: "docs/complete",
    check: () => existsSync("docs/complete"),
    shouldBe: false,
    action: "旧形式のため削除済み、planning/complete/を使用",
  },
  {
    name: ".cacheが存在 (ビルドキャッシュ)",
    file: ".cache",
    check: () => existsSync(".cache"),
    shouldBe: false,
    action: "gitignore済み、新規リポジトリには含まれないはず",
  },
  {
    name: "pnpm-lock.yamlが存在 (再現性のため必要)",
    file: "pnpm-lock.yaml",
    check: () => existsSync("pnpm-lock.yaml"),
    shouldBe: true,
    action: "新規でも必要、lockはコミットすべき",
  },
  {
    name: ".envが存在しない (env.exampleのみであるべき)",
    file: ".env",
    check: () => existsSync(".env"),
    shouldBe: false,
    action: ".envはgitignore、新規では存在しないのが正しい",
  },
  {
    name: "CODEOWNERSが@shiratama644のまま",
    file: ".github/CODEOWNERS",
    check: () => {
      if (!existsSync(".github/CODEOWNERS")) return false
      const content = readFileSync(".github/CODEOWNERS", "utf8")
      return content.includes("shiratama644")
    },
    shouldBe: true,
    action: "新規リポジトリ作成時に変更が必要",
  },
  {
    name: "FUNDING.ymlがコメントアウト状態",
    file: ".github/FUNDING.yml",
    check: () => {
      if (!existsSync(".github/FUNDING.yml")) return false
      const content = readFileSync(".github/FUNDING.yml", "utf8")
      return content.includes("#") // コメントアウトされている
    },
    shouldBe: true,
    action: "新規では未設定でOK",
  },
]

for (const c of checks) {
  const exists = c.check()
  const isExpected = exists === c.shouldBe
  const color = isExpected ? GREEN : YELLOW
  console.log(
    `${color}${isExpected ? "✅" : "△"} ${c.name}${RESET} — 存在=${exists}, 期待=${c.shouldBe} — ${c.action}`,
  )
}

console.log(`\n${CYAN}=== 12品質ゲート保守コスト分析 ===${RESET}`)

const checkContent = readFileSync("scripts/check.ts", "utf8")
const tasks = [
  "typecheck",
  "lint",
  "determinism",
  "cspell",
  "knip",
  "publint",
  "size-limit",
  "unit",
  "coverage",
  "build",
  "e2e",
]

for (const task of tasks) {
  const exists = checkContent.toLowerCase().includes(task.toLowerCase())
  console.log(
    `${exists ? `${GREEN}✅` : `${RED}❌`} ${task}${RESET} — ${exists ? "check.tsに含まれる" : "含まれない"}`,
  )
}

console.log(`\n${YELLOW}保守コスト考察:${RESET}`)
console.log(`- 12タスクは多いが、並列実行 (install先行➡️11並列) で高速化されている`)
console.log(`- publint/size-limitはnon-blocking (continue-on-error) で、失敗してもCIが止まらない`)
console.log(`- knipはSandbox対策済み (KNIP_DISABLE_RAW_TRANSFER=1)`)
console.log(`- cspellはignorePathsでnode_modules/.cache/.next/distを除外、誤爆しにくい`)
console.log(`- determinismは軽量、禁止API検出のみ`)
console.log(
  `- 実際の保守コスト: 新ツール追加時は check.ts + ci.yml + package.json の3箇所を更新する必要あり`,
)

console.log(`\n${CYAN}=== .agent/とAGENTS.md一貫性 ===${RESET}`)

const agentsMd = readFileSync("AGENTS.md", "utf8")
const _skillsIndex = existsSync(".agent/skills/index.md")
  ? readFileSync(".agent/skills/index.md", "utf8")
  : ""

const hasSkillsRef = agentsMd.includes("skills") || agentsMd.includes("SKILL.md")
const hasRulesRef = agentsMd.includes("rules")
const hasHooksRef = agentsMd.includes("hooks")
const hasLogsRef = agentsMd.includes("logs")

console.log(`${hasSkillsRef ? `${GREEN}✅` : `${RED}❌`} AGENTS.mdがskillsを参照${RESET}`)
console.log(`${hasRulesRef ? `${GREEN}✅` : `${RED}❌`} AGENTS.mdがrulesを参照${RESET}`)
console.log(`${hasHooksRef ? `${GREEN}✅` : `${RED}❌`} AGENTS.mdがhooksを参照${RESET}`)
console.log(`${hasLogsRef ? `${GREEN}✅` : `${RED}❌`} AGENTS.mdがlogsを参照${RESET}`)

const skills = [
  "project-overview",
  "tech-stack",
  "sandbox-constraints",
  "docs-maintenance",
  "ci-quality-gates",
  "testing",
  "import-boundaries",
  "determinism",
  "e2e",
  "memory-leak",
  "zero-alloc",
]

for (const skill of skills) {
  const exists = existsSync(`.agent/skills/${skill}/SKILL.md`)
  console.log(
    `${exists ? `${GREEN}✅` : `${RED}❌`} skill ${skill}${RESET} — ${exists ? "存在" : "不在"}`,
  )
}

console.log(`\n${GREEN}新リポジトリ健全性チェック完了${RESET}`)
