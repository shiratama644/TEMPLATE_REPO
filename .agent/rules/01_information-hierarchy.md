---
paths:
  - "**/*.md"
  - "docs/**"
  - ".agent/**"
---

# Rule 01: 情報の正と編集ルール

> 優先度: **CRITICAL** — 他の全ルールに優先する

## 1. 「正」の対応表

| 用途 | 参照すべき情報源 | 編集可否 | 備考 |
|---|---|---|---|
| 作業規約・開発ワークフロー | `AGENTS.md` | ✅ 編集可（プロジェクト固有 §6 のみ） | 常に正。速さより復旧可能性を優先 |
| 進捗・タスク状態の正本 | `docs/task-list.md` | ✅ 編集可（状態・証拠の更新） | 矛盾時は本ファイルを正とする — cod-web arena準拠 |
| 仕様書 | `docs/arch/*` | ✅ 編集可 | どう作るか — cod-web arena準拠で復旧 |
| 個別タスクの詳細計画 | `docs/planning/*_PLAN.md` | ✅ 編集可（計画時） | `_TEMPLATE.md` 準拠 |
| 調査結果 | `docs/research/*` | ✅ 編集可 | 競合・技術調査 — cod-web arena準拠で復旧 |
| 監査・差分・バグ | `docs/audit/*` | ✅ 必要時に作成 | 時点記録、書き換え禁止 — DropMod準拠で復旧 |
| 完了レポート | `docs/complete/*` + `docs/planning/complete/*` | ✅ 完了時に作成 | メトリクス・証拠を記録 |
| 運用手順 | `docs/ops/*` | ✅ 運用時に更新 | デプロイ・CI手順 |
| 設定例 | `docs/examples/*` | ✅ 参考として保持 | Vite/Next.js設定例 — 現在の機能 |
| ドキュメント目次 | `docs/README.md` | ✅ 追加・削除時に必須更新 | 全ドキュメントの入口（arch/ + planning/ + research/ + audit/ + ops/ + examples/ + task-list.md） |
| コードベース知識（事実） | `.agent/skills/*/SKILL.md` | ✅ 知見が得られたら更新 | 再利用可能な事実・仕様 |
| プロジェクト概要 | `README.md` | ✅ 編集可 | 技術スタック・セットアップ |
| Agent設定 | `.agent/settings.json` | ✅ 編集可（チーム共有） | permissions, hooks, env |
| 個人オーバーライド | `.agent/settings.local.json` | ✅ 個人のみ（gitignore） | 個人の上書き |

> **活発リポジトリ準拠で復旧**: cod-web arena/01a0b161-cod-web（2026-09-26活発）では docs/: README, task-list.md, arch/ (15 files), planning/ (with complete/), ops/, research/ が標準。以前「記録は削除」としたが、ユーザー指摘（arch/audit/planning/researchは必要）により復旧（2026-09-27調査）。

## 2. 鉄則

1. **進捗は `docs/task-list.md` のみを正本とする**。チャット・PR・ログと矛盾したら本ファイルを正とする — cod-web arena準拠
2. **仕様は `docs/arch/` が正本**。計画は `docs/planning/`、調査は `docs/research/`、監査は `docs/audit/`
3. **スキルは事実、AGENTS.mdは規約**。重複させない。規約はAGENTS.md、事実・仕様・ハマりどころはスキルへ
4. **ドキュメント追加・削除・移動時は必ず `docs/README.md` の目次を更新する**。参照切れを残さない
5. **テンプレート化を意識**：このリポジトリ固有の情報は `AGENTS.md §6` と `skills/project-overview` に集約し、汎用部分はそのまま流用できる形に保つ

## 3. 禁止操作

- `docs/task-list.md` のタスクIDの再利用
- `AGENTS.md` の汎用節（§1〜§5）の勝手な削除・大幅書き換え（プロジェクト固有は§6へ）
- 完了したタスクの計画書・レポートの削除（履歴として残す）— ただし `docs/` 全体は活発リポジトリ準拠で保持
- 現在の機能（detector, cache, termux, 100% coverage）を壊す変更
