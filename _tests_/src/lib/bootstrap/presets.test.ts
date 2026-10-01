import { describe, expect, it } from "vitest"
import {
  applyPresetToAnswers,
  getPreset,
  getPresetChoices,
  listPresets,
  PRESETS,
} from "../../../../scripts/lib/bootstrap/presets.ts"

describe("PRESETS", () => {
  it("has 7 presets", () => {
    expect(Object.keys(PRESETS).length).toBe(7)
  })
  it("contains expected ids", () => {
    expect(PRESETS.minimal).toBeDefined()
    expect(PRESETS.recommended).toBeDefined()
    expect(PRESETS.full).toBeDefined()
    expect(PRESETS.library).toBeDefined()
    expect(PRESETS["vite-app"]).toBeDefined()
    expect(PRESETS["next-app"]).toBeDefined()
    expect(PRESETS.monorepo).toBeDefined()
  })
  it("all presets have required fields", () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.id).toBeDefined()
      expect(preset.name).toBeDefined()
      expect(preset.description).toBeDefined()
      expect(preset.projectType).toBeDefined()
      expect(preset.features).toBeDefined()
      expect(preset.termuxMode).toBeDefined()
    }
  })
})

describe("getPreset", () => {
  it("returns preset by id", () => {
    const preset = getPreset("minimal")
    expect(preset?.id).toBe("minimal")
  })
  it("returns undefined for unknown", () => {
    expect(getPreset("unknown")).toBeUndefined()
  })
})

describe("listPresets", () => {
  it("lists all presets", () => {
    const list = listPresets()
    expect(list.length).toBe(7)
  })
})

describe("getPresetChoices", () => {
  it("returns choices with value/label/hint", () => {
    const choices = getPresetChoices()
    expect(choices.length).toBe(7)
    for (const choice of choices) {
      expect(choice.value).toBeDefined()
      expect(choice.label).toBeDefined()
      expect(choice.hint).toBeDefined()
    }
  })
})

describe("applyPresetToAnswers", () => {
  it("applies preset with base", () => {
    const answers = applyPresetToAnswers("vite-app", {
      projectName: "my-vite",
      githubOwner: "myuser",
    })
    expect(answers?.projectName).toBe("my-vite")
    expect(answers?.projectType).toBe("vite")
    expect(answers?.githubOwner).toBe("myuser")
  })
  it("returns undefined for unknown preset", () => {
    expect(applyPresetToAnswers("unknown", {})).toBeUndefined()
  })
  it("uses defaults when base not provided", () => {
    const answers = applyPresetToAnswers("minimal", {})
    expect(answers?.projectName).toBe("my-app")
  })
})

describe("preset features", () => {
  it("minimal has only vitest", () => {
    const enabled = Object.entries(PRESETS.minimal.features)
      .filter(([, v]) => v)
      .map(([k]) => k)
    expect(enabled).toEqual(["vitest"])
  })
  it("full has all enabled", () => {
    const allOn = Object.values(PRESETS.full.features).every((v) => v)
    expect(allOn).toBe(true)
  })
  it("vite-app has vite type and docker", () => {
    expect(PRESETS["vite-app"].projectType).toBe("vite")
    expect(PRESETS["vite-app"].features.docker).toBe(true)
  })
})
