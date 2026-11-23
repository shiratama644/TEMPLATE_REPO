/** 生成する `package.json` の組み立て（既存項目の保持と、JS 向けの型・設定の付け替え）。 */
import { readFileSync } from "node:fs"
import type { Scaffold } from "./setup-manifest.ts"
import type { Resolved } from "./setup-options.ts"

export const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
export const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
/** `javascript` を選んだときに `.tsx` / `.ts` の生成物を `.jsx` / `.js` に差し替える。 */
export function applyLanguageVariants(
  o: Pick<Resolved, "language" | "template">,
  generated: Record<string, string>,
  base: Scaffold,
): void {
  if (o.language === "javascript" && o.template === "vite-react") {
    generated["src/main.jsx"] = generated["src/main.tsx"].replace(
      'getElementById("root")!',
      'getElementById("root")',
    )
    delete generated["src/main.tsx"]
    generated["vite.config.js"] = generated["vite.config.ts"]
    delete generated["vite.config.ts"]
    generated["index.html"] = generated["index.html"].replace("/src/main.tsx", "/src/main.jsx")
    for (const dep of ["typescript", "@types/react", "@types/react-dom"]) delete base.dev?.[dep]
  }
  if (o.language === "javascript" && o.template === "next") {
    generated["app/page.jsx"] = generated["app/page.tsx"]
    delete generated["app/page.tsx"]
    generated["app/layout.jsx"] = generated["app/layout.tsx"].replace(
      ": { children: React.ReactNode }",
      "",
    )
    delete generated["app/layout.tsx"]
    generated["next.config.mjs"] = "const config = {}\nexport default config\n"
    delete generated["next.config.ts"]
    for (const dep of ["typescript", "@types/react", "@types/react-dom"]) delete base.dev?.[dep]
  }
}
export function buildPackage(
  o: Resolved,
  base: Scaffold,
  extra: Scaffold,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const publishable =
    ["plain-ts", "plain-js"].includes(o.template) &&
    (o.preset === "library" || o.features.includes("publint"))
  if (publishable && o.template === "plain-ts" && base.scripts)
    base.scripts.build = `${base.scripts.build} && bun x tsc --ignoreConfig --declaration --emitDeclarationOnly --outDir dist --target ES2022 --module ESNext --moduleResolution Bundler src/index.ts`
  return {
    ...existing,
    name: o.name,
    description: o.description || existing.description || "",
    private: o.preset === "library" ? false : (existing.private ?? true),
    version: existing.version ?? "0.1.0",
    type: "module",
    packageManager: "bun@1.4.4",
    ...(publishable
      ? {
          main: existing.main ?? "./dist/index.js",
          ...(o.template === "plain-ts" ? { types: existing.types ?? "./dist/index.d.ts" } : {}),
          exports:
            existing.exports ??
            (o.template === "plain-ts"
              ? { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }
              : { ".": "./dist/index.js" }),
          files: existing.files ?? ["dist"],
        }
      : {}),
    ...(o.template === "monorepo" || o.template === "next-monorepo"
      ? { workspaces: ["apps/*", "packages/*"] }
      : {}),
    scripts: { ...((existing.scripts as object) || {}), ...base.scripts, ...extra.scripts },
    dependencies: { ...((existing.dependencies as object) || {}), ...base.deps },
    devDependencies: {
      ...((existing.devDependencies as object) || {}),
      ...base.dev,
      ...extra.dev,
    },
    ...extra.package,
  }
}
