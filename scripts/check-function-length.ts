/** 関数の長さの上限検査。TypeScript の AST で正確に数える（文字列や正規表現の影響を受けない）。 */
import { readFileSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"
import { files, root } from "./walk.ts"

export const MAX_LINES = 100
export type LongFunction = { file: string; name: string; lines: number; line: number }
const isFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isConstructorDeclaration(node) ||
  ts.isGetAccessorDeclaration(node) ||
  ts.isSetAccessorDeclaration(node)
const nameOf = (node: ts.FunctionLikeDeclaration, sf: ts.SourceFile): string => {
  if (node.name) return node.name.getText(sf)
  const parent = node.parent
  if (ts.isVariableDeclaration(parent) && parent.name) return parent.name.getText(sf)
  if (ts.isPropertyAssignment(parent) && parent.name) return parent.name.getText(sf)
  return "(匿名)"
}
/** `scripts/` の .ts を対象に、関数の行数を長い順に返す。 */
export function functionLengths(base = root): LongFunction[] {
  const found: LongFunction[] = []
  for (const path of files(join(base, "scripts"))) {
    if (!path.endsWith(".ts")) continue
    const text = readFileSync(path, "utf8")
    const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node) => {
      if (isFunctionLike(node)) {
        const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
        const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1
        found.push({
          file: relative(base, path).replaceAll("\\", "/"),
          name: nameOf(node, sf),
          lines: end - start + 1,
          line: start,
        })
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return found.sort((a, b) => b.lines - a.lines)
}
export function checkFunctionLength(base = root): number {
  const long = functionLengths(base).filter((f) => f.lines > MAX_LINES)
  if (long.length) {
    for (const f of long)
      console.error(`NG: ${f.file}:${f.line} ${f.name} は ${f.lines} 行（上限 ${MAX_LINES} 行）`)
    return 1
  }
  const all = functionLengths(base)
  const worst = all[0]
  console.log(
    `OK: 関数 ${all.length} 個を検査、最長は ${worst.file} の ${worst.name}（${worst.lines} 行 / 上限 ${MAX_LINES} 行）`,
  )
  return 0
}
if (import.meta.main) {
  const report = process.argv.includes("--report")
  if (report)
    for (const f of functionLengths().slice(0, 12))
      console.log(`${f.lines}\t${f.file}:${f.line}\t${f.name}`)
  else process.exit(checkFunctionLength())
}
