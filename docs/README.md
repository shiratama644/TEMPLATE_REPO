# ドキュメント索引

本リポジトリのドキュメント一式を種類別に整理した目次です。ルート `README.md` からプロジェクトの概要へアクセスできます。

> **構成参考**: `shiratama644/cod-web` の `arena/01a0b161-cod-web` ブランチ（2026-09-26活発）を調査。`arch/` + `planning/` + `research/` + `ops/` + `task-list.md` が標準構成。DropModは `audit/` + `ops/` + `planning/` + `task-list.md`、ytdlは `planning/` + `research/` + `task-list.md`。本テンプレートでは全てを統合し `examples/` も保持。

---

## 📂 ディレクトリ構造（活発リポジトリ準拠 + TEMPLATE_REPO拡張）

```
docs/
├── README.md                          ← 本ファイル（全ドキュメントの目次）
├── task-list.md                       ★ タスク管理の唯一の正本（進捗・証拠）
├── arch/                              ★ 仕様書（どう作るか）— cod-web arena準拠で復旧
│   ├── README.md                      # 仕様書一覧と実装時に守ること
│   ├── product.md                     # プロダクト定義・用語・現行資産
│   ├── architecture.md                # レイヤー・リポジトリ・依存規則・検出優先順位
│   ├── tech-stack.md                  # Node 24 LTS + pnpm 12.6.0 + TS 6 + Biome + Vitest
│   ├── bootstrap.md                   # Template Bootstrap CLI — Feature Manifest
│   ├── detector.md                    # ProjectDetector — Vite/Next/Turbo/Monorepo自動検出
│   ├── cache.md                       # ビルド高速化キャッシュ — ハッシュベーススキップ
│   ├── termux.md                      # Termux対応 — 9種判定・Webpack強制
│   ├── engineering.md                 # 決定論・テスト・性能予算・セキュリティ
│   ├── adr.md                         # 意思決定ログ
│   └── milestones.md                  # フェーズと完了条件
├── planning/                          # 計画書（タスク単位・_TEMPLATE.md形式）
│   ├── README.md                      # 計画書索引・次に使う計画
│   ├── _TEMPLATE.md                   # 計画書テンプレート（新規は必ず本形式）
│   ├── robustness-plan.md             # 堅牢性テスト・ProjectDetector設計
│   └── complete/                      # 完了済み計画（cod-web arena準拠）
│       └── README.md
├── research/                          # 調査結果 — cod-web arena準拠で復旧
│   └── README.md                      # 調査一覧・採用判断
├── audit/                             # 差分・バグ監査 — DropMod準拠で復旧
│   ├── index.md                       # 本フォルダの説明
│   └── activity.md                    # 活動ログ
├── ops/                               # 運用ドキュメント（デプロイ・CI実務）
│   └── index.md
└── examples/                          # 設定例（Vite/Next）— 現在の機能
    ├── vite.config.example.ts
    └── next.config.example.mjs
```

> 各フォルダの `index.md` / `README.md` に「何のフォルダか・そこに何を置くか・運用ルール」が書かれています。
> `arch/` は仕様の正本、 `planning/` は計画、 `task-list.md` は進捗の正本、 `research/` は調査、 `ops/` は運用。

---

## 🗺️ 用途別リファレンス

### 「まず全体像を把握したい」

| 見る順 | ドキュメント | 内容 |
|---:|---|---|
| 1 | [`../README.md`](../README.md) | プロジェクト概要、技術スタック、セットアップ — 現在の機能 |
| 2 | [`task-list.md`](task-list.md) | **タスク管理の正本**（全タスクの状態・証拠が一覧） |
| 3 | [`arch/README.md`](arch/README.md) | 仕様書一覧と実装時に守ること |
| 4 | [`arch/product.md`](arch/product.md) / [`arch/architecture.md`](arch/architecture.md) | プロダクト定義、レイヤー、依存規則 |
| 5 | [`.agent/skills/project-overview/SKILL.md`](../.agent/skills/project-overview/SKILL.md) | コードベース知識の入口 |
| 6 | [`../AGENTS.md`](../AGENTS.md) | 開発規約（ワークフロー / Git運用 / 品質保証） |

### 「これから開発を継続したい」

| 見る順 | ドキュメント | 内容 |
|---:|---|---|
| 1 | [`task-list.md`](task-list.md) | 次に着手すべきタスクと依存・検証待ち |
| 2 | [`planning/README.md`](planning/README.md) | 計画書索引・次に使う計画 |
| 3 | [`planning/_TEMPLATE.md`](planning/_TEMPLATE.md) | 計画書テンプレート（新規はこの形式） |
| 4 | [`arch/`](./arch/) | 仕様書（どう作るか） |

### 「調査・技術選定したい」

| ドキュメント | 内容 |
|---|---|
| [`research/README.md`](research/README.md) | 調査一覧・採用判断 |
| [`arch/adr.md`](arch/adr.md) | 意思決定ログ |

### 「デプロイしたい / CI を動かしたい」

| ドキュメント | 内容 |
|---|---|
| [`ops/`](ops/) | デプロイ・CI の運用手順 |
| [`examples/`](examples/) | Vite/Next.js設定例 |

