import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import { shouldAutomerge } from "../../../scripts/lib/cicd.ts"
import { calculateA11yScore } from "../../../scripts/lib/quality.ts"
import {
  checkLicenseCompatibility,
  parsePnpmAuditOutput,
  severityToNumber,
} from "../../../scripts/lib/security.ts"
import { LruCache } from "../../../src/cache/lru.ts"

describe("property-based tests @property", () => {
  it("LRU cache should never exceed max size @property", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.string(), { maxLength: 200 }),
        (max, keys) => {
          const cache = new LruCache({ maxSize: max })
          for (const k of keys) {
            cache.set(k, 1)
          }
          expect(cache.size).toBeLessThanOrEqual(max)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("LRU get after set should return value @property", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), fc.integer(), (key, value) => {
        const cache = new LruCache({ maxSize: 10 })
        cache.set(key, value)
        expect(cache.get(key)).toBe(value)
      }),
      { numRuns: 100 },
    )
  })

  it("severityToNumber should be monotonic @property", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("critical", "high", "moderate", "low", "info"),
        fc.constantFrom("critical", "high", "moderate", "low", "info"),
        (a, b) => {
          const order = ["info", "low", "moderate", "high", "critical"]
          const numA = severityToNumber(a)
          const numB = severityToNumber(b)
          const idxA = order.indexOf(a)
          const idxB = order.indexOf(b)
          if (idxA > idxB) {
            expect(numA).toBeGreaterThanOrEqual(numB)
          } else if (idxA < idxB) {
            expect(numA).toBeLessThanOrEqual(numB)
          }
        },
      ),
      { numRuns: 50 },
    )
  })

  it("checkLicenseCompatibility should be deterministic @property", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (license) => {
        const r1 = checkLicenseCompatibility(license)
        const r2 = checkLicenseCompatibility(license)
        expect(r1.compatible).toBe(r2.compatible)
        expect(r1.reason).toBe(r2.reason)
      }),
      { numRuns: 100 },
    )
  })

  it("shouldAutomerge should be deterministic @property", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.array(fc.string()),
        fc.boolean(),
        (actor, title, labels, draft) => {
          const r1 = shouldAutomerge(actor, title, labels, draft)
          const r2 = shouldAutomerge(actor, title, labels, draft)
          expect(r1.should).toBe(r2.should)
          expect(r1.reason).toBe(r2.reason)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("calculateA11yScore should be between 0 and 100 @property", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            impact: fc.constantFrom("minor", "moderate", "serious", "critical" as const),
            description: fc.string(),
            help: fc.string(),
            helpUrl: fc.string(),
            nodes: fc.integer({ min: 1, max: 10 }),
          }),
          { maxLength: 20 },
        ),
        (violations) => {
          const score = calculateA11yScore(violations as any)
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("parsePnpmAuditOutput should not throw on random string @property", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        expect(() => parsePnpmAuditOutput(str)).not.toThrow()
      }),
      { numRuns: 200 },
    )
  })
})
