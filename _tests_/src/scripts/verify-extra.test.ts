import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("verify-docs extra", () => {
  let tmp: string
  let origCwd: string

  beforeEach(() => {
    tmp = join(tmpdir(), `verify-extra-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    origCwd = process.cwd()
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.chdir(origCwd)
    rmSync(tmp, { recursive: true, force: true })
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("runVerifyDocs with packageManager missing", async () => {
    process.chdir(tmp)
    writeFileSync(join(tmp, "package.json"), JSON.stringify({}))
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("diff --cached")) return ""
          if (String(cmd).includes("status --porcelain")) return ""
          return ""
        }),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "docs") return false
          if (p === "package.json") return true
          return actual.existsSync(p as any)
        },
        readFileSync: (p: string) => {
          if (String(p).includes("package.json")) return JSON.stringify({})
          return actual.readFileSync(p as any)
        },
        readdirSync: actual.readdirSync,
        statSync: actual.statSync,
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    const ok = mod.runVerifyDocs()
    expect(typeof ok).toBe("boolean")
    spyLog.mockRestore()
    spyWarn.mockRestore()
    spyError.mockRestore()
  })

  it("runVerifyDocs with non-pnpm pm", async () => {
    process.chdir(tmp)
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => ""),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "docs") return false
          if (p === "package.json") return true
          return actual.existsSync(p as any)
        },
        readFileSync: (p: string) => {
          if (String(p).includes("package.json"))
            return JSON.stringify({ packageManager: "npm@10.0.0" })
          return actual.readFileSync(p as any)
        },
        readdirSync: actual.readdirSync,
        statSync: actual.statSync,
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    mod.runVerifyDocs()
    spyLog.mockRestore()
    spyWarn.mockRestore()
    spyError.mockRestore()
  })

  it("runVerifyDocs with package.json read error", async () => {
    process.chdir(tmp)
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => ""),
      }
    })
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "docs") return false
          if (p === "package.json") return true
          return actual.existsSync(p as any)
        },
        readFileSync: () => {
          throw new Error("read fail")
        },
        readdirSync: actual.readdirSync,
        statSync: actual.statSync,
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    mod.runVerifyDocs()
    spyLog.mockRestore()
    spyWarn.mockRestore()
    spyError.mockRestore()
  })

  it("runVerifyDocs with toc update warning", async () => {
    process.chdir(tmp)
    mkdirSync(join(tmp, "docs"), { recursive: true })
    writeFileSync(join(tmp, "docs", "test.md"), "[link](./missing.md)")
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("diff --cached")) return ""
          if (String(cmd).includes("status --porcelain")) return "?? docs/new.md\n"
          return ""
        }),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    mod.runVerifyDocs()
    spyLog.mockRestore()
    spyWarn.mockRestore()
    spyError.mockRestore()
  })

  it("runVerifyDocs with internal links error", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: (p: string) => {
          if (p === "docs") return true
          if (p === "package.json") return false
          return actual.existsSync(p as any)
        },
        readdirSync: () => {
          throw new Error("readdir fail")
        },
        readFileSync: actual.readFileSync,
        statSync: actual.statSync,
      }
    })
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => ""),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    mod.runVerifyDocs()
    spyLog.mockRestore()
    spyError.mockRestore()
  })

  it("runVerifyDocs with checkTocUpdate throwing", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("diff --cached")) return ""
          if (String(cmd).includes("status --porcelain")) throw new Error("git fail")
          return ""
        }),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    // Force checkTocUpdate to throw via mock
    vi.spyOn(mod, "checkTocUpdate").mockImplementation(() => {
      throw new Error("fail")
    })
    mod.runVerifyDocs()
    spyLog.mockRestore()
    spyError.mockRestore()
  })

  it("checkInternalLinks catch", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: () => {
          throw new Error("exists fail")
        },
        readdirSync: actual.readdirSync,
        readFileSync: actual.readFileSync,
        statSync: actual.statSync,
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkInternalLinks("docs")
    expect(result.brokenCount).toBe(0)
  })
})
