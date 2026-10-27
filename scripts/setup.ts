#!/usr/bin/env bun
/** Interactive / non-interactive Bun bootstrap. No existing user file is deleted. */
import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { createInterface } from "node:readline/promises"
import {
  compatibleFeatures,
  type Feature,
  featureNames,
  featureScaffold,
  type Language,
  type Preset,
  presets,
  scaffold,
  type Template,
  templates,
} from "./setup_manifest.ts"

type Options = {
  name?: string
  description?: string
  language?: Language
  template?: Template
  preset?: Preset
  features?: Feature[]
  dir: string
  yes: boolean
  apply: boolean
  dryRun: boolean
  noInstall: boolean
  noOsInstall: boolean
  help: boolean
  list: boolean
  config?: string
  saveConfig?: string
}
const usage = `bun run setup [options]\n\n  --preset <id>       ${Object.keys(presets).join(" | ")}\n  --language <id>     ${Object.keys(templates).join(" | ")}\n  --template <id>     ${Object.values(templates).flat().join(" | ")}\n  --name <name>       Project name (lowercase kebab-case)\n  --description <s>   Project description\n  --features <ids>    Comma-separated feature IDs, or none / all\n  --config <file>     Load JSON configuration\n  --save-config <f>  Save choices when the plan is approved\n  --dir <path>        Target directory (default: current directory)\n  --dry-run           Show plan; never write files or install anything\n  --apply             With --yes, authorize writing without a prompt (not needed interactively)\n  --yes               Skip interactive questions; requires --apply to make changes\n  --no-install        Skip bun install\n  --no-os-install     Show OS package instructions only\n  --list-presets      Show presets and features\n  --help              Show this help\n\nOS packages always require a separate, per-package confirmation in an interactive terminal.\nNon-interactive mode only prints OS installation instructions; --yes never authorizes sudo.\n`
function option(args: string[]): Options {
  const o: Options = {
    dir: process.cwd(),
    yes: false,
    apply: false,
    dryRun: false,
    noInstall: false,
    noOsInstall: false,
    help: false,
    list: false,
  }
  const keys: Record<string, keyof Options> = {
    "--preset": "preset",
    "--language": "language",
    "--template": "template",
    "--name": "name",
    "--description": "description",
    "--features": "features",
    "--config": "config",
    "--save-config": "saveConfig",
    "--dir": "dir",
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a in keys) {
      const v = args[++i]
      if (!v || v.startsWith("--")) throw new Error(`${a} に値が必要です`)
      if (a === "--features")
        o.features = (
          v === "all" ? [...featureNames] : v === "none" ? [] : v.split(",").map((f) => f.trim())
        ) as Feature[]
      else (o as unknown as Record<string, string>)[keys[a]] = v
    } else if (a === "--help" || a === "-h") o.help = true
    else if (a === "--list-presets") o.list = true
    else if (a === "--dry-run") o.dryRun = true
    else if (a === "--apply") o.apply = true
    else if (a === "--yes") o.yes = true
    else if (a === "--no-install") o.noInstall = true
    else if (a === "--no-os-install") o.noOsInstall = true
    else throw new Error(`不明な引数: ${a}`)
  }
  return o
}
function assertChoices(o: Options): void {
  if (o.preset !== undefined && (typeof o.preset !== "string" || !(o.preset in presets)))
    throw new Error(`不明なプリセット: ${o.preset}`)
  if (o.language !== undefined && (typeof o.language !== "string" || !(o.language in templates)))
    throw new Error(`不明な言語: ${o.language}`)
  if (o.template !== undefined && !Object.values(templates).flat().includes(o.template))
    throw new Error(`不明なテンプレート: ${o.template}`)
  if (o.features !== undefined) {
    if (!Array.isArray(o.features) || o.features.some((f) => typeof f !== "string"))
      throw new Error("機能は文字列の配列で指定してください")
    const unknown = o.features.filter((f) => !featureNames.includes(f))
    if (unknown.length) throw new Error(`不明な機能: ${unknown.join(", ")}`)
  }
  if (
    o.name !== undefined &&
    (typeof o.name !== "string" ||
      o.name.length > 64 ||
      !/^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*$/.test(o.name))
  )
    throw new Error("プロジェクト名は英小文字で始まる kebab-case（最大 64 文字）にしてください")
  if (o.description !== undefined && typeof o.description !== "string")
    throw new Error("説明は文字列で指定してください")
  if (o.template && o.language && !templates[o.language].includes(o.template))
    throw new Error(`${o.template} は ${o.language} に対応しません`)
}
function safe(root: string, p: string): string {
  const segments = p.split(/[\\/]/)
  if (isAbsolute(p) || segments.includes("..") || segments.includes(".git") || !p)
    throw new Error(`不正な生成パス: ${p}`)
  const full = resolve(root, p)
  const rel = relative(root, full)
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error(`対象外のパス: ${p}`)
  for (let dir = dirname(full); dir !== root; dir = dirname(dir))
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink())
      throw new Error(`シンボリックリンク経由の書き込みはしません: ${p}`)
  return full
}
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
function osCommand(m: string, p: string): string[] {
  if (m === "apt") return ["sudo", "apt-get", "install", "-y", p]
  if (m === "brew") return ["brew", "install", p]
  if (m === "pkg") return ["pkg", "install", "-y", p]
  return ["winget", "install", "--id", p, "--exact"]
}
const runtimeBinary = (bin: string) =>
  process.platform === "win32" && bin === "python3" ? "python" : bin
