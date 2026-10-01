import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  calculateDiff,
  checkLighthouseThresholds,
  DEFAULT_AUTOMERGE_CONFIG,
  DEFAULT_LIGHTHOUSE_THRESHOLDS,
  detectPreviewConfig,
  formatBytes,
  generateBundleSizeComment,
  generateLighthouseComment,
  generatePreviewUrl,
  parseSizeLimitOutput,
  parseSizeToBytes,
  shouldAutomerge,
} from "../../../scripts/lib/cicd.ts"

describe("cicd.ts", () => {
  describe("shouldAutomerge", () => {
    it("allows renovate bot", () => {
      const r = shouldAutomerge(
        "renovate[bot]",
        "chore(deps): update lodash",
        ["dependencies"],
        false,
      )
      expect(r.should).toBe(true)
    })
    it("allows dependabot", () => {
      const r = shouldAutomerge("dependabot[bot]", "chore: bump lodash", ["dependencies"], false)
      expect(r.should).toBe(true)
    })
    it("blocks draft", () => {
      const r = shouldAutomerge("renovate[bot]", "chore(deps): update", ["dependencies"], true)
      expect(r.should).toBe(false)
      expect(r.reason).toContain("Draft")
    })
    it("blocks major", () => {
      const r = shouldAutomerge(
        "renovate[bot]",
        "chore(deps): major update BREAKING",
        ["dependencies"],
        false,
      )
      expect(r.should).toBe(false)
      expect(r.reason).toContain("Blocked")
    })
    it("blocks non-allowed", () => {
      const r = shouldAutomerge("someuser", "feat: new feature", [], false)
      expect(r.should).toBe(false)
    })
    it("allows via label", () => {
      const r = shouldAutomerge("someuser", "fix: something", ["automerge"], false)
      expect(r.should).toBe(true)
    })
    it("allows via prefix", () => {
      const r = shouldAutomerge("someuser", "chore(deps): update", [], false)
      expect(r.should).toBe(true)
    })
    it("allows via deps keyword", () => {
      const r = shouldAutomerge("someuser", "update deps: lodash", [], false)
      expect(r.should).toBe(true)
    })
    it("respects custom config", () => {
      const cfg = { ...DEFAULT_AUTOMERGE_CONFIG, allowedActors: [] as string[] }
      const r = shouldAutomerge("renovate[bot]", "chore(deps): update", [], false, cfg)
      // No actor, but title has deps: so should still allow via prefix
      expect(r.should).toBe(true)
    })
  })

  describe("detectPreviewConfig", () => {
    it("detects next", () => {
      const c = detectPreviewConfig(["next.config.js", "package.json"])
      expect(c.framework).toBe("next")
      expect(c.outputDir).toBe(".next")
    })
    it("detects vite", () => {
      const c = detectPreviewConfig(["vite.config.ts"])
      expect(c.framework).toBe("vite")
      expect(c.outputDir).toBe("dist")
    })
    it("detects astro", () => {
      const c = detectPreviewConfig(["astro.config.mjs"])
      expect(c.framework).toBe("astro")
    })
    it("detects nuxt", () => {
      const c = detectPreviewConfig(["nuxt.config.ts"])
      expect(c.framework).toBe("nuxt")
      expect(c.outputDir).toBe(".output/public")
    })
    it("unknown fallback", () => {
      const c = detectPreviewConfig(["README.md"])
      expect(c.framework).toBe("unknown")
      expect(c.outputDir).toBe("dist")
    })
  })

  describe("parseSizeToBytes", () => {
    it("parses bytes", () => {
      expect(parseSizeToBytes("100", "B")).toBe(100)
      expect(parseSizeToBytes("1", "kB")).toBe(1024)
      expect(parseSizeToBytes("1", "KB")).toBe(1024)
      expect(parseSizeToBytes("1", "MB")).toBe(1024 * 1024)
      expect(parseSizeToBytes("1", "GB")).toBe(1024 * 1024 * 1024)
      expect(parseSizeToBytes("1.5", "kB")).toBe(1536)
      expect(parseSizeToBytes("1", "unknown")).toBe(1)
    })
  })

  describe("formatBytes", () => {
    it("formats", () => {
      expect(formatBytes(500)).toBe("500 B")
      expect(formatBytes(1024)).toBe("1.0 kB")
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB")
    })
  })

  describe("calculateDiff", () => {
    it("calculates diff", () => {
      const d = calculateDiff(1100, 1000)
      expect(d.diff).toBe(100)
      expect(d.percent).toBe(10)
      expect(d.increased).toBe(true)
    })
    it("handles decrease", () => {
      const d = calculateDiff(900, 1000)
      expect(d.diff).toBe(-100)
      expect(d.increased).toBe(false)
    })
    it("handles zero baseline", () => {
      const d = calculateDiff(100, 0)
      expect(d.percent).toBe(0)
    })
  })

  describe("parseSizeLimitOutput", () => {
    it("parses output", () => {
      const out = "  template core — 5.2 kB (limit: 10 kB)\n  other — 1 kB"
      const res = parseSizeLimitOutput(out)
      expect(res.length).toBeGreaterThan(0)
      expect(res[0].name).toContain("template core")
      expect(res[0].size).toBeGreaterThan(0)
      expect(res[0].limit).toBeDefined()
      expect(res[0].passed).toBe(true)
    })
    it("handles empty", () => {
      const res = parseSizeLimitOutput("")
      expect(res).toHaveLength(0)
    })
    it("handles no limit", () => {
      const out = "  foo — 5 kB"
      const res = parseSizeLimitOutput(out)
      expect(res[0].passed).toBe(true)
      expect(res[0].limit).toBeUndefined()
    })
  })

  describe("checkLighthouseThresholds", () => {
    it("passes when above thresholds", () => {
      const r = checkLighthouseThresholds({
        url: "http://localhost:3000",
        performance: 0.9,
        accessibility: 0.9,
        bestPractices: 0.9,
        seo: 0.9,
        passed: true,
      })
      expect(r.passed).toBe(true)
      expect(r.failures).toHaveLength(0)
    })
    it("fails when below", () => {
      const r = checkLighthouseThresholds({
        url: "http://localhost:3000",
        performance: 0.5,
        accessibility: 0.9,
        bestPractices: 0.9,
        seo: 0.9,
        passed: false,
      })
      expect(r.passed).toBe(false)
      expect(r.failures.some((f) => f.includes("performance"))).toBe(true)
    })
    it("checks FCP/LCP/CLS/TBT", () => {
      const r = checkLighthouseThresholds({
        url: "http://localhost:3000",
        performance: 0.9,
        accessibility: 0.9,
        bestPractices: 0.9,
        seo: 0.9,
        fcp: 5000,
        lcp: 5000,
        cls: 0.5,
        tbt: 1000,
        passed: false,
      })
      expect(r.passed).toBe(false)
      expect(r.failures.length).toBeGreaterThanOrEqual(4)
    })
    it("uses defaults", () => {
      const r = checkLighthouseThresholds(
        {
          url: "http://localhost:3000",
          performance: 0.9,
          accessibility: 0.9,
          bestPractices: 0.9,
          seo: 0.9,
          passed: true,
        },
        DEFAULT_LIGHTHOUSE_THRESHOLDS,
      )
      expect(r.passed).toBe(true)
    })
  })

  describe("generatePreviewUrl", () => {
    it("generates url", () => {
      expect(generatePreviewUrl(123)).toContain("pr-123")
      expect(generatePreviewUrl(123, "https://example.com")).toBe(
        "https://example.com/preview/pr-123/",
      )
    })
  })

  describe("generateBundleSizeComment", () => {
    it("generates comment", () => {
      const results = [
        { name: "core", size: 5000, limit: 10000, passed: true },
        { name: "big", size: 20000, limit: 10000, passed: false },
      ]
      const comment = generateBundleSizeComment(results)
      expect(comment).toContain("Bundle Size")
      expect(comment).toContain("core")
      expect(comment).toContain("✓")
      expect(comment).toContain("✗")
    })
    it("with baseline diff", () => {
      const results = [{ name: "core", size: 6000, limit: 10000, passed: true }]
      const baseline = [{ name: "core", size: 5000, limit: 10000, passed: true }]
      const comment = generateBundleSizeComment(results, baseline)
      expect(comment).toContain("core")
      expect(comment).toContain("Diff")
    })
    it("with baseline decrease", () => {
      const results = [{ name: "core", size: 4000, limit: 10000, passed: true }]
      const baseline = [{ name: "core", size: 5000, limit: 10000, passed: true }]
      const comment = generateBundleSizeComment(results, baseline)
      expect(comment).toContain("core")
      expect(comment).toContain("🟢")
    })
    it("with baseline no match", () => {
      const results = [{ name: "core", size: 4000, limit: 10000, passed: true }]
      const baseline = [{ name: "other", size: 5000, limit: 10000, passed: true }]
      const comment = generateBundleSizeComment(results, baseline)
      expect(comment).toContain("core")
    })
  })

  describe("generateLighthouseComment", () => {
    it("generates comment", () => {
      const results = [
        {
          url: "http://localhost:3000",
          performance: 0.9,
          accessibility: 0.9,
          bestPractices: 0.9,
          seo: 0.9,
          fcp: 1000,
          lcp: 2000,
          cls: 0.05,
          passed: true,
        },
      ]
      const comment = generateLighthouseComment(results)
      expect(comment).toContain("Lighthouse")
      expect(comment).toContain("http://localhost:3000")
      expect(comment).toContain("✓")
    })
    it("with failure", () => {
      const results = [
        {
          url: "http://localhost:3000",
          performance: 0.5,
          accessibility: 0.5,
          bestPractices: 0.5,
          seo: 0.5,
          passed: false,
        },
      ]
      const comment = generateLighthouseComment(results)
      expect(comment).toContain("⚠️")
    })
  })
})
