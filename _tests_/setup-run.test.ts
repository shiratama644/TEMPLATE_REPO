import { afterEach, expect, test } from "bun:test"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { CANCEL_SYMBOL } from "@clack/prompts"
import {
  type ClackChoices,
  collectSelection,
  decisionMessage,
  loadConfig,
  makeSetupUi,
  maybeInit,
  planPending,
  promptChoices,
  run,
  type SetupUi,
  setupEntry,
} from "../scripts/setup.ts"
import type { InstallEnv } from "../scripts/setup-install.ts"
import { featureNames, presets, type Template, templates } from "../scripts/setup-manifest.ts"
import { type Options, option, SetupCancelled } from "../scripts/setup-options.ts"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "setup-run-"))
  dirs.push(dir)
  return dir
}

/** 導入の偽物。コマンドを実行せず、呼び出しだけ記録する。 */
function fakeInstall(over: Partial<InstallEnv> = {}): { env: InstallEnv; calls: string[] } {
  const calls: string[] = []
  const env: InstallEnv = {
    run(command, args, cwd) {
      calls.push(`run ${command} ${args.join(" ")}${cwd ? ` cwd=${cwd}` : ""}`)
      return 0
    },
    async ask(message) {
      calls.push(`ask ${message}`)
      return "yes"
    },
    has: () => true,
    manager: () => ({ name: "apt", packages: { python3: "python3" } }),
    ...over,
  }
  return { env, calls }
}

type Answer = { select?: string; text?: string; confirm?: boolean }
/** 対話の偽物。質問を記録し、決めた答えを返す。 */
function fakeClack(
  answers: Answer & { textByMessage?: Record<string, string>; cancel?: boolean } = {},
): { clack: ClackChoices; asked: string[] } {
  const asked: string[] = []
  const clack: ClackChoices = {
    async select(opts) {
      asked.push(`select ${opts.message}`)
      if (answers.cancel) return CANCEL_SYMBOL
      return answers.select ?? opts.initialValue ?? opts.options[0].value
    },
    async text(opts) {
      asked.push(`text ${opts.message}`)
      if (answers.cancel) return CANCEL_SYMBOL
      const given = answers.textByMessage?.[opts.message] ?? answers.text
      const value = given ?? opts.defaultValue ?? ""
      const validate = opts.validate as ((input?: string) => string | undefined) | undefined
      const invalid = validate?.(value)
      return typeof invalid === "string" ? `invalid:${invalid}` : value
    },
    async confirm(opts) {
      asked.push(`confirm ${opts.message}`)
      if (answers.cancel) return CANCEL_SYMBOL
      return answers.confirm ?? false
    },
  }
  return { clack, asked }
}

function ui(answers: Parameters<typeof fakeClack>[0] = {}, tty = false, install?: InstallEnv) {
  const { clack, asked } = fakeClack(answers)
  return { ui: makeSetupUi(clack, tty, install ?? fakeInstall().env), asked }
}

/**
 * 実行中の出力を全部集める。console だけでなく process.stdout も差し替えるのは、
 * Clack の cancel() が console を通さず直接 stdout に書くため（利用者に見える物は全部対象）。
 */
async function capture<T>(run: () => Promise<T>): Promise<{ value: T; out: string }> {
  const logs: string[] = []
  const originalLog = console.log
  const originalError = console.error
  const originalOut = process.stdout.write.bind(process.stdout)
  const originalErr = process.stderr.write.bind(process.stderr)
  console.log = (message: string) => logs.push(String(message))
  console.error = (message: string) => logs.push(String(message))
  process.stdout.write = ((chunk: string | Uint8Array) => {
    logs.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk))
    return true
  }) as typeof process.stdout.write
  process.stderr.write = process.stdout.write
  try {
    return { value: await run(), out: logs.join("\n") }
  } finally {
    console.log = originalLog
    console.error = originalError
    process.stdout.write = originalOut as typeof process.stdout.write
    process.stderr.write = originalErr as typeof process.stderr.write
  }
}

/** 終了コードを返す CLI 用の薄いラッパ。 */
async function captured(run: () => Promise<number>): Promise<{ code: number; out: string }> {
  const { value, out } = await capture(run)
  return { code: value, out }
}

