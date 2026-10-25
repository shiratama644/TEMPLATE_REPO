---
paths:
  - "docs/**/*.md"
  - "README.md"
  - "AGENTS.md"
---

# Rule 03: ドキュメント記述スタイル

> 優先度: **HIGH** — 可読性と再利用性の一貫性を保つ

## 1. 言語と表記

- 本文は**日本語**。コード識別子・技術固有名詞は英語のまま。
- 「〜です/ます」調。計画書の完了条件などは断定形「〜する」。
- 絵文字は既存ファイルのパターンに従う。新規の飾り絵文字は増やさない（可読性優先）。

## 2. ファイル構成

| 場所 | 内容 | 形式 |
|---|---|---|
| `docs/task-list.md` | 進捗の正本 | 固定名 |
| `docs/arch/` | 仕様・構成・判断の記録 | `kebab-case.md` |
| `docs/planning/` | 個別タスクの計画 | `_TEMPLATE.md` 準拠 |
| `docs/research/` | 調査結果 | `<TOPIC>_RESEARCH.md` |
| `docs/audit/` | 差分・問題・活動の記録 | `diff-{context}.md` / `issues-{context}.md` / `activity.md` |
| `docs/ops/` | 運用手順 | 大文字スネークケース（例: `RELEASE.md`） |

計画書の必須セクション: 開始前確認、目的、変更範囲、禁止事項、完了条件、停止条件、実績と証拠。

## 3. 命名規約

ハイフンは最大 1 つ。短く、内容が正確に分かる名前にする。

| 種類 | 命名規則 | 例 |
|---|---|---|
| 計画書 | `{TOPIC}_PLAN.md` | `REPOFIX_PLAN.md` |
| 仕様書 | `kebab-case.md` | `product.md` |
| 調査 | `<TOPIC>_RESEARCH.md` | `PRICING_RESEARCH.md` |
| 監査（差分） | `diff-{context}.md` | `diff-migration.md` |
| 監査（問題） | `issues-{context}.md` | `issues-auth.md` |
| スキル | `kebab-case/SKILL.md` | `project-overview/SKILL.md` |
| ルール | `NN_kebab-case.md` または `kebab-case.md` | `project-template.md` |
| フック手順 | `kebab-case.md` | `verify-commit.md` |
| フックスクリプト | `kebab-case.sh` | `post-edit-verify.sh` |

## 4. リンク規約

- `docs/` 内の相互リンクは相対パス（`./planning/`、`../README.md` 等）。
- 存在しないファイルへのリンクを残さない。移動・削除時は参照も更新する。
- 外部リンクは可能な限り公式ソースを優先し、確認日を書く。

## 5. 運用ルール

- ドキュメントを追加・削除・移動したら、**必ず `docs/README.md` の目次を更新する**。
- 削除済みファイルを指す参照を残さない。
- タスク ID と進捗は `docs/task-list.md` にのみ記録する。計画書には「対応 task-list ID」を書いて相互参照する。
- 仕様は `docs/arch/`、計画は `docs/planning/`、調査は `docs/research/`、監査は `docs/audit/`、運用は `docs/ops/` に置く。
