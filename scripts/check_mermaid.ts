import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { display, files, root } from "./walk.ts"

const declaration =
  /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|sankey-beta|C4Context)(?:\s|$)/
export function checkBlock(body: string[]): string[] {
  const nonblank = body.map((text, i) => [i, text.trim()] as const).filter(([, text]) => text)
  if (!nonblank.length) return ["Mermaid ブロックが空です"]
  const diagrams = nonblank.filter(([, text]) => declaration.test(text))
  if (!diagrams.length)
    return [`${nonblank[0][0] + 1} 行目が図の宣言ではありません（flowchart TD などを先頭に置く）`]
  if (diagrams.length > 1)
    return [
      `図の宣言が ${diagrams.length} 回あります（ブロック内 ${diagrams.map(([i]) => i + 1).join(", ")} 行目）`,
    ]
  if (diagrams[0][0] !== nonblank[0][0])
    return [`図の宣言が先頭にありません（${diagrams[0][0] + 1} 行目）`]
  return []
}
export function blocks(text: string): Array<[number, string[]]> {
  const result: Array<[number, string[]]> = []
  let start = 0
  let body: string[] | null = null
  for (const [index, line] of text.split("\n").entries()) {
    if (body === null) {
      if (/^```mermaid[ \t]*$/.test(line)) {
        start = index + 1
        body = []
      }
    } else if (/^```[ \t]*$/.test(line)) {
      result.push([start, body])
      body = null
    } else body.push(line)
  }
  if (body !== null) result.push([start, body])
  return result
}
export function checkMermaid(base = root): number {
  const fixtures: Array<[string[], number]> = [
    [["flowchart TD", "  A --> B"], 0],
    [["gitGraph", "  commit"], 0],
    [["flowchart TD", "flowchart TD"], 1],
    [["classDef ok fill:#fff", "  A --> B"], 1],
    [[""], 1],
  ]
  for (const [body, expected] of fixtures)
    if (checkBlock(body).length !== expected) {
      console.error("NG: Mermaid 自己検査に失敗")
      return 1
    }
  let count = 0,
    scanned = 0,
    errors = 0
  for (const path of files(base)) {
    if (!path.endsWith(".md")) continue
    const found = blocks(readFileSync(path, "utf8"))
    if (found.length) scanned++
    for (const [line, body] of found) {
      count++
      for (const issue of checkBlock(body)) {
        console.error(`${display(path, base)}:${line}: ${issue}`)
        errors++
      }
    }
  }
  if (errors) console.error(`NG: ${errors} 件の不備（${scanned} ファイル / ${count} ブロック中）`)
  else
    console.log(
      `OK: Mermaid ${count} ブロック（${scanned} ファイル）を検査、図の宣言に不備はありません`,
    )
  return errors ? 1 : 0
}
if (import.meta.main) process.exit(checkMermaid(process.argv[2] ? resolve(process.argv[2]) : root))
