import { afterEach, expect, test } from "bun:test"
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  checkLanguage,
  classify,
  findIssues,
  languageFixtures,
  selfTest,
  stripCommit,
} from "../scripts/check-language.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
function fixture(entries: Record<string, string | Buffer | null>) {
  const base = mkdtempSync(join(tmpdir(), "check-language-"))
  dirs.push(base)
  for (const [path, body] of Object.entries(entries)) {
    const target = join(base, path)
    mkdirSync(join(target, ".."), { recursive: true })
    if (body === null) symlinkSync(join(base, "docs/ok.md"), target)
    else writeFileSync(target, body)
  }
  return base
}
/** console.error と console.log を集めて戻す（ゲートの出力を確認するため）。 */
function captured(run: () => number): { code: number; errors: string; logs: string } {
  const errors: string[] = []
  const logs: string[] = []
  const originalError = console.error
  const originalLog = console.log
  console.error = (...args: unknown[]) => errors.push(args.join(" "))
  console.log = (...args: unknown[]) => logs.push(args.join(" "))
  try {
    return { code: run(), errors: errors.join("\n"), logs: logs.join("\n") }
  } finally {
    console.error = originalError
    console.log = originalLog
  }
}

const simplified = String.fromCodePoint(0x52a8) // 動（日本語では使わない簡体字系の字形）
const hangul = String.fromCodePoint(0xd55c)
const cyrillic = String.fromCodePoint(0x41f)
const extended = String.fromCodePoint(0x20b9f)

test("classify allows everything the documents need and names what it rejects", () => {
  for (const ch of ["a", "Z", "0", " ", "\n", "あ", "ア", "漢", "髙", "﨑", "✅", "→", "①", "€"])
    expect(classify(ch)).toBeNull()
  // 結合記号は文字でも記号でもないが、排除する理由がない
  expect(classify("\u0301")).toBeNull()
  expect(classify(simplified)).toEqual({
    level: "error",
    reason: "日本語で使わない漢字（簡体字など）",
  })
  expect(classify(hangul)?.reason).toContain("hangul")
  expect(classify(cyrillic)?.reason).toContain("cyrillic")
  expect(classify(extended)).toEqual({
    level: "warn",
    reason: "拡張領域の漢字（表外字か他言語か要確認）",
  })
})

test("findIssues reports one issue per character with its line and excerpt", () => {
  const issues = findIssues(`ok\n手${simplified}と${simplified} for ${simplified}\n`)
  expect(issues).toEqual([
    {
      line: 2,
      level: "error",
      character: simplified,
      reason: "日本語で使わない漢字（簡体字など）",
      excerpt: `手${simplified}と${simplified} for ${simplified}`,
    },
  ])
  expect(findIssues("日本語と English")).toEqual([])
})

test("stripCommit drops comments and everything after the scissors line", () => {
  expect(
    stripCommit(
      "# comment\nfix: 件名\n\n# ------------------------ >8 ------------------------\n動",
    ),
  ).toBe("fix: 件名\n")
  // はさみ行はコメント記号の無い形でも切る
  expect(
    stripCommit("fix: 件名\n------------------------ >8 ------------------------\n" + simplified),
  ).toBe("fix: 件名")
  expect(stripCommit("// note\nchore: x")).toBe("chore: x")
  expect(stripCommit("feat: x\r\n# comment\r\nbody")).toBe("feat: x\nbody")
})

test("the self-check passes with the real judge and fails with a broken one", () => {
  expect(selfTest()).toBe(true)
  expect(languageFixtures.length).toBeGreaterThanOrEqual(5)
  const broken = captured(() => (selfTest(() => []) ? 0 : 1))
  expect(broken.code).toBe(1)
  expect(broken.errors).toContain("NG: 言語判定の自己検査に失敗")
  expect(captured(() => (selfTest(() => findIssues("日本語")) ? 0 : 1)).code).toBe(1)
})

test("a clean tree passes and the message counts the checked files", () => {
  const base = fixture({ "docs/ok.md": "# 日本語と English\n", "docs/sub/next.md": "ok\n" })
  const run = captured(() => checkLanguage([], base))
  expect(run.code).toBe(0)
  expect(run.logs).toContain("OK: ファイル 2 件を検査、日本語と英語以外の文字はありません")
})

