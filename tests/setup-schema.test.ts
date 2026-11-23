import { expect, test } from "bun:test"
import { tmpdir } from "node:os"
import { relative, resolve, sep } from "node:path"
import fc from "fast-check"
import { safe } from "../scripts/setup.ts"
import { nameSchema, validateChoices } from "../scripts/setup-schema.ts"

const root = resolve(tmpdir(), "setup-check-root")
const segment = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/)

test("generated paths stay inside the target or reject traversal and Git metadata", () => {
  fc.assert(
    fc.property(fc.array(segment, { minLength: 1, maxLength: 5 }), (segments) => {
      const path = segments.join("/")
      expect(relative(root, safe(root, path))).toBe(segments.join(sep))
    }),
    { seed: 644, numRuns: 100 },
  )
  fc.assert(
    fc.property(
      fc.array(segment, { maxLength: 3 }),
      fc.constantFrom("..", ".git"),
      fc.constantFrom("/", "\\"),
      (prefix, blocked, separator) => {
        expect(() => safe(root, [...prefix, blocked, "file"].join(separator))).toThrow()
      },
    ),
    { seed: 644, numRuns: 100 },
  )
})

test("Zod choices reject invalid names, unknown fields and mismatched templates", () => {
  fc.assert(
    fc.property(fc.string(), (name) => {
      expect(nameSchema.safeParse(name).success).toBe(
        name.length <= 64 && /^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*$/.test(name),
      )
    }),
    { seed: 644, numRuns: 150 },
  )
  expect(() => validateChoices({ language: "go", template: "next" })).toThrow("対応しません")
  expect(() => validateChoices({ featues: ["vitest"] })).toThrow("featues")
  expect(() => validateChoices({ features: "vitest" })).toThrow("機能")
})
