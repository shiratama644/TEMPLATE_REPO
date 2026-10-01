import { describe, expect, it } from "vitest"
import {
  isEmail,
  isGithubOwner,
  isInRange,
  isNonEmptyString,
  isNpmPackageName,
  isPositiveInteger,
  isSemver,
  isUrl,
  isValidNpmNameStrict,
  isValidProjectType,
  isValidTermuxMode,
  validateProjectConfig,
} from "../../../src/utils/validation.ts"

describe("isEmail", () => {
  it("valid emails", () => {
    expect(isEmail("test@example.com")).toBe(true)
    expect(isEmail("user.name+tag@example.co.uk")).toBe(true)
  })
  it("invalid emails", () => {
    expect(isEmail("")).toBe(false)
    expect(isEmail("invalid")).toBe(false)
    expect(isEmail("test@")).toBe(false)
    expect(isEmail("@example.com")).toBe(false)
    expect(isEmail(null as any)).toBe(false)
  })
  it("too long", () => {
    expect(isEmail("a".repeat(255) + "@example.com")).toBe(false)
  })
})

describe("isUrl", () => {
  it("valid urls", () => {
    expect(isUrl("https://example.com")).toBe(true)
    expect(isUrl("http://example.com/path")).toBe(true)
    expect(isUrl("example.com")).toBe(true)
  })
  it("invalid urls", () => {
    expect(isUrl("")).toBe(false)
    expect(isUrl("not a url")).toBe(false)
    expect(isUrl(null as any)).toBe(false)
  })
  it("too long", () => {
    expect(isUrl("https://example.com/" + "a".repeat(2048))).toBe(false)
  })
  it("handles URL constructor failure", () => {
    expect(isUrl("http://")).toBe(false)
  })
})

describe("isNpmPackageName", () => {
  it("valid names", () => {
    expect(isNpmPackageName("my-app")).toBe(true)
    expect(isNpmPackageName("@scope/my-app")).toBe(true)
  })
  it("invalid names", () => {
    expect(isNpmPackageName("")).toBe(false)
    expect(isNpmPackageName(".hidden")).toBe(false)
    expect(isNpmPackageName("_private")).toBe(false)
    expect(isNpmPackageName("a".repeat(215))).toBe(false)
    expect(isNpmPackageName(null as any)).toBe(false)
  })
})

describe("isValidNpmNameStrict", () => {
  it("valid strict", () => {
    expect(isValidNpmNameStrict("my-app").valid).toBe(true)
    expect(isValidNpmNameStrict("my_app").valid).toBe(true)
  })
  it("invalid strict", () => {
    expect(isValidNpmNameStrict("").valid).toBe(false)
    expect(isValidNpmNameStrict("MyApp").valid).toBe(false)
    expect(isValidNpmNameStrict("my..app").valid).toBe(false)
    expect(isValidNpmNameStrict("my--app").valid).toBe(false)
    expect(isValidNpmNameStrict(".app").valid).toBe(false)
    expect(isValidNpmNameStrict("_app").valid).toBe(false)
    expect(isValidNpmNameStrict("a".repeat(215)).valid).toBe(false)
  })
  it("returns error messages", () => {
    const result = isValidNpmNameStrict("")
    expect(result.error).toBeDefined()
  })
})

describe("isGithubOwner", () => {
  it("valid owners", () => {
    expect(isGithubOwner("myuser")).toBe(true)
    expect(isGithubOwner("my-user")).toBe(true)
    expect(isGithubOwner("your-github-username")).toBe(true)
  })
  it("invalid owners", () => {
    expect(isGithubOwner("")).toBe(false)
    expect(isGithubOwner("-invalid")).toBe(false)
    expect(isGithubOwner("invalid-")).toBe(false)
    expect(isGithubOwner(null as any)).toBe(false)
  })
})

describe("isSemver", () => {
  it("valid semver", () => {
    expect(isSemver("1.0.0")).toBe(true)
    expect(isSemver("1.0.0-alpha")).toBe(true)
    expect(isSemver("1.0.0+build")).toBe(true)
  })
  it("invalid semver", () => {
    expect(isSemver("")).toBe(false)
    expect(isSemver("1.0")).toBe(false)
    expect(isSemver("v1.0.0")).toBe(false)
    expect(isSemver(null as any)).toBe(false)
  })
})

describe("isValidProjectType", () => {
  it("valid types", () => {
    expect(isValidProjectType("plain")).toBe(true)
    expect(isValidProjectType("vite")).toBe(true)
    expect(isValidProjectType("next")).toBe(true)
    expect(isValidProjectType("monorepo")).toBe(true)
    expect(isValidProjectType("next-monorepo")).toBe(true)
  })
  it("invalid types", () => {
    expect(isValidProjectType("invalid")).toBe(false)
    expect(isValidProjectType("")).toBe(false)
  })
})

describe("isValidTermuxMode", () => {
  it("valid modes", () => {
    expect(isValidTermuxMode("auto")).toBe(true)
    expect(isValidTermuxMode("yes")).toBe(true)
    expect(isValidTermuxMode("no")).toBe(true)
  })
  it("invalid modes", () => {
    expect(isValidTermuxMode("invalid")).toBe(false)
  })
})

describe("validateProjectConfig", () => {
  it("valid config", () => {
    const result = validateProjectConfig({
      projectName: "my-app",
      projectType: "vite",
      githubOwner: "myuser",
      termuxMode: "auto",
    })
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })
  it("missing projectName", () => {
    const result = validateProjectConfig({})
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("projectName"))).toBe(true)
  })
  it("invalid projectType", () => {
    const result = validateProjectConfig({ projectName: "my-app", projectType: "invalid" })
    expect(result.valid).toBe(false)
  })
  it("invalid githubOwner", () => {
    const result = validateProjectConfig({ projectName: "my-app", githubOwner: "-bad" })
    expect(result.valid).toBe(false)
  })
  it("invalid termuxMode", () => {
    const result = validateProjectConfig({ projectName: "my-app", termuxMode: "bad" })
    expect(result.valid).toBe(false)
  })
})

describe("isNonEmptyString", () => {
  it("checks non-empty string", () => {
    expect(isNonEmptyString("hello")).toBe(true)
    expect(isNonEmptyString("  a  ")).toBe(true)
    expect(isNonEmptyString("")).toBe(false)
    expect(isNonEmptyString("   ")).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
    expect(isNonEmptyString(123)).toBe(false)
  })
})

describe("isPositiveInteger", () => {
  it("checks positive integer", () => {
    expect(isPositiveInteger(1)).toBe(true)
    expect(isPositiveInteger(100)).toBe(true)
    expect(isPositiveInteger(0)).toBe(false)
    expect(isPositiveInteger(-1)).toBe(false)
    expect(isPositiveInteger(1.5)).toBe(false)
    expect(isPositiveInteger("1" as any)).toBe(false)
  })
})

describe("isInRange", () => {
  it("checks range", () => {
    expect(isInRange(5, 1, 10)).toBe(true)
    expect(isInRange(1, 1, 10)).toBe(true)
    expect(isInRange(10, 1, 10)).toBe(true)
    expect(isInRange(0, 1, 10)).toBe(false)
    expect(isInRange(11, 1, 10)).toBe(false)
    expect(isInRange(NaN, 1, 10)).toBe(false)
    expect(isInRange("5" as any, 1, 10)).toBe(false)
  })
})