---

## 🎯 各フォルダの役割

### `arch/` — 仕様書（どう作るか）— cod-web arena準拠で復旧

詳細は [`arch/README.md`](arch/README.md)。

- **理想形**の正本。現行コードと食い違う場合、本ディレクトリが目標
- プロダクト定義、レイヤー、依存規則、技術スタック、Bootstrap CLI、Detector、Cache、Termux、ADR
- 新しい設計領域が固まったら `kebab-case.md` を追加

### `planning/` — 計画書

詳細は [`planning/index.md`](planning/index.md)（旧） / [`planning/README.md`](planning/README.md)（cod-web準拠）。

- **タスク開始前**に作成する詳細な計画書（`_TEMPLATE.md` 形式）
- 進捗・証拠は `task-list.md`（正本）で管理、計画書は個別タスクの詳細を担う
- 完了済みは `planning/complete/` へ（cod-web arena準拠）

### `research/` — 調査結果 — cod-web arena準拠で復旧

詳細は [`research/README.md`](research/README.md)。

- 競合・関連技術の調査結果、採用/不採用/要確認の判断
- 仕様へ採用する場合は `arch/` へ反映

### `audit/` — 差分・バグ監査 — DropMod準拠で復旧

詳細は [`audit/index.md`](audit/index.md)。

- 計画書 vs 実装の差分（`diff-*.md`）
- 発見したバグ・潜在的不具合（`issues-*.md`）
- 時点記録のため書き換えない

### `ops/` — 運用ドキュメント

詳細は [`ops/index.md`](ops/index.md)。

- デプロイ・CI・本番運用の手順書

### `examples/` — 設定例 — 現在の機能

- `vite.config.example.ts` — Vite設定例（キャッシュ、Termux対応）
- `next.config.example.mjs` — Next.js設定例（キャッシュ、Termux対応）

---

## 📝 命名規約（最終テンプレート — ハイフン最大1つ、短く正確）

| 種類 | 命名規則 | 例 |
|---|---|---|
| タスクリスト | `docs/task-list.md`（固定・唯一の正本） | — |
| 計画書テンプレート | `_TEMPLATE.md`（固定） | — |
| 計画書 | `{TOPIC}_PLAN.md`（ハイフン最大1つ） | `AUTH_PLAN.md` |
| 仕様書 | `kebab-case.md`（ハイフン最大1つ） | `tech-stack.md` |
| 調査 | `{TOPIC}_RESEARCH.md` | `TERMUX_RESEARCH.md` |
| 監査（差分） | `diff-{context}.md` | `diff-migration.md` |
| 監査（バグ） | `issues-{context}.md` | `issues-auth.md` |
| 運用 | 大文字スネークケース | `DEPLOY.md` |
| 設定例 | `kebab-case.example.*` | `vite.config.example.ts` |
| スキル | `kebab-case/SKILL.md` | `project-overview/SKILL.md` |
| ルール | `kebab-case.md`（ハイフン最大1つ） | `project-template.md` |
| テスト | `kebab-case.test.ts`（ハイフン最大1つ） | `yaml-top.test.ts` |

---

## 🔗 運用ルール

- ドキュメントを追加・削除・移動したら**必ず本 README の目次を更新する**
- 削除済みファイルを指す参照を残さない
- タスクIDと進捗は `docs/task-list.md`（正本）にのみ記録、計画書・完了レポートには「対応 task-list ID」を書いて相互参照
- `arch/` が仕様の正本、 `planning/` が計画、 `task-list.md` が進捗の正本、 `research/` が調査、 `ops/` が運用
- ファイル名は短く正確、ハイフン最大1つ

---

## 📚 現在の機能（活発リポジトリ準拠 + TEMPLATE_REPO拡張）

- **Node 24 LTS** + pnpm 12.6.0 + TypeScript 6系
- **Vite / Next.js / Monorepo / Turbo** 自動検出（`scripts/lib/detector.ts`）
- **Termux対応** — 9種判定、Next.jsはWebpack強制、Viteはメモリ制限
- **ビルド高速化キャッシュ** — ハッシュベーススキップ（`scripts/lib/cache.ts`）
- **品質ゲート13タスク** — `pnpm check` で 8必須(blocking: typecheck/lint/determinism/cspell/knip/unit/coverage/build) + 2任意(non-blocking: publint/size-limit) + 3 infra (install/e2e:list/security:check)
- **カバレッジ100%** — `src/` + `scripts/lib/` 9ファイル
- **Template Bootstrap CLI** — `pnpm setup` で対話的セットアップ（7プリセット）
- **GitHub Templates** — Issue/PRテンプレ、CODEOWNERS、SECURITY、labeler、stale
- **DXツール** — size-limit, publint, taze, Docker, devcontainer, husky, commitlint, cspell, knip, Renovate, Changesets
- **ドキュメント構成** — `arch/` (仕様) + `planning/` (計画) + `research/` (調査) + `audit/` (監査) + `ops/` (運用) + `examples/` (設定例) + `task-list.md` (進捗正本) — cod-web arena/01a0b161-cod-web準拠で復旧