test("help and the preset list answer without touching the directory", async () => {
  const help = await captured(() => run(["--help"], ui().ui))
  expect(help.code).toBe(0)
  expect(help.out).toContain("--plan-json")
  expect(help.out).toContain("--init-only")

  const list = await captured(() => run(["--list-presets"], ui().ui))
  expect(list.code).toBe(0)
  for (const [key, preset] of Object.entries(presets))
    expect(list.out).toContain(`${key}: ${preset.description}`)
  expect(list.out).toContain(`機能: ${featureNames.join(", ")}`)

  await expect(run(["--plan-json", "--help"], ui().ui)).rejects.toThrow(
    "--plan-json は --help / --list-presets と併用できません",
  )
  await expect(run(["--plan-json", "--list-presets"], ui().ui)).rejects.toThrow(
    "--plan-json は --help / --list-presets と併用できません",
  )
})

test("a missing directory or a missing --yes stops before anything is planned", async () => {
  await expect(run(["--dir", join(temp(), "missing"), "--yes"], ui().ui)).rejects.toThrow(
    "対象ディレクトリが存在しません",
  )
  const file = join(temp(), "not-a-dir")
  writeFileSync(file, "x\n")
  await expect(run(["--dir", file, "--yes"], ui().ui)).rejects.toThrow(
    "対象ディレクトリが存在しません",
  )
  const dir = temp()
  await expect(run(["--dir", dir], ui().ui)).rejects.toThrow(
    "非対話式には --yes を指定してください（書き込みには --apply も必要）",
  )
  expect(existsSync(join(dir, "package.json"))).toBe(false)
})

test("dry-run and --yes without --apply show the plan and write nothing", async () => {
  const dir = temp()
  const dry = await captured(() =>
    run(["--dir", dir, "--dry-run", "--preset", "minimal", "--name", "demo-app"], ui().ui),
  )
  expect(dry.code).toBe(0)
  expect(dry.out).toContain("セットアップ計画: demo-app / typescript / plain-ts / minimal")
  expect(dry.out).toContain("dry-run: 変更・インストールは行いません")
  expect(dry.out).toContain("+ src/index.ts")
  expect(existsSync(join(dir, "package.json"))).toBe(false)

  const needsApply = await captured(() =>
    run(["--dir", dir, "--yes", "--preset", "minimal", "--name", "demo-app"], ui().ui),
  )
  expect(needsApply.code).toBe(0)
  // 適用すべき変更があるのに --apply が無いときは「変更なし」とは言わない
  expect(needsApply.out).toContain(
    "計画は適用していません。適用するには --yes --apply を指定してください",
  )
  expect(existsSync(join(dir, "package.json"))).toBe(false)
  expect(planPending({ create: [], pkgChanged: false, configDest: undefined })).toBe(false)
  expect(planPending({ create: [], pkgChanged: true, configDest: undefined })).toBe(true)
  expect(planPending({ create: [], pkgChanged: false, configDest: "a.json" })).toBe(true)
  expect(decisionMessage("needs-apply", false)).toBe(
    "変更なし。非対話式の適用には --yes --apply を指定してください",
  )
  expect(decisionMessage("needs-apply", true)).toBe(
    "計画は適用していません。適用するには --yes --apply を指定してください",
  )
  expect(decisionMessage("dry-run", true)).toBe("dry-run: 変更・インストールは行いません")
  expect(decisionMessage("decline", false)).toBe("中止しました。変更・インストールは行いません")
})

