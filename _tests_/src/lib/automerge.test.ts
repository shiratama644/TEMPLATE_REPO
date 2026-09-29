import { describe, expect, it } from "vitest"
import { checkAutomergeEligibility } from "../../../scripts/lib/automerge.ts"

describe("automerge.ts", () => {
  it("checks eligibility", () => {
    const r = checkAutomergeEligibility(
      "renovate[bot]",
      "chore(deps): update lodash",
      ["dependencies"],
      false,
    )
    expect(r.should).toBe(true)
  })

  it("blocks draft", () => {
    const r = checkAutomergeEligibility(
      "renovate[bot]",
      "chore(deps): update",
      ["dependencies"],
      true,
    )
    expect(r.should).toBe(false)
  })

  it("blocks non-allowed", () => {
    const r = checkAutomergeEligibility("user", "feat: new", [], false)
    expect(r.should).toBe(false)
  })
})
