import { describe, expect, it } from "vitest"
import {
  createProjectConfig,
  detectProjectType,
  err,
  formatProjectSummary,
  getProjectDisplayName,
  hello,
  isEmail,
  LruCache,
  ok,
  slugify,
  templateVersion,
} from "../../src/index.ts"

describe("template", () => {
  it("hello returns greeting", () => {
    expect(hello("world")).toBe("Hello, world!")
  })

  it("hello handles empty", () => {
    expect(hello("")).toBe("Hello, world!")
    expect(hello(null as any)).toBe("Hello, world!")
  })

  it("templateVersion is string", () => {
    expect(typeof templateVersion).toBe("string")
    expect(templateVersion).toBe("2.0.0")
  })
})

describe("createProjectConfig", () => {
  it("creates valid config", () => {
    const result = createProjectConfig({ projectName: "my-app", projectType: "vite" })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.projectName).toBe("my-app")
      expect(result.value.projectType).toBe("vite")
    }
  })

  it("fails on invalid config", () => {
    const result = createProjectConfig({ projectName: "" })
    expect(result.isErr()).toBe(true)
  })

  it("uses defaults", () => {
    const result = createProjectConfig({ projectName: "test" })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.projectType).toBe("plain")
      expect(result.value.termuxMode).toBe("auto")
    }
  })
})

describe("getProjectDisplayName", () => {
  it("formats display name", () => {
    const name = getProjectDisplayName({ projectName: "my-app", projectType: "vite" })
    expect(name.includes("my-app")).toBe(true)
    expect(name.includes("Vite")).toBe(true)
  })

  it("handles all project types", () => {
    const types = ["plain", "vite", "next", "monorepo", "next-monorepo"] as const
    for (const type of types) {
      const name = getProjectDisplayName({ projectName: "test", projectType: type })
      expect(name.includes("test")).toBe(true)
    }
  })
})

describe("formatProjectSummary", () => {
  it("formats summary", () => {
    const summary = formatProjectSummary({
      projectName: "my-app",
      projectType: "next",
      githubOwner: "myuser",
      termuxMode: "auto",
    })
    expect(summary.includes("my-app")).toBe(true)
    expect(summary.includes("next")).toBe(true)
    expect(summary.includes("myuser")).toBe(true)
  })

  it("handles minimal config", () => {
    const summary = formatProjectSummary({ projectName: "test", projectType: "plain" })
    expect(summary.includes("test")).toBe(true)
    expect(summary.includes("plain")).toBe(true)
  })
})

describe("integration — src exports", () => {
  it("exports string utils", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })
  it("exports validation", () => {
    expect(isEmail("test@example.com")).toBe(true)
  })
  it("exports result", () => {
    expect(ok(42).isOk()).toBe(true)
    expect(err(new Error("fail")).isErr()).toBe(true)
  })
  it("exports LruCache", () => {
    const cache = new LruCache({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.get("a")).toBe(1)
  })
  it("exports detector", () => {
    expect(detectProjectType(["vite.config.ts"])).toBe("vite")
  })
})
