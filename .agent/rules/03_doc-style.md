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

## 2. ファイル構成テンプレート（活発リポジトリ準拠 — cod-web arena/01a0b161-cod-web復旧）

> cod-web arena/01a0b161-cod-web（2026-09-26活発）では docs/: README, task-list.md, arch/ (15 files), planning/ (with complete/), ops/, research/ が標準。以前「記録は削除」としたが、ユーザー指摘（arch/audit/planning/researchは必要）により復旧（2026-09-27調査）。

### 仕様書 (`docs/arch/`)

- `product.md` — プロダクト定義
- `architecture.md` — レイヤー・依存規則
- `tech-stack.md` — 技術スタック
- `adr.md` — 意思決定ログ

### 計画書 (`docs/planning/{TOPIC}_PLAN.md`)

`docs/planning/_TEMPLATE.md` 準拠。必須セクション: 開始前確認, 目的, 変更範囲, 禁止事項, 完了条件, テスト方法, 停止条件, 完了時に行うこと, サブタスク分割, 設計詳細, リスク, 実績と証拠

### 調査 (`docs/research/`)

- `{TOPIC}_RESEARCH.md` — 調査結果

### 監査 (`docs/audit/`)

- `diff-{context}.md` — 差分レポート
- `issues-{context}.md` — バグリスト

### 完了レポート (`docs/complete/` + `docs/planning/complete/`)

- `{TOPIC}_COMPLETE.md` — 完了レポート

### 設定例 (`docs/examples/`)

- `vite.config.example.ts` — Vite設定例
- `next.config.example.mjs` — Next.js設定例

### 運用 (`docs/ops/`)

- `DEPLOY.md` — デプロイ手順
- `CI_SETUP.md` — CIセットアップ

## 3. 命名規約（活発リポジトリ準拠 — ハイフン最大1つ、短く正確）

| 種類 | 命名規則 | 例 |
|---|---|---|
| タスクリスト | `docs/task-list.md`（固定・唯一の正本） | — |
| 計画書テンプレート | `_TEMPLATE.md`（固定） | — |
| 計画書 | `{TOPIC}_PLAN.md`（ハイフン最大1つ） | `AUTH_PLAN.md` |
| 仕様書 | `kebab-case.md`（ハイフン最大1つ） | `tech-stack.md` |
| 調査 | `{TOPIC}_RESEARCH.md` | `TERMUX_RESEARCH.md` |
| 監査（差分） | `diff-{context}.md` | `diff-migration.md` |
| 監査（バグ） | `issues-{context}.md` | `issues-auth.md` |
| 完了レポート | `{TOPIC}_COMPLETE.md` | `AUTH_COMPLETE.md` |
| 設定例 | `kebab-case.example.*` | `vite.config.example.ts` |
| 運用 | 大文字スネークケース | `DEPLOY.md`, `CI_SETUP.md` |
| スキル | `kebab-case/SKILL.md` | `project-overview/SKILL.md` |
| ルール | `kebab-case.md`（ハイフン最大1つ） | `project-template.md` |
| フック手順 | `kebab-case.md`（ハイフン最大1つ） | `verify-commit.md` |
| フックスクリプト | `kebab-case.sh`（ハイフン最大1つ） | `restore-env.sh` |
| テスト | `kebab-case.test.ts`（ハイフン最大1つ） | `yaml-top.test.ts` |

## 4. リンク規約

- `docs/` 内の相互リンクは相対パス（`./planning/`, `../README.md` 等）
- 存在しないファイルへのリンクを残さない。移動時は参照も更新。
- 外部リンクは可能な限り公式ソースを優先。

## 5. 運用ルール（活発リポジトリ準拠 — cod-web arena復旧）

- ドキュメントを追加・削除・移動したら**必ず `docs/README.md` の目次を更新**（arch/ + planning/ + research/ + audit/ + ops/ + examples/ + task-list.md）
- 削除済みファイルを指す参照を残さない
- タスクIDと進捗は `docs/task-list.md`（正本）にのみ記録、計画書・完了レポートには「対応 task-list ID」を書いて相互参照 — cod-web arena準拠
- 仕様は `docs/arch/` が正本、計画は `docs/planning/`、調査は `docs/research/`、監査は `docs/audit/`、運用は `docs/ops/`
- ファイル名は短く正確、ハイフン最大1つ（例: `yaml-top.test.ts` はOK、`yaml-utils-top-level.test.ts` はNG）
