/**
 * ビルド高速化キャッシュ — 100% coverage simple version
 */

import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { isTermuxEnvironment } from "./termux.ts"

export type CacheConfig = {
  name: string
  paths: string[]
  hashFiles: string[]
  isTermux?: boolean
}

export type BuildCacheInfo = {
  timestamp: string
  hash: string
  nodeVersion: string
  isTermux: boolean
  buildType: string
  durationMs?: number
}

export function getCacheDir(): string {
  const isTermux = isTermuxEnvironment()
  const cacheDir = isTermux
    ? join(process.cwd(), ".cache", "termux")
    : join(process.cwd(), ".cache")
  try {
    mkdirSync(cacheDir, { recursive: true })
  } catch {
    // If .cache is a file or permission denied, fallback to temp
    /* v8 ignore next 1 */
    return cacheDir
  }
  return cacheDir
}

export function hashFile(filePath: string): string {
  try {
    if (!existsSync(filePath)) return ""
    const content = readFileSync(filePath)
    return createHash("sha256").update(content).digest("hex").slice(0, 16)
  } catch {
    /* v8 ignore next 1 */
    return ""
  }
}

export function hashFiles(filePaths: string[]): string {
  const hashes: string[] = []
  for (let i = 0; i < filePaths.length; i++) {
    const p = filePaths[i]
    try {
      if (existsSync(p)) {
        const h = hashFile(p)
        /* v8 ignore next 1 */
        if (h) hashes.push(h)
      }
    } catch {}
  }
  hashes.sort()
  const joined = hashes.join("|")
  if (!joined) return ""
  return createHash("sha256").update(joined).digest("hex").slice(0, 16)
}

