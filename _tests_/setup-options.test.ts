import { expect, test } from "bun:test"
import { CANCEL_SYMBOL } from "@clack/prompts"
import { featureNames, presets, templates } from "../scripts/setup-manifest.ts"
import {
  assertChoices,
  defaultName,
  type Options,
  option,
  parseSections,
  planApproval,
  required,
  SetupCancelled,
  usage,
} from "../scripts/setup-options.ts"

const base: Options = {
  dir: process.cwd(),
  yes: false,
  apply: false,
  dryRun: false,
  planJson: false,
  noInstall: false,
  noOsInstall: false,
  help: false,
  list: false,
  initOnly: false,
  noInit: false,
}

test("no arguments means the current directory and every switch off", () => {
  expect(option([])).toEqual(base)
})

test("every value flag lands on the documented option", () => {
  const o = option([
    "--preset",
    "vite-app",
    "--language",
    "typescript",
    "--template",
    "vite-react",
    "--name",
    "my-app",
    "--description",
    "説明",
    "--config",
    "setup.json",
    "--save-config",
    "out.json",
    "--dir",
    "/tmp/target",
    "--init-name",
    "My App",
    "--owner",
    "octocat/hello-world",
    "--repo",
    "hello-world",
    "--license-holder",
    "Octocat",
    "--license-year",
    "2026",
    "--purpose",
    "目的",
    "--audience",
    "対象",
    "--non-goals",
    "対象外",
    "--first-task",
    "最初のタスク",
  ])
  expect(o.preset).toBe("vite-app")
  expect(o.language).toBe("typescript")
  expect(o.template).toBe("vite-react")
  expect(o.name).toBe("my-app")
  expect(o.description).toBe("説明")
  expect(o.config).toBe("setup.json")
  expect(o.saveConfig).toBe("out.json")
  expect(o.dir).toBe("/tmp/target")
  expect(o.initName).toBe("My App")
  expect(o.owner).toBe("octocat/hello-world")
  expect(o.repo).toBe("hello-world")
  expect(o.licenseHolder).toBe("Octocat")
  expect(o.licenseYear).toBe("2026")
  expect(o.purpose).toBe("目的")
  expect(o.audience).toBe("対象")
  expect(o.nonGoals).toBe("対象外")
  expect(o.firstTask).toBe("最初のタスク")
})

test("every boolean flag turns its switch on, including -h", () => {
  expect(option(["--help"])).toEqual({ ...base, help: true })
  expect(option(["-h"])).toEqual({ ...base, help: true })
  expect(option(["--list-presets"])).toEqual({ ...base, list: true })
  expect(option(["--dry-run"])).toEqual({ ...base, dryRun: true })
  expect(option(["--plan-json"])).toEqual({ ...base, planJson: true })
  expect(option(["--apply"])).toEqual({ ...base, apply: true })
  expect(option(["--yes"])).toEqual({ ...base, yes: true })
  expect(option(["--init-only"])).toEqual({ ...base, initOnly: true })
  expect(option(["--no-init"])).toEqual({ ...base, noInit: true })
  expect(option(["--no-install"])).toEqual({ ...base, noInstall: true })
  expect(option(["--no-os-install"])).toEqual({ ...base, noOsInstall: true })
  expect(option(["--yes", "--apply", "--no-install", "--no-init"])).toEqual({
    ...base,
    yes: true,
    apply: true,
    noInstall: true,
    noInit: true,
  })
})

test("--features accepts all, none and a comma separated list", () => {
  expect(option(["--features", "all"]).features).toEqual([...featureNames])
  expect(option(["--features", "none"]).features).toEqual([])
  expect(option(["--features", "docker, vitest "]).features).toEqual(["docker", "vitest"])
})

test("a value flag without a value, or with another flag as its value, is rejected", () => {
  expect(() => option(["--name"])).toThrow("--name に値が必要です")
  expect(() => option(["--name", "--yes"])).toThrow("--name に値が必要です")
  expect(() => option(["--dir"])).toThrow("--dir に値が必要です")
  expect(() => option(["--features"])).toThrow("--features に値が必要です")
  expect(() => option(["--unknown"])).toThrow("不明な引数: --unknown")
  expect(() => option(["--yes", "stray"])).toThrow("不明な引数: stray")
})

