# bootstrap.md — Template Bootstrap CLI

## 概要

`pnpm setup` で対話的セットアップ。Feature Manifestパターンで宣言的に機能を定義。

## アーキテクチャ

- `types.ts`: FeatureDefinition, ProjectTypeDefinition, SetupAnswers, SetupPlan
- `manifest.ts`: 17機能 + 5プロジェクトタイプ + 7プリセット
- `presets.ts`: minimal, recommended, full, library, vite-app, next-app, monorepo
- `validator.ts`: バリデーション、依存解決、影響サマリー
- `backup.ts`: バックアップ/ロールバック、5世代保持
- `yaml-utils.ts`: YAML安全操作（job/step削除が壊れても元に戻す）
- `engine.ts`: 差分計算・適用・サマリー・diff
- `prompts.ts`: 対話（@clack/prompts）、GitHub owner自動推論、Termux自動検出
- `readme-generator.ts`: バッジ付きREADME再生成
- `setup.ts`: CLI v2エントリーポイント

## 機能一覧（17）

Docker, DevContainer, Termux, Vitest, Playwright, Coverage, cspell, knip, publint, size-limit, determinism, Husky, Commitlint, GitHub Templates, Renovate, Stale, Changesets

## プリセット（7）

- minimal 🪶 — Plain TS + Vitestのみ
- recommended ⭐ — Plain TS + testing + quality + git workflow
- full 🚀 — 全機能ON
- library 📦 — 公開ライブラリ用
- vite-app ⚡ — Vite SPA + Docker + E2E
- next-app ▲ — Next.js SSR/SSG + Docker + E2E
- monorepo 🏗️ — Turborepo (apps/web + packages/ui)

## 安全性

- `git status --porcelain` で未コミット検知 → stash/continue/abort
- `.bootstrap-backup/` に自動バックアップ
- `.bootstrap-state.json` で冪等性検出
- `src/` 配下は無条件で削除・上書きしない

## CLI

```
--dry-run, --yes/-y, --minimal, --preset <id>, --list-presets,
--project-name <name>, --type <type>, --features <list>,
--termux-mode <mode>, --github-owner <owner>, --description <desc>,
--config <path>, --save-config <path>, --force,
--no-install, --no-verify, --no-backup, --verbose/-v, --help/-h, --version
```
