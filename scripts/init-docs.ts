/** 初期化で生成する文書のうち、README・ライセンス・package.json・運用文書を作る。 */
import type { Detected, InitAnswers } from "./init-detect.ts"

/** `package.json` の scripts のうち README に載せるものと、その説明。 */
export const commandDocs: Record<string, string> = {
  setup: "対話式 TUI。プロジェクトの生成と、この初期化（文書の生成・修正）",
  init: "初期化だけを実行（`setup --init-only`）。`--dry-run` で読み取り専用",
  check: "検証の正本（全ゲート）。CI と同じ入口",
  knip: "未使用のコード・依存・export の検査",
  test: "単体テスト",
  typecheck: "型検査",
  format: "Biome で整形",
  "hooks:install": "Git フックの安全な導入（`bun install` でも自動実行）",
  "github:settings": "GitHub のリポジトリ設定を gh で一括適用",
  "git:report": "読み取り専用の Git / PR レポート",
  "verify:generated": "生成物の静的検査と、明示したときだけのビルド",
  "commit:check": "コミットメッセージ形式の検査",
}
/** 個別ゲートのコマンド（`bun run check` の内訳）。 */
export const gateCommands = [
  "links",
  "mermaid",
  "lang",
  "agents",
  "index",
  "shell",
  "length",
  "coverage",
]

/** 実在するコマンドだけを表の行にする。 */
export function commandRows(d: Detected): string[] {
  return Object.entries(commandDocs)
    .filter(([key]) => key in d.scripts)
    .map(([key, doc]) => `| \`bun run ${key}\` | ${doc} |`)
}

export function renderReadme(a: InitAnswers, d: Detected): string {
  const gates = d.gates.length || gateCommands.filter((g) => g in d.scripts).length + 1
  const lines = [`# ${a.name}`, "", a.description, "", "## 目的", "", a.purpose, ""]
  if (a.audience) lines.push(`**対象**: ${a.audience}`, "")
  if (a.nonGoals) lines.push(`**対象外**: ${a.nonGoals}`, "")
  lines.push(
    "## 始め方",
    "",
    "```bash",
    "bun install --frozen-lockfile   # 依存の導入と Git フックの有効化",
    "bun run check                   # 検証の正本（全ゲート）",
    "```",
    "",
    `Bun ${d.packageManager} を前提とします。検証は \`bun run check\`（${gates} ゲート）が正本で、`,
    `個別の検査は \`bun run ${gateCommands.filter((g) => g in d.scripts).join("` / `bun run ")}\` です。`,
    "CI と Dependabot の運用は [`docs/ops/index.md`](docs/ops/index.md) にあります。",
    "",
    "## コマンド",
    "",
    "| コマンド | 役割 |",
    "| :--- | :--- |",
    ...commandRows(d),
    "",
    "## Agent と作業するとき",
    "",
    "- 作業規約の正本: [`AGENTS.md`](AGENTS.md)（`CLAUDE.md` は symlink。§6 がプロジェクト固有）",
    "- 全体像: [`project-overview`](.agent/skills/project-overview/SKILL.md)",
    "- 進捗と証拠の正本: [`docs/task-list.md`](docs/task-list.md)",
    "- 仕様と構成: [`docs/arch/`](docs/arch/README.md) / 計画: [`docs/planning/_TEMPLATE.md`](docs/planning/_TEMPLATE.md)",
    "- 文書の目次: [`docs/README.md`](docs/README.md)",
    "- 脆弱性の報告: [`.github/SECURITY.md`](.github/SECURITY.md)",
    "",
    "## GitHub 側の設定",
    "",
    "Dependabot alerts・secret scanning・`main` の ruleset はファイルだけでは有効になりません。",
    "管理者権限で `gh auth login` したあと `bun run github:settings --apply` を実行するか、",
    "[`docs/ops/GITHUB_SETTINGS.md`](docs/ops/GITHUB_SETTINGS.md) の手順を画面で行ってください。",
    "",
    "## 初期化の再実行",
    "",
    "`bun run setup --init-only` は対話式 TUI で本ファイル・`AGENTS.md §6`・`docs/` を生成し直します。",
    "`--dry-run` は読み取り専用、非対話式は `--yes --apply` が必要です。",
    "",
    "## ライセンス",
    "",
    `${a.licenseHolder ? `${a.licenseHolder} ` : ""}(c) ${a.licenseYear} — [LICENSE](LICENSE)`,
    "",
  )
  return lines.join("\n")
}

