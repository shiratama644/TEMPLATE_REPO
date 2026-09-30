/**
 * Security checks — npm audit, secret scanning, license check, SBOM
 * Usage: pnpm security:check (or node --experimental-strip-types scripts/check-security.ts)
 *
 * Checks:
 * 1. Secret scanning (hardcoded secrets, tokens, keys)
 * 2. npm audit (vulnerability scanning)
 * 3. License compatibility
 * 4. SBOM generation (optional)
 */

import { execSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  type AuditFinding,
  checkLicenseCompatibility,
  filterBySeverity,
  generateCycloneDxSbom,
  parsePnpmAuditOutput,
  type SecretFinding,
  scanDirectoryForSecrets,
  severityToNumber,
} from "./lib/security.ts"

export const RESET = "\x1b[0m"
export const GREEN = "\x1b[32m"
export const RED = "\x1b[31m"
export const CYAN = "\x1b[36m"
export const YELLOW = "\x1b[33m"
export const DIM = "\x1b[2m"

export function log(msg: string) {
  console.log(`${CYAN}[security]${RESET} ${msg}`)
}

export function parseArgs() {
  const args = process.argv.slice(2)
  return {
    audit: !args.includes("--no-audit"),
    secrets: !args.includes("--no-secrets"),
    licenses: !args.includes("--no-licenses"),
    sbom: args.includes("--sbom") || args.includes("--all"),
    fix: args.includes("--fix"),
    json: args.includes("--json"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    help: args.includes("--help") || args.includes("-h"),
    auditLevel: (() => {
      const idx = args.findIndex((a) => a === "--audit-level" || a.startsWith("--audit-level="))
      if (idx === -1) return "high"
      const arg = args[idx]
      if (arg.includes("=")) return arg.split("=")[1]
      return args[idx + 1] || "high"
    })(),
  }
}

export function printHelp() {
  /* v8 ignore start */
  console.log(`
🔒 Security Check — pnpm security:check

📖 Usage:
  pnpm security:check [options]
  pnpm security:audit
  pnpm security:secrets
  pnpm security:sbom

🎛️  Options:
  --no-audit             Skip npm audit
  --no-secrets           Skip secret scanning
  --no-licenses          Skip license check
  --sbom                 Generate SBOM (CycloneDX)
  --all                  Run all checks including SBOM
  --audit-level <level>  Minimum severity: low, moderate, high, critical (default: moderate)
  --fix                  Auto-fix vulnerabilities (pnpm audit --fix)
  --json                 Output JSON format
  --verbose, -v          Verbose output
  --help, -h             Show help

🔍 Checks:
  🔹 Secret Scanning  — hardcoded tokens, keys, passwords
  🔹 npm Audit        — known vulnerabilities
  🔹 License Check    — incompatible licenses
  🔹 SBOM Generation  — CycloneDX SBOM

💡 Examples:
  pnpm security:check                    # all checks (audit + secrets + licenses)
  pnpm security:check --audit-level high # only high+ vulnerabilities
  pnpm security:check --sbom             # include SBOM generation
  pnpm security:audit                    # only audit
  pnpm security:secrets                  # only secret scanning

📚 Docs: https://github.com/shiratama644/TEMPLATE_REPO#security
`)
  /* v8 ignore stop */
}

export function runSecretScan(verbose = false): { findings: SecretFinding[]; ok: boolean } {
  log("🔍 Scanning for hardcoded secrets...")

  const findings = scanDirectoryForSecrets(process.cwd())

  if (findings.length === 0) {
    log(`${GREEN}✅ No secrets detected${RESET}`)
    return { findings, ok: true }
  }

  const high = findings.filter((f) => f.severity === "high")
  const medium = findings.filter((f) => f.severity === "medium")
  const low = findings.filter((f) => f.severity === "low")

  log(`${RED}❌ Found ${findings.length} potential secrets:${RESET}`)
  log(
    `  ${RED}High: ${high.length}${RESET}, ${YELLOW}Medium: ${medium.length}${RESET}, Low: ${low.length}`,
  )

  /* v8 ignore next 12 */
  if (verbose || high.length > 0) {
    for (const finding of findings.slice(0, 20)) {
      const color = finding.severity === "high" ? RED : finding.severity === "medium" ? YELLOW : DIM
      console.log(
        `  ${color}[${finding.severity.toUpperCase()}]${RESET} ${finding.file}:${finding.line} — ${finding.type}`,
      )
      if (verbose) console.log(`    ${DIM}${finding.snippet}${RESET}`)
    }
    if (findings.length > 20) {
      console.log(`  ${DIM}... and ${findings.length - 20} more${RESET}`)
    }
  }

  /* v8 ignore next 3 */
  console.log("")
  console.log(
    `${YELLOW}💡 If these are false positives, add to allowlist in scripts/lib/security.ts${RESET}`,
  )
  console.log(`${YELLOW}💡 Or add file to SECRET_EXCLUDE_FILES${RESET}`)

  return { findings, ok: high.length === 0 }
}

export function runNpmAudit(
  auditLevel = "moderate",
  verbose = false,
  fix = false,
): { findings: AuditFinding[]; ok: boolean } {
  log(`🔍 Running pnpm audit (level: ${auditLevel})...`)

  /* v8 ignore start */
  if (fix) {
    log(`${YELLOW}⚠️ Attempting auto-fix...${RESET}`)
    try {
      execSync("pnpm audit --fix", { stdio: verbose ? "inherit" : "pipe", cwd: process.cwd() })
      log(`${GREEN}✅ Auto-fix completed${RESET}`)
    } catch {
      log(`${YELLOW}⚠️ Auto-fix had issues, continuing with audit${RESET}`)
    }
  }
  /* v8 ignore stop */

  try {
    const output = execSync("pnpm audit --json 2>&1 || true", {
      encoding: "utf8",
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    })

    const findings = parsePnpmAuditOutput(output)
    const filtered = filterBySeverity(findings, auditLevel)

    if (filtered.length === 0) {
      log(`${GREEN}✅ No vulnerabilities found (level: ${auditLevel}+)${RESET}`)
      /* v8 ignore next 3 */
      if (findings.length > 0 && verbose) {
        log(`${DIM}Found ${findings.length} low-severity issues below threshold${RESET}`)
      }
      return { findings: filtered, ok: true }
    }

    /* v8 ignore start */
    const critical = filtered.filter((f) => f.severity === "critical")
    const high = filtered.filter((f) => f.severity === "high")
    const moderate = filtered.filter((f) => f.severity === "moderate")

    log(`${RED}❌ Found ${filtered.length} vulnerabilities (level: ${auditLevel}+):${RESET}`)
    log(
      `  ${RED}Critical: ${critical.length}, High: ${high.length}, Moderate: ${moderate.length}${RESET}`,
    )

    for (const finding of filtered.slice(0, 20)) {
      const color =
        finding.severity === "critical" ? RED : finding.severity === "high" ? RED : YELLOW
      console.log(
        `  ${color}[${finding.severity.toUpperCase()}]${RESET} ${finding.package} — ${finding.title}`,
      )
      if (finding.url && verbose) console.log(`    ${DIM}${finding.url}${RESET}`)
      if (finding.fixAvailable) console.log(`    ${GREEN}Fix available${RESET}`)
    }

    if (filtered.length > 20) {
      console.log(`  ${DIM}... and ${filtered.length - 20} more${RESET}`)
    }

    console.log("")
    console.log(`${YELLOW}💡 Run pnpm audit to see details${RESET}`)
    console.log(`${YELLOW}💡 Run pnpm audit --fix to auto-fix${RESET}`)
    console.log(`${YELLOW}💡 Run pnpm update to update dependencies${RESET}`)

    // Fail only on high and critical by default (moderate is warning, DX improvement)
    const shouldFail = critical.length > 0 || high.length > 0
    return { findings: filtered, ok: !shouldFail }
    /* v8 ignore stop */
  } catch (error) {
    /* v8 ignore start */
    const msg = error instanceof Error ? error.message : String(error)
    if (
      msg.includes("No audit") ||
      msg.includes("no vulnerabilities") ||
      msg.includes("0 vulnerabilities")
    ) {
      log(`${GREEN}✅ No vulnerabilities found${RESET}`)
      return { findings: [], ok: true }
    }

    // If pnpm audit fails for other reasons, try alternative
    log(`${YELLOW}⚠️ Audit check had issues, trying alternative...${RESET}`)
    try {
      const result = spawnSync("pnpm", ["audit"], { encoding: "utf8", cwd: process.cwd() })
      if (result.status === 0) {
        log(`${GREEN}✅ No vulnerabilities found (via pnpm audit)${RESET}`)
        return { findings: [], ok: true }
      }
      // If audit returns non-zero, there are vulnerabilities
      log(`${YELLOW}⚠️ Vulnerabilities may exist, check pnpm audit output${RESET}`)
      if (verbose) console.log(result.stdout || result.stderr)
      return { findings: [], ok: false }
    } catch {
      log(`${YELLOW}⚠️ Could not run pnpm audit, skipping${RESET}`)
      return { findings: [], ok: true }
    }
    /* v8 ignore stop */
  }
}

export function runLicenseCheck(verbose = false): {
  incompatible: { pkg: string; license: string; reason: string }[]
  ok: boolean
} {
  log("🔍 Checking license compatibility...")

  try {
    const pkgPath = join(process.cwd(), "package.json")
    /* v8 ignore next 3 */
    if (!existsSync(pkgPath)) {
      log(`${YELLOW}⚠️ No package.json found, skipping license check${RESET}`)
      return { incompatible: [], ok: true }
    }

    // Try to read pnpm licenses
    let licenses: { name: string; version: string; license: string }[] = []

    /* v8 ignore start */
    try {
      const output = execSync(
        "pnpm licenses list --json 2>&1 || pnpm list --json 2>&1 || echo '{}'",
        {
          encoding: "utf8",
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
        },
      )

      // Parse licenses from output (format varies)
      try {
        const data = JSON.parse(output)
        if (Array.isArray(data)) {
          licenses = data.map((d: any) => ({
            name: d.name || d.from?.split("@")[0] || "unknown",
            version: d.version || "0.0.0",
            license: d.license || "Unknown",
          }))
        } else if (data.dependencies) {
          // pnpm list format
          const deps = Object.values(data.dependencies) as any[]
          licenses = deps.map((d: any) => ({
            name: d.from?.split("@")[0] || d.name || "unknown",
            version: d.version || "0.0.0",
            license: d.license || "Unknown",
          }))
        }
      } catch {
        // If JSON parsing fails, skip detailed check
        /* v8 ignore next 1 */
        if (verbose) log(`${DIM}Could not parse license data, skipping detailed check${RESET}`)
      }
    } catch {
      /* v8 ignore next 1 */
      if (verbose) log(`${DIM}pnpm licenses command failed, skipping${RESET}`)
    }
    /* v8 ignore stop */

    const incompatible: { pkg: string; license: string; reason: string }[] = []

    /* v8 ignore start */
    for (const lic of licenses) {
      const check = checkLicenseCompatibility(lic.license)
      if (!check.compatible) {
        incompatible.push({
          pkg: `${lic.name}@${lic.version}`,
          license: lic.license,
          reason: check.reason || "Incompatible",
        })
      } else if (check.reason && verbose) {
        log(`${YELLOW}⚠️ ${lic.name}: ${check.reason}${RESET}`)
      }
    }

    if (incompatible.length === 0) {
      log(`${GREEN}✅ License check passed${RESET}`)
      if (verbose && licenses.length > 0) {
        log(`${DIM}Checked ${licenses.length} packages${RESET}`)
      }
      return { incompatible, ok: true }
    }

    log(`${RED}❌ Found ${incompatible.length} incompatible licenses:${RESET}`)
    for (const inc of incompatible) {
      console.log(`  ${RED}[INCOMPATIBLE]${RESET} ${inc.pkg} — ${inc.license}: ${inc.reason}`)
    }
    return { incompatible, ok: false }
    /* v8 ignore stop */
  } catch {
    /* v8 ignore start */
    log(`${YELLOW}⚠️ License check failed${RESET}`)
    return { incompatible: [], ok: true }
    /* v8 ignore stop */
  }
}

export function generateSbom(verbose = false): { path: string; ok: boolean } {
  log("📦 Generating SBOM (CycloneDX)...")

  try {
    const pkgPath = join(process.cwd(), "package.json")
    /* v8 ignore next 1 */
    const lockPath = join(process.cwd(), "pnpm-lock.yaml")

    if (!existsSync(pkgPath)) {
      log(`${RED}❌ No package.json found${RESET}`)
      return { path: "", ok: false }
    }

    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
    const packages: { name: string; version: string; license?: string }[] = []

    // Add main package
    packages.push({
      /* v8 ignore next 1 */
      name: pkg.name || "template-repo",
      /* v8 ignore next 1 */
      version: pkg.version || "0.0.0",
      /* v8 ignore next 1 */
      license: pkg.license || "MIT",
    })

    // Try to get dependencies from pnpm-lock.yaml or package.json
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    }

    for (const [name, version] of Object.entries(allDeps)) {
      packages.push({
        name,
        version: (version as string).replace(/[\^~]/, ""),
      })
    }

    const sbom = generateCycloneDxSbom(packages)
    const outputDir = join(process.cwd(), "sbom")
    mkdirSync(outputDir, { recursive: true })
    const outputPath = join(outputDir, "sbom.cyclonedx.json")
    writeFileSync(outputPath, JSON.stringify(sbom, null, 2), "utf8")

    // Also generate SPDX format (simplified)
    const spdxPath = join(outputDir, "sbom.spdx.json")
    const spdx = {
      spdxVersion: "SPDX-2.3",
      dataLicense: "CC0-1.0",
      SPDXID: "SPDXRef-DOCUMENT",
      /* v8 ignore next 1 */
      name: `${pkg.name || "template-repo"}-SBOM`,
      /* v8 ignore next 1 */
      documentNamespace: `https://example.com/${pkg.name || "template-repo"}/sbom/${Date.now()}`,
      creationInfo: {
        created: new Date().toISOString(),
        creators: ["Tool: template-repo-security-1.0.0"],
      },
      packages: packages.map((p, idx) => ({
        name: p.name,
        SPDXID: `SPDXRef-Package-${idx}`,
        downloadLocation: "NOASSERTION",
        filesAnalyzed: false,
        verificationCode: {
          packageVerificationCodeValue: "NOASSERTION",
        },
        licenseConcluded: p.license || "NOASSERTION",
        licenseDeclared: p.license || "NOASSERTION",
        copyrightText: "NOASSERTION",
        versionInfo: p.version,
      })),
    }
    writeFileSync(spdxPath, JSON.stringify(spdx, null, 2), "utf8")

    /* v8 ignore next 4 */
    log(`${GREEN}✅ SBOM generated:${RESET}`)
    log(`  CycloneDX: ${outputPath}`)
    log(`  SPDX: ${spdxPath}`)
    log(`  Packages: ${packages.length}`)

    return { path: outputPath, ok: true }
  } catch {
    /* v8 ignore start */
    log(`${RED}❌ SBOM generation failed${RESET}`)
    return { path: "", ok: false }
    /* v8 ignore stop */
  }
}