test("--yes --apply writes the plan and installs through the injected environment", async () => {
  const dir = temp()
  const install = fakeInstall()
  const applied = await captured(() =>
    run(
      ["--dir", dir, "--yes", "--apply", "--preset", "minimal", "--name", "demo-app"],
      ui({}, false, install.env).ui,
    ),
  )
  expect(applied.code).toBe(0)
  expect(applied.out).toContain("作成 4 件、更新 0 件、保持 0 件。")
  expect(applied.out).toContain("セットアップ処理が終わりました")
  expect(readFileSync(join(dir, "src/index.ts"), "utf8")).toContain("demo-app")
  expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name).toBe("demo-app")
  expect(install.calls).toEqual([`run bun install cwd=${dir}`])

  // --no-install では依存導入も言語別の手順も実行しない
  const skipped = fakeInstall()
  const dir2 = temp()
  await captured(() =>
    run(
      [
        "--dir",
        dir2,
        "--yes",
        "--apply",
        "--no-install",
        "--language",
        "python",
        "--template",
        "python-fastapi",
        "--name",
        "demo-api",
      ],
      ui({}, false, skipped.env).ui,
    ),
  )
  expect(skipped.calls).toEqual([])
  expect(existsSync(join(dir2, "app.py"))).toBe(true)

  // 導入を許可すれば言語別の手順まで走る。OS パッケージは個別承認のまま
  const native = fakeInstall({ has: () => false })
  const dir3 = temp()
  const out = await captured(() =>
    run(
      [
        "--dir",
        dir3,
        "--yes",
        "--apply",
        "--language",
        "python",
        "--template",
        "python-fastapi",
        "--name",
        "demo-api",
      ],
      ui({}, false, native.env).ui,
    ),
  )
  expect(out.out).toContain("OS パッケージは自動導入しません")
  expect(out.out).toContain("言語別の依存導入は保留しました。必要な実行ツールを用意してください")
  expect(native.calls).toEqual([`run bun install cwd=${dir3}`])

  const ready = fakeInstall()
  const dir4 = temp()
  await captured(() =>
    run(
      [
        "--dir",
        dir4,
        "--yes",
        "--apply",
        "--language",
        "python",
        "--template",
        "python-fastapi",
        "--name",
        "demo-api",
      ],
      ui({}, false, ready.env).ui,
    ),
  )
  expect(ready.calls[0]).toBe(`run bun install cwd=${dir4}`)
  expect(ready.calls[1]).toContain("-m venv .venv")
  expect(ready.calls[2]).toContain("-m pip install -e .")
})

test("--plan-json prints one document and refuses the flags that would write", async () => {
  const dir = temp()
  const printed = await captured(() =>
    run(["--dir", dir, "--plan-json", "--preset", "minimal", "--name", "demo-app"], ui().ui),
  )
  expect(printed.code).toBe(0)
  const payload = JSON.parse(printed.out) as {
    mode: string
    selection: { features: string[] }
    files: Array<{ path: string }>
    dependencies: { executed: boolean }
    manualReview: string[]
  }
  expect(payload.mode).toBe("preview")
  expect(payload.selection.features).toEqual(["vitest"])
  expect(payload.files.map((f) => f.path)).toContain("package.json")
  expect(payload.dependencies.executed).toBe(false)
  expect(payload.manualReview.length).toBeGreaterThan(0)
  expect(existsSync(join(dir, "package.json"))).toBe(false)

  await expect(run(["--dir", dir, "--plan-json", "--apply"], ui().ui)).rejects.toThrow(
    "--plan-json は --apply / --save-config と同時に指定できません",
  )
  await expect(
    run(["--dir", dir, "--plan-json", "--save-config", "setup.json"], ui().ui),
  ).rejects.toThrow("--plan-json は --apply / --save-config と同時に指定できません")
})

