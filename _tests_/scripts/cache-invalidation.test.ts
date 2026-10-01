/**
 * キャッシュhash invalidationの過不足を厳密にテスト
 */

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const CYAN = "\x1b[36m"
const YELLOW = "\x1b[33m"

function run(script: string, env: Record<string, string> = {}): string {
  const r = spawnSync("node", ["--experimental-strip-types", "-e", script], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  })
  return (r.stdout || "") + (r.stderr || "")
}

console.log(`${CYAN}=== Cache Invalidation Tests ===${RESET}`)

// Test 1: package.json変更でハッシュが変わる
console.log("\n1. package.json変更でハッシュが変わるか")
const hash1 = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()

// 一時的にpackage.jsonにコメント追加 (実際はjsonなので改行追加)
const pkgPath = "package.json"
const original = readFileSync(pkgPath, "utf8")
writeFileSync(pkgPath, `${original}\n`, "utf8")
const hash2 = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()
writeFileSync(pkgPath, original, "utf8")

console.log(`  hash before: ${hash1}`)
console.log(`  hash after adding newline to package.json: ${hash2}`)
console.log(
  `  ${hash1 !== hash2 ? `${GREEN}✓ 変わる (正しい)` : `${RED}✗ 変わらない (バグ)`}${RESET}`,
)

// Test 2: srcファイルのmtime変更でハッシュが変わる
console.log("\n2. srcファイルのmtime変更でハッシュが変わるか")
const srcFile = "src/index.ts"
const _srcOriginalStat = statSync(srcFile)
const srcOriginalContent = readFileSync(srcFile, "utf8")

const hashSrc1 = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()

// 1秒待ってファイルをtouch
const wait = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
wait(1100)
writeFileSync(srcFile, `${srcOriginalContent}\n// touch\n`, "utf8")

const hashSrc2 = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()

writeFileSync(srcFile, srcOriginalContent, "utf8")

console.log(`  hash before: ${hashSrc1}`)
console.log(`  hash after src touch: ${hashSrc2}`)
console.log(
  `  ${hashSrc1 !== hashSrc2 ? `${GREEN}✓ 変わる (正しい)` : `${RED}✗ 変わらない (バグ: src変更が検出されない)`}${RESET}`,
)

// Test 3: Termuxフラグでハッシュが変わる
console.log("\n3. Termuxフラグでハッシュが変わるか")
const hashNormal = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()

const hashTermux = run(
  `
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`,
  { TERMUX_VERSION: "1.0" },
).trim()

console.log(`  normal: ${hashNormal}`)
console.log(`  termux: ${hashTermux}`)
console.log(
  `  ${hashNormal !== hashTermux ? `${GREEN}✓ 変わる (正しい、キャッシュ分離)` : `${RED}✗ 変わらない (バグ: Termuxと通常でキャッシュ衝突)`}${RESET}`,
)

// Test 4: 無関係なファイル変更ではハッシュが変わらない (docs/*.mdは対象外か?)
console.log("\n4. 無関係ファイル (docs/README.md) 変更でハッシュが変わらないか")
const docsFile = "docs/README.md"
const docsOriginal = existsSync(docsFile) ? readFileSync(docsFile, "utf8") : ""
const hashDocs1 = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()

if (existsSync(docsFile)) {
  writeFileSync(docsFile, `${docsOriginal}\n<!-- test -->\n`, "utf8")
}
const hashDocs2 = run(`
  import { getProjectSourceHash } from "./scripts/lib/cache.ts"
  console.log(getProjectSourceHash())
`).trim()
if (existsSync(docsFile)) {
  writeFileSync(docsFile, docsOriginal, "utf8")
}

console.log(`  before: ${hashDocs1}`)
console.log(`  after docs change: ${hashDocs2}`)
console.log(
  `  ${hashDocs1 === hashDocs2 ? `${GREEN}✓ 変わらない (正しい、docsは非機能)` : `${YELLOW}△ 変わる (docs変更でもキャッシュ無効化、過剰だが安全側)`}${RESET}`,
)

// Test 5: キャッシュの保存と検証
console.log("\n5. キャッシュ保存と検証のサイクル")
run(`
  import { saveBuildCache, isBuildCacheValid, clearCache } from "./scripts/lib/cache.ts"
  clearCache("test-invalidation")
  saveBuildCache("test-invalidation")
  console.log("saved")
`)
const valid1 = run(`
  import { isBuildCacheValid } from "./scripts/lib/cache.ts"
  console.log(isBuildCacheValid("test-invalidation"))
`).trim()
console.log(`  直後の検証: ${valid1} (期待 true)`)
console.log(`  ${valid1.includes("true") ? `${GREEN}✓ 有効` : `${RED}✗ 無効 (バグ)`}${RESET}`)

// package.json変更後は無効になるはず
writeFileSync(pkgPath, `${original}\n`, "utf8")
const valid2 = run(`
  import { isBuildCacheValid } from "./scripts/lib/cache.ts"
  console.log(isBuildCacheValid("test-invalidation"))
`).trim()
writeFileSync(pkgPath, original, "utf8")
console.log(`  package.json変更後の検証: ${valid2} (期待 false)`)
console.log(
  `  ${valid2.includes("false") ? `${GREEN}✓ 無効化される (正しい)` : `${RED}✗ 有効のまま (バグ)`}${RESET}`,
)

run(`
  import { clearCache } from "./scripts/lib/cache.ts"
  clearCache("test-invalidation")
`)

console.log(`\n${GREEN}Cache invalidation tests completed${RESET}`)
