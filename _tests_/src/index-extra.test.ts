import { describe, expect, it } from "vitest"
import { createProjectConfig, getProjectDisplayName } from "../../src/index.ts"

describe("getProjectDisplayName extra", () => {
  it("handles unknown project type", () => {
    const name = getProjectDisplayName({ projectName: "test", projectType: "unknown" as any })
    expect(name).toBe("test (unknown)")
  })
})

describe("createProjectConfig extra branches", () => {
  it("handles missing githubOwner and termuxMode", () => {
    const result = createProjectConfig({ projectName: "my-app" })
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.githubOwner).toBeUndefined()
      expect(result.value.termuxMode).toBe("auto")
    }
  })
  it("handles all fields", () => {
    const result = createProjectConfig({
      projectName: "my-app",
      projectType: "next",
      githubOwner: "myuser",
      termuxMode: "yes",
    })
    expect(result.isOk()).toBe(true)
  })
})
