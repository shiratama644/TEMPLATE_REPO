import { execSync } from "node:child_process"
import { describe, expect, it } from "vitest"

describe("smoke tests @smoke", () => {
  it("CLI check --help works @smoke", () => {
    expect(() =>
      execSync("node --experimental-strip-types scripts/check.ts --help", { stdio: "pipe" }),
    ).not.toThrow()
  })

  it("CLI check-cicd --help works @smoke", () => {
    expect(() =>
      execSync("node --experimental-strip-types scripts/check-cicd.ts --help", { stdio: "pipe" }),
    ).not.toThrow()
  })

  it("CLI check-security --help works @smoke", () => {
    expect(() =>
      execSync("node --experimental-strip-types scripts/check-security.ts --help", {
        stdio: "pipe",
      }),
    ).not.toThrow()
  })

  it("package.json has required scripts @smoke", async () => {
    const pkg = await import("../../package.json")
    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts.test).toBeDefined()
    expect(pkg.scripts.typecheck).toBeDefined()
    expect(pkg.scripts.lint).toBeDefined()
  })

  it("src/index exports @smoke", async () => {
    const mod = await import("../../src/index.ts")
    expect(mod).toBeDefined()
  })
})
