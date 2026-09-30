/**
 * Docs Generator — Generates docs/ for new repository after pnpm setup
 * Deletes template-repo-specific docs and creates clean template for new project
 */

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { SetupAnswers } from "./types.ts"

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function generateDocs(answers: SetupAnswers, cwd = process.cwd()): string[] {
  const created: string[] = []
  const docsDir = join(cwd, "docs")

  // Clean old template-repo-specific files
  const toDelete = [
    "docs/complete",
    "docs/complete/migration.md",
    "docs/complete/migration-v2.md",
    "docs/complete/migration-v3.md",
    "docs/complete/migration-v4.md",
    "docs/audit/activity.md",
    "docs/planning/robustness-plan.md",
    "docs/planning/index.md",
    "docs/arch/product.md",
    "docs/arch/architecture.md",
    "docs/arch/tech-stack.md",
    "docs/arch/bootstrap.md",
    "docs/arch/detector.md",
    "docs/arch/cache.md",
    "docs/arch/termux.md",
    "docs/arch/adr.md",
    "docs/arch/engineering.md",
    "docs/arch/milestones.md",
    "docs/arch/cicd.md",
    "docs/arch/quality.md",
    "docs/arch/security.md",
  ]
  for (const p of toDelete) {
    const full = join(cwd, p)
    if (existsSync(full)) {
      try {
        rmSync(full, { force: true, recursive: true })
      } catch {}
    }
  }

  // Clean .claude/logs/ and .claude/logs/ — ensure empty with .gitkeep for new project
  for (const logsDir of [".claude/logs", ".claude/logs"]) {
    const full = join(cwd, logsDir)
    try {
      if (existsSync(full)) {
        const files = readdirSync(full)
        for (const f of files) {
          if (f === ".gitkeep") continue
          try {
            rmSync(join(full, f), { force: true, recursive: true })
          } catch {}
        }
      }
      ensureDir(full)
      const gitkeepPath = join(full, ".gitkeep")
      if (!existsSync(gitkeepPath)) {
        writeFileSync(gitkeepPath, "", "utf8")
      }
      created.push(`${logsDir}/.gitkeep`)
    } catch {}
  }

  // docs/README.md — for new project
  const readmeContent = `# ${answers.projectName} — ドキュメント索引

本リポジトリのドキュメント一式を種類別に整理した目次です。

> Generated with Template Bootstrap — Project: **${answers.projectName}** (${answers.projectType})${answers.preset ? ` preset: ${answers.preset}` : ""}

---

## 📂 ディレクトリ構造

\`\`\`
docs/
├── README.md          ← 本ファイル（全ドキュメントの目次）
├── task-list.md       ⭐ タスク管理の唯一の正本（進捗・証拠）
├── arch/              ⭐ 仕様書（どう作るか）
│   ├── README.md
│   ├── product.md     # プロダクト定義
│   ├── architecture.md
│   ├── engineering.md # 決定論・テスト・性能予算
│   ├── adr.md
│   └── milestones.md  # フェーズと完了条件
├── planning/          # 計画書（_TEMPLATE.md形式）
│   ├── README.md
│   ├── _TEMPLATE.md
│   └── complete/      # 完了済み計画
├── research/          # 調査結果
│   └── README.md
├── audit/             # 差分・バグ監査
│   └── index.md
├── ops/               # 運用ドキュメント
│   └── index.md
└── examples/          # 設定例（Vite/Next）— 参考
    ├── vite.config.example.ts
    └── next.config.example.mjs
\`\`\`

---

## 🗺️ 用途別リファレンス

### 「まず全体像を把握したい」

| 順 | ドキュメント | 内容 |
|---:|---|---|
| 1 | \`../README.md\` | プロジェクト概要、技術スタック、セットアップ |
| 2 | \`task-list.md\` | **タスク管理の正本** |
| 3 | \`arch/README.md\` | 仕様書一覧 |
| 4 | \`../AGENTS.md\` | 開発規約 |

### 「これから開発を継続したい」

| 順 | ドキュメント | 内容 |
|---:|---|---|
| 1 | \`task-list.md\` | 次に着手すべきタスク |
| 2 | \`planning/_TEMPLATE.md\` | 計画書テンプレート |
| 3 | \`arch/\` | 仕様書 |

---

## 🎯 各フォルダの役割

### \`arch/\` — 仕様書（どう作るか）

- プロダクト定義、レイヤー、依存規則、決定論、ADR、フェーズ
- 新しい設計領域が固まったら \`kebab-case.md\` を追加

### \`planning/\` — 計画書

- タスク開始前に作成する詳細な計画書（\`_TEMPLATE.md\` 形式）
- 完了済みは \`complete/\` へ

### \`research/\` — 調査結果

- 競合・関連技術の調査結果、採用判断

### \`audit/\` — 差分・バグ監査

- 計画書 vs 実装の差分、バグリスト
- 時点記録のため書き換えない

### \`ops/\` — 運用ドキュメント

- デプロイ・CI・本番運用の手順書

### \`examples/\` — 設定例

- Vite/Next.js設定例（参考）

---

## 📝 命名規約（ハイフン最大1つ、短く正確）

| 種類 | 命名規則 | 例 |
|---|---|---|
| タスクリスト | \`docs/task-list.md\`（固定・唯一の正本） | — |
| 計画書テンプレート | \`_TEMPLATE.md\`（固定） | — |
| 計画書 | \`{TOPIC}_PLAN.md\`（ハイフン最大1つ） | \`AUTH_PLAN.md\` |
| 仕様書 | \`kebab-case.md\`（ハイフン最大1つ） | \`tech-stack.md\` |
| 調査 | \`{TOPIC}_RESEARCH.md\` | \`TERMUX_RESEARCH.md\` |
| 監査 | \`diff-{context}.md\` / \`issues-{context}.md\` | \`diff-auth.md\` |
| 完了レポート | \`{TOPIC}_COMPLETE.md\` | \`AUTH_COMPLETE.md\` |
| 運用 | 大文字スネークケース | \`DEPLOY.md\` |
| 設定例 | \`kebab-case.example.*\` | \`vite.config.example.ts\` |

---

## 🔗 運用ルール

- ドキュメントを追加・削除・移動したら**必ず本 README の目次を更新**
- タスクIDと進捗は \`docs/task-list.md\`（正本）にのみ記録
- \`arch/\` が仕様の正本、\`planning/\` が計画、\`task-list.md\` が進捗の正本
- ファイル名は短く正確、ハイフン最大1つ
`

  writeFileSync(join(docsDir, "README.md"), readmeContent, "utf8")
  created.push("docs/README.md")

  // docs/task-list.md — clean template for new project
  const taskListContent = `# タスクリスト (唯一の正本) — ${answers.projectName}

> **運用規則** — Qiita「Claude Code／Codex に中〜大規模開発を任せるためのタスク管理」
> (<https://qiita.com/Y-Y-dev/items/d526fb7cdbe35a3f9384>) に基づく運用。
>
> 1. **本ファイルが進捗管理の唯一の正本**。チャット・Issue・AI の完了報告と本ファイルが矛盾する場合は本ファイルを正とする。
> 2. **進行中タスクは原則 1 件**。複数を同時に進めない。
> 3. **タスク ID は再利用しない**。中止したタスクは行を消さず「対象外」にして理由を残す。
> 4. **作業中に見つけた新問題は新タスクとして登録**し、現在のタスクへ混ぜない。
> 5. 完了は **AI の自己申告ではなく証拠で判定**する (テスト件数 / コミット SHA / PR / 実測値)。
> 6. 個別タスクの詳細は \`docs/planning/*_PLAN.md\` (計画書テンプレート \`_TEMPLATE.md\` 準拠) に書く。
>
> **状態の定義**: \`未着手\` / \`調査中\` / \`実装中\` / \`ローカル検証済み\` / \`実環境検証待ち\` / \`完了\` / \`保留\` / \`対象外\`

> Generated with Template Bootstrap — Project: ${answers.projectName} (${answers.projectType})${answers.preset ? ` preset: ${answers.preset}` : ""}

---

## 未完了サマリー

| ID | 状態 | 残作業 |
|---|---|---|
| — | — | なし（初期テンプレート） |

---

## タスク一覧

### 初期セットアップ

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| SETUP-1 | プロジェクト初期セットアップ（${answers.projectName}） | 完了 | 100% | — | pnpm setup で生成、README/docs/が新プロジェクト用に書き換え済み、pnpm check 12 PASS | pnpm setup ${answers.preset ? `--preset ${answers.preset}` : ""} |

### <テーマ名>

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| 例 | タスク内容 | 未着手 | 0% | 依存 ID | 第三者が Yes/No 判定できる条件 | コミット SHA / テスト件数 |

---

## タスク追加の手順

1. 本ファイルに**新規 ID** で行を追加（ID は \`TASK-1\` / \`AUTH-2\` のようにテーマ接頭辞 + 連番）
2. 計画書を \`docs/planning/{TOPIC}_PLAN.md\` に \`_TEMPLATE.md\` 形式で作成
3. 実装中は状態を更新（未着手 ➡️ 調査中 ➡️ 実装中 ➡️ ローカル検証済み）
4. 完了時は証拠（コミット SHA / テスト結果）を書く
`

  writeFileSync(join(docsDir, "task-list.md"), taskListContent, "utf8")
  created.push("docs/task-list.md")

  // docs/arch/ — clean template for new project
  const archDir = join(docsDir, "arch")
  ensureDir(archDir)

  const archReadme = `# docs/arch — 仕様書（${answers.projectName} 理想形）

ここは **どう作るか** の正本です。計画は \`../planning/README.md\`、進捗は \`../task-list.md\`。

> Generated with Template Bootstrap — Project: ${answers.projectName} (${answers.projectType})

## 実装時に守ること

1. **存在しない API を発明しない**
2. **フェーズ順を飛ばさない**
3. **adr.md に反する実装をしない**
4. **決定論を壊さない**

## 仕様書一覧

| ファイル | 内容 |
|---|---|
| [product.md](./product.md) | プロダクト定義・用語 |
| [architecture.md](./architecture.md) | レイヤー・依存規則 |
| [engineering.md](./engineering.md) | 決定論・テスト・性能予算 |
| [adr.md](./adr.md) | 意思決定ログ |
| [milestones.md](./milestones.md) | フェーズと完了条件 |

新しい設計領域が固まったら \`kebab-case.md\` を追加し、本一覧と \`../README.md\` を更新する。
`

  writeFileSync(join(archDir, "README.md"), archReadme, "utf8")
  created.push("docs/arch/README.md")

  const productMd = `# product.md — プロダクト定義（${answers.projectName}）

> Generated with Template Bootstrap — Project: ${answers.projectName}

## 目的

${answers.projectDescription || `${answers.projectName} の目的をここに書く`}

## 用語

| 用語 | 定義 |
|---|---|
| 例 | 用語の定義 |

## 現行資産

- プロジェクトタイプ: ${answers.projectType}
- プリセット: ${answers.preset || "なし"}
- 機能: ${
    Object.entries(answers.features)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "minimal"
  }

## ライセンス

MIT
`

  writeFileSync(join(archDir, "product.md"), productMd, "utf8")
  created.push("docs/arch/product.md")

  const archMd = `# architecture.md — レイヤー・依存規則（${answers.projectName}）

> Generated with Template Bootstrap

## レイヤー

\`\`\`
L0: Runtime (Node 24 LTS + pnpm 12.6.0)
L1: Tooling (Biome, Vitest, Playwright)
L2: Scripts / Lib
L3: App (src/)
\`\`\`

## リポジトリ構成

\`\`\`
${answers.projectName}/
├── .agent/          # Agent設定
├── docs/            # ドキュメント一式（本ディレクトリ）
├── scripts/         # スクリプト
├── src/             # ソース
└── _tests_/         # テスト
\`\`\`

## 依存規則

- \`src/\` ➡️ \`scripts/lib/\` 禁止
- \`docs/\` ➡️ コード 禁止（仕様のみ）

## プロジェクトタイプ

- Type: ${answers.projectType}
- Preset: ${answers.preset || "none"}
`

  writeFileSync(join(archDir, "architecture.md"), archMd, "utf8")
  created.push("docs/arch/architecture.md")

  const engineeringMd = `# engineering.md — エンジニアリング規約（${answers.projectName}）

> Generated with Template Bootstrap — Project: ${answers.projectName}

## 決定論

- 純粋関数: 副作用を持たず、同じ入力で同じ出力を返す
- 禁止API: \`Math.random()\`, \`Date.now()\` の乱用は \`check-determinism\` で検出

## テスト

- 配置: \`_tests_/\` にソースと同じディレクトリ構造
- 命名: \`<name>.test.ts\`（ハイフン最大1つ）
- カバレッジ: 100% (statements/branches/functions/lines)

## 性能予算

- size-limit: ライブラリサイズ制限
- キャッシュ: ハッシュベーススキップ

## セキュリティ

- 機密ファイル: \`.env\` はGit管理外
- 入力検証: \`src/utils/validation.ts\` で検証
`

  writeFileSync(join(archDir, "engineering.md"), engineeringMd, "utf8")
  created.push("docs/arch/engineering.md")

  const adrMd = `# adr.md — 意思決定ログ（${answers.projectName}）

> Generated with Template Bootstrap

## ADR-001: プロジェクト初期セットアップ

**決定**: ${answers.projectName} を ${answers.projectType} タイプでセットアップ、プリセット ${answers.preset || "なし"}。

**理由**: Template Bootstrap CLI で生成。

**日付**: ${new Date().toISOString().split("T")[0]}
`

  writeFileSync(join(archDir, "adr.md"), adrMd, "utf8")
  created.push("docs/arch/adr.md")

  const milestonesMd = `# milestones.md — フェーズと完了条件（${answers.projectName}）

> Generated with Template Bootstrap — Project: ${answers.projectName}

## Phase 0: 基盤

- [x] Node 24 LTS + pnpm 12.6.0 + TS 6系
- [x] coverage 100%

## Phase 1: 機能実装

- [ ] タスクを \`docs/task-list.md\` に追加
- [ ] 計画書を \`docs/planning/*_PLAN.md\` に作成
- [ ] 実装・テスト・検証

## 完了条件（DoD）

1. \`pnpm check\` 12 PASS
2. \`pnpm test:coverage\` 100%
3. \`docs/README.md\` 索引更新済み
4. 内部リンク検証 OK
`

  writeFileSync(join(archDir, "milestones.md"), milestonesMd, "utf8")
  created.push("docs/arch/milestones.md")

  // docs/planning/ — clean template for new project
  const planningDir = join(docsDir, "planning")
  ensureDir(planningDir)
  const planningCompleteDir = join(planningDir, "complete")
  ensureDir(planningCompleteDir)

  const planningReadme = `# Planning Index — ${answers.projectName}

計画書（\`docs/planning/\`）は、\`docs/task-list.md\` の各タスクを **どの順で、どの範囲で、何をもって完了とするか** に分解する場所です。仕様そのものの正本は \`../arch/\` です。完了済み計画は \`complete/\` に置きます。

## まず読むもの

| 順 | 文書 | いつ読むか | 内容 |
|---:|---|---|---:|
| 1 | \`../task-list.md\` | 常に最初 | 状態・依存・次に着手できるタスクの唯一の正本 |
| 2 | 対象タスクの \`*_PLAN.md\` | 実装/調査に入る前 | 変更範囲、禁止事項、DoD、停止条件、検証方法 |
| 3 | \`../research/README.md\` | 外部技術・調査の根拠が必要な時 | 調査の入口 |
| 4 | \`../arch/README.md\` | 仕様確認が必要な時 | 仕様書一覧 |

## 計画書一覧

| 文書 | 対応 ID | 状態 | 役割 |
|---|---|---|---:|
| \`_TEMPLATE.md\` | — | 現用 | 新規計画書の必須形式 |
| \`complete/README.md\` | — | 現用 | 完了済み計画の索引 |

## 計画書を書く/更新する時のルール

- 新規タスクは先に \`../task-list.md\` へ ID を追加する
- 新規計画書は \`_TEMPLATE.md\` の §1〜§9 を最低限満たす
- 実装範囲、禁止事項、DoD、停止条件を必ず書く
- 完了後は「実績と証拠」に commit / validation を書く
- ファイル名は短く正確、ハイフン最大1つ

## 完了済み計画の扱い

完了した計画書は \`complete/\` へ移動。過去の記録は書き換えない。新規は \`_TEMPLATE.md\` 準拠で作成。
`

  writeFileSync(join(planningDir, "README.md"), planningReadme, "utf8")
  created.push("docs/planning/README.md")

  const planningTemplate = `# 計画書テンプレート (新規計画書は本形式で作成する)

> 進捗の正本は \`docs/task-list.md\`。計画書は個別タスクの詳細 (目的・範囲・条件) を担う。
> 各計画書は本テンプレートの §1〜§9 を必須セクションとし、§10〜§12 を必要に応じて増減する。

---

# <タスク名>: <タイトル>

> 対応 task-list ID: \`TASK-ID\` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠

## 1. 開始前確認

- 現在のブランチ / HEAD / \`git status\` を確認する
- \`docs/task-list.md\` で依存タスクの完了を確認する
- 関連仕様 (AGENTS.md §6 / .agent/skills/) を読む
- 本計画書の §5 (完了条件) と §7 (停止条件) を再読する

## 2. 目的 (Why)

## 3. 変更範囲 (Scope)

変更対象:
-

変更しない (境界外):
-

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する

## 5. 完了条件 (DoD)

- [ ] 条件 1
- [ ] \`docs/task-list.md\` の状態・進捗・証拠を更新

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---:|
| Unit |  |  |
| E2E |  |  |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 仕様書同士に矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要
- 破壊的変更が必要
- ユーザー判断が必要な設計論点に到達した

## 8. 完了時に行うこと

1. 差分を自己レビュー
2. プロジェクト検証を実行
3. \`docs/task-list.md\` の状態・進捗・証拠を更新
4. コミットを作成
5. 完了報告

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---:|
| TASK-A |  |  |  |

## 10. 設計詳細・仕様

## 11. リスク・Gotchas

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---:|
| TASK-A | \`abc1234\` | N passed |  |
`

  writeFileSync(join(planningDir, "_TEMPLATE.md"), planningTemplate, "utf8")
  created.push("docs/planning/_TEMPLATE.md")

  writeFileSync(
    join(planningCompleteDir, "README.md"),
    `# complete/ — 完了済み計画（${answers.projectName}）\n\n完了した計画書をここへ移動。\n`,
    "utf8",
  )
  created.push("docs/planning/complete/README.md")

  // docs/research/ — clean template
  const researchDir = join(docsDir, "research")
  ensureDir(researchDir)
  writeFileSync(
    join(researchDir, "README.md"),
    `# docs/research — 調査結果（${answers.projectName}）\n\nここは競合・関連技術の調査結果を置く場所です。\n\n> Generated with Template Bootstrap\n\n## 構成\n\n\`\`\`\nresearch/\n├── README.md\n└── <TOPIC>_RESEARCH.md\n\`\`\`\n\n## 運用ルール\n\n- 調査は \`RESEARCH.md\` 形式で、目的・調査対象・結果・採用判断を書く\n- 仕様へ採用する場合は \`../arch/\` へ反映\n`,
    "utf8",
  )
  created.push("docs/research/README.md")

  // docs/audit/ — ensure index exists
  const auditDir = join(docsDir, "audit")
  ensureDir(auditDir)
  writeFileSync(
    join(auditDir, "index.md"),
    `# audit/ — 差分・バグ監査（${answers.projectName}）\n\n計画と実装の差分、バグの監査記録を置く場所。\n`,
    "utf8",
  )
  created.push("docs/audit/index.md")

  // docs/ops/ — ensure index exists
  const opsDir = join(docsDir, "ops")
  ensureDir(opsDir)
  writeFileSync(
    join(opsDir, "index.md"),
    `# ops/ — 運用ドキュメント（${answers.projectName}）\n\nデプロイ・CI・本番運用の手順書。\n`,
    "utf8",
  )
  created.push("docs/ops/index.md")

  return created
}