test("an error character fails the gate with the file, line and code point", () => {
  const base = fixture({ "docs/bad.md": `# 見出し\n手${simplified}で実行\n` })
  const run = captured(() => checkLanguage([], base))
  expect(run.code).toBe(1)
  expect(run.errors).toContain("docs/bad.md:2: 日本語・英語以外の文字 U+52A8")
  expect(run.errors).toContain("NG: 1 件の違反文字（1 ファイル中、要確認 0 件）")
})

test("a warning character is reported but does not fail the gate", () => {
  const base = fixture({ "docs/warn.md": `拡張領域 ${extended} を確認\n` })
  const run = captured(() => checkLanguage([], base))
  expect(run.code).toBe(0)
  expect(run.logs).toContain("docs/warn.md:1: 要確認の文字 U+20B9F")
  expect(run.logs).toContain("要確認 1 件")
})

test("binaries, symlinks, directories and ignored paths are skipped", () => {
  const base = fixture({
    "docs/ok.md": "ok\n",
    "docs/binary.md": Buffer.from([0x6f, 0x6b, 0x00, 0xff]),
    "docs/invalid.md": Buffer.from([0xff, 0xfe, 0xfd]),
    "docs/link.md": null,
    "node_modules/pkg/bad.md": `手${simplified}\n`,
  })
  mkdirSync(join(base, "docs/dir.md"), { recursive: true })
  const run = captured(() => checkLanguage([], base))
  expect(run.code).toBe(0)
  expect(run.logs).toContain("OK: ファイル 1 件を検査")
  // 明示的にパスを渡しても node_modules は対象外
  expect(captured(() => checkLanguage(["node_modules/pkg/bad.md"], base)).code).toBe(0)
  // --commit-msg では除外規則を使わないので同じファイルが違反になる
  const commit = captured(() => checkLanguage(["--commit-msg", "node_modules/pkg/bad.md"], base))
  expect(commit.code).toBe(1)
  expect(commit.errors).toContain("NG: 1 件の違反文字")
  // ディレクトリを渡しても読みに行かない
  expect(captured(() => checkLanguage(["docs/dir.md", "docs/ok.md"], base)).code).toBe(0)
})

test("commit messages are stripped before the judgement", () => {
  const base = fixture({
    "msg.txt": `# ------------------------ >8 ------------------------\n手${simplified}\n`,
    "body.txt": `fix: 件名\n\n本分に${simplified}がある\n`,
  })
  const scissors = captured(() => checkLanguage(["--commit-msg", "msg.txt"], base))
  expect(scissors.code).toBe(0)
  expect(scissors.logs).toContain("OK: コミットメッセージ 1 件を検査")
  const body = captured(() => checkLanguage(["--commit-msg", "body.txt"], base))
  expect(body.code).toBe(1)
  expect(body.errors).toContain("body.txt:3:")
})

test("a path that cannot be inspected at all is not silently ignored", () => {
  const base = fixture({ "docs/ok.md": "ok\n" })
  // 存在しないパスは読み飛ばす（ゲート全体を落とさない）
  expect(captured(() => checkLanguage(["docs/missing.md"], base)).code).toBe(0)
  // NUL を含む引数は Node が拒む。握りつぶさずに投げる
  expect(() => checkLanguage([`docs${String.fromCharCode(0)}bad.md`], base)).toThrow()
})

test("unreadable files are reported as an unexpected failure, not skipped", () => {
  if (process.platform === "win32") return
  const base = fixture({ "docs/secret.md": `手${simplified}\n` })
  chmodSync(join(base, "docs/secret.md"), 0o000)
  try {
    expect(() => checkLanguage([], base)).toThrow()
  } finally {
    chmodSync(join(base, "docs/secret.md"), 0o644)
  }
})

test("the repository itself satisfies the language gate", () => {
  const run = captured(() => checkLanguage(["--all"], join(import.meta.dir, "..")))
  expect(run.code).toBe(0)
  expect(run.logs).toContain("日本語と英語以外の文字はありません")
})
