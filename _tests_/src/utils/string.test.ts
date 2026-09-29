import { describe, expect, it } from "vitest"
import {
  camelToKebab,
  capitalize,
  countWords,
  extractHashtags,
  isBlank,
  kebabToCamel,
  maskEmail,
  removeExtraSpaces,
  slugify,
  truncate,
} from "../../../src/utils/string.ts"

describe("slugify", () => {
  it("converts basic string", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })
  it("handles empty", () => {
    expect(slugify("")).toBe("")
    expect(slugify("   ")).toBe("")
  })
  it("removes special chars", () => {
    expect(slugify("Hello@World!")).toBe("helloworld")
  })
  it("handles multiple spaces and dashes", () => {
    expect(slugify("hello   world")).toBe("hello-world")
    expect(slugify("hello---world")).toBe("hello-world")
  })
  it("trims dashes", () => {
    expect(slugify("-hello-world-")).toBe("hello-world")
  })
  it("handles mixed case and numbers", () => {
    expect(slugify("My App 123")).toBe("my-app-123")
  })
})

describe("truncate", () => {
  it("returns same if shorter", () => {
    expect(truncate("hello", 10)).toBe("hello")
  })
  it("truncates with suffix", () => {
    expect(truncate("hello world", 8)).toBe("hello...")
  })
  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello")
  })
  it("handles custom suffix", () => {
    // "hello world" 11 chars, max 8, suffix "!!" len 2 => slice 0..6 = "hello " + "!!" = "hello !!"
    expect(truncate("hello world", 8, "!!")).toBe("hello !!")
  })
  it("handles maxLength smaller than suffix", () => {
    expect(truncate("hello world", 2, "...")).toBe("he")
  })
  it("throws on invalid input", () => {
    expect(() => truncate(123 as any, 5)).toThrow(TypeError)
    expect(() => truncate("hello", -1)).toThrow(RangeError)
  })
  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("")
  })
})

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello")
    expect(capitalize("HELLO")).toBe("Hello")
  })
  it("handles empty", () => {
    expect(capitalize("")).toBe("")
  })
  it("handles single char", () => {
    expect(capitalize("a")).toBe("A")
  })
})

describe("camelToKebab", () => {
  it("converts camelCase", () => {
    expect(camelToKebab("helloWorld")).toBe("hello-world")
    expect(camelToKebab("myViteApp")).toBe("my-vite-app")
  })
  it("handles empty", () => {
    expect(camelToKebab("")).toBe("")
  })
  it("handles PascalCase", () => {
    expect(camelToKebab("HelloWorld")).toBe("hello-world")
  })
  it("handles consecutive capitals", () => {
    expect(camelToKebab("XMLHttpRequest")).toBe("xml-http-request")
  })
})

describe("kebabToCamel", () => {
  it("converts kebab-case", () => {
    expect(kebabToCamel("hello-world")).toBe("helloWorld")
    expect(kebabToCamel("my-vite-app")).toBe("myViteApp")
  })
  it("handles empty", () => {
    expect(kebabToCamel("")).toBe("")
  })
  it("handles single word", () => {
    expect(kebabToCamel("hello")).toBe("hello")
  })
})

describe("countWords", () => {
  it("counts words", () => {
    expect(countWords("hello world")).toBe(2)
    expect(countWords("  hello   world  ")).toBe(2)
  })
  it("handles empty", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   ")).toBe(0)
  })
  it("handles single word", () => {
    expect(countWords("hello")).toBe(1)
  })
})

describe("isBlank", () => {
  it("detects blank", () => {
    expect(isBlank("")).toBe(true)
    expect(isBlank("   ")).toBe(true)
    expect(isBlank(null)).toBe(true)
    expect(isBlank(undefined)).toBe(true)
  })
  it("detects non-blank", () => {
    expect(isBlank("hello")).toBe(false)
    expect(isBlank("  a  ")).toBe(false)
  })
})

describe("removeExtraSpaces", () => {
  it("removes extra spaces", () => {
    expect(removeExtraSpaces("hello   world")).toBe("hello world")
    expect(removeExtraSpaces("  hello   world  ")).toBe("hello world")
  })
  it("handles empty", () => {
    expect(removeExtraSpaces("")).toBe("")
  })
})

describe("extractHashtags", () => {
  it("extracts hashtags", () => {
    expect(extractHashtags("hello #world #test")).toEqual(["world", "test"])
  })
  it("handles no hashtags", () => {
    expect(extractHashtags("hello world")).toEqual([])
  })
  it("handles empty", () => {
    expect(extractHashtags("")).toEqual([])
  })
  it("lowercases hashtags", () => {
    expect(extractHashtags("#Hello #WORLD")).toEqual(["hello", "world"])
  })
  it("handles underscores", () => {
    expect(extractHashtags("#hello_world")).toEqual(["hello_world"])
  })
})

describe("maskEmail", () => {
  it("masks email", () => {
    expect(maskEmail("test@example.com")).toBe("t**t@example.com")
    expect(maskEmail("ab@example.com")).toBe("a***@example.com")
  })
  it("handles invalid email", () => {
    expect(maskEmail("invalid")).toBe("invalid")
    expect(maskEmail("")).toBe("")
  })
  it("handles short local", () => {
    expect(maskEmail("a@example.com")).toBe("a***@example.com")
  })
  it("handles empty local and multiple @", () => {
    expect(maskEmail("@example.com")).toBe("***@example.com")
    expect(maskEmail("a@b@c.com")).toBe("a***@b@c.com")
    expect(maskEmail("test@")).toBe("test@")
  })
})
