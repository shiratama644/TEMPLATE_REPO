/**
 * CI/CD utilities — Auto-merge, Preview, Bundle size, Lighthouse
 * CI/CD強化: 自動マージ、プレビュー、バンドルサイズ、Lighthouse
 */

export type AutomergeConfig = {
  allowedActors: string[]
  allowedLabels: string[]
  allowedPrefixes: string[]
  blockedKeywords: string[]
  requireLabels?: string[]
  autoMergeMethod: "squash" | "merge" | "rebase"
  minApprovals?: number
}

export const DEFAULT_AUTOMERGE_CONFIG: AutomergeConfig = {
  allowedActors: ["renovate[bot]", "dependabot[bot]", "github-actions[bot]"],
  allowedLabels: ["dependencies", "automerge", "renovate", "dependabot"],
  allowedPrefixes: ["chore:", "chore(deps)", "chore(deps):", "fix(deps)", "chore(deps-dev)"],
  blockedKeywords: ["major", "BREAKING", "breaking change"],
  autoMergeMethod: "squash",
  minApprovals: 0,
}

export function shouldAutomerge(
  actor: string,
  title: string,
  labels: string[],
  isDraft: boolean,
  config = DEFAULT_AUTOMERGE_CONFIG,
): { should: boolean; reason: string } {
  if (isDraft) {
    return { should: false, reason: "Draft PR" }
  }

  const hasAllowedLabel = labels.some((l) => config.allowedLabels.includes(l))
  const isAllowedActor = config.allowedActors.includes(actor)
  const hasAllowedPrefix =
    config.allowedPrefixes.some((p) => title.startsWith(p)) || title.includes("deps:")

  if (!isAllowedActor && !hasAllowedLabel && !hasAllowedPrefix) {
    return { should: false, reason: "Not allowed actor/label/prefix" }
  }

  const hasBlocked = config.blockedKeywords.some(
    (kw) => title.toLowerCase().includes(kw.toLowerCase()) || title.includes(kw),
  )
  if (hasBlocked) {
    return { should: false, reason: "Blocked keyword found (major/BREAKING)" }
  }

  return { should: true, reason: "Allowed for auto-merge" }
}

export type PreviewConfig = {
  framework: "vite" | "next" | "astro" | "nuxt" | "unknown"
  outputDir: string
  buildCommand: string
  port: number
}

export function detectPreviewConfig(files: string[]): PreviewConfig {
  const hasFile = (name: string) => files.some((f) => f.endsWith(name) || f === name)

  if (hasFile("next.config.js") || hasFile("next.config.mjs") || hasFile("next.config.ts")) {
    return { framework: "next", outputDir: ".next", buildCommand: "pnpm build:next", port: 3000 }
  }
  if (hasFile("vite.config.ts") || hasFile("vite.config.js") || hasFile("vite.config.mjs")) {
    return { framework: "vite", outputDir: "dist", buildCommand: "pnpm build:vite", port: 5173 }
  }
  if (hasFile("astro.config.mjs") || hasFile("astro.config.ts")) {
    return { framework: "astro", outputDir: "dist", buildCommand: "pnpm build", port: 4321 }
  }
  if (hasFile("nuxt.config.ts") || hasFile("nuxt.config.js")) {
    return {
      framework: "nuxt",
      outputDir: ".output/public",
      buildCommand: "pnpm build",
      port: 3000,
    }
  }
  return { framework: "unknown", outputDir: "dist", buildCommand: "pnpm build", port: 3000 }
}

export type BundleSizeResult = {
  name: string
  size: number
  limit?: number
  passed: boolean
  diff?: number
}

export function parseSizeLimitOutput(output: string): BundleSizeResult[] {
  const results: BundleSizeResult[] = []
  const lines = output.split("\n")

  for (const line of lines) {
    // Example: "  template core — 5.2 kB (limit: 10 kB)"
    // Or: "  path: src/index.ts — 5.2 kB"
    const match = line.match(
      /(.+?)\s*[—-]\s*([\d.]+)\s*([a-zA-Z]+)(?:\s*\(limit:\s*([\d.]+)\s*([a-zA-Z]+)\))?/,
    )
    if (match) {
      const name = match[1].trim()
      const sizeStr = match[2]
      const unit = match[3]
      const limitStr = match[4]
      // const limitUnit = match[5]

      const size = parseSizeToBytes(sizeStr, unit)
      /* v8 ignore next 1 */
      const limit = limitStr ? parseSizeToBytes(limitStr, match[5] || unit) : undefined
      const passed = limit ? size <= limit : true

      results.push({ name, size, limit, passed })
    }
  }

  return results
}

