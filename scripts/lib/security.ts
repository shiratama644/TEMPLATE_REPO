/**
 * Security utilities — secret scanning, audit parsing, SBOM helpers
 * セキュリティ強化: シークレット検出、監査、SBOM生成
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

export type SecretFinding = {
  file: string
  line: number
  type: string
  snippet: string
  severity: "high" | "medium" | "low"
}

export type AuditFinding = {
  package: string
  severity: "critical" | "high" | "moderate" | "low" | "info"
  title: string
  url?: string
  fixAvailable?: boolean
}

// Common secret patterns (based on gitleaks/trufflehog + custom)
export const SECRET_PATTERNS: {
  name: string
  pattern: RegExp
  severity: SecretFinding["severity"]
}[] = [
  // High severity - direct secrets
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/, severity: "high" },
  {
    name: "AWS Secret Key",
    pattern: /aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9/+=]{40}['"]?/i,
    severity: "high",
  },
  { name: "GitHub Token (classic)", pattern: /ghp_[A-Za-z0-9_]{36,}/, severity: "high" },
  {
    name: "GitHub Token (fine-grained)",
    pattern: /github_pat_[A-Za-z0-9_]{22,}/,
    severity: "high",
  },
  { name: "GitHub OAuth", pattern: /gho_[A-Za-z0-9_]{36,}/, severity: "high" },
  { name: "NPM Token", pattern: /npm_[A-Za-z0-9]{36,}/, severity: "high" },
  {
    name: "Private Key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: "high",
  },
  {
    name: "Slack Token",
    pattern: /xox[bpras]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}/,
    severity: "high",
  },
  { name: "Stripe Key (live)", pattern: /sk_live_[0-9a-zA-Z]{24,}/, severity: "high" },
  { name: "Google API Key", pattern: /AIza[0-9A-Za-z-_]{35}/, severity: "high" },
  {
    name: "Generic API Key",
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/i,
    severity: "medium",
  },
  {
    name: "Password in code",
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    severity: "high",
  },
  {
    name: "Hardcoded Secret",
    pattern: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/i,
    severity: "medium",
  },
  {
    name: "Database URL",
    pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s]+/i,
    severity: "high",
  },
  {
    name: "JWT",
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    severity: "medium",
  },
]

export const SECRET_ALLOWLIST: RegExp[] = [
  /your-github-username/,
  /your[_-]?api[_-]?key/i,
  /example\.com/,
  /test[_-]?token/i,
  /fake[_-]?secret/i,
  /placeholder/i,
  /xxx+/i,
  /sk_test_/,
  /pk_test_/,
  /ghp_example/,
]

export const SECRET_EXCLUDE_FILES: RegExp[] = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /\.next\//,
  /coverage\//,
  /\.turbo\//,
  /pnpm-lock\.yaml/,
  /\.md$/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /__tests__\//,
  /\.example/,
  /\.template/,
  /bench\//,
  /e2e\//,
]

export function shouldExcludeFile(filePath: string): boolean {
  return SECRET_EXCLUDE_FILES.some((re) => re.test(filePath))
}

export function isAllowlisted(content: string): boolean {
  return SECRET_ALLOWLIST.some((re) => re.test(content))
}

export function scanFileForSecrets(filePath: string): SecretFinding[] {
  if (shouldExcludeFile(filePath)) return []
  if (!existsSync(filePath)) return []

  let content: string
  try {
    content = readFileSync(filePath, "utf8")
  } catch {
    /* v8 ignore next 1 */
    return []
  }

  const findings: SecretFinding[] = []
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    // Skip comments that are clearly examples or docs
    if (trimmed.startsWith("//") && isAllowlisted(trimmed)) continue
    if (trimmed.startsWith("*") && isAllowlisted(trimmed)) continue
    if (trimmed.startsWith("#") && isAllowlisted(trimmed)) continue

    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        if (isAllowlisted(line)) continue
        // Additional check: if line contains example/test/fake, skip
        if (/example|test|fake|placeholder|your-/i.test(line) && severity !== "high") continue

        findings.push({
          file: filePath,
          line: i + 1,
          type: name,
          snippet: trimmed.slice(0, 120),
          severity,
        })
      }
    }
  }

  return findings
}

