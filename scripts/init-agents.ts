/** 初期化で生成する指示ファイル（AGENTS.md §6・ルール・project-overview）。 */
import type { Detected, InitAnswers, SectionId } from "./init-detect.ts"
import { gateCommands } from "./init-docs.ts"

/** §6.2〜§6.6 に対応する小節。番号は公開 API なので変えない（AGENTS.md §8.4）。 */
export const sectionHeadings: Record<SectionId, string> = {
  sandbox: "### 6.2 サンドボックス制約（乗り越えず、迂回する）",
  git: "### 6.3 リポジトリ固有の Git 制約",
  impl: "### 6.4 実装ルール",
  style: "### 6.5 Lint・フォーマット特有ルール（Code Style）",
  output: "### 6.6 成果物・表現ルール",
}
export const sectionOrder: SectionId[] = ["sandbox", "git", "impl", "style", "output"]
/** 小節の番号（§8.4 の公開 API）。表示とチェックリストで使う。 */
export const sectionNumbers: Record<SectionId, string> = {
  sandbox: "6.2",
  git: "6.3",
  impl: "6.4",
  style: "6.5",
  output: "6.6",
}
const emptySection = "- 固有の事項はまだ無い。事実が分かったら追記する（推測で埋めない）。"

/** §6.1 を実在するコマンドから作る。 */
export function renderCommandsSection(a: InitAnswers, d: Detected): string[] {
  const gates = gateCommands.filter((g) => g in d.scripts)
  const lines = [
    "### 6.1 環境・ツールチェーン・検証コマンド（Commands / Setup）",
    `- **検証の正本**: \`bun run check\`（${d.gates.length || gates.length + 1} ゲート: ${
      d.gates.join(" / ") || "検査"
    }）。` + "`make check` は同じ入口。未使用コード・依存は `bun run knip`。",
    `- **個別の検査**: \`bun run ${gates.join("` / `bun run ")}\` / \`bun run test\`。`,
    `- **ランタイム**: Bun ${d.packageManager}（\`package.json\` の \`packageManager\`）。` +
      "依存は `bun install --frozen-lockfile` で固定する。",
    "- **Git フック**: `bun install` の postinstall が `.githooks` を有効化する。" +
      "既存の commit-msg / pre-commit は上書きせず連鎖実行し、再実行は `bun run hooks:install`。",
    "- **初期化**: `bun run init`（= `bun run setup --init-only`）。対話式 TUI が本節・README・docs/ を実物から生成し直す。`--dry-run` は読み取り専用、`--plan-json` は計画の JSON だけ。",
    `- **CI**: ${d.workflows.map((w) => `\`.github/workflows/${w}\``).join(" / ") || "なし"}。` +
      "運用は `docs/ops/index.md`。",
    `- **GitHub 側の設定**: \`bun run github:settings --apply\`（gh が必要）。` +
      "画面で行う場合の手順は `docs/ops/GITHUB_SETTINGS.md`。",
  ]
  // パスらしき文字列を backtick で囲むと AGENTS.md のゲート（AMC-PATH）が実在チェックするため URL で書く
  if (a.owner)
    lines.push(`- **リポジトリ**: https://github.com/${a.owner}/${a.repo}（既定ブランチ main）。`)
  return lines
}

