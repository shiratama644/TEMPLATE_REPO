/** OS とパッケージマネージャの判定（Termux / apt / Homebrew / winget）と導入コマンド。 */
import { existsSync } from "node:fs"

export type PackageManager = { name: string; packages: Record<string, string> }

/**
 * 実行環境のパッケージマネージャと、ツールごとのパッケージ名。
 * Termux は `PREFIX` に `com.termux` を含む（Android 上で apt 相当の `pkg` を使う）。
 * Bun はパッケージマネージャ経由ではなく配布スクリプトで導入するため `packages` に含めない。
 */
export function detectPackageManager(
  os = process.platform,
  prefix = process.env.PREFIX,
  isDebian = existsSync("/etc/debian_version"),
): PackageManager | null {
  if (prefix?.includes("com.termux")) return { name: "pkg", packages: { node: "nodejs" } }
  if (os === "darwin") return { name: "brew", packages: { node: "node" } }
  if (os === "win32") return { name: "winget", packages: { node: "OpenJS.NodeJS" } }
  if (os === "linux" && isDebian) return { name: "apt", packages: { node: "nodejs" } }
  return null
}

/** マネージャ別の導入コマンド。引数は検証しないので、実行前に必ず承認を取る。 */
export function osCommand(manager: string, pkg: string): string[] {
  if (manager === "apt") return ["sudo", "apt-get", "install", "-y", pkg]
  if (manager === "brew") return ["brew", "install", pkg]
  if (manager === "pkg") return ["pkg", "install", "-y", pkg]
  return ["winget", "install", "--id", pkg, "--exact"]
}

/** コマンドが PATH 上にあるか。 */
export const available = (bin: string): boolean => Bun.which(bin) !== null