export function collectFilesRecursive(dir: string, exts?: string[]): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      /* v8 ignore next 3 */
      if (entry.startsWith(".") && entry !== ".env.example" && entry !== ".env.template") {
        if ([".git", ".next", ".turbo", "node_modules", "coverage", "dist"].includes(entry))
          continue
      }
      const full = join(dir, entry)
      try {
        const stat = statSync(full)
        if (stat.isDirectory()) {
          files.push(...collectFilesRecursive(full, exts))
        } else {
          /* v8 ignore next 3 */
          if (stat.isFile()) {
            if (!exts || exts.some((ext) => full.endsWith(ext))) {
              files.push(full)
            }
          }
        }
      } catch {
        /* v8 ignore next 1 */
        // ignore
      }
    }
  } catch {
    /* v8 ignore next 1 */
    // ignore
  }

  return files
}

export function scanDirectoryForSecrets(
  dir = process.cwd(),
  exts = [".ts", ".js", ".mjs", ".cjs", ".json", ".env", ".yml", ".yaml", ".toml"],
): SecretFinding[] {
  const files = collectFilesRecursive(dir, exts)
  const allFindings: SecretFinding[] = []

  for (const file of files) {
    if (shouldExcludeFile(file)) continue
    // Only scan relevant files
    /* v8 ignore next 1 */
    if (exts.length > 0 && !exts.some((ext) => file.endsWith(ext))) continue
    const findings = scanFileForSecrets(file)
    allFindings.push(...findings)
  }

  return allFindings
}

export function parsePnpmAuditOutput(jsonStr: string): AuditFinding[] {
  try {
    const data = JSON.parse(jsonStr)
    const findings: AuditFinding[] = []

    // pnpm audit --json format
    if (data.advisories) {
      for (const advisory of Object.values(data.advisories) as any[]) {
        findings.push({
          package: advisory.module_name || "unknown",
          severity: advisory.severity || "moderate",
          title: advisory.title || advisory.overview || "Vulnerability",
          url: advisory.url,
          fixAvailable: !!advisory.patched_versions,
        })
      }
    }

    // Alternative format: vulnerabilities
    if (data.vulnerabilities) {
      for (const [pkg, vuln] of Object.entries(data.vulnerabilities as any)) {
        const v = vuln as any
        findings.push({
          package: pkg,
          severity: v.severity || "moderate",
          title: v.via?.[0]?.title || v.via?.[0] || "Vulnerability",
          url: v.via?.[0]?.url,
          fixAvailable: !!v.fixAvailable,
        })
      }
    }

    return findings
  } catch {
    return []
  }
}

export function severityToNumber(severity: string): number {
  switch (severity) {
    case "critical":
      return 4
    case "high":
      return 3
    case "moderate":
      return 2
    case "low":
      return 1
    default:
      return 0
  }
}

export function filterBySeverity(findings: AuditFinding[], minSeverity: string): AuditFinding[] {
  const minLevel = severityToNumber(minSeverity)
  return findings.filter((f) => severityToNumber(f.severity) >= minLevel)
}

// SBOM helpers
export type SbomPackage = {
  name: string
  version: string
  license?: string
  purl?: string
}

export function generateCycloneDxSbom(packages: SbomPackage[]): object {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${generateUuid()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: {
        components: [
          {
            type: "application",
            name: "template-repo-security",
            version: "1.0.0",
          },
        ],
      },
    },
    components: packages.map((pkg) => ({
      type: "library",
      name: pkg.name,
      version: pkg.version,
      purl: pkg.purl || `pkg:npm/${pkg.name}@${pkg.version}`,
      licenses: pkg.license ? [{ license: { id: pkg.license } }] : undefined,
    })),
  }
}

function generateUuid(): string {
  // Simple UUID v4 generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function checkLicenseCompatibility(license: string): {
  compatible: boolean
  reason?: string
} {
  const incompatible = ["GPL-2.0", "GPL-3.0", "AGPL-1.0", "AGPL-3.0", "SSPL-1.0"]
  const permissive = [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "0BSD",
    "CC0-1.0",
    "Unlicense",
  ]

  if (incompatible.some((l) => license.includes(l))) {
    return { compatible: false, reason: `Incompatible license: ${license} (copyleft)` }
  }

  if (permissive.some((l) => license.includes(l))) {
    return { compatible: true }
  }

  // Unknown or other licenses - warn but allow
  return { compatible: true, reason: `Unknown license: ${license} - manual review needed` }
}
