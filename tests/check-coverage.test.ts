import { expect, test } from "bun:test"
import { parseLcov, percent } from "../scripts/check-coverage.ts"

const lcov = [
  "TN:",
  "SF:scripts/a.ts",
  "FN:2,1",
  "LF:10",
  "LH:5",
  "end_of_record",
  "TN:",
  "SF:scripts/b.ts",
  "LF:30",
  "LH:30",
  "end_of_record",
  "",
].join("\n")

test("lcov is parsed into per-file line coverage", () => {
  const rows = parseLcov(lcov)
  expect(rows).toEqual([
    { file: "scripts/a.ts", lines: 10, hit: 5 },
    { file: "scripts/b.ts", lines: 30, hit: 30 },
  ])
  expect(percent(rows)).toBe(87.5)
})

test("an empty report is zero percent instead of a division error", () => {
  expect(parseLcov("")).toEqual([])
  expect(percent([])).toBe(0)
})
