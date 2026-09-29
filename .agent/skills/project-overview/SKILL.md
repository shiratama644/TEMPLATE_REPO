---
name: project-overview
description: テンプレートリポジトリの全体像（目的・技術スタック・ドキュメント構成・進捗管理）を掴む。新規セッションの最初に読む1スキル。Use when starting a new session or needing overall context.
---

# Project Overview — TEMPLATE_REPO

> このリポジトリはAI Agentによるソフトウェア開発を規律立てて進めるための**テンプレートリポジリトリ**です。
> GitHubの「Use this template」から新しいリポジトリを作成し、各プロジェクトでカスタマイズして使うことを想定しています。

## 目的

- **速く大量に作ることではなく、常に復旧可能で、壊れた状態を長時間維持しないこと**を最優先とする。
- 小さく実装 → 検証 → 修正 → Commit → 次の機能のサイクルを徹底。
- タスク管理・ドキュメント・Agent設定を統一し、新規リポジトリでも同じ運用を流用できる状態にする。

## 技術スタック（テンプレート既定）

| 層 | 採用 | 備考 |
|---|---|---|
| ランタイム | Node.js v24 LTS + pnpm 12.6.0 | `.nvmrc` + `packageManager` で固定、corepack経由 |
| 言語 | TypeScript 5.8+ | strict mode |
| Lint/Format | Biome 2.x | ESLint/Prettierは使わない |
| Test | Vitest 4 + Playwright | `_tests_/` にミラー、coverageはv8 |
| ドキュメント | Markdown + `docs/` 構成 | `task-list.md`（正本）+ `arch/`（仕様）+ `planning/`（計画）+ `research/`（調査）+ `audit/`（監査）+ `complete/`（完了）+ `ops/`（運用）+ `examples/`（設定例） — cod-web arena/01a0b161-cod-web準拠で復旧（2026-09-27調査、arch/audit/planning/researchは必要） |
| Agent設定 | `.agent/` | 公式 `.claude/` 構成に準拠、ディレクトリ名は `.agent/` のまま |
| CI | GitHub Actions + pnpm/action-setup@v4 | `packageManager` からバージョン解決、cache: pnpm |

> cod-web arena/01a0b161-cod-webブランチ（2026-09-26活発）を調査: docs/は README, task-list.md, arch/ (15 files), planning/ (with complete/), ops/, research/ (DR-1..5) が標準。DropModは audit + ops + planning + task-list.md、ytdlは planning + research + task-list.md。本テンプレートでは全て統合し examples/ も保持。以前「記録は削除」としたが、ユーザー指摘により必要と判断し復旧。

詳細なハマりどころは `tech-stack` スキルを参照。環境制約は `sandbox-constraints` スキルを参照。

## ドキュメント構成（活発リポジトリ準拠 — cod-web arena/01a0b161-cod-web復旧）

```
docs/
├── README.md          # 全ドキュメントの目次（arch/ + planning/ + research/ + audit/ + ops/ + examples/ + task-list.md）
├── task-list.md       # タスク管理の唯一の正本（進捗・証拠）
├── arch/              # 仕様書（どう作るか）— cod-web arena準拠で復旧
│   ├── README.md
│   ├── product.md
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── bootstrap.md
│   ├── detector.md
│   ├── cache.md
│   ├── termux.md
│   └── adr.md
├── planning/          # 計画書（_TEMPLATE.md形式）
│   ├── README.md
│   ├── _TEMPLATE.md
│   ├── robustness-plan.md
│   └── complete/      # 完了済み計画
├── research/          # 調査結果 — cod-web arena準拠で復旧
│   └── README.md
├── audit/             # 差分・バグ監査 — DropMod準拠で復旧
│   ├── index.md
│   └── activity.md
├── complete/          # 完了レポート（旧形式）
│   ├── index.md
│   └── migration.md
├── ops/               # 運用ドキュメント（デプロイ・CI）
│   └── index.md
└── examples/          # 設定例（Vite/Next.js）— 現在の機能
    ├── vite.config.example.ts
    └── next.config.example.mjs
```

## Agent設定構成（公式準拠）

```
.agent/
├── settings.json              # チーム共有設定（permissions, hooks, env）
├── settings.local.json        # 個人オーバーライド（gitignore）
├── rules/                     # トピック別ルール（pathsで発火条件）
│   ├── 01_information-hierarchy.md
│   ├── 02_git-workflow.md
│   ├── 03_doc-style.md
│   ├── 04_verification.md
│   └── project-template.md
├── skills/<name>/SKILL.md     # 再利用プロンプト（/nameで呼び出し）
├── agents/                    # サブエージェント定義
├── hooks/                     # フック手順(.md) + 実行スクリプト(.sh)
│   ├── settings.json          # 互換性のための旧登録（本体は../settings.json）
│   ├── pre_edit_guard.sh
│   └── post_edit_verify.sh
├── output-styles/             # 出力スタイル
├── workflows/                 # 動的ワークフロー
├── agent-memory/              # サブエージェント永続メモリ
├── logs/                      # タスク実行ログ（追加のみ）
└── commands/                  # 旧commands互換（新しくはskills/を使う）
```

## 進捗管理（活発リポジトリ準拠 — cod-web arena復旧）

- 正本は `docs/task-list.md`。チャット・Issue・AIの完了報告と矛盾する場合は本ファイルを正とする — cod-web arena/01a0b161-cod-web準拠
- 仕様の正本は `docs/arch/`（どう作るか）、計画は `docs/planning/`（_TEMPLATE.md形式）、調査は `docs/research/`、監査は `docs/audit/`
- 進行中タスクは原則1件。複数を同時に進めない
- タスクIDは再利用しない。中止したタスクは行を消さず「対象外」にして理由を残す
- 完了はAIの自己申告ではなく証拠（テスト件数 / コミットSHA / PR / 実測値）で判定
- 以前「記録は削除」としたが、ユーザー指摘（arch/audit/planning/researchは必要）により復旧（2026-09-27調査）

## 関連

- 開発規約: `AGENTS.md`（§1〜§5は汎用、§6はプロジェクト固有）
- ルール: `.agent/rules/`（トピック別、pathsで発火）
- スキル: `.agent/skills/`（事実・仕様・ハマりどころ）
- フック: `.agent/hooks/`（トリガー別定型手順）
- ログ: `.agent/logs/`（実行記録、追加のみ）
