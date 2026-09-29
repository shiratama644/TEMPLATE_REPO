import { describe, expect, it, vi } from "vitest"
import {
  CommonErrors,
  ErrorCodes,
  handleError,
  reportErrors,
  TemplateError,
  wrapAsyncError,
  wrapError,
} from "../../../scripts/lib/errors.ts"

describe("errors", () => {
  it("TemplateError basic", () => {
    const err = new TemplateError("fail", {
      code: ErrorCodes.BUILD_FAILED,
      hint: "hint",
      docsUrl: "https://example.com",
    })
    expect(err.code).toBe(ErrorCodes.BUILD_FAILED)
    expect(err.hint).toBe("hint")
    expect(err.docsUrl).toBeDefined()
    expect(err.toString()).toContain("BUILD_FAILED")
    expect(() => err.log()).not.toThrow()
  })

  it("TemplateError with fix", () => {
    const err = new TemplateError("fail", {
      code: ErrorCodes.SETUP_FAILED,
      hint: "hint",
      fix: "fix it",
      docsUrl: "https://example.com",
    })
    expect(err.fix).toBe("fix it")
    expect(err.toString()).toContain("Fix")
    expect(err.toJSON()).toBeDefined()
    expect(err.toJSON().fix).toBe("fix it")
  })

  it("TemplateError toJSON", () => {
    const err = new TemplateError("msg", {
      code: "CODE",
      hint: "h",
      fix: "f",
      docsUrl: "https://x",
    })
    const json = err.toJSON()
    expect(json.code).toBe("CODE")
    expect(json.message).toBe("msg")
    expect(json.hint).toBe("h")
    expect(json.fix).toBe("f")
  })

  it("TemplateError minimal (no hint/fix/docs)", () => {
    const err = new TemplateError("minimal", { code: "MINIMAL" })
    expect(err.toString()).toBe("[MINIMAL] minimal")
    expect(() => err.log()).not.toThrow()
    expect(err.toJSON().hint).toBeUndefined()
  })

  it("TemplateError only hint", () => {
    const err = new TemplateError("only hint", { code: "HINT", hint: "just hint" })
    expect(err.toString()).toContain("Hint")
    expect(err.toString()).not.toContain("Fix")
    expect(err.toString()).not.toContain("Docs")
    expect(() => err.log()).not.toThrow()
  })

  it("TemplateError only fix", () => {
    const err = new TemplateError("only fix", { code: "FIX", fix: "just fix" })
    expect(err.toString()).toContain("Fix")
    expect(err.toString()).not.toContain("Hint")
    expect(() => err.log()).not.toThrow()
  })

  it("TemplateError only docsUrl", () => {
    const err = new TemplateError("only docs", { code: "DOCS", docsUrl: "https://example.com" })
    expect(err.toString()).toContain("Docs")
    expect(err.toString()).not.toContain("Hint")
    expect(err.toString()).not.toContain("Fix")
    expect(() => err.log()).not.toThrow()
  })

  it("TemplateError with cause", () => {
    const cause = new Error("root")
    const err = new TemplateError("with cause", { code: "CAUSE", cause })
    expect((err as any).cause).toBe(cause)
  })

  it("ErrorCodes defined", () => {
    expect(ErrorCodes.SETUP_FAILED).toBeDefined()
    expect(ErrorCodes.BUILD_FAILED).toBeDefined()
    expect(ErrorCodes.DETECT_FAILED).toBeDefined()
    expect(ErrorCodes.CACHE_CORRUPTED).toBeDefined()
    expect(ErrorCodes.GIT_DIRTY).toBeDefined()
    expect(ErrorCodes.NODE_VERSION).toBeDefined()
    expect(ErrorCodes.MISSING_DEPENDENCY).toBeDefined()
  })

  it("CommonErrors factories", () => {
    expect(CommonErrors.gitDirty("status").code).toBe(ErrorCodes.GIT_DIRTY)
    expect(CommonErrors.nodeVersion("16", ">=24").code).toBe(ErrorCodes.NODE_VERSION)
    expect(CommonErrors.missingDep("react").code).toBe(ErrorCodes.MISSING_DEPENDENCY)
    expect(CommonErrors.buildFailed("vite").code).toBe(ErrorCodes.BUILD_FAILED)
    expect(CommonErrors.buildFailed("vite", "details here").message).toContain("details here")
    expect(CommonErrors.invalidConfig("file.json", "bad").code).toBe(ErrorCodes.INVALID_CONFIG)
  })

  it("wrapError", () => {
    expect(() =>
      wrapError(
        () => {
          throw new Error("oops")
        },
        "CODE",
        "hint",
      ),
    ).toThrow(TemplateError)
    expect(wrapError(() => 42, "CODE")).toBe(42)
  })

  it("wrapError with fix", () => {
    expect(() =>
      wrapError(
        () => {
          throw new Error("oops")
        },
        "CODE",
        "hint",
        "fix",
      ),
    ).toThrow(TemplateError)
  })

  it("wrapAsyncError", async () => {
    await expect(
      wrapAsyncError(async () => {
        throw new Error("oops")
      }, "CODE"),
    ).rejects.toThrow(TemplateError)
    const val = await wrapAsyncError(async () => 123, "CODE")
    expect(val).toBe(123)
  })

  it("wrapAsyncError with fix", async () => {
    await expect(
      wrapAsyncError(
        async () => {
          throw new Error("oops")
        },
        "CODE",
        "hint",
        "fix",
      ),
    ).rejects.toThrow(TemplateError)
  })

  it("handleError with TemplateError calls exit", () => {
    const spy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit")
    }) as any)
    const err = new TemplateError("fail", { code: "TEST" })
    expect(() => handleError(err)).toThrow("exit")
    spy.mockRestore()
  })

  it("handleError with generic Error", () => {
    const spy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit")
    }) as any)
    expect(() => handleError(new Error("ENOENT file"))).toThrow("exit")
    spy.mockRestore()
  })

  it("handleError with EACCES", () => {
    const spy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit")
    }) as any)
    expect(() => handleError(new Error("EACCES permission"))).toThrow("exit")
    spy.mockRestore()
  })

  it("handleError with Cannot find module", () => {
    const spy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit")
    }) as any)
    expect(() => handleError(new Error("Cannot find module 'x'"))).toThrow("exit")
    spy.mockRestore()
  })

  it("handleError with unknown", () => {
    const spy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit")
    }) as any)
    expect(() => handleError("string error")).toThrow("exit")
    spy.mockRestore()
  })

  it("handleError verbose", () => {
    const origArgv = [...process.argv]
    process.argv = ["node", "test", "--verbose"]
    const spy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit")
    }) as any)
    expect(() => handleError(new Error("test"))).toThrow("exit")
    process.argv = origArgv
    spy.mockRestore()
  })

  it("reportErrors", () => {
    expect(() => reportErrors("Title", [])).not.toThrow()
    expect(() => reportErrors("Title", ["err1"], ["hint1"])).not.toThrow()
    expect(() => reportErrors("Title", ["err1"], ["hint1"], true)).not.toThrow()
    expect(() => reportErrors("Warn", ["w1"], [], true)).not.toThrow()
  })
})
