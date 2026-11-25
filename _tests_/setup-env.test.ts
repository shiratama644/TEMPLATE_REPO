import { expect, test } from "bun:test"
import { available, detectPackageManager, osCommand, runtimeBinary } from "../scripts/setup-env.ts"

const posix = process.platform === "win32" ? test.skip : test

test("osCommand builds the documented install command for each package manager", () => {
  expect(osCommand("apt", "python3")).toEqual(["sudo", "apt-get", "install", "-y", "python3"])
  expect(osCommand("brew", "go")).toEqual(["brew", "install", "go"])
  expect(osCommand("pkg", "rust")).toEqual(["pkg", "install", "-y", "rust"])
  expect(osCommand("winget", "GoLang.Go")).toEqual([
    "winget",
    "install",
    "--id",
    "GoLang.Go",
    "--exact",
  ])
  // 未知のマネージャは winget の形に倒す（sudo を勝手に付けない）
  expect(osCommand("unknown", "x")).toEqual(["winget", "install", "--id", "x", "--exact"])
})

test("runtimeBinary maps python3 to python only on Windows", () => {
  expect(runtimeBinary("python3", "win32")).toBe("python")
  expect(runtimeBinary("python3", "linux")).toBe("python3")
  expect(runtimeBinary("python3", "darwin")).toBe("python3")
  expect(runtimeBinary("go", "win32")).toBe("go")
  expect(runtimeBinary("bun")).toBe("bun")
})

posix("available reports whether a runtime binary is on PATH", () => {
  expect(available("sh")).toBe(true)
  expect(available("definitely-not-installed-binary")).toBe(false)
})

test("detectPackageManager names the packages each manager needs", () => {
  expect(detectPackageManager("darwin", undefined, false)?.packages).toEqual({
    python3: "python",
    go: "go",
    cargo: "rust",
  })
  expect(detectPackageManager("win32", undefined, false)?.packages).toEqual({
    python3: "Python.Python.3.12",
    python: "Python.Python.3.12",
    go: "GoLang.Go",
    cargo: "Rustlang.Rustup",
  })
  expect(detectPackageManager("linux", "/data/data/com.termux/files/usr", false)?.packages).toEqual(
    { python3: "python", go: "golang", cargo: "rust" },
  )
})
