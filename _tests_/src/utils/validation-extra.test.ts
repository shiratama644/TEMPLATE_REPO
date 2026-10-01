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

describe("isEmail extra 100%", () => {
  it("handles null/undefined/non-string", () => {
    expect(isEmail(null as any)).toBe(false)
    expect(isEmail(undefined as any)).toBe(false)
    expect(isEmail(123 as any)).toBe(false)
    expect(isEmail("")).toBe(false)
  })
  it("handles too long", () => {
    expect(isEmail("a".repeat(250) + "@example.com")).toBe(false)
  })
  it("valid", () => {
    expect(isEmail("test@example.com")).toBe(true)
  })
})

describe("isUrl extra 100%", () => {
  it("handles null/undefined", () => {
    expect(isUrl(null as any)).toBe(false)
    expect(isUrl(undefined as any)).toBe(false)
    expect(isUrl("")).toBe(false)
  })
  it("too long", () => {
    expect(isUrl("https://example.com/" + "a".repeat(2048))).toBe(false)
  })
  it("http with URL ctor success", () => {
    expect(isUrl("https://example.com")).toBe(true)
  })
  it("http with URL ctor failure", () => {
    expect(isUrl("http://")).toBe(false)
    expect(isUrl("https://")).toBe(false)
  })
  it("non-http URL regex", () => {
    expect(isUrl("example.com")).toBe(true)
    expect(isUrl("not a url")).toBe(false)
  })
})

describe("isNpmPackageName extra 100%", () => {
  it("handles null/undefined", () => {
    expect(isNpmPackageName(null as any)).toBe(false)
    expect(isNpmPackageName(undefined as any)).toBe(false)
    expect(isNpmPackageName("")).toBe(false)
  })
  it("too long", () => {
    expect(isNpmPackageName("a".repeat(215))).toBe(false)
  })
  it("starts with . or _", () => {
    expect(isNpmPackageName(".hidden")).toBe(false)
    expect(isNpmPackageName("_private")).toBe(false)
  })
  it("valid", () => {
    expect(isNpmPackageName("my-app")).toBe(true)
    expect(isNpmPackageName("@scope/my-app")).toBe(true)
  })
  it("rejects uppercase", () => {
    expect(isNpmPackageName("MyApp")).toBe(false)
    expect(isNpmPackageName("My-App")).toBe(false)
    expect(isNpmPackageName("@Scope/my-app")).toBe(false)
  })
})

describe("isValidNpmNameStrict extra 100%", () => {
  it("covers all branches", () => {
    expect(isValidNpmNameStrict("").valid).toBe(false)
    expect(isValidNpmNameStrict("a".repeat(215)).valid).toBe(false)
    expect(isValidNpmNameStrict(".app").valid).toBe(false)
    expect(isValidNpmNameStrict("_app").valid).toBe(false)
    expect(isValidNpmNameStrict("MyApp").valid).toBe(false)
    expect(isValidNpmNameStrict("my-app").valid).toBe(true)
    expect(isValidNpmNameStrict("invalid name").valid).toBe(false)
    expect(isValidNpmNameStrict("my..app").valid).toBe(false)
    expect(isValidNpmNameStrict("my--app").valid).toBe(false)
  })
})

describe("isGithubOwner extra 100%", () => {
  it("covers all branches", () => {
    expect(isGithubOwner(null as any)).toBe(false)
    expect(isGithubOwner(undefined as any)).toBe(false)
    expect(isGithubOwner("")).toBe(false)
    expect(isGithubOwner("your-github-username")).toBe(true)
    expect(isGithubOwner("myuser")).toBe(true)
    expect(isGithubOwner("-invalid")).toBe(false)
    expect(isGithubOwner("invalid-")).toBe(false)
    expect(isGithubOwner("valid-user-123")).toBe(true)
  })
})

describe("isSemver extra 100%", () => {
  it("covers all", () => {
    expect(isSemver(null as any)).toBe(false)
    expect(isSemver("")).toBe(false)
    expect(isSemver("1.0.0")).toBe(true)
    expect(isSemver("invalid")).toBe(false)
  })
})

