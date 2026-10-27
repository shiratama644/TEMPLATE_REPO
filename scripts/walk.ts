import { lstatSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

export const root = join(import.meta.dir, "..")
export function* files(base = root): Generator<string> {
  function* visit(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (
        [".git", "node_modules", ".setup-backup", ".cache", "dist", "build", "coverage"].includes(
          entry.name,
        )
      )
        continue
      const path = join(dir, entry.name)
      if (lstatSync(path).isSymbolicLink()) continue
      if (entry.isDirectory()) yield* visit(path)
      else if (entry.isFile()) yield path
    }
  }
  yield* visit(base)
}
export function display(path: string, base = root): string {
  return relative(base, path).replaceAll("\\", "/")
}
