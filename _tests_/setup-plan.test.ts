import { afterEach, expect, test } from "bun:test"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { noCleanup } from "../scripts/init-cleanup.ts"
import { applyPlan } from "../scripts/setup-apply.ts"
import { option, type Resolved, suggestions } from "../scripts/setup-options.ts"
import { buildSetupPlan, type PlanEnv, printPlan, printPlanJson } from "../scripts/setup-plan.ts"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "setup-plan-"))
  dirs.push(dir)
  return dir
}
function resolved(args: string[], over: Partial<Resolved> = {}): Resolved {
  const parsed = option(["--yes", ...args])
  const given = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))
  return {
    dir: temp(),
    yes: true,
    apply: false,
    dryRun: false,
    planJson: false,
    noInstall: true,
    noOsInstall: false,
    help: false,
    list: false,
    initOnly: false,
    noInit: false,
    language: "typescript",
    template: "plain-ts",
    preset: "minimal",
    name: "demo-app",
    features: [],
    ...given,
    ...over,
  } as Resolved
}
/** OS の事実を固定する偽物（実行環境に依存しない計画表示を検証するため）。 */
const linux: PlanEnv = {
  manager: () => ({ name: "apt", packages: { python3: "python3" } }),
  has: (bin) => bin !== "python3",
  platform: "linux",
}
const unsupported: PlanEnv = { manager: () => null, has: () => true, platform: "plan9" }

function captured(run: () => void): string {
  const logs: string[] = []
  const original = console.log
  console.log = (message: string) => logs.push(String(message))
  try {
    run()
    return logs.join("\n")
  } finally {
    console.log = original
  }
}

test("the plan separates new files from the ones the user already has", () => {
  const dir = temp()
  writeFileSync(join(dir, "README.md"), "# 既存の README\n")
  const o = resolved(["--dir", dir])
  const plan = buildSetupPlan(
    o,
    { "README.md": "# demo-app\n", "src/index.ts": "export {}\n" },
    {
      name: "demo-app",
    },
  )
  expect(plan.create.map(([path]) => path)).toEqual(["src/index.ts"])
  expect(plan.retained).toEqual(["README.md"])
  expect(plan.pkgChanged).toBe(true)
  expect(plan.files).toEqual([
    { path: "src/index.ts", action: "create" },
    { path: "README.md", action: "retain" },
    { path: "package.json", action: "create", backupPlanned: false },
  ])
  expect(plan.configDest).toBeUndefined()

  // package.json があれば更新になり、退避を計画する
  writeFileSync(join(dir, "package.json"), '{"name":"old"}\n')
  const update = buildSetupPlan(o, {}, { name: "demo-app" })
  expect(update.files.at(-1)).toEqual({
    path: "package.json",
    action: "update",
    backupPlanned: true,
  })
  // 中身が同じなら触らない（比較は生成する JSON の文字列そのもの）
  writeFileSync(join(dir, "package.json"), '{\n  "name": "demo-app"\n}\n')
  const same = buildSetupPlan(o, {}, { name: "demo-app" })
  expect(same.pkgChanged).toBe(false)
  expect(same.files.at(-1)).toEqual({
    path: "package.json",
    action: "retain",
    backupPlanned: false,
  })

  const saved = buildSetupPlan(
    resolved(["--dir", dir, "--save-config", "setup.json"]),
    {},
    { name: "demo-app" },
  )
  expect(saved.configDest).toBe(join(dir, "setup.json"))
  expect(saved.files.at(-1)).toEqual({ path: "setup.json", action: "create" })
})

test("the plan refuses a symlinked manifest and an existing configuration file", () => {
  const dir = temp()
  const outside = temp()
  writeFileSync(join(outside, "package.json"), '{"name":"outside"}\n')
  symlinkSync(join(outside, "package.json"), join(dir, "package.json"))
  expect(() => buildSetupPlan(resolved(["--dir", dir]), {}, { name: "demo-app" })).toThrow(
    "package.json が symlink です。安全のため中止します",
  )

  const plain = temp()
  writeFileSync(join(plain, "setup.json"), "{}\n")
  expect(() =>
    buildSetupPlan(resolved(["--dir", plain, "--save-config", "setup.json"]), {}, {}),
  ).toThrow("既存の設定ファイルを上書きできません: setup.json")

  // 退避先が symlink で外に出るときも、計画の段階で止まる
  const escaping = temp()
  writeFileSync(join(escaping, "package.json"), '{"name":"old"}\n')
  symlinkSync(outside, join(escaping, ".setup-backup"))
  expect(() => buildSetupPlan(resolved(["--dir", escaping]), {}, { name: "x" })).toThrow()
})