describe("isValidProjectType extra 100%", () => {
  it("covers all", () => {
    expect(isValidProjectType("plain")).toBe(true)
    expect(isValidProjectType("vite")).toBe(true)
    expect(isValidProjectType("next")).toBe(true)
    expect(isValidProjectType("monorepo")).toBe(true)
    expect(isValidProjectType("next-monorepo")).toBe(true)
    expect(isValidProjectType("invalid")).toBe(false)
    expect(isValidProjectType("")).toBe(false)
  })
})

describe("isValidTermuxMode extra 100%", () => {
  it("covers all", () => {
    expect(isValidTermuxMode("auto")).toBe(true)
    expect(isValidTermuxMode("yes")).toBe(true)
    expect(isValidTermuxMode("no")).toBe(true)
    expect(isValidTermuxMode("invalid")).toBe(false)
    expect(isValidTermuxMode("")).toBe(false)
  })
})

describe("validateProjectConfig extra 100%", () => {
  it("covers all branches", () => {
    // missing projectName
    expect(validateProjectConfig({}).valid).toBe(false)
    // invalid projectName
    expect(validateProjectConfig({ projectName: "" }).valid).toBe(false)
    expect(validateProjectConfig({ projectName: "MyApp" }).valid).toBe(false)
    // valid with only projectName
    expect(validateProjectConfig({ projectName: "my-app" }).valid).toBe(true)
    // invalid projectType
    expect(validateProjectConfig({ projectName: "my-app", projectType: "invalid" }).valid).toBe(
      false,
    )
    // valid projectType
    expect(validateProjectConfig({ projectName: "my-app", projectType: "vite" }).valid).toBe(true)
    // invalid githubOwner
    expect(validateProjectConfig({ projectName: "my-app", githubOwner: "-bad" }).valid).toBe(false)
    // valid githubOwner placeholder
    expect(
      validateProjectConfig({ projectName: "my-app", githubOwner: "your-github-username" }).valid,
    ).toBe(true)
    // valid githubOwner
    expect(validateProjectConfig({ projectName: "my-app", githubOwner: "myuser" }).valid).toBe(true)
    // no githubOwner
    expect(validateProjectConfig({ projectName: "my-app", githubOwner: undefined }).valid).toBe(
      true,
    )
    // invalid termuxMode
    expect(validateProjectConfig({ projectName: "my-app", termuxMode: "bad" }).valid).toBe(false)
    // valid termuxMode
    expect(validateProjectConfig({ projectName: "my-app", termuxMode: "auto" }).valid).toBe(true)
    expect(validateProjectConfig({ projectName: "my-app", termuxMode: undefined }).valid).toBe(true)
    // all invalid
    const result = validateProjectConfig({
      projectName: "",
      projectType: "invalid",
      githubOwner: "-bad",
      termuxMode: "bad",
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe("isNonEmptyString extra 100%", () => {
  it("covers all", () => {
    expect(isNonEmptyString("hello")).toBe(true)
    expect(isNonEmptyString("  a  ")).toBe(true)
    expect(isNonEmptyString("")).toBe(false)
    expect(isNonEmptyString("   ")).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
    expect(isNonEmptyString(undefined)).toBe(false)
    expect(isNonEmptyString(123)).toBe(false)
    expect(isNonEmptyString({})).toBe(false)
  })
})

describe("isPositiveInteger extra 100%", () => {
  it("covers all", () => {
    expect(isPositiveInteger(1)).toBe(true)
    expect(isPositiveInteger(0)).toBe(false)
    expect(isPositiveInteger(-1)).toBe(false)
    expect(isPositiveInteger(1.5)).toBe(false)
    expect(isPositiveInteger("1" as any)).toBe(false)
    expect(isPositiveInteger(null as any)).toBe(false)
    expect(isPositiveInteger(undefined as any)).toBe(false)
  })
})

describe("isInRange extra 100%", () => {
  it("covers all", () => {
    expect(isInRange(5, 1, 10)).toBe(true)
    expect(isInRange(1, 1, 10)).toBe(true)
    expect(isInRange(10, 1, 10)).toBe(true)
    expect(isInRange(0, 1, 10)).toBe(false)
    expect(isInRange(11, 1, 10)).toBe(false)
    expect(isInRange(NaN, 1, 10)).toBe(false)
    expect(isInRange("5" as any, 1, 10)).toBe(false)
    expect(isInRange(null as any, 1, 10)).toBe(false)
    expect(isInRange(undefined as any, 1, 10)).toBe(false)
  })
})
