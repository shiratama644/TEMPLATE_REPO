/**
 * ドキュメント整合性検証スクリプト（汎用版）。
 * PalmIDEのverify-doc-integrityをベースに、テンプレート用に一般化。
 *
 * 実行: pnpm exec tsx scripts/verify-docs.ts
 * または: node --experimental-strip-types scripts/verify-docs.ts
 */

import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"

export function getMdFiles(dir: string): string[] {
  const result: string[] = []
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      result.push(...getMdFiles(fullPath))
    } else if (entry.endsWith(".md")) {
      result.push(fullPath)
    }
  }
  return result
}

export function checkSecretFiles(): { ok: boolean; envFiles: string[] } {
  try {
    const staged = execSync("git diff --cached --name-only", { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean)
    const hasEnv = staged.filter((f) => f === ".env" || f.startsWith(".env."))
    return { ok: hasEnv.length === 0, envFiles: hasEnv }
  } catch {
    return { ok: true, envFiles: [] }
  }
}

export function checkInternalLinks(docsDir = "docs"): { brokenCount: number; broken: string[] } {
  const broken: string[] = []
  let brokenCount = 0
  try {
    if (existsSync(docsDir)) {
      const files = getMdFiles(docsDir)
      for (const file of files) {
        const content = readFileSync(file, "utf-8")
        const stripped = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "")
        const linkRegex = /\[.*?\]\(([^)]*)\)/g
        let match: RegExpExecArray | null
        while ((match = linkRegex.exec(stripped)) !== null) {
          const rawLink = match[1]
          if (!rawLink) continue
          if (rawLink.startsWith("#")) continue
          let linkPath = rawLink.split("#")[0]
          linkPath = linkPath.split("?")[0]
          if (!linkPath) continue
          if (linkPath.startsWith("http") || linkPath.startsWith("mailto:")) continue
          const fileDir = dirname(file)
          const fullPath = join(fileDir, linkPath)
          if (!existsSync(fullPath)) {
            if (!existsSync(`${fullPath}.md`) && !existsSync(join(fullPath, "README.md"))) {
              broken.push(`${file} -> ${linkPath}`)
              brokenCount++
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return { brokenCount, broken }
}

export function checkTocUpdate(): { docsChanged: string[]; readmeChanged: boolean } {
  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" })
    const docsChanged = status
      .split("\n")
      .filter((line) => line.includes("docs/") && /^(?:\?\?|A |D |R )/.test(line))
    const readmeChanged = status.includes("docs/README.md")
    return { docsChanged, readmeChanged }
  } catch {
    return { docsChanged: [], readmeChanged: false }
  }
}

export function checkPackageManager(): { ok: boolean; pm?: string; message: string } {
  try {
    if (existsSync("package.json")) {
      const pkg = JSON.parse(readFileSync("package.json", "utf-8"))
      const pm = pkg.packageManager as string | undefined
      if (!pm) {
        return { ok: false, message: "no packageManager" }
      } else if (!pm.startsWith("pnpm@")) {
        return { ok: false, pm, message: `not pnpm: ${pm}` }
      } else {
        return { ok: true, pm, message: pm }
      }
    }
  } catch (e) {
    return { ok: false, message: `error: ${e}` }
  }
  return { ok: true, message: "ok" }
}

export function runVerifyDocs(): boolean {
  let fail = false

  console.log("=== verify-docs ===")

  console.log("\n(A) 機密ファイルチェック...")
  try {
    const secret = checkSecretFiles()
    if (secret.envFiles.length > 0) {
      console.error(`✗ .envファイルがステージングされています: ${secret.envFiles.join(", ")}`)
      fail = true
    } else {
      console.log("✓ 機密ファイル: OK")
    }
  } catch {
    /* v8 ignore next 1 */
    console.log("ℹ️ Git情報取得失敗、スキップ")
  }

  console.log("\n(B) 内部リンク検証...")
  try {
    const docsDir = "docs"
    if (existsSync(docsDir)) {
      const { brokenCount } = checkInternalLinks(docsDir)
      if (brokenCount === 0) {
        console.log("✓ リンク: OK")
      } else {
        console.error(`✗ 壊れたリンクが ${brokenCount} 件見つかりました`)
        fail = true
      }
    }
  } catch (e) {
    /* v8 ignore next 1 */
    console.error(`リンク検証エラー: ${e}`)
  }

  console.log("\n(C) 目次更新チェック...")
  try {
    const { docsChanged, readmeChanged } = checkTocUpdate()
    if (docsChanged.length > 0) {
      if (!readmeChanged) {
        console.warn(
          `⚠️ docs/ に追加/削除がありますが docs/README.md が未更新です:\n${docsChanged.join("\n")}`,
        )
      } else {
        console.log("✓ 目次: OK (README更新済み)")
      }
    } else {
      console.log("✓ 目次: 変更なし")
    }
  } catch {
    /* v8 ignore next 1 */
    console.log("ℹ️ Git情報取得失敗、スキップ")
  }

  console.log("\n(D) packageManagerチェック...")
  try {
    if (existsSync("package.json")) {
      const pkg = JSON.parse(readFileSync("package.json", "utf-8"))
      const pm = pkg.packageManager as string | undefined
      if (!pm) {
        console.warn("⚠️ package.json に packageManager フィールドがありません")
      } else if (!pm.startsWith("pnpm@")) {
        console.warn(`⚠️ packageManager が pnpm ではありません: ${pm}`)
      } else {
        console.log(`✓ packageManager: ${pm}`)
      }
    }
  } catch (e) {
    console.error(`package.jsonチェックエラー: ${e}`)
  }

  console.log("\n=== 検証完了 ===")
  if (fail) {
    console.error("✗ 検証失敗")
    return false
  } else {
    console.log("✓ 全検証OK")
    return true
  }
}

export function main(): number {
  const ok = runVerifyDocs()
  return ok ? 0 : 1
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  const code = main()
  if (code !== 0) process.exit(code)
}
/* v8 ignore stop */