test("the printed plan names every file and the tools the project needs", () => {
  const dir = temp()
  writeFileSync(join(dir, "package.json"), '{"name":"old"}\n')
  const o = resolved(["--dir", dir, "--features", "vitest", "--description", "demo"])
  const plan = buildSetupPlan(o, { "src/index.ts": "export {}\n" }, { name: "demo-app" })
  const out = captured(() => printPlan(o, plan.files, ["python3"], linux))
  expect(out).toContain("セットアップ計画: demo-app / typescript / plain-ts / minimal")
  expect(out).toContain("機能: vitest")
  expect(out).toContain("OS: linux / apt  必要: python3")
  expect(out).toContain("+ src/index.ts")
  expect(out).toContain("~ package.json （バックアップを作成）")
  expect(out).toContain(`- ${suggestions.join("\n- ")}`)

  const empty = captured(() => printPlan(resolved([], { features: [] }), [], [], unsupported))
  expect(empty).toContain("機能: なし")
  expect(empty).toContain("OS: plan9 / 未対応  必要: Bun")
  expect(empty).not.toContain("+ ")
})

test("the JSON plan is a single document that reports prerequisites without installing", () => {
  const dir = temp()
  const o = resolved(["--dir", dir, "--features", "vitest", "--no-install"])
  const plan = buildSetupPlan(o, { "src/index.ts": "export {}\n" }, { name: "demo-app" })
  const out = captured(() =>
    printPlanJson(
      o,
      plan.files,
      ["python3", "bun"],
      ["changesets"],
      {
        code: 0,
        plan: {
          writes: [{ path: "README.md", content: "# demo-app\n" }],
          unchanged: ["LICENSE"],
          skipped: [],
          deletes: [],
          blocked: [],
          missing: [],
          notes: ["task-list は触りません"],
          cleanup: noCleanup,
        },
        answers: null,
        detected: null,
      },
      linux,
    ),
  )
  const payload = JSON.parse(out) as Record<string, unknown>
  expect(payload.schemaVersion).toBe(1)
  expect(payload.mode).toBe("preview")
  expect(payload.selection).toEqual({
    name: "demo-app",
    language: "typescript",
    template: "plain-ts",
    preset: "minimal",
    features: ["vitest"],
    excludedFeatures: ["changesets"],
  })
  expect(payload.dependencies).toEqual({ wouldInstallOnApply: false, executed: false })
  const prerequisites = payload.prerequisites as {
    runtime: string[]
    missing: string[]
    osPackageManager: string
    osPackages: Array<{ tool: string; command: string[] | null; status: string }>
    osPackagesRequireIndividualApproval: boolean
  }
  expect(prerequisites.runtime).toEqual(["python3", "bun"])
  expect(prerequisites.missing).toEqual(["python3"])
  expect(prerequisites.osPackageManager).toBe("apt")
  expect(prerequisites.osPackages).toEqual([
    {
      tool: "python3",
      command: ["sudo", "apt-get", "install", "-y", "python3"],
      status: "manual-confirmation-required",
    },
  ])
  expect(prerequisites.osPackagesRequireIndividualApproval).toBe(true)
  const init = payload.init as { writes: string[]; unchanged: string[]; notes: string[] }
  expect(init.writes).toEqual(["README.md"])
  expect(init.unchanged).toEqual(["LICENSE"])
  expect(init.notes).toEqual(["task-list は触りません"])

  // 未対応の OS では命令を出さず、初期化が無ければ init を足さない
  const bare = captured(() =>
    printPlanJson(resolved(["--dir", dir]), [], ["python3"], [], null, unsupported),
  )
  const barePayload = JSON.parse(bare) as Record<string, unknown>
  expect(barePayload.init).toBeUndefined()
  expect((barePayload.prerequisites as { osPackageManager: null }).osPackageManager).toBeNull()
  expect((barePayload.prerequisites as { missing: string[] }).missing).toEqual([])
  expect((barePayload.dependencies as { wouldInstallOnApply: boolean }).wouldInstallOnApply).toBe(
    true,
  )
})