test("a configuration file is weaker than the command line and validates its init section", async () => {
  const dir = temp()
  const config = join(temp(), "setup.json")
  writeFileSync(
    config,
    JSON.stringify({
      name: "from-config",
      description: "設定ファイルの説明",
      language: "typescript",
      template: "plain-ts",
      preset: "recommended",
      features: ["vitest", "cspell"],
      init: {
        name: "表示名",
        slug: "slug-name",
        owner: "octocat",
        repo: "hello",
        licenseHolder: "Octocat",
        licenseYear: "2026",
        purpose: "目的",
        audience: "対象",
        nonGoals: "対象外",
        firstTask: "最初のタスク",
        sections: ["git"],
        sectionText: { git: "main への直接 push は禁止" },
      },
    }),
  )
  const o: Options = option(["--dir", dir, "--config", config, "--name", "from-cli"])
  loadConfig(o)
  expect(o.name).toBe("from-cli")
  expect(o.description).toBe("設定ファイルの説明")
  expect(o.preset).toBe("recommended")
  expect(o.features).toEqual(["vitest", "cspell"])
  expect(o.initName).toBe("表示名")
  expect(o.owner).toBe("octocat")
  expect(o.repo).toBe("hello")
  expect(o.licenseHolder).toBe("Octocat")
  expect(o.licenseYear).toBe("2026")
  expect(o.purpose).toBe("目的")
  expect(o.audience).toBe("対象")
  expect(o.nonGoals).toBe("対象外")
  expect(o.firstTask).toBe("最初のタスク")
  expect(o.keepSections).toEqual(["git"])
  expect(o.initSections).toEqual({ git: "main への直接 push は禁止" })

  // 配列や文字列は設定として受け付けない
  const bad = join(temp(), "bad.json")
  writeFileSync(bad, "[1,2]\n")
  expect(() => loadConfig(option(["--config", bad]))).toThrow(
    "設定ファイルは JSON オブジェクトで指定してください",
  )
  // init の中身は Zod で検証する
  const wrongInit = join(temp(), "wrong.json")
  writeFileSync(wrongInit, JSON.stringify({ init: { licenseYear: "26" } }))
  expect(() => loadConfig(option(["--config", wrongInit]))).toThrow()
  // --config が無ければ何も変えない
  const untouched = option(["--dir", dir])
  loadConfig(untouched)
  expect(untouched.name).toBeUndefined()
})

test("the interactive run asks only what is missing and applies after a yes", async () => {
  const dir = temp()
  const { ui: interactive, asked } = ui(
    {
      textByMessage: {
        プロジェクト名: "demo-app",
        "したいこと・概要（任意）": "問い合わせ対応を自動化する",
        "機能を変更する場合はカンマ区切りで入力（Enter で推奨）": "vitest,cspell",
      },
      confirm: true,
    },
    true,
    fakeInstall().env,
  )
  const applied = await captured(() => run(["--dir", dir, "--apply", "--no-install"], interactive))
  expect(applied.code).toBe(0)
  expect(asked).toEqual([
    "select プリセット",
    "select 使用する言語",
    "select テンプレート",
    "text プロジェクト名",
    "text したいこと・概要（任意）",
    "text 機能を変更する場合はカンマ区切りで入力（Enter で推奨）",
    "confirm この計画を適用しますか？ [y/N]",
  ])
  expect(applied.out).toContain("機能: vitest, cspell")
  expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).description).toBe(
    "問い合わせ対応を自動化する",
  )

  // 引数で決まっている項目は聞かない
  const partial = ui({ confirm: true }, true, fakeInstall().env)
  const dir2 = temp()
  await captured(() =>
    run(
      [
        "--dir",
        dir2,
        "--apply",
        "--no-install",
        "--preset",
        "minimal",
        "--language",
        "typescript",
        "--template",
        "plain-ts",
        "--name",
        "demo-app",
        "--features",
        "vitest",
      ],
      partial.ui,
    ),
  )
  expect(partial.asked).toEqual([
    "text したいこと・概要（任意）",
    "confirm この計画を適用しますか？ [y/N]",
  ])

  // 機能の入力は none / all / 空（推奨のまま）を受け付ける
  for (const [input, expected] of [
    ["none", []],
    ["all", [...featureNames]],
    // Enter（空）は推奨のまま。o.features は undefined のまま preset 側が使われる
    ["", undefined],
  ] as Array<[string, Options["features"]]>) {
    const asked2 = ui(
      { textByMessage: { "機能を変更する場合はカンマ区切りで入力（Enter で推奨）": input } },
      true,
    )
    const o = option(["--dir", temp(), "--preset", "recommended"])
    await promptChoices(o, asked2.ui)
    expect(o.features).toEqual(expected)
  }
})

