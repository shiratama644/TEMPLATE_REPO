/**
 * execute.tsの機能差分スキップが壊れにくいかテスト
 */

import { spawnSync } from "node:child_process"

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"

function testCommentDetection() {
  console.log(`${CYAN}=== execute.ts コメントのみ差分検出テスト ===${RESET}`)

  const testCases = [
    {
      name: "純粋コメント追加 //",
      diff: `
+// これはコメント
+// 追加コメント
`,
      expectedNonFunctional: true,
    },
    {
      name: "純粋コメント追加 /* */",
      diff: `
+/* コメント */
+/* 追加 */
`,
      expectedNonFunctional: true,
    },
    {
      name: "インラインコメント追加",
      diff: `
-const a = 1;
+const a = 1; // コメント追加
`,
      expectedNonFunctional: true,
    },
    {
      name: "文字列リテラル内の//は機能的",
      diff: `
-const a = "hello";
+const a = "// test";
`,
      expectedNonFunctional: false,
    },
    {
      name: "実際のコード変更",
      diff: `
-const a = 1;
+const a = 2;
`,
      expectedNonFunctional: false,
    },
    {
      name: "空白のみ",
      diff: `
-const a = 1;
+const a = 1;
 
`,
      expectedNonFunctional: true,
    },
    {
      name: "HTMLコメント",
      diff: `
+<!-- コメント -->
+<!-- 追加 -->
`,
      expectedNonFunctional: true,
    },
    {
      name: "文字列内容変更は機能的",
      diff: `
-const a = "foo";
+const a = "bar";
`,
      expectedNonFunctional: false,
    },
    {
      name: "console.log文字列内コメントは非機能ではないが文字列変更は機能的",
      diff: `
-const a = 1;
+console.log("// test");
`,
      expectedNonFunctional: false,
    },
  ]

  for (const tc of testCases) {
    const script = `
      function stripStringLiterals(s) {
        let idx = 0
        return s.replace(/"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`/g, (match) => {
          const hash = \`\${match.length}:\${match.slice(0, 10)}:\${match.slice(-10)}\`
          let h = 0
          for (let i = 0; i < hash.length; i++) h = (h * 31 + hash.charCodeAt(i)) | 0
          return \`"__STR_\${h}_\${idx++}__"\`
        })
      }
      function isPureCommentLine(content) {
        const patterns = [
          /^\\/\\/.*$/,
          /^\\/\\*.*\\*\\/$/,
          /^\\/\\*.*$/,
          /^\\*\\/$/,
          /^\\*[^/].*$/,
          /^\\*$/,
          /^\\s*\\*.*$/,
          /^<!--.*-->$/,
          /^<!--.*$/,
          /^-->$/,
          /^\\s*-->$/,
          /^#(?![A-Za-z0-9_$]).*$/,
          /^#$/,
        ]
        return patterns.some(re => re.test(content))
      }
      function getCodeOnly(content) {
        let code = stripStringLiterals(content)
        code = code.replace(/\\/\\*.*?\\*\\//g, "")
        code = code.replace(/^\\/\\*+/, "").replace(/\\*\\/$/, "")
        const idx = code.indexOf("//")
        if (idx !== -1) code = code.slice(0, idx)
        return code.trim()
      }
      function isCommentOnlyDiff(diffText) {
        const lines = diffText.split("\\n")
        const addedOrRemoved = lines.filter(l => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"))
        if (addedOrRemoved.length === 0) return true
        const added = [], removed = []
        for (const line of addedOrRemoved) {
          const content = line.slice(1).trim()
          if (content.length === 0) continue
          if (isPureCommentLine(content)) continue
          const codeOnly = getCodeOnly(content)
          if (codeOnly.length === 0) continue
          if (line.startsWith("+")) added.push(codeOnly)
          else removed.push(codeOnly)
        }
        if (added.length === 0 && removed.length === 0) return true
        const sa = [...added].sort(), sr = [...removed].sort()
        if (sa.length === sr.length && sa.every((v,i) => v === sr[i])) return true
        return false
      }
      const diff = \`${tc.diff.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`
      console.log(isCommentOnlyDiff(diff) ? "NON_FUNCTIONAL" : "FUNCTIONAL")
    `

    const r = spawnSync("node", ["-e", script], { encoding: "utf8" })
    const output = (r.stdout || "").trim()
    const isNonFunctional = output === "NON_FUNCTIONAL"
    const passed = isNonFunctional === tc.expectedNonFunctional
    console.log(
      `${passed ? `${GREEN}✅` : `${RED}❌`} ${tc.name}${RESET} — 判定=${output}, 期待=${tc.expectedNonFunctional ? "NON_FUNCTIONAL" : "FUNCTIONAL"} ${passed ? "" : "(失敗)"}`,
    )
  }
}

function testPathPatterns() {
  console.log(`\n${CYAN}=== パスパターン判定テスト ===${RESET}`)

  const cases = [
    { file: "docs/README.md", expectedNonFunctional: true, expectedFunctional: false },
    { file: ".agent/skills/test/SKILL.md", expectedNonFunctional: true, expectedFunctional: false },
    { file: "src/index.ts", expectedNonFunctional: false, expectedFunctional: true },
    { file: "packages/ui/src/button.tsx", expectedNonFunctional: false, expectedFunctional: true },
    { file: "package.json", expectedNonFunctional: false, expectedFunctional: true },
    { file: "vite.config.ts", expectedNonFunctional: false, expectedFunctional: true },
    { file: "next.config.mjs", expectedNonFunctional: false, expectedFunctional: true },
    { file: "README.md", expectedNonFunctional: true, expectedFunctional: false },
    { file: "cspell.json", expectedNonFunctional: true, expectedFunctional: false },
  ]

  for (const tc of cases) {
    const script = `
      const NON = [
        /^docs\\//,
        /^\\.agent\\//,
        /^\\.github\\//,
        /^\\.husky\\//,
        /^\\.vscode\\//,
        /^README\\.md$/,
        /^AGENTS\\.md$/,
        /\\.md$/,
        /^\\.editorconfig$/,
        /^cspell\\.json$/,
        /^knip\\.json$/,
        /^commitlint\\.config\\.(js|cjs|mjs)$/,
        /^\\.gitignore$/,
        /^\\.nvmrc$/,
        /^LICENSE$/,
        /^\\.claude\\//,
      ]
      const FUNC = [
        /^src\\//,
        /^packages\\//,
        /^apps\\//,
        /^package\\.json$/,
        /^pnpm-lock\\.yaml$/,
        /^pnpm-workspace\\.yaml$/,
        /^tsconfig/,
        /^biome\\.json$/,
        /^vite\\.config/,
        /^next\\.config/,
        /^vitest\\.config/,
        /^playwright\\.config/,
        /^scripts\\//,
      ]
      const file = "${tc.file}"
      const isNon = NON.some(re => re.test(file))
      const isFunc = FUNC.some(re => re.test(file))
      console.log(JSON.stringify({ isNon, isFunc }))
    `
    const r = spawnSync("node", ["-e", script], { encoding: "utf8" })
    const out = JSON.parse((r.stdout || "{}").trim() || "{}")
    const passed = out.isNon === tc.expectedNonFunctional && out.isFunc === tc.expectedFunctional
    console.log(
      `${passed ? `${GREEN}✅` : `${RED}❌`} ${tc.file}${RESET} — nonFunc=${out.isNon} (期待${tc.expectedNonFunctional}), func=${out.isFunc} (期待${tc.expectedFunctional})`,
    )
  }
}

testCommentDetection()
testPathPatterns()

console.log(`\n${GREEN}execute.ts robustness tests completed${RESET}`)