const available = (bin: string) => Bun.which(runtimeBinary(bin)) !== null
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
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n"
export async function run(args: string[]): Promise<number> {
  const o = option(args)
  if (o.help) {
    console.log(usage)
    return 0
  }
  if (o.list) {
    for (const [key, p] of Object.entries(presets))
      console.log(`${key}: ${p.description} (${p.template}, ${p.features.length} 機能)`)
    console.log(`機能: ${featureNames.join(", ")}`)
    return 0
  }
  o.dir = resolve(o.dir)
  if (!existsSync(o.dir) || !statSync(o.dir).isDirectory())
    throw new Error(`対象ディレクトリが存在しません: ${o.dir}`)
  if (o.config) {
    const config = readJson(resolve(o.config))
    if (!config || typeof config !== "object" || Array.isArray(config))
      throw new Error("設定ファイルは JSON オブジェクトで指定してください")
    const keys = ["name", "description", "language", "template", "preset", "features"] as const
    for (const key of Object.keys(config))
      if (!keys.includes(key as (typeof keys)[number]))
        throw new Error(`設定ファイルに不明な項目があります: ${key}`)
    for (const k of keys)
      if (config[k] !== undefined && o[k] === undefined)
        (o as unknown as Record<string, unknown>)[k] = config[k]
  }
  assertChoices(o) // Validate JSON and CLI values before indexing presets / templates.
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  if (!tty && !o.yes && !o.dryRun)
    throw new Error("非対話式には --yes を指定してください（書き込みには --apply も必要）")
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (question: string) => (await rl.question(question)).trim()
  const select = async <T extends string>(
    label: string,
    values: readonly T[],
    fallback: T,
  ): Promise<T> => {
    console.log(`\n${label}: ${values.map((v, i) => `${i + 1}:${v}`).join("  ")}`)
    const answer = await ask(`番号を選択 [${values.indexOf(fallback) + 1}]: `)
    return (values[Number(answer || values.indexOf(fallback) + 1) - 1] ?? fallback) as T
  }
  try {
    if (!o.preset && tty && !o.yes)
      o.preset = await select("プリセット", Object.keys(presets) as Preset[], "recommended")
    o.preset ??= "recommended"
    const preset = presets[o.preset]
    if (!o.language && tty && !o.yes)
      o.language = await select("使用する言語", Object.keys(templates) as Language[], "typescript")
    o.language ??= "typescript"
    if (!o.template && tty && !o.yes)
      o.template = await select(
        "テンプレート",
        templates[o.language],
        templates[o.language].includes(preset.template)
          ? preset.template
          : templates[o.language][0],
      )
    o.template ??= templates[o.language].includes(preset.template)
      ? preset.template
      : templates[o.language][0]
    if (!o.name && tty && !o.yes)
      o.name = (await ask(`プロジェクト名 [${basename(o.dir)}]: `)) || basename(o.dir)
    o.name ??= basename(o.dir)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
    if (!o.description && tty && !o.yes) o.description = await ask("したいこと・概要（任意）: ")
    if (!o.features && tty && !o.yes) {
      console.log(`推奨機能: ${preset.features.join(", ") || "なし"}`)
      const input = await ask("機能を変更する場合はカンマ区切りで入力（Enter で推奨）: ")
      if (input)
        o.features =
          input === "none"
            ? []
            : input === "all"
              ? [...featureNames]
              : (input.split(",").map((s) => s.trim()) as Feature[])
    }
    const explicitFeatures = o.features !== undefined
    o.features ??= preset.features
    assertChoices(o)
    const allowed = compatibleFeatures(o.template)
    const incompatible = o.features.filter((f) => !allowed.includes(f))
    if (incompatible.length) {
      if (explicitFeatures)
        throw new Error(`${o.template} では使用できない機能: ${incompatible.join(", ")}`)
      console.log(`対象言語・テンプレートに非対応の機能を除外: ${incompatible.join(", ")}`)
      o.features = o.features.filter((f) => allowed.includes(f))
    }
    const base = scaffold(o.template, o.name)
    const publishable =
      ["plain-ts", "plain-js"].includes(o.template) &&
      (o.preset === "library" || o.features.includes("publint"))
    if (publishable && o.template === "plain-ts" && base.scripts)
      base.scripts.build = `${base.scripts.build} && bun x tsc --declaration --emitDeclarationOnly --outDir dist --target ES2022 --module ESNext --moduleResolution Bundler src/index.ts`
    const extra = featureScaffold(o.features, o.name, o.template)
    if (
      o.features.includes("termux") &&
      process.env.PREFIX?.includes("com.termux") &&
      o.template === "next" &&
      base.scripts
    )
      base.scripts.dev = "bun x next dev --webpack"
    const generated = { ...base.files, ...extra.files }
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
    const existing = existsSync(join(o.dir, "package.json"))
      ? readJson(join(o.dir, "package.json"))
      : {}
    const pkg: Record<string, unknown> = {
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
    const pkgPath = safe(o.dir, "package.json")
    if (lstatSync(pkgPath, { throwIfNoEntry: false })?.isSymbolicLink())
      throw new Error("package.json が symlink です。安全のため中止します")
    const create = Object.entries(generated).filter(([p]) => !existsSync(safe(o.dir, p)))
    const retained = Object.keys(generated).filter((p) => existsSync(safe(o.dir, p)))
    const pkgChanged = !existsSync(pkgPath) || readFileSync(pkgPath, "utf8") !== json(pkg)
    const configDest = o.saveConfig ? safe(o.dir, o.saveConfig) : undefined
    if (configDest && existsSync(configDest))
      throw new Error(`既存の設定ファイルを上書きできません: ${o.saveConfig}`)
    // Check the backup path before writing any generated file.
    if (pkgChanged && existsSync(pkgPath)) safe(o.dir, ".setup-backup/check")
    console.log(`\nセットアップ計画: ${o.name} / ${o.language} / ${o.template} / ${o.preset}`)
    console.log(`機能: ${o.features.join(", ") || "なし"}`)
    console.log(
      `OS: ${process.platform} / ${detectPackageManager()?.name ?? "未対応"}  必要: ${base.requires?.join(", ") || "Bun"}`,
    )
    for (const [path] of create) console.log(`+ ${path}`)
    for (const path of retained) console.log(`= ${path} （既存を保持）`)
    if (pkgChanged)
      console.log(`${existsSync(pkgPath) ? "~" : "+"} package.json （バックアップを作成）`)
    const suggestions = [
      "docs/planning/ にあるテンプレート用計画書",
      "docs/task-list.md のサンプル行",
      "使用しない .agent/skills/ と .agent/agents/",
      "README.md のテンプレート説明",
    ]
    console.log("完了後に手動で確認・修正する候補（自動削除なし）:\n- " + suggestions.join("\n- "))
    if (o.dryRun) {
      console.log("dry-run: 変更・インストールは行いません")
      return 0
    }
    if (tty && !o.yes) {
      const answer = (await ask("この計画を適用しますか？ [y/N]: ")).toLowerCase()
      if (answer !== "y" && answer !== "yes") {
        console.log("中止しました。変更・インストールは行いません")
        return 0
      }
    } else if (!o.apply) {
      console.log("変更なし。非対話式の適用には --yes --apply を指定してください")
      return 0
    }
    const backupRoot = safe(o.dir, ".setup-backup")
    let backup: string | undefined
    if (pkgChanged && existsSync(pkgPath)) {
      mkdirSync(backupRoot, { recursive: true })
      backup = mkdtempSync(join(backupRoot, "manifest-"))
    }
    const created: string[] = []
    const changed: string[] = []
    try {
      for (const [path, content] of create) {
        const target = safe(o.dir, path)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, content, { flag: "wx" })
        created.push(target)
      }
      if (pkgChanged) {
        if (existsSync(pkgPath)) {
          if (!backup) throw new Error("バックアップの作成に失敗しました")
          copyFileSync(pkgPath, join(backup, "package.json"))
          changed.push(pkgPath)
        }
        const tmp = join(o.dir, `.setup-pkg-${process.pid}.tmp`)
        writeFileSync(tmp, json(pkg), { flag: "wx" })
        renameSync(tmp, pkgPath)
        if (!changed.length) created.push(pkgPath)
      }
      if (configDest) {
        mkdirSync(dirname(configDest), { recursive: true })
        writeFileSync(
          configDest,
          json({
            name: o.name,
            description: o.description,
            language: o.language,
            template: o.template,
            preset: o.preset,
            features: o.features,
          }),
          { flag: "wx" },
        )
        created.push(configDest)
      }
    } catch (e) {
      for (const path of created) rmSync(path, { force: true })
      for (const path of changed) if (backup) copyFileSync(join(backup, basename(path)), path)
      throw e
    }
    console.log(
      `作成 ${create.length} 件、保持 ${retained.length} 件。${changed.length ? `バックアップ: ${backup}` : ""}`,
    )
    if (!o.noInstall) {
      console.log("Bun 依存をインストール: bun install")
      const installed = spawnSync("bun", ["install"], {
        cwd: o.dir,
        stdio: "inherit",
        shell: false,
      })
      if (installed.status !== 0)
        throw new Error(
          "bun install に失敗。生成ファイルは残しています。設定を確認して再実行してください",
        )
    }
    let missingNativeTool = false
    for (const bin of base.requires || []) {
      if (available(bin)) continue
      const m = detectPackageManager(),
        p = m?.packages[bin]
      if (!m || !p) {
        console.log(`${bin} が必要です。OS に応じて手動で導入してください`)
        missingNativeTool = true
        continue
      }
      const command = osCommand(m.name, p)
      console.log(`必要な OS パッケージ: ${command.join(" ")}`)
      if (!tty || o.yes || o.noOsInstall) {
        console.log("OS パッケージは自動導入しません")
        missingNativeTool = true
        continue
      }
      if ((await ask(`${bin} を今インストールしますか？コマンドを確認し yes と入力: `)) !== "yes") {
        missingNativeTool = true
        continue
      }
      const installed = spawnSync(command[0], command.slice(1), { stdio: "inherit", shell: false })
      if (installed.status !== 0) {
        console.error(`${bin} のインストールに失敗しました。手動で確認してください`)
        missingNativeTool = true
      } else missingNativeTool ||= !available(bin)
    }
    if (!o.noInstall && !missingNativeTool) {
      const steps = nativeInstallSteps(o.template, o.dir)
      if (
        steps.length &&
        lstatSync(join(o.dir, ".venv"), { throwIfNoEntry: false })?.isSymbolicLink()
      )
        throw new Error(".venv が symlink です。安全のため依存導入を中止します")
      for (const [command, ...args] of steps) {
        console.log(`言語別の依存を導入: ${command} ${args.join(" ")}`)
        const result = spawnSync(command, args, { cwd: o.dir, stdio: "inherit", shell: false })
        if (result.status !== 0)
          throw new Error(`依存導入に失敗しました: ${command}。生成ファイルは保持します`)
      }
    } else if (missingNativeTool) {
      console.log("言語別の依存導入は保留しました。必要な実行ツールを用意してください")
    }
    console.log(
      "セットアップ処理が終わりました。案内した文書・スキル候補を確認してください（自動削除はしません）。",
    )
    return 0
  } finally {
    rl.close()
  }
}
if (import.meta.main)
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(`NG: ${e instanceof Error ? e.message : e}`)
      process.exit(1)
    })