/** 自由記述の答えを行単位の箇条書きにする（既に記号があればそのまま）。 */
export function bulletize(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/^([-*#>|]|\d+\.)/u.test(line) ? line : `- ${line}`))
    .join("\n")
}

/** §6 全体を作る。選ばれなかった小節は「まだ無い」と明記し、番号は保つ。 */
export function renderAgentsSection(a: InitAnswers, d: Detected): string[] {
  const lines = [
    `## 6. プロジェクト固有の遵守事項（${a.name}）`,
    "",
    "> この節だけプロジェクト固有の内容。計画書と矛盾すれば計画書を優先し、それ以外は本節を厳守する。",
    "> `bun run setup --init-only` で生成した。事実が変わったら同じコマンドで生成し直す。",
    "",
    ...renderCommandsSection(a, d),
    "",
  ]
  for (const id of sectionOrder) {
    const text = a.sectionText[id]?.trim()
    lines.push(sectionHeadings[id], text ? bulletize(text) : emptySection, "")
  }
  lines.push(
    "### 6.7 ドキュメント運用",
    "- 目次と運用ルール `docs/README.md` / 進捗の正本 `docs/task-list.md`（状態定義・証拠記録のルールは冒頭）" +
      "/ 仕様 `docs/arch/` / 計画 `docs/planning/`（`docs/planning/_TEMPLATE.md` 形式）" +
      "/ 調査 `docs/research/` / 監査 `docs/audit/` / 運用 `docs/ops/`",
    "- ドキュメントを追加・削除・移動したら `docs/README.md` の目次を必ず更新する。" +
      "ファイル名は短く正確、単語の区切りはハイフン 1 つ（`--` のような連続は使わない）。",
    "",
  )
  return lines
}

/** AGENTS.md の §6 だけを差し替える。§6 / §7 が見つからなければ null（触らない）。 */
export function spliceAgents(existing: string | null, section: string[]): string | null {
  if (!existing) return null
  const lines = existing.split("\n")
  const start = lines.findIndex((l) => /^## 6\./.test(l))
  const end = lines.findIndex((l, i) => i > start && /^## 7\./.test(l))
  if (start < 0 || end < 0) return null
  return [...lines.slice(0, start), ...section, ...lines.slice(end)].join("\n")
}

/** `.agent/rules/project-template.md` を §6 と揃える（埋めた項目のチェックリスト）。 */
export function renderProjectTemplateRule(a: InitAnswers, d: Detected): string {
  const filled = sectionOrder.filter((id) => a.sectionText[id]?.trim())
  const lines = [
    "---",
    "paths:",
    '  - "AGENTS.md"',
    '  - ".agent/skills/project-overview/**"',
    '  - ".agent/skills/project-init/**"',
    "---",
    "",
    "# Rule 07: プロジェクト固有の遵守事項",
    "",
    "> 優先度: **HIGH** — `AGENTS.md §6` と対応するチェックリスト",
    ">",
    `> \`bun run setup --init-only\` で生成した（${a.name}）。§6 と食い違ったら §6 を正とする。`,
    "",
    "## 1. 環境・ツールチェーン（§6.1相当）",
    "",
    `- ランタイム: Bun ${d.packageManager}。依存は \`bun install --frozen-lockfile\` で固定`,
    `- 検証の正本: \`bun run check\`（${d.gates.length || gateCommands.filter((g) => g in d.scripts).length + 1} ゲート）と \`bun run knip\``,
    "- 個別の検査: `bun run links` / `mermaid` / `lang` / `agents` / `index` / `shell` / `length` / `coverage` / `test`",
    "",
    "## 2. 記入済みと未記入の節（§6.2〜§6.6相当）",
    "",
    "| 節 | 状態 |",
    "|---|---|",
    ...sectionOrder.map((id) => {
      const title = sectionHeadings[id].replace(/^### \d+\.\d+ /u, "")
      const state = filled.includes(id) ? "記入済み" : "未記入（事実が分かったら追記）"
      return `| §${sectionNumbers[id]} ${title} | ${state} |`
    }),
    "",
    "## 3. ドキュメント運用（§6.7相当）",
    "",
    "- 構成・命名規則・運用ルール: `docs/README.md`",
    "- タスク進捗管理: `docs/task-list.md`（唯一の正本）",
    "- 仕様書: `docs/arch/` / 計画書: `docs/planning/`（`_TEMPLATE.md` 形式）",
    "",
  ]
  return lines.join("\n")
}

/** `project-overview` スキルを、このプロジェクトの全体像に書き換える。 */
export function renderProjectOverview(a: InitAnswers, d: Detected): string {
  const lines = [
    "---",
    "name: project-overview",
    `description: ${a.name} の全体像（目的・構成・ドキュメント・進捗管理）を掴む。新規セッションの最初に読む。プロジェクト固有の検証と制約は AGENTS.md §6 を参照。Use when starting a new session or needing overall context.`,
    "---",
    "",
    `# Project Overview — ${a.name}`,
    "",
    `> ${a.description}`,
    ">",
    `> **目的**: ${a.purpose}`,
    "",
    "## 守ること",
    "",
    "- **速く大量に作ることではなく、常に復旧可能で、壊れた状態を長時間維持しないこと**を最優先とする。",
    "- 小さく実行 → 検証 → 修正 → 記録 → 次の作業、のサイクルを徹底する。",
    `- 検証の正本は \`bun run check\`。プロジェクト固有の制約は \`AGENTS.md §6\`（初期化: \`bun run setup --init-only\`）。`,
    "",
    "## 構成",
    "",
    "| パス | 役割 |",
    "|---|---|",
    "| `AGENTS.md` | Agent が必ず守る作業規約。§6 がプロジェクト固有 |",
    `| \`.agent/\` | Agent 設定（rules・skills ${d.skills.length} 件・hooks ${d.hooks.length} 件・agents ${d.agents.length} 件） |`,
    "| `docs/` | `task-list.md`（進捗の正本）・`arch/`（仕様）・`planning/`（計画）・`research/`（調査）・`audit/`（監査）・`ops/`（運用） |",
    "| `scripts/` | 検証と初期化の CLI（Bun / TypeScript） |",
    "| `README.md` | プロジェクトの概要と始め方 |",
    "| `LICENSE` | ライセンス |",
    "",
    "## 進捗管理",
    "",
    "- 正本は `docs/task-list.md`。チャット・Issue・AI の完了報告と矛盾する場合は本ファイルを正とする。",
    "- 進行中タスクは原則 1 件。タスク ID は再利用しない。中止したタスクは行を消さず「対象外」にして理由を残す。",
    "- 完了は AI の自己申告ではなく、証拠（検証結果 / コミット SHA / 成果物 / 実測値）で判定する。",
    "",
    "## 関連",
    "",
    "- 開発規約: `AGENTS.md`（§6 はプロジェクト固有）",
    "- 文書の目次: `docs/README.md` / 仕様: `docs/arch/README.md` / 運用: `docs/ops/index.md`",
    "- ルール: `.agent/rules/` / スキル: `.agent/skills/` / フック: `.agent/hooks/`",
    "- 初期化のやり直し: `.agent/skills/project-init/SKILL.md`（TUI の手順と確認項目）",
    "",
  ]
  return lines.join("\n")
}