/** LICENSE の著作権行だけ差し替える。LICENSE が無ければ null（作らない）。 */
export function renderLicense(a: InitAnswers, existing: string | null): string | null {
  if (!existing) return null
  const line = `Copyright (c) ${a.licenseYear} ${a.licenseHolder}`.trimEnd()
  return existing.replace(/Copyright \(c\).*/, line)
}

/** `package.json` の名前と説明だけ更新し、他はそのまま残す。 */
export function renderPackage(a: InitAnswers, existing: string | null): string | null {
  if (!existing) return null
  const pkg = JSON.parse(existing) as Record<string, unknown>
  pkg.name = a.slug // npm の名前規則（kebab-case）。表示名は README と文書で使う
  pkg.description = a.description
  return `${JSON.stringify(pkg, null, 2)}\n`
}

/** SECURITY.md から「テンプレートです」の注記を除き、対象をプロジェクト名にする。 */
export function renderSecurity(a: InitAnswers, existing: string | null): string | null {
  if (!existing) return null
  return existing
    .replace(/^> このファイルはテンプレートです。.*\n\n/msu, "")
    .replace(
      /^# Security Policy \/ セキュリティポリシー(?:（[^）]*）)?$/mu,
      `# Security Policy / セキュリティポリシー（${a.name}）`,
    )
}

/** リポジトリ設定画面の URL。owner が変わったあとの再実行でも差し替わる。 */
const settingsUrl = /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/settings/gu

/** 作者リポジトリ・実測日付の痕跡を利用者の値に置き換える。 */
export function replaceTraces(text: string, a: InitAnswers): string {
  const slug = a.owner ? `${a.owner}/${a.repo}` : `<owner>/<repo>`
  return text
    .replaceAll("https://github.com/shiratama644/TEMPLATE_REPO", `https://github.com/${slug}`)
    .replaceAll("shiratama644/TEMPLATE_REPO", slug)
    .replace(settingsUrl, `https://github.com/${slug}/settings`)
    .replaceAll("（2026-11-23 に実測）", "")
    .replaceAll("（2026-11-23 実測）", "")
    .replaceAll("2026-11-23 実測", "実測")
    .replaceAll("<owner>/<repo>", slug)
}

/** 計画書の形式出典（作者の参照リンク）を除く。他の行はそのまま残す。 */
export function renderPlanningTemplate(existing: string | null): string | null {
  if (!existing) return null
  const dropped = /形式の出典|qiita\.com\/Y-Y-dev/u
  const lines = existing.split("\n").filter((l) => !dropped.test(l))
  return lines.join("\n").replace(/^>\n(?=> )/mu, "")
}

/** 最初のタスクが指定されたときだけ、空の進捗表に行を登録する。既存の行は壊さない。 */
export function renderTaskList(a: InitAnswers, existing: string | null): string | null {
  if (!existing || !a.firstTask) return null
  const emptySummary = /## 未完了サマリー\n\nなし。[^\n]*\n/u
  const emptyTable = /## タスク一覧\n\n現在、登録済みのタスクはありません。[\s\S]*$/u
  if (!emptySummary.test(existing) || !emptyTable.test(existing)) return null
  const summary = `## 未完了サマリー\n\n- TASK-1: ${a.firstTask}（状態: 未着手）\n`
  const table = [
    "## タスク一覧",
    "",
    "| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |",
    "|---|---|---|---:|---|---|---|",
    `| TASK-1 | ${a.firstTask} | 未着手 | 0% | なし | 初期化で承認した完了条件 | \`bun run setup --init-only\` の実行記録 |`,
    "",
  ].join("\n")
  return existing.replace(emptySummary, summary).replace(emptyTable, table)
}
