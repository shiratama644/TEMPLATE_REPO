import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkLicenseCompatibility,
  collectFilesRecursive,
  filterBySeverity,
  generateCycloneDxSbom,
  isAllowlisted,
  parsePnpmAuditOutput,
  SECRET_PATTERNS,
  scanDirectoryForSecrets,
  scanFileForSecrets,
  severityToNumber,
  shouldExcludeFile,
} from "../../../scripts/lib/security.ts"

describe("security.ts", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "security-test-"))
  })

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  })

  describe("shouldExcludeFile", () => {
    it("excludes node_modules", () => {
      expect(shouldExcludeFile("node_modules/foo/bar.js")).toBe(true)
    })
    it("excludes dist", () => {
      expect(shouldExcludeFile("dist/index.js")).toBe(true)
    })
    it("excludes test files", () => {
      expect(shouldExcludeFile("src/foo.test.ts")).toBe(true)
    })
    it("includes src files", () => {
      expect(shouldExcludeFile("src/index.ts")).toBe(false)
    })
    it("excludes md", () => {
      expect(shouldExcludeFile("README.md")).toBe(true)
    })
  })

  describe("isAllowlisted", () => {
    it("detects allowlisted patterns", () => {
      expect(isAllowlisted("your-github-username")).toBe(true)
      expect(isAllowlisted("test_token_123")).toBe(true)
      expect(isAllowlisted("example.com")).toBe(true)
    })
    it("not allowlisted for real secret", () => {
      expect(isAllowlisted("ghp_1234567890abcdefghijklmnopqrstuv")).toBe(false)
    })
  })

  describe("scanFileForSecrets", () => {
    it("detects no secrets in clean file", () => {
      const file = join(tmpDir, "clean.ts")
      writeFileSync(file, "const x = 1;\nconst y = 'hello';\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })

    it("detects private key", () => {
      const file = join(tmpDir, "key.ts")
      writeFileSync(file, "const key = '-----BEGIN RSA PRIVATE KEY-----';\n")
      const findings = scanFileForSecrets(file)
      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].type).toBe("Private Key")
    })

    it("detects github token", () => {
      const file = join(tmpDir, "token.ts")
      writeFileSync(file, "const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';\n")
      const findings = scanFileForSecrets(file)
      expect(findings.length).toBeGreaterThan(0)
    })

    it("ignores allowlisted", () => {
      const file = join(tmpDir, "allow.ts")
      writeFileSync(file, "const x = 'your-github-username';\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })

    it("excludes files via pattern", () => {
      const findings = scanFileForSecrets("node_modules/foo.js")
      expect(findings).toHaveLength(0)
    })

    it("handles missing file", () => {
      const findings = scanFileForSecrets(join(tmpDir, "nonexistent.ts"))
      expect(findings).toHaveLength(0)
    })

    it("detects AWS key", () => {
      const file = join(tmpDir, "aws.ts")
      writeFileSync(file, "const key = 'AKIAIOSFODNN7EXAMPLE';\n")
      const findings = scanFileForSecrets(file)
      expect(findings.length).toBeGreaterThan(0)
    })

    it("detects password", () => {
      const file = join(tmpDir, "pwd.ts")
      writeFileSync(file, "const password = 'supersecret123';\n")
      const findings = scanFileForSecrets(file)
      expect(findings.length).toBeGreaterThan(0)
    })
  })

  describe("collectFilesRecursive", () => {
    it("collects files", () => {
      writeFileSync(join(tmpDir, "a.ts"), "a")
      mkdirSync(join(tmpDir, "sub"))
      writeFileSync(join(tmpDir, "sub", "b.ts"), "b")
      const files = collectFilesRecursive(tmpDir, [".ts"])
      expect(files.length).toBe(2)
    })

    it("returns empty for nonexistent", () => {
      const files = collectFilesRecursive("/nonexistent/path/xyz")
      expect(files).toHaveLength(0)
    })
  })

  describe("parsePnpmAuditOutput", () => {
    it("parses advisories format", () => {
      const json = JSON.stringify({
        advisories: {
          "1": {
            module_name: "lodash",
            severity: "high",
            title: "Prototype Pollution",
            url: "https://example.com",
            patched_versions: ">=4.17.21",
          },
        },
      })
      const findings = parsePnpmAuditOutput(json)
      expect(findings).toHaveLength(1)
      expect(findings[0].package).toBe("lodash")
      expect(findings[0].severity).toBe("high")
    })

    it("parses vulnerabilities format", () => {
      const json = JSON.stringify({
        vulnerabilities: {
          lodash: {
            severity: "high",
            via: [{ title: "Prototype Pollution", url: "https://example.com" }],
            fixAvailable: true,
          },
        },
      })
      const findings = parsePnpmAuditOutput(json)
      expect(findings).toHaveLength(1)
      expect(findings[0].package).toBe("lodash")
    })

    it("handles invalid json", () => {
      const findings = parsePnpmAuditOutput("invalid json")
      expect(findings).toHaveLength(0)
    })

    it("handles empty", () => {
      const findings = parsePnpmAuditOutput("{}")
      expect(findings).toHaveLength(0)
    })
  })

  describe("severityToNumber", () => {
    it("converts severities", () => {
      expect(severityToNumber("critical")).toBe(4)
      expect(severityToNumber("high")).toBe(3)
      expect(severityToNumber("moderate")).toBe(2)
      expect(severityToNumber("low")).toBe(1)
      expect(severityToNumber("info")).toBe(0)
      expect(severityToNumber("unknown")).toBe(0)
    })
  })

  describe("filterBySeverity", () => {
    it("filters by severity", () => {
      const findings = [
        { package: "a", severity: "low" as const, title: "low" },
        { package: "b", severity: "moderate" as const, title: "moderate" },
        { package: "c", severity: "high" as const, title: "high" },
        { package: "d", severity: "critical" as const, title: "critical" },
      ]
      expect(filterBySeverity(findings, "high")).toHaveLength(2)
      expect(filterBySeverity(findings, "moderate")).toHaveLength(3)
      expect(filterBySeverity(findings, "low")).toHaveLength(4)
      expect(filterBySeverity(findings, "critical")).toHaveLength(1)
    })
  })

  describe("generateCycloneDxSbom", () => {
    it("generates SBOM", () => {
      const sbom = generateCycloneDxSbom([
        { name: "lodash", version: "4.17.21", license: "MIT" },
        { name: "react", version: "18.0.0" },
      ]) as any
      expect(sbom.bomFormat).toBe("CycloneDX")
      expect(sbom.specVersion).toBe("1.5")
      expect(sbom.components).toHaveLength(2)
      expect(sbom.components[0].name).toBe("lodash")
      expect(sbom.components[0].purl).toContain("pkg:npm")
    })

    it("handles empty", () => {
      const sbom = generateCycloneDxSbom([]) as any
      expect(sbom.components).toHaveLength(0)
    })
  })

  describe("checkLicenseCompatibility", () => {
    it("allows permissive", () => {
      expect(checkLicenseCompatibility("MIT").compatible).toBe(true)
      expect(checkLicenseCompatibility("Apache-2.0").compatible).toBe(true)
      expect(checkLicenseCompatibility("BSD-3-Clause").compatible).toBe(true)
      expect(checkLicenseCompatibility("ISC").compatible).toBe(true)
    })

    it("blocks copyleft", () => {
      expect(checkLicenseCompatibility("GPL-3.0").compatible).toBe(false)
      expect(checkLicenseCompatibility("GPL-2.0").compatible).toBe(false)
      expect(checkLicenseCompatibility("AGPL-3.0").compatible).toBe(false)
      expect(checkLicenseCompatibility("SSPL-1.0").compatible).toBe(false)
    })

    it("warns on unknown", () => {
      const result = checkLicenseCompatibility("Custom-1.0")
      expect(result.compatible).toBe(true)
      expect(result.reason).toContain("Unknown")
    })
  })

  describe("SECRET_PATTERNS", () => {
    it("has patterns", () => {
      expect(SECRET_PATTERNS.length).toBeGreaterThan(10)
      expect(SECRET_PATTERNS.some((p) => p.name === "Private Key")).toBe(true)
      expect(SECRET_PATTERNS.some((p) => p.name.includes("GitHub"))).toBe(true)
    })
  })

  describe("scanFileForSecrets edge cases", () => {
    it("skips comment with allowlist //", () => {
      const file = join(tmpDir, "comment1.ts")
      writeFileSync(file, "// your-github-username is example\nconst x=1;\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })
    it("skips comment with allowlist *", () => {
      const file = join(tmpDir, "comment2.ts")
      writeFileSync(file, " * your-github-username\nconst x=1;\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })
    it("skips comment with allowlist #", () => {
      const file = join(tmpDir, "comment3.ts")
      writeFileSync(file, "# your-github-username\nconst x=1;\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })
    it("skips allowlisted secret line", () => {
      const file = join(tmpDir, "allow-secret.ts")
      writeFileSync(file, "const t = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz example.com';\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })
    it("skips medium severity with example word", () => {
      const file = join(tmpDir, "medium-example.ts")
      writeFileSync(file, "const api_key = 'example_api_key_123456789012345';\n")
      const findings = scanFileForSecrets(file)
      expect(findings).toHaveLength(0)
    })
    it("does not skip high severity even with example word", () => {
      const file = join(tmpDir, "high-example.ts")
      writeFileSync(file, "const k = '-----BEGIN RSA PRIVATE KEY----- example';\n")
      const findings = scanFileForSecrets(file)
      expect(findings.length).toBeGreaterThan(0)
    })
  })

  describe("scanDirectoryForSecrets", () => {
    it("scans directory and respects exclude", () => {
      writeFileSync(join(tmpDir, "clean.ts"), "const x=1;\n")
      writeFileSync(join(tmpDir, "secret.ts"), "const k='-----BEGIN RSA PRIVATE KEY-----';\n")
      mkdirSync(join(tmpDir, "node_modules"), { recursive: true })
      writeFileSync(
        join(tmpDir, "node_modules", "evil.ts"),
        "const k='-----BEGIN RSA PRIVATE KEY-----';\n",
      )
      const findings = scanDirectoryForSecrets(tmpDir, [".ts"] as any)
      expect(findings.length).toBeGreaterThan(0)
      expect(findings.some((f) => f.file.includes("secret.ts"))).toBe(true)
      expect(findings.some((f) => f.file.includes("node_modules"))).toBe(false)
    })
    it("filters by exts", () => {
      writeFileSync(join(tmpDir, "a.txt"), "const k='-----BEGIN RSA PRIVATE KEY-----';\n")
      writeFileSync(join(tmpDir, "b.ts"), "const x=1;\n")
      const findings = scanDirectoryForSecrets(tmpDir, [".ts"] as any)
      expect(findings.some((f) => f.file.endsWith("a.txt"))).toBe(false)
    })
  })

  describe("parsePnpmAuditOutput extra", () => {
    it("handles missing fields fallback", () => {
      const json = JSON.stringify({
        advisories: {
          "1": {},
        },
      })
      const findings = parsePnpmAuditOutput(json)
      expect(findings).toHaveLength(1)
      expect(findings[0].package).toBe("unknown")
      expect(findings[0].severity).toBe("moderate")
    })
    it("handles vulnerabilities missing fields", () => {
      const json = JSON.stringify({
        vulnerabilities: {
          foo: {},
        },
      })
      const findings = parsePnpmAuditOutput(json)
      expect(findings).toHaveLength(1)
      expect(findings[0].package).toBe("foo")
    })
  })

  describe("generateCycloneDxSbom purl fallback", () => {
    it("uses purl if provided", () => {
      const sbom = generateCycloneDxSbom([
        { name: "lodash", version: "4.17.21", purl: "pkg:npm/lodash@4.17.21?custom" },
      ]) as any
      expect(sbom.components[0].purl).toBe("pkg:npm/lodash@4.17.21?custom")
    })
  })
})