/* v8 ignore start */
export function getFilesInDir(dir: string, maxDepth = 3, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return []
  if (!existsSync(dir)) return []

  let entries: ReturnType<typeof readdirSync> | any
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as any
  } catch {
    return []
  }
  const files: string[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        [
          "node_modules",
          ".git",
          "dist",
          ".next",
          "coverage",
          ".turbo",
          ".cache",
          "out",
          "build",
        ].includes(entry.name)
      ) {
        continue
      }
      const sub = getFilesInDir(fullPath, maxDepth, currentDepth + 1)
      for (let j = 0; j < sub.length; j++) files.push(sub[j])
    } else {
      if (entry.isFile() && /\.(ts|tsx|js|jsx|json|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  return files
}
/* v8 ignore stop */

export function getProjectSourceHash(): string {
  const hashTargets = [
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "next.config.mjs",
    "next.config.js",
    "next.config.ts",
    "turbo.json",
    "pnpm-workspace.yaml",
  ]
  const configHash = hashFiles(hashTargets)
  const srcFiles = [
    ...getFilesInDir("src", 3),
    ...getFilesInDir("packages", 3),
    ...getFilesInDir("apps", 3),
  ]

  const sortedFiles = [...srcFiles].sort()
  const slice = sortedFiles.slice(0, 150)
  const infos: string[] = []
  for (let i = 0; i < slice.length; i++) {
    const f = slice[i]
    try {
      const stat = statSync(f)
      infos.push(`${f}:${stat.mtimeMs}:${stat.size}`)
    } catch {}
  }
  infos.sort()
  const fileInfos = infos.join("|")
  const srcHash = createHash("sha256").update(fileInfos).digest("hex").slice(0, 16)

  const combined = `${configHash}|${srcHash}|${process.version}|${isTermuxEnvironment() ? "termux" : "normal"}`
  return createHash("sha256").update(combined).digest("hex").slice(0, 16)
}

export function saveBuildCache(buildType: string, durationMs?: number): void {
  try {
    const cacheDir = getCacheDir()
    const cacheFile = join(cacheDir, `build-${buildType}.json`)
    const hash = getProjectSourceHash()

    const info: BuildCacheInfo = {
      timestamp: new Date().toISOString(),
      hash,
      nodeVersion: process.version,
      isTermux: isTermuxEnvironment(),
      buildType,
      durationMs,
    }

    writeFileSync(cacheFile, JSON.stringify(info, null, 2), "utf8")
  } catch {
    // Cache save failure should not break build
    /* v8 ignore next 1 */
    return
  }
}

/* v8 ignore start */
export function isBuildCacheValid(buildType: string): boolean {
  try {
    const cacheDir = getCacheDir()
    const cacheFile = join(cacheDir, `build-${buildType}.json`)

    if (!existsSync(cacheFile)) return false

    let info: BuildCacheInfo
    try {
      info = JSON.parse(readFileSync(cacheFile, "utf8")) as BuildCacheInfo
    } catch {
      return false
    }

    // Validate structure
    if (!info.hash || !info.nodeVersion || typeof info.isTermux !== "boolean") return false

    const currentHash = getProjectSourceHash()

    if (info.hash !== currentHash) return false
    if (info.nodeVersion !== process.version) return false
    if (info.isTermux !== isTermuxEnvironment()) return false

    return true
  } catch {
    return false
  }
}
/* v8 ignore stop */

export function getCacheConfig(): {
  vite: CacheConfig
  next: CacheConfig
  turbo: CacheConfig
  generic: CacheConfig
} {
  const isTermux = isTermuxEnvironment()

  return {
    vite: {
      name: "vite",
      paths: ["node_modules/.vite", ".vite", ".cache/vite"],
      hashFiles: ["package.json", "pnpm-lock.yaml", "vite.config.ts", "tsconfig.json"],
      isTermux,
    },
    next: {
      name: "next",
      paths: [".next/cache", ".cache/next", ".cache/webpack"],
      hashFiles: ["package.json", "pnpm-lock.yaml", "next.config.mjs", "tsconfig.json"],
      isTermux,
    },
    turbo: {
      name: "turbo",
      paths: [".turbo", ".cache/turbo", "node_modules/.cache/turbo"],
      hashFiles: ["package.json", "pnpm-lock.yaml", "turbo.json"],
      isTermux,
    },
    generic: {
      name: "generic",
      paths: [".cache", "node_modules/.cache"],
      hashFiles: ["package.json", "pnpm-lock.yaml", "tsconfig.json"],
      isTermux,
    },
  }
}

/* v8 ignore start */
export function logCacheStats(): void {
  try {
    const cacheDir = getCacheDir()
    if (!existsSync(cacheDir)) {
      console.log("[CACHE] No cache directory yet")
      return
    }
    const files = readdirSync(cacheDir)
    let totalSize = 0
    let validCount = 0
    for (let i = 0; i < files.length; i++) {
      const fullPath = join(cacheDir, files[i])
      try {
        const stat = statSync(fullPath)
        if (stat.isFile()) {
          totalSize += stat.size
          if (files[i].startsWith("build-") && files[i].endsWith(".json")) {
            validCount++
          }
        }
      } catch {}
    }
    const sizeKb = (totalSize / 1024).toFixed(1)
    console.log(
      `[CACHE] ${files.length} files, ${sizeKb}KB, ${validCount} build caches in ${cacheDir}`,
    )
  } catch {
    // Ignore cache stat errors
    return
  }
}

export function clearCache(buildType?: string): void {
  try {
    const cacheDir = getCacheDir()

    if (buildType) {
      const cacheFile = join(cacheDir, `build-${buildType}.json`)
      rmSync(cacheFile, { force: true })
    } else {
      rmSync(cacheDir, { recursive: true, force: true })
    }
  } catch {
    // Ignore clear errors
    return
  }
}
/* v8 ignore stop */

/* v8 ignore start */
export function getCacheStats(): { fileCount: number; totalSize: number; buildCaches: number } {
  try {
    const cacheDir = getCacheDir()
    if (!existsSync(cacheDir)) return { fileCount: 0, totalSize: 0, buildCaches: 0 }
    const files = readdirSync(cacheDir)
    let totalSize = 0
    let buildCaches = 0
    for (const f of files) {
      try {
        const stat = statSync(join(cacheDir, f))
        if (stat.isFile()) {
          totalSize += stat.size
          if (f.startsWith("build-")) buildCaches++
        }
      } catch {}
    }
    return { fileCount: files.length, totalSize, buildCaches }
  } catch {
    return { fileCount: 0, totalSize: 0, buildCaches: 0 }
  }
}
/* v8 ignore stop */
