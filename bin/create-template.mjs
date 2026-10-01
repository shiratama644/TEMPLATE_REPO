#!/usr/bin/env node
/**
 * pnpm create template — Quick scaffolding
 * Usage: pnpm create template my-app --template vite
 */

import { existsSync, mkdirSync, cpSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const targetName = args[0] || "my-app"
const templateFlagIndex = args.findIndex((a) => a === "--template" || a === "-t")
const template = templateFlagIndex !== -1 ? args[templateFlagIndex + 1] : "default"

const targetPath = resolve(process.cwd(), targetName)

if (existsSync(targetPath)) {
  console.error(`✖ Target directory already exists: ${targetPath}`)
  process.exit(1)
}

const root = fileURLToPath(new URL("..", import.meta.url))

console.log(`\n✔ Creating new project: ${targetName}`)
console.log(`  Template: ${template}`)
console.log(`  Path: ${targetPath}\n`)

mkdirSync(targetPath, { recursive: true })

// Copy base files excluding node_modules, dist, .git, etc.
const exclude = new Set([
  "node_modules",
  "dist",
  ".git",
  ".turbo",
  ".next",
  "coverage",
  targetName,
])

function copyRecursive(src, dest) {
  const entries = awaitImportDir(src)
  for (const entry of entries) {
    if (exclude.has(entry)) continue
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    try {
      cpSync(srcPath, destPath, { recursive: true, force: true })
    } catch {
      // Ignore copy errors for optional files
    }
  }
}

function awaitImportDir(dir) {
  try {
    const { readdirSync } = require("node:fs")
    return readdirSync(dir)
  } catch {
    return []
  }
}

// Simplified: copy key files
import { readdirSync } from "node:fs"
const filesToCopy = readdirSync(root).filter((f) => !exclude.has(f) && !f.startsWith("bin"))

for (const file of filesToCopy) {
  const src = join(root, file)
  const dest = join(targetPath, file)
  try {
    cpSync(src, dest, { recursive: true, force: true })
  } catch {}
}

console.log(`\n✔ Project created at ${targetPath}`)
console.log(`\nNext steps:`)
console.log(`  cd ${targetName}`)
console.log(`  pnpm install`)
console.log(`  pnpm dev\n`)

if (template !== "default") {
  console.log(`Note: Template '${template}' selection will be fully supported in future release.`)
  console.log(`Currently scaffolds the default template.\n`)
}