test("declining or cancelling the plan never writes, and says which files were kept", async () => {
  const dir = temp()
  const declined = await captured(() =>
    run(
      ["--dir", dir, "--preset", "minimal", "--name", "demo-app", "--no-install"],
      ui({ confirm: false }, true).ui,
    ),
  )
  expect(declined.code).toBe(0)
  expect(declined.out).toContain("中止しました。変更・インストールは行いません")
  expect(existsSync(join(dir, "package.json"))).toBe(false)

  // 承認の途中で中止したら、書き込んだ物は残すと明示する
  const cancelled = fakeInstall({
    has: () => false,
    async ask() {
      throw new SetupCancelled()
    },
  })
  const dir2 = temp()
  const afterApply = await captured(() =>
    run(
      [
        "--dir",
        dir2,
        "--apply",
        "--language",
        "python",
        "--template",
        "python-cli",
        "--name",
        "demo-app",
      ],
      ui({ confirm: true }, true, cancelled.env).ui,
    ),
  )
  expect(afterApply.code).toBe(0)
  expect(afterApply.out).toContain("後続の導入を中止しました。生成済みのファイルは保持します")
  expect(existsSync(join(dir2, "main.py"))).toBe(true)

  // 選択の途中で中止したら、何も書いていない
  const early = ui({ cancel: true }, true)
  await expect(run(["--dir", temp(), "--apply", "--no-install"], early.ui)).resolves.toBe(0)
  expect(early.asked[0]).toBe("select プリセット")
})

test("features that do not fit the template are refused or dropped with a reason", async () => {
  const dir = temp()
  await expect(
    run(
      [
        "--dir",
        dir,
        "--yes",
        "--template",
        "vite-react",
        "--features",
        "changesets",
        "--name",
        "x",
      ],
      ui().ui,
    ),
  ).rejects.toThrow("vite-react では使用できない機能: changesets")

  const dropped = await captured(() =>
    run(
      [
        "--dir",
        dir,
        "--dry-run",
        "--preset",
        "library",
        "--template",
        "vite-react",
        "--name",
        "demo-app",
      ],
      ui().ui,
    ),
  )
  expect(dropped.out).toContain(
    "対象言語・テンプレートに非対応の機能を除外: publint, size-limit, changesets",
  )
  expect(dropped.out).toContain("機能: vitest, coverage")

  // --plan-json では除外を標準出力に混ぜない（JSON は 1 文書の約束）
  const silent = await captured(() =>
    run(
      [
        "--dir",
        temp(),
        "--plan-json",
        "--preset",
        "library",
        "--template",
        "vite-react",
        "--name",
        "demo-app",
      ],
      ui().ui,
    ),
  )
  const payload = JSON.parse(silent.out) as { selection: { excludedFeatures: string[] } }
  expect(payload.selection.excludedFeatures).toEqual(["publint", "size-limit", "changesets"])
})

test("collectSelection and buildSelection keep the resolved choices consistent", async () => {
  const o = option([
    "--dir",
    temp(),
    "--preset",
    "vite-app",
    "--language",
    "javascript",
    "--template",
    "vite-react",
    "--name",
    "demo-app",
  ])
  const selection = await collectSelection(o, ui().ui)
  expect(selection.resolved.features).toEqual(presets["vite-app"].features)
  expect(selection.requires).toEqual([])
  expect(selection.generated["src/main.jsx"]).toContain("demo-app")
  expect(selection.generated["src/main.tsx"]).toBeUndefined()
  expect(selection.pkg.devDependencies).not.toHaveProperty("typescript")

  // Termux の Next.js は webpack で動かす（turbopack は Termux で動かない）
  const prefix = process.env.PREFIX
  try {
    process.env.PREFIX = "/data/data/com.termux/files/usr"
    const termux = option([
      "--dir",
      temp(),
      "--template",
      "next",
      "--features",
      "termux",
      "--name",
      "demo-app",
    ])
    const built = await collectSelection(termux, ui().ui)
    expect((built.pkg.scripts as Record<string, string>).dev).toBe("bun x next dev --webpack")
  } finally {
    if (prefix === undefined) delete process.env.PREFIX
    else process.env.PREFIX = prefix
  }
})

test("init runs only for a template and only when it was not turned off", async () => {
  const dir = temp()
  const withoutInit = await captured(() =>
    run(["--dir", dir, "--yes", "--dry-run", "--preset", "minimal", "--name", "demo-app"], ui().ui),
  )
  expect(withoutInit.out).not.toContain("初期化計画")

  // --init-only はテンプレート以外では理由を言って失敗する
  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(String(message))
  let code = 0
  try {
    code = await setupEntry(["--dir", dir, "--init-only", "--yes"])
  } finally {
    console.error = original
  }
  expect(code).toBe(1)
  expect(errors.join("\n")).toContain("NG: 初期化の対象ではありません")
})

