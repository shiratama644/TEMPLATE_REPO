import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("check-security.ts", () => {
  let tmpDir: string
  let originalCwd: string
  let originalArgv: string[]

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "check-security-"))
    originalCwd = process.cwd()
    originalArgv = [...process.argv]
    process.chdir(tmpDir)
    vi.resetModules()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.argv = originalArgv
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
    vi.restoreAllMocks()
  })

  it("parses args", async () => {
    process.argv = ["node", "check-security.ts", "--no-audit", "--verbose", "--audit-level=high"]
    const mod = await import("../../../scripts/check-security.ts")
    const opts = mod.parseArgs()
    expect(opts.audit).toBe(false)
    expect(opts.verbose).toBe(true)
    expect(opts.auditLevel).toBe("high")
  })

  it("parses help", async () => {
    process.argv = ["node", "check-security.ts", "--help"]
    const mod = await import("../../../scripts/check-security.ts")
    const opts = mod.parseArgs()
    expect(opts.help).toBe(true)
  })

  it("runs secret scan on clean dir", async () => {
    writeFileSync(join(tmpDir, "clean.ts"), "const x = 1;")
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }))
    const mod = await import("../../../scripts/check-security.ts")
    const result = mod.runSecretScan(false)
    expect(result.ok).toBe(true)
  })

  it("runs secret scan with finding", async () => {
    writeFileSync(join(tmpDir, "secret.ts"), "const key = '-----BEGIN RSA PRIVATE KEY-----';")
    const mod = await import("../../../scripts/check-security.ts")
    const result = mod.runSecretScan(false)
    expect(result.findings.length).toBeGreaterThan(0)
    // High severity should cause ok=false
    expect(result.ok).toBe(false)
  })

  it("runs license check", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }))
    const mod = await import("../../../scripts/check-security.ts")
    const result = mod.runLicenseCheck(false)
    expect(result.ok).toBe(true)
  })

  it("generates SBOM", async () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test",
        version: "1.0.0",
        license: "MIT",
        dependencies: { lodash: "^4.17.21" },
      }),
    )
    const mod = await import("../../../scripts/check-security.ts")
    const result = mod.generateSbom(false)
    expect(result.ok).toBe(true)
    expect(result.path).toContain("sbom.cyclonedx.json")
  })

  it("handles missing package.json for SBOM", async () => {
    const mod = await import("../../../scripts/check-security.ts")
    const result = mod.generateSbom(false)
    expect(result.ok).toBe(false)
  })

  it("main with help returns 0", async () => {
    process.argv = ["node", "check-security.ts", "--help"]
    const mod = await import("../../../scripts/check-security.ts")
    const code = await mod.main()
    expect(code).toBe(0)
  })

  it("main runs checks", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }))
    writeFileSync(join(tmpDir, "clean.ts"), "const x = 1;")
    process.argv = ["node", "check-security.ts", "--no-audit", "--no-licenses"]
    const mod = await import("../../../scripts/check-security.ts")
    const code = await mod.main()
    expect([0, 1]).toContain(code)
  })

  it("parseArgs handles --audit-level with equals", async () => {
    process.argv = ["node", "check-security.ts", "--audit-level=critical"]
    const mod = await import("../../../scripts/check-security.ts")
    const opts = mod.parseArgs()
    expect(opts.auditLevel).toBe("critical")
  })

  it("parseArgs handles --audit-level without value", async () => {
    process.argv = ["node", "check-security.ts", "--audit-level"]
    const mod = await import("../../../scripts/check-security.ts")
    const opts = mod.parseArgs()
    expect(opts.auditLevel).toBe("high")
  })

  it("runNpmAudit handles no vulnerabilities", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test" }))
    const mod = await import("../../../scripts/check-security.ts")
    // Mock execSync to return empty
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => "{}"),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "", stderr: "" })),
      }
    })
    // Re-import with mock
    vi.resetModules()
    const mod2 = await import("../../../scripts/check-security.ts")
    const result = mod2.runNpmAudit("moderate", false, false)
    expect(result.ok).toBe(true)
  })

  it("runNpmAudit handles vulnerabilities", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test" }))
    const auditOutput = JSON.stringify({
      advisories: {
        "1": {
          id: 1,
          title: "Test vuln",
          module_name: "lodash",
          severity: "high",
          url: "https://example.com",
          findings: [{ version: "4.17.20" }],
        },
      },
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => auditOutput),
        spawnSync: vi.fn(() => ({ status: 0, stdout: "", stderr: "" })),
      }
    })
    vi.resetModules()
    const mod2 = await import("../../../scripts/check-security.ts")
    const result = mod2.runNpmAudit("moderate", false, false)
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.ok).toBe(false)
  })

  it("main returns 1 on failure", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }))
    writeFileSync(join(tmpDir, "secret.ts"), "const k='-----BEGIN RSA PRIVATE KEY-----';")
    process.argv = ["node", "check-security.ts", "--no-audit", "--no-licenses"]
    const mod = await import("../../../scripts/check-security.ts")
    const code = await mod.main()
    expect(code).toBe(1)
  })

  it("generates SBOM without name fallback", async () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ version: "1.0.0" }))
    const mod = await import("../../../scripts/check-security.ts")
    const result = mod.generateSbom(false)
    expect(result.ok).toBe(true)
  })
})