test("apply writes the planned files, backs the manifest up and never deletes user files", () => {
  const dir = temp()
  writeFileSync(join(dir, "README.md"), "# 既存の README\n")
  const o = resolved(["--dir", dir])
  const applied = applyPlan(
    o,
    [["src/index.ts", 'export const name = "demo-app"\n']],
    { name: "demo-app" },
    join(dir, "package.json"),
    true,
    undefined,
  )
  expect(applied.backup).toBeUndefined()
  expect(applied.changed).toEqual([])
  expect(applied.created).toEqual([join(dir, "src/index.ts"), join(dir, "package.json")])
  expect(readFileSync(join(dir, "src/index.ts"), "utf8")).toContain("demo-app")
  expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))).toEqual({ name: "demo-app" })
  expect(readFileSync(join(dir, "README.md"), "utf8")).toBe("# 既存の README\n")
  expect(existsSync(join(dir, ".setup-backup"))).toBe(false)
})

test("apply backs the existing manifest up and records the configuration", () => {
  const dir = temp()
  writeFileSync(join(dir, "package.json"), '{"name":"old","version":"9.9.9"}\n')
  const applied = applyPlan(
    resolved(["--dir", dir]),
    [],
    { name: "demo-app" },
    join(dir, "package.json"),
    true,
    join(dir, "setup.json"),
  )
  expect(applied.changed).toEqual([join(dir, "package.json")])
  expect(applied.created).toEqual([join(dir, "setup.json")])
  expect(applied.backup).toContain(join(dir, ".setup-backup", "manifest-"))
  expect(JSON.parse(readFileSync(join(applied.backup as string, "package.json"), "utf8"))).toEqual({
    name: "old",
    version: "9.9.9",
  })
  expect(JSON.parse(readFileSync(join(dir, "setup.json"), "utf8"))).toMatchObject({
    name: "demo-app",
    language: "typescript",
    template: "plain-ts",
    preset: "minimal",
    features: [],
  })
  expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))).toEqual({ name: "demo-app" })
})

test("a failed write rolls back everything apply created and restores the manifest", () => {
  const dir = temp()
  writeFileSync(join(dir, "package.json"), '{"name":"old"}\n')
  // 既存の設定ファイルは上書きできない（flag: wx）ので、ここで失敗する
  writeFileSync(join(dir, "setup.json"), "{}\n")
  const o = resolved(["--dir", dir])
  expect(() =>
    applyPlan(
      o,
      [
        ["src/index.ts", "export {}\n"],
        ["README.md", "# demo-app\n"],
      ],
      { name: "demo-app" },
      join(dir, "package.json"),
      true,
      join(dir, "setup.json"),
    ),
  ).toThrow()
  expect(existsSync(join(dir, "src/index.ts"))).toBe(false)
  expect(readFileSync(join(dir, "package.json"), "utf8")).toBe('{"name":"old"}\n')
  expect(readFileSync(join(dir, "setup.json"), "utf8")).toBe("{}\n")
  // 退避は残す（消すと復元の手段が無くなる）
  expect(existsSync(join(dir, ".setup-backup"))).toBe(true)

  // ディレクトリの外へは書かない。書いた物は戻す
  mkdirSync(join(dir, "inside"))
  expect(() =>
    applyPlan(
      o,
      [
        ["ok.ts", "export {}\n"],
        ["../escape.ts", "export {}\n"],
      ],
      {},
      join(dir, "package.json"),
      false,
      undefined,
    ),
  ).toThrow()
  expect(existsSync(join(dir, "ok.ts"))).toBe(false)
  expect(existsSync(join(dirs[0], "..", "escape.ts"))).toBe(false)
})
