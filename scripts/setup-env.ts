/** OS のパッケージ管理と、言語別の依存導入に必要なコマンド。 */
import { existsSync } from "node:fs"
import { join } from "node:path"
import type { Template } from "./setup-manifest.ts"

export function detectPackageManager(
  os = process.platform,
  prefix = process.env.PREFIX,
  isDebian = existsSync("/etc/debian_version"),
): { name: string; packages: Record<string, string> } | null {
  if (prefix?.includes("com.termux"))
    return { name: "pkg", packages: { python3: "python", go: "golang", cargo: "rust" } }
  if (os === "darwin")
    return { name: "brew", packages: { python3: "python", go: "go", cargo: "rust" } }
  if (os === "win32")
    return {
      name: "winget",
      packages: {
        python3: "Python.Python.3.12",
        python: "Python.Python.3.12",
        go: "GoLang.Go",
        cargo: "Rustlang.Rustup",
      },
    }
  if (os === "linux" && isDebian)
    return { name: "apt", packages: { python3: "python3", go: "golang-go", cargo: "cargo" } }
  return null
}
export function osCommand(m: string, p: string): string[] {
  if (m === "apt") return ["sudo", "apt-get", "install", "-y", p]
  if (m === "brew") return ["brew", "install", p]
  if (m === "pkg") return ["pkg", "install", "-y", p]
  return ["winget", "install", "--id", p, "--exact"]
}
const runtimeBinary = (bin: string) =>
  process.platform === "win32" && bin === "python3" ? "python" : bin
export const available = (bin: string) => Bun.which(runtimeBinary(bin)) !== null
export function nativeInstallSteps(
  template: Template,
  dir: string,
  os = process.platform,
): string[][] {
  if (template === "python-fastapi")
    return [
      [os === "win32" ? "python" : "python3", "-m", "venv", ".venv"],
      [
        join(dir, ".venv", os === "win32" ? "Scripts/python.exe" : "bin/python"),
        "-m",
        "pip",
        "install",
        "-e",
        ".",
      ],
    ]
  if (template === "rust-axum") return [["cargo", "fetch"]]
  return []
}
