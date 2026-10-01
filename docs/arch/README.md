# docs/arch — 仕様書（TEMPLATE_REPO 理想形）

ここは **どう作るか** の正本です。計画は `../planning/README.md`、進捗は `../task-list.md`。

TEMPLATE_REPO は AI Agent によるソフトウェア開発を規律立てて進めるための**テンプレートリポジトリ**です。GitHub「Use this template」から新規リポジトリを作成し、各プロジェクトでカスタマイズして使うことを想定。

現行コードと本ディレクトリが食い違う場合、**本ディレクトリが目標**です。競合・外部技術調査は `../research/` を入口にし、仕様へ採用する場合は本ディレクトリへ反映してから実装します。

> **参考**: `shiratama644/cod-web` の `arena/01a0b161-cod-web` ブランチ構成を参考に `arch/`, `research/`, `audit/`, `planning/` を復旧（2026-09-27調査）。活発なリポジトリでは `arch/` が仕様の正本、`research/` が調査、`planning/` が計画、`task-list.md` が進捗の正本。

## 実装時に守ること

1. **存在しない API を発明しない**。記載外の外部 API は公式ドキュメントで実在とシグネチャを確認する。
2. **フェーズ順を飛ばさない**。`milestones.md` があれば完了条件を満たす前に次へ進まない。
3. **`adr.md` に反する実装をしない**。変更が必要なら実装せず人間に確認する。
4. **決定論を壊さない**。`engineering.md` の規則に反するコードは、テストが通っても不正解。
5. **現在の機能を壊さない**（detector, cache, termux, bootstrap, 100% coverage）。

## 読み方

| 状況 | 最初に読むもの | 次に読むもの |
|---|---|---|
| 実装を始める | `../task-list.md` → `../planning/README.md` | 対象フェーズの計画書 → 本 README の仕様書一覧 |
| 外部 API を使う | `tech-stack.md` | 公式ドキュメント / installed `.d.ts` |
| 新機能を仕様へ取り込む | `../research/README.md` | 個別 research → 採用先の `arch/*.md` |
| ADR に反しそう | `adr.md` | 実装せずユーザーへ確認 |

## 仕様書一覧

| ファイル | 内容 |
|---|---|
| [product.md](./product.md) | プロダクト定義・用語・現行資産 |
| [architecture.md](./architecture.md) | レイヤー・リポジトリ・依存規則・Vite/Next/Monorepo/Turbo検出 |
| [tech-stack.md](./tech-stack.md) | Node 24 LTS + pnpm 12.6.0 + TS 6 + Biome + Vitest + Playwright |
| [bootstrap.md](./bootstrap.md) | Template Bootstrap CLI — Feature Manifestパターン・7プリセット |
| [detector.md](./detector.md) | ProjectDetector — Vite/Next/Turbo/Monorepo自動検出 |
| [cache.md](./cache.md) | ビルド高速化キャッシュ — ハッシュベーススキップ |
| [termux.md](./termux.md) | Termux対応 — 9種判定・Webpack強制・メモリ制限 |
| [cicd.md](./cicd.md) | CI/CDアーキテクチャ — Auto-merge, Preview, Bundle Size, Lighthouse |
| [quality.md](./quality.md) | テスト・品質アーキテクチャ — Mutation, A11y, Visual, Benchmark |
| [security.md](./security.md) | セキュリティアーキテクチャ — CodeQL, Dependency Review, SBOM |
| [engineering.md](./engineering.md) | 決定論・テスト・性能予算・セキュリティ |
| [adr.md](./adr.md) | 意思決定ログ（なぜそうしたか） |
| [milestones.md](./milestones.md) | フェーズと完了条件 |

新しい設計領域が固まったら `kebab-case.md` を追加し、本一覧と `../README.md` を更新する。ファイル名は短く正確、ハイフン最大1つ。
