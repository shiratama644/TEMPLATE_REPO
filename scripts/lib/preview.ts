/**
 * Preview Deploy helper — local preview generation
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { detectPreviewConfig } from "./cicd.ts"
import { logger } from "./logger.ts"

const log = logger.log.bind(logger)

export function buildPreviewInfo() {
  const files = readdirSync(process.cwd())
  const config = detectPreviewConfig(files)
  log(`🔍 Detected framework: ${config.framework}`)
  log(`📁 Output dir: ${config.outputDir}`)
  log(`🔨 Build command: ${config.buildCommand}`)

  const outputExists = existsSync(config.outputDir)
  /* v8 ignore start */
  if (!outputExists) {
    log(`⚠️ Output dir ${config.outputDir} not found — run ${config.buildCommand} first`)
  } else {
    const stats = statSync(config.outputDir)
    if (stats.isDirectory()) {
      const entries = readdirSync(config.outputDir)
      log(`📦 Found ${entries.length} files in ${config.outputDir}`)
    }
  }
  /* v8 ignore stop */

  return { config, outputExists }
}

export function createPreviewPlaceholder(targetDir = "preview") {
  /* v8 ignore next 1 */
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preview</title>
<style>
body{font-family:system-ui;max-width:800px;margin:0 auto;padding:2rem;line-height:1.6}
.hero{text-align:center;padding:2rem;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px}
.card{border:1px solid #ddd;padding:1rem;border-radius:8px;margin:1rem 0}
code{background:#f6f8fa;padding:0.2rem 0.4rem;border-radius:3px}
</style>
</head>
<body>
<div class="hero"><h1>🔍 Preview</h1><p>Template Repo Preview</p></div>
<div class="card">
<h2>Build not found</h2>
<p>Run <code>pnpm build</code> to generate preview.</p>
<p>Supported: Vite (dist), Next.js (.next), Astro (dist), Nuxt (.output/public)</p>
</div>
</body>
</html>`

  writeFileSync(join(targetDir, "index.html"), html, "utf8")
  log(`✅ Created placeholder preview at ${targetDir}/index.html`)
}

export function copyPreview(outputDir: string, targetDir = "preview") {
  if (!existsSync(outputDir)) {
    log(`⚠️ Output dir ${outputDir} missing — creating placeholder`)
    createPreviewPlaceholder(targetDir)
    return false
  }

  /* v8 ignore next 1 */
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

  /* v8 ignore start */
  try {
    cpSync(outputDir, targetDir, { recursive: true })
    log(`✅ Copied ${outputDir} → ${targetDir}`)
    return true
  } catch (e) {
    log(`❌ Failed to copy preview: ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
  /* v8 ignore stop */
}

/* v8 ignore start */
if (!process.env.VITEST) {
  const { config, outputExists } = buildPreviewInfo()
  if (outputExists) {
    copyPreview(config.outputDir)
  } else {
    createPreviewPlaceholder()
  }
}
/* v8 ignore stop */