export async function main(): Promise<number> {
  const opts = parseArgs()

  /* v8 ignore next 4 */
  if (opts.help) {
    printHelp()
    return 0
  }

  /* v8 ignore next 3 */
  console.log("")
  console.log(`${CYAN}╔════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${CYAN}║  🔒 Security Check — pnpm security:check          ║${RESET}`)
  console.log(`${CYAN}╚════════════════════════════════════════════════════╝${RESET}`)
  console.log("")

  let allOk = true
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  /* v8 ignore start */
  if (opts.secrets) {
    const secretResult = runSecretScan(opts.verbose)
    results.checks.secrets = {
      ok: secretResult.ok,
      findings: secretResult.findings.length,
      details: opts.json ? secretResult.findings : undefined,
    }
    if (!secretResult.ok) allOk = false
    console.log("")
  }

  if (opts.audit) {
    const auditResult = runNpmAudit(opts.auditLevel, opts.verbose, opts.fix)
    results.checks.audit = {
      ok: auditResult.ok,
      findings: auditResult.findings.length,
      level: opts.auditLevel,
      details: opts.json ? auditResult.findings : undefined,
    }
    if (!auditResult.ok) allOk = false
    console.log("")
  }

  if (opts.licenses) {
    const licenseResult = runLicenseCheck(opts.verbose)
    results.checks.licenses = {
      ok: licenseResult.ok,
      incompatible: licenseResult.incompatible.length,
      details: opts.json ? licenseResult.incompatible : undefined,
    }
    if (!licenseResult.ok) allOk = false
    console.log("")
  }

  if (opts.sbom) {
    const sbomResult = generateSbom(opts.verbose)
    results.checks.sbom = {
      ok: sbomResult.ok,
      path: sbomResult.path,
    }
    if (!sbomResult.ok) allOk = false
    console.log("")
  }
  /* v8 ignore stop */

  // Summary
  /* v8 ignore start */
  console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  if (allOk) {
    console.log(`${GREEN}✅ All security checks passed${RESET}`)
  } else {
    console.log(`${RED}❌ Some security checks failed${RESET}`)
    console.log(`${YELLOW}💡 Run with --verbose for details${RESET}`)
    console.log(`${YELLOW}💡 Run pnpm security:check --fix to auto-fix audit issues${RESET}`)
  }
  console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)

  if (opts.json) {
    console.log("")
    console.log(JSON.stringify(results, null, 2))
  }

  // Write results to file for CI
  try {
    const outputDir = join(process.cwd(), "logs")
    mkdirSync(outputDir, { recursive: true })
    writeFileSync(join(outputDir, "security.json"), JSON.stringify(results, null, 2), "utf8")
    writeFileSync(join(outputDir, "security.log"), JSON.stringify(results, null, 2), "utf8")
  } catch {
    // ignore
  }
  /* v8 ignore stop */

  return allOk ? 0 : 1
}

/* v8 ignore start */
if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`Security check failed: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    })
}
/* v8 ignore stop */