export function parseSizeToBytes(value: string, unit: string): number {
  const num = parseFloat(value)
  const u = unit.toLowerCase()
  if (u.startsWith("b") && !u.includes("k") && !u.includes("m") && !u.includes("g")) return num
  if (u.startsWith("k")) return num * 1024
  if (u.startsWith("m")) return num * 1024 * 1024
  if (u.startsWith("g")) return num * 1024 * 1024 * 1024
  return num
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function calculateDiff(
  current: number,
  baseline: number,
): { diff: number; percent: number; increased: boolean } {
  const diff = current - baseline
  const percent = baseline === 0 ? 0 : (diff / baseline) * 100
  return { diff, percent, increased: diff > 0 }
}

export type LighthouseThresholds = {
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  pwa?: number
  fcp?: number
  lcp?: number
  cls?: number
  tbt?: number
}

export const DEFAULT_LIGHTHOUSE_THRESHOLDS: LighthouseThresholds = {
  performance: 0.7,
  accessibility: 0.8,
  bestPractices: 0.8,
  seo: 0.8,
  fcp: 3000,
  lcp: 4000,
  cls: 0.15,
  tbt: 500,
}

export type LighthouseResult = {
  url: string
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  pwa?: number
  fcp?: number
  lcp?: number
  cls?: number
  tbt?: number
  passed: boolean
}

export function checkLighthouseThresholds(
  result: LighthouseResult,
  thresholds = DEFAULT_LIGHTHOUSE_THRESHOLDS,
): { passed: boolean; failures: string[] } {
  const failures: string[] = []

  if (result.performance < thresholds.performance) {
    failures.push(`performance ${result.performance} < ${thresholds.performance}`)
  }
  if (result.accessibility < thresholds.accessibility) {
    failures.push(`accessibility ${result.accessibility} < ${thresholds.accessibility}`)
  }
  if (result.bestPractices < thresholds.bestPractices) {
    failures.push(`best-practices ${result.bestPractices} < ${thresholds.bestPractices}`)
  }
  if (result.seo < thresholds.seo) {
    failures.push(`seo ${result.seo} < ${thresholds.seo}`)
  }
  if (thresholds.fcp && result.fcp && result.fcp > thresholds.fcp) {
    failures.push(`FCP ${result.fcp}ms > ${thresholds.fcp}ms`)
  }
  if (thresholds.lcp && result.lcp && result.lcp > thresholds.lcp) {
    failures.push(`LCP ${result.lcp}ms > ${thresholds.lcp}ms`)
  }
  if (thresholds.cls && result.cls && result.cls > thresholds.cls) {
    failures.push(`CLS ${result.cls} > ${thresholds.cls}`)
  }
  if (thresholds.tbt && result.tbt && result.tbt > thresholds.tbt) {
    failures.push(`TBT ${result.tbt}ms > ${thresholds.tbt}ms`)
  }

  return { passed: failures.length === 0, failures }
}

export function generatePreviewUrl(pr: number, baseUrl = "https://example.com"): string {
  return `${baseUrl}/preview/pr-${pr}/`
}

export function generateBundleSizeComment(
  results: BundleSizeResult[],
  baseline?: BundleSizeResult[],
): string {
  const lines: string[] = []
  lines.push("### 📦 Bundle Size Report")
  lines.push("")
  lines.push("| Package | Size | Limit | Status | Diff |")
  lines.push("|---------|------|-------|--------|------|")

  for (const r of results) {
    const sizeStr = formatBytes(r.size)
    /* v8 ignore next 1 */
    const limitStr = r.limit ? formatBytes(r.limit) : "-"
    const status = r.passed ? "✅" : "❌"
    let diffStr = "-"
    if (baseline) {
      const base = baseline.find((b) => b.name === r.name)
      if (base) {
        const { diff, percent, increased } = calculateDiff(r.size, base.size)
        const sign = increased ? "+" : ""
        diffStr = `${sign}${formatBytes(diff)} (${sign}${percent.toFixed(1)}%)`
        /* v8 ignore next 2 */
        if (increased) diffStr = `🔴 ${diffStr}`
        else if (diff < 0) diffStr = `🟢 ${diffStr}`
      }
    }
    lines.push(`| ${r.name} | ${sizeStr} | ${limitStr} | ${status} | ${diffStr} |`)
  }

  lines.push("")
  lines.push("> 💡 Run `pnpm size` locally to check")
  return lines.join("\n")
}

export function generateLighthouseComment(results: LighthouseResult[]): string {
  const lines: string[] = []
  lines.push("### 🔦 Lighthouse CI Report")
  lines.push("")
  lines.push("| URL | Perf | A11y | BP | SEO | FCP | LCP | CLS | Status |")
  lines.push("|-----|------|------|----|----|-----|-----|-----|--------|")

  for (const r of results) {
    const check = checkLighthouseThresholds(r)
    const status = check.passed ? "✅" : "⚠️"
    lines.push(
      `| ${r.url} | ${(r.performance * 100).toFixed(0)} | ${(r.accessibility * 100).toFixed(0)} | ${(r.bestPractices * 100).toFixed(0)} | ${(r.seo * 100).toFixed(0)} | ${r.fcp ? `${r.fcp}ms` : "-"} | ${r.lcp ? `${r.lcp}ms` : "-"} | ${r.cls ?? "-"} | ${status} |`,
    )
  }

  lines.push("")
  lines.push("> Edit `lighthouserc.json` to customize thresholds")
  return lines.join("\n")
}