test("the CLI entry turns a failure into NG and an exit code", async () => {
  expect((await captured(() => setupEntry(["--help"]))).code).toBe(0)
  const dir = temp()
  // 既定の SetupUi（実物の installEnv）を使う経路。依存導入は止めて hermetic にする
  const real = await captured(() =>
    setupEntry([
      "--dir",
      dir,
      "--yes",
      "--apply",
      "--no-install",
      "--preset",
      "minimal",
      "--name",
      "demo-app",
    ]),
  )
  expect(real.code).toBe(0)
  expect(real.out).toContain("セットアップ処理が終わりました")
  expect(existsSync(join(dir, "package.json"))).toBe(true)

  const errors: string[] = []
  const original = console.error
  console.error = (message: string) => errors.push(String(message))
  try {
    expect(await setupEntry(["--dir", join(dir, "missing"), "--yes"])).toBe(1)
    expect(await setupEntry(["--preset", "nope", "--dir", dir, "--yes"])).toBe(1)
  } finally {
    console.error = original
  }
  expect(errors.join("\n")).toContain("NG: 対象ディレクトリが存在しません")
  expect(errors.join("\n")).toContain("NG: 不明なプリセット")
})

test("the clack adapter maps the answers and turns a cancel into SetupCancelled", async () => {
  const seen: unknown[] = []
  const clack: ClackChoices = {
    async select(opts) {
      seen.push(opts)
      return "plain-ts"
    },
    async text(opts) {
      seen.push(opts)
      return "demo-app"
    },
    async confirm(opts) {
      seen.push(opts)
      return true
    },
  }
  const prompter = makeSetupUi(clack, true, fakeInstall().env)
  expect(prompter.tty).toBe(true)
  expect(await prompter.select("テンプレート", templates.typescript, "plain-ts")).toBe("plain-ts")
  expect(seen[0]).toMatchObject({
    message: "テンプレート",
    initialValue: "plain-ts",
    options: templates.typescript.map((value) => ({ value, label: value })),
  })
  expect(
    await prompter.text("プロジェクト名", "demo", (value) =>
      value === "demo" ? undefined : "kebab-case で指定してください",
    ),
  ).toBe("demo-app")
  expect(seen[1]).toMatchObject({
    message: "プロジェクト名",
    initialValue: "demo",
    defaultValue: "demo",
  })
  // 初期値が空のときは initialValue を足さない（Clack が既定値の表示を変えるため）
  expect(await prompter.text("したいこと・概要（任意）", "")).toBe("demo-app")
  expect(seen[2]).not.toHaveProperty("initialValue")
  expect(await prompter.confirm("この計画を適用しますか？ [y/N]")).toBe(true)
  expect(seen[3]).toEqual({
    message: "この計画を適用しますか？ [y/N]",
    initialValue: false,
    active: "y",
    inactive: "N",
  })

  const cancelled = makeSetupUi(fakeClack({ cancel: true }).clack, true, fakeInstall().env)
  await expect(
    cancelled.select("テンプレート", ["plain-ts"] as Template[], "plain-ts"),
  ).rejects.toThrow(SetupCancelled)
  await expect(cancelled.text("プロジェクト名", "demo")).rejects.toThrow(SetupCancelled)
  await expect(cancelled.confirm("この計画を適用しますか？ [y/N]")).rejects.toThrow(SetupCancelled)
})

/** テンプレート本体のコピー（node_modules / .git / .tmp は除く）。初期化フェーズの対象になる。 */
const skipCopy = new Set(["node_modules", ".git", ".tmp", ".setup-backup"])
function templateFixture(): string {
  const dir = temp()
  cpSync(resolve(import.meta.dir, ".."), dir, {
    recursive: true,
    filter: (from) => !from.split("/").some((part) => skipCopy.has(part)),
  })
  return dir
}

