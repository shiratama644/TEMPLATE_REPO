/** POSIX sh の構文検査と bashism の検出。対象は `.agent/hooks/*.sh` と `.githooks/*`。 */
import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { root } from "./walk.ts"

// コメントは検査対象外（説明に bashism を書くことがある）。
function stripComments(src: string): string {
  return src
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return ""
      let quote: string | null = null
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (quote) {
          if (c === quote) quote = null
          continue
        }
        if (c === '"' || c === "'") {
          quote = c
          continue
        }
        // 空白の後ろの # だけをコメント開始とみなす（${#x} や $# は残す）。
        if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i)
      }
      return line
    })
    .join("\n")
}
export const bashisms: Array<[RegExp, string]> = [
  [/\[\[(?!:)/, "[[ ]] は bash 専用。[ ] を使う（[[:space:]] は POSIX の文字クラス）"],
  [/\$\{[A-Za-z_][A-Za-z0-9_]*\//, "${var/pat/rep} は bash 専用"],
  [/\$\{[A-Za-z_][A-Za-z0-9_]*:(?![-=+?])\s*[-+]?\d/, "${var:offset:length} は bash 専用"],
  [/\$\{!/, "${!var} の間接参照は bash 専用"],
  [/\$\(</, "$(<file) は bash 専用。$(cat file) を使う"],
  [/(^|[^&])&>/, "&> は bash 専用。> file 2>&1 を使う"],
  [
    /\b(let|declare|typeset|shopt|select|coproc|pushd|popd|dirs|disown|bind)\b/,
    "bash 専用の組込みコマンド",
  ],
  [/\bset\s+-[A-Za-z]*o/, "set -o / pipefail は bash 専用"],
  [/\bsource\s/, "source は bash 専用。. (dot) を使う"],
  [/\$'/, "$'...' は bash 専用"],
  [/\[ [^\]]*==/, "[ ] の == は bash 専用。= を使う"],
  [/\bBASH[A-Z_]*\b/, "$BASH 系の変数は bash 専用"],
  [/printf[^|;&]*%q/, "printf %q は bash 専用"],
  [/\becho\s+-[A-Za-z]*e\b/, "echo -e は POSIX で未定義。printf を使う"],
]
export function shellTargets(base = root): string[] {
  const list = (dir: string, accept: (name: string) => boolean): string[] => {
    try {
      return readdirSync(dir)
        .filter(accept)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => join(dir, name))
    } catch {
      return []
    }
  }
  return [
    ...list(join(base, ".agent/hooks"), (name) => name.endsWith(".sh")),
    ...list(join(base, ".githooks"), () => true),
  ]
}
export function checkShell(base = root, platform = process.platform): number {
  if (platform === "win32") {
    console.log("SKIP: POSIX sh が無いため構文検査は未実施（Windows）")
    return 0
  }
  const targets = shellTargets(base)
  const shell = ["dash", "sh"].find((bin) => spawnSync(bin, ["-c", ":"], {}).status === 0)
  const problems: string[] = []
  for (const path of targets) {
    const name = relative(base, path).replaceAll("\\", "/")
    const src = readFileSync(path, "utf8")
    if (src.split("\n")[0] !== "#!/bin/sh") problems.push(`${name}: shebang は #!/bin/sh にする`)
    const code = stripComments(src)
    for (const [re, why] of bashisms) {
      const m = re.exec(code)
      if (m)
        problems.push(
          `${name}:${code.slice(0, m.index).split("\n").length}: ${why}（${m[0].trim()}）`,
        )
    }
    if (shell) {
      const r = spawnSync(shell, ["-n", path], { encoding: "utf8" })
      if (r.status !== 0)
        problems.push(`${name}: ${shell} -n が失敗: ${(r.stderr || "").trim().split("\n")[0]}`)
    }
  }
  if (problems.length) {
    for (const p of problems) console.error(`NG: ${p}`)
    return 1
  }
  console.log(
    `OK: POSIX sh ${targets.length} ファイルを検査（shebang・bashism・${shell ?? "sh 未取得"} -n）`,
  )
  return 0
}
if (import.meta.main) process.exit(checkShell())
