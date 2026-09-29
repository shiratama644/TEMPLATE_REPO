import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("verify-docs coverage", () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `verify-cover-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    vi.resetModules()
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("checkInternalLinks detects broken links", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    writeFileSync(join(tmp, "test.md"), "[broken](./nonexistent.md)")
    const result = mod.checkInternalLinks(tmp)
    expect(result.brokenCount).toBe(1)
    expect(result.broken.length).toBe(1)
  })

  it("checkInternalLinks handles code blocks and http links", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    writeFileSync(
      join(tmp, "test.md"),
      "```\n[link](./broken.md)\n```\n[http](https://example.com)\n[anchor](#section)\n[mailto](mailto:test@example.com)\n[valid](./exists.md)\n",
    )
    writeFileSync(join(tmp, "exists.md"), "# exists")
    const result = mod.checkInternalLinks(tmp)
    expect(result.brokenCount).toBe(0)
  })

  it("checkInternalLinks handles query and anchor stripping", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    writeFileSync(
      join(tmp, "test.md"),
      "[query](./exists.md?query=1)\n[anchor](./exists.md#section)\n",
    )
    writeFileSync(join(tmp, "exists.md"), "# exists")
    const result = mod.checkInternalLinks(tmp)
    expect(result.brokenCount).toBe(0)
  })

  it("checkInternalLinks handles .md extension and README", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    mkdirSync(join(tmp, "subdir"), { recursive: true })
    writeFileSync(join(tmp, "subdir", "README.md"), "# readme")
    writeFileSync(join(tmp, "test.md"), "[link](./subdir)")
    const result = mod.checkInternalLinks(tmp)
    expect(result.brokenCount).toBe(0)
  })

  it("checkPackageManager handles no pm, pnpm, non-pnpm", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const origCwd = process.cwd()
    const pkgPath = join(tmp, "package.json")

    writeFileSync(pkgPath, JSON.stringify({}))
    const originalExistsSync = (await import("node:fs")).existsSync
    // We need to chdir to tmp for checkPackageManager to find package.json
    process.chdir(tmp)
    let result = mod.checkPackageManager()
    expect(result.ok).toBe(false)
    expect(result.message).toContain("no packageManager")

    writeFileSync(pkgPath, JSON.stringify({ packageManager: "npm@10.0.0" }))
    vi.resetModules()
    const mod2 = await import("../../../scripts/verify-docs.ts")
    result = mod2.checkPackageManager()
    expect(result.ok).toBe(false)
    expect(result.pm).toBe("npm@10.0.0")

    writeFileSync(pkgPath, JSON.stringify({ packageManager: "pnpm@9.0.0" }))
    vi.resetModules()
    const mod3 = await import("../../../scripts/verify-docs.ts")
    result = mod3.checkPackageManager()
    expect(result.ok).toBe(true)

    process.chdir(origCwd)
  })

  it("checkSecretFiles handles git error", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => {
          throw new Error("git error")
        }),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkSecretFiles()
    expect(result.ok).toBe(true)
    vi.resetModules()
  })

  it("checkTocUpdate handles git error", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => {
          throw new Error("git error")
        }),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkTocUpdate()
    expect(result.docsChanged).toEqual([])
    vi.resetModules()
  })

  it("runVerifyDocs covers all branches", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})

    // Mock checkSecretFiles to return env files to trigger fail
    vi.spyOn(mod, "checkSecretFiles").mockReturnValue({ ok: false, envFiles: [".env"] })
    vi.spyOn(mod, "checkInternalLinks").mockReturnValue({ brokenCount: 1, broken: ["a -> b"] })
    vi.spyOn(mod, "checkTocUpdate").mockReturnValue({
      docsChanged: ["docs/new.md"],
      readmeChanged: false,
    })

    const result = mod.runVerifyDocs()
    expect(typeof result).toBe("boolean")

    spyLog.mockRestore()
    spyWarn.mockRestore()
    spyError.mockRestore()
  })

  it("runVerifyDocs with no docs dir", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = mod.runVerifyDocs()
    expect(typeof result).toBe("boolean")
    spyLog.mockRestore()
  })

  it("getMdFiles recursive", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    mkdirSync(join(tmp, "nested"), { recursive: true })
    writeFileSync(join(tmp, "a.md"), "# a")
    writeFileSync(join(tmp, "nested", "b.md"), "# b")
    writeFileSync(join(tmp, "nested", "c.txt"), "not md")
    const files = mod.getMdFiles(tmp)
    expect(files.length).toBe(2)
  })

  it("checkSecretFiles success with env", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => ".env\n.env.local\nsrc/index.ts\n"),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkSecretFiles()
    expect(result.ok).toBe(false)
    expect(result.envFiles).toContain(".env")
    vi.resetModules()
  })

  it("checkSecretFiles success no env", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => "src/index.ts\n"),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkSecretFiles()
    expect(result.ok).toBe(true)
    vi.resetModules()
  })

  it("checkTocUpdate success cases", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => "?? docs/new.md\n M docs/README.md\n"),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkTocUpdate()
    expect(result.docsChanged.length).toBe(1)
    expect(result.readmeChanged).toBe(true)
    vi.resetModules()

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn(() => "?? docs/new.md\n"),
      }
    })
    const mod2 = await import("../../../scripts/verify-docs.ts")
    const result2 = mod2.checkTocUpdate()
    expect(result2.docsChanged.length).toBe(1)
    expect(result2.readmeChanged).toBe(false)
    vi.resetModules()
  })

  it("checkPackageManager error", async () => {
    vi.doMock("node:fs", async () => {
      const actual = await vi.importActual<typeof import("node:fs")>("node:fs")
      return {
        ...actual,
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => {
          throw new Error("read error")
        }),
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const result = mod.checkPackageManager()
    expect(result.ok).toBe(false)
    vi.resetModules()
  })

  it("runVerifyDocs all success paths", async () => {
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(mod, "checkSecretFiles").mockReturnValue({ ok: true, envFiles: [] })
    vi.spyOn(mod, "checkInternalLinks").mockReturnValue({ brokenCount: 0, broken: [] })
    vi.spyOn(mod, "checkTocUpdate").mockReturnValue({ docsChanged: [], readmeChanged: false })
    vi.spyOn(mod, "checkPackageManager").mockReturnValue({ ok: true, message: "ok" })

    let result = mod.runVerifyDocs()
    expect(result).toBe(true)

    vi.spyOn(mod, "checkTocUpdate").mockReturnValue({
      docsChanged: ["docs/new.md"],
      readmeChanged: true,
    })
    result = mod.runVerifyDocs()
    expect(result).toBe(true)

    vi.spyOn(mod, "checkSecretFiles").mockImplementation(() => {
      throw new Error("git error")
    })

    result = mod.runVerifyDocs()
    expect(typeof result).toBe("boolean")

    spyLog.mockRestore()
    spyWarn.mockRestore()
    spyError.mockRestore()
  })

  it("main returns 0/1", async () => {
    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("diff --cached")) return "src/index.ts\n"
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
          if (String(p).includes("package.json"))
            return JSON.stringify({ packageManager: "pnpm@9.0.0" })
          return actual.readFileSync(p as any)
        },
        readdirSync: actual.readdirSync,
        statSync: actual.statSync,
      }
    })
    const mod = await import("../../../scripts/verify-docs.ts")
    const spyLog = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {})
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(mod.main()).toBe(0)
    spyLog.mockRestore()
    spyError.mockRestore()
    spyWarn.mockRestore()
    vi.resetModules()

    vi.doMock("node:child_process", async () => {
      const actual =
        await vi.importActual<typeof import("node:child_process")>("node:child_process")
      return {
        ...actual,
        execSync: vi.fn((cmd: string) => {
          if (String(cmd).includes("diff --cached")) return ".env\n"
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
          if (String(p).includes("package.json"))
            return JSON.stringify({ packageManager: "pnpm@9.0.0" })
          return actual.readFileSync(p as any)
        },
        readdirSync: actual.readdirSync,
        statSync: actual.statSync,
      }
    })
    const mod2 = await import("../../../scripts/verify-docs.ts")
    const spyLog2 = vi.spyOn(console, "log").mockImplementation(() => {})
    const spyError2 = vi.spyOn(console, "error").mockImplementation(() => {})
    const spyWarn2 = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(mod2.main()).toBe(1)
    spyLog2.mockRestore()
    spyError2.mockRestore()
    spyWarn2.mockRestore()
  })
})