test("maybeInit runs the init phase only inside a template, and prints JSON on request", async () => {
  const plain = temp()
  // テンプレートではないディレクトリでは何もしない
  expect(await maybeInit(option(["--dir", plain, "--dry-run"]), false)).toBeNull()
  // --no-init は明示的なスキップ（テンプレートでも走らない）
  expect(await maybeInit(option(["--dir", plain, "--init-only", "--no-init"]), false)).toBeNull()
  // --init-only なのにテンプレートではない場合は、黙って成功せず理由を言う
  await expect(maybeInit(option(["--dir", plain, "--init-only"]), false)).rejects.toThrow(
    "初期化の対象ではありません",
  )

  const template = templateFixture()
  const printed = await capture(() =>
    maybeInit(
      option([
        "--dir",
        template,
        "--init-only",
        "--plan-json",
        "--dry-run",
        "--yes",
        "--owner",
        "octocat/hello",
        "--license-holder",
        "Octocat",
        "--purpose",
        "問い合わせ対応を自動化する",
      ]),
      false,
    ),
  )
  expect(printed.value?.code).toBe(0)
  const payload = JSON.parse(printed.out) as {
    mode: string
    init: {
      answers: { owner: string; repo: string; licenseHolder: string; purpose: string }
      detected: { template: boolean; traces: number }
      writes: string[]
      skipped: string[]
    }
  }
  expect(payload.mode).toBe("preview")
  expect(payload.init.detected.template).toBe(true)
  expect(payload.init.answers.owner).toBe("octocat")
  expect(payload.init.answers.repo).toBe("hello")
  expect(payload.init.answers.licenseHolder).toBe("Octocat")
  expect(payload.init.answers.purpose).toBe("問い合わせ対応を自動化する")
  expect(payload.init.writes).toContain("README.md")
  expect(payload.init.writes).toContain("LICENSE")
  expect(payload.init.skipped).toContain("docs/task-list.md")

  // --plan-json が無ければ計画を人が読む形で表示する
  const human = await capture(() =>
    maybeInit(option(["--dir", template, "--init-only", "--dry-run", "--yes"]), false),
  )
  expect(human.value?.code).toBe(0)
  expect(human.out).toContain("初期化計画")
})

test("the template falls back to the first of the language when the preset does not fit", async () => {
  const dir = temp()
  const out = await captured(() =>
    run(["--dir", dir, "--dry-run", "--language", "python", "--name", "demo-app"], ui().ui),
  )
  expect(out.code).toBe(0)
  expect(out.out).toContain("セットアップ計画: demo-app / python / python-cli / recommended")

  // プリセットのテンプレートが言語に合っていれば、それを使う
  const fitting = await captured(() =>
    run(["--dir", dir, "--dry-run", "--preset", "next-app", "--name", "demo-app"], ui().ui),
  )
  expect(fitting.out).toContain("セットアップ計画: demo-app / typescript / next / next-app")
})

test("an invalid project name is rejected with the rule, not silently kept", async () => {
  let validator: ((value: string) => string | undefined) | undefined
  const prompter: SetupUi = {
    tty: true,
    install: fakeInstall().env,
    async select(_message, _values, initial) {
      return initial
    },
    async text(message, initial, validate) {
      if (message === "プロジェクト名") validator = validate
      return initial
    },
    async confirm() {
      return false
    },
  }
  const o = option(["--dir", temp(), "--preset", "minimal"])
  await promptChoices(o, prompter)
  expect(o.name).toMatch(/^[a-z]/)
  expect(validator?.("demo-app")).toBeUndefined()
  const rule = "英小文字で始まる kebab-case（最大 64 文字）で指定してください"
  expect(validator?.("Demo App")).toBe(rule)
  expect(validator?.("1app")).toBe(rule)
})

test("an existing package.json is read and its own fields win", async () => {
  const dir = temp()
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "kept-name", version: "9.9.9", scripts: { lint: "biome check ." } }),
  )
  const selection = await collectSelection(
    option(["--dir", dir, "--preset", "minimal", "--name", "demo-app"]),
    ui().ui,
  )
  const pkg = selection.pkg as {
    name: string
    version: string
    scripts: Record<string, string>
    private?: boolean
  }
  expect(pkg.version).toBe("9.9.9")
  expect(pkg.scripts.lint).toBe("biome check .")
  expect(pkg.scripts.dev).toBeDefined()
  // 名前は今回の選択が勝つ（既存の名前を残すと生成物と食い違う）
  expect(pkg.name).toBe("demo-app")
})