test("parseSections accepts none, all and known ids only", () => {
  expect(parseSections("none")).toEqual([])
  expect(parseSections("all").length).toBeGreaterThan(1)
  expect(parseSections("git, impl")).toEqual(["git", "impl"])
  expect(() => parseSections("nope")).toThrow("不明な節: nope")
  expect(() => option(["--keep-sections", "nope"])).toThrow("不明な節")
  expect(option(["--keep-sections", "all"]).keepSections?.length).toBeGreaterThan(1)
})

test("assertChoices validates the CLI pair before anything is written", () => {
  expect(() => assertChoices(option(["--preset", "vite-app", "--name", "my-app"]))).not.toThrow()
  expect(() => assertChoices(option(["--name", "Bad Name"]))).toThrow()
  expect(() => assertChoices(option(["--preset", "nope"]))).toThrow("不明なプリセット")
  expect(() =>
    assertChoices(option(["--language", "javascript", "--template", "plain-ts"])),
  ).toThrow("plain-ts は javascript に対応しません")
  expect(() => assertChoices(option(["--features", "nope"]))).toThrow("機能に不明な値")
})

test("required turns a cancelled prompt into SetupCancelled and passes values through", () => {
  expect(required("value")).toBe("value")
  expect(required(false)).toBe(false)
  expect(() => required(CANCEL_SYMBOL)).toThrow(SetupCancelled)
})

test("planApproval never writes without an explicit decision", async () => {
  const yes = async () => true
  const no = async () => false
  // @clack/prompts が返す cancel は unique symbol 型。値として import すると symbol に
  // 広がるので、planApproval が受け付ける型へ合わせておく（実行時の値は同じ）。
  type ConfirmPlan = Parameters<typeof planApproval>[2]
  const cancelled: ConfirmPlan = async () =>
    CANCEL_SYMBOL as unknown as Awaited<ReturnType<ConfirmPlan>>
  expect(await planApproval({ dryRun: true, yes: false, apply: false }, true, yes)).toBe("dry-run")
  expect(await planApproval({ dryRun: false, yes: false, apply: false }, true, yes)).toBe("apply")
  expect(await planApproval({ dryRun: false, yes: false, apply: true }, true, no)).toBe("decline")
  await expect(
    planApproval({ dryRun: false, yes: false, apply: false }, true, cancelled),
  ).rejects.toThrow(SetupCancelled)
  // 対話できない端末では --apply が無い限り書き込まない
  expect(await planApproval({ dryRun: false, yes: true, apply: false }, false, yes)).toBe(
    "needs-apply",
  )
  expect(await planApproval({ dryRun: false, yes: true, apply: true }, false, yes)).toBe("apply")
  // tty でも --yes なら質問せず、apply の有無だけで決める
  let asked = false
  const spy = async () => {
    asked = true
    return true
  }
  expect(await planApproval({ dryRun: false, yes: true, apply: false }, true, spy)).toBe(
    "needs-apply",
  )
  expect(asked).toBe(false)
})

test("defaultName derives a kebab-case npm name from the directory", () => {
  expect(defaultName("/tmp/My_Project")).toBe("my-project")
  expect(defaultName("/tmp/---weird---")).toBe("weird")
  expect(defaultName("/tmp/123")).toBe("project")
  // 末尾が区切りのときは直前のディレクトリ名を使う
  expect(defaultName("/tmp/")).toBe("tmp")
  expect(defaultName(`/tmp/${"a".repeat(80)}`)).toBe("a".repeat(64))
  expect(defaultName(`/tmp/${"a".repeat(70)}-tail`)).toBe("a".repeat(64))
})

test("the usage text lists every switch the parser accepts", () => {
  for (const flag of [
    "--preset",
    "--language",
    "--template",
    "--name",
    "--description",
    "--features",
    "--config",
    "--save-config",
    "--dir",
    "--dry-run",
    "--plan-json",
    "--apply",
    "--yes",
    "--no-install",
    "--no-os-install",
    "--list-presets",
    "--help",
    "--init-only",
    "--no-init",
    "--init-name",
    "--owner",
    "--repo",
    "--license-holder",
    "--license-year",
    "--purpose",
    "--audience",
    "--non-goals",
    "--first-task",
    "--keep-sections",
  ])
    expect(usage).toContain(flag)
  expect(usage).toContain(Object.keys(presets).join(" | "))
  expect(usage).toContain(Object.keys(templates).join(" | "))
})
