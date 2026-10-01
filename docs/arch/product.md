# product.md — プロダクト定義

## 目的

AI Agent によるソフトウェア開発を規律立てて進めるための**テンプレートリポジトリ**。速く大量に作ることではなく、**常に復旧可能で、壊れた状態を長時間維持しないこと**を最優先。

## 用語

| 用語 | 定義 |
|---|---|
| Template Bootstrap CLI | `pnpm setup` で対話的セットアップ。Feature Manifestパターン、7プリセット、バックアップ/ロールバック、冪等性検出 |
| ProjectDetector | `scripts/lib/detector.ts` — Vite/Next/Turbo/Monorepo自動検出、空ディレクトリ誤爆防止 |
| Cache | `scripts/lib/cache.ts` — ハッシュベースビルドスキップ、Termux分離 |
| Termux | Android Termux環境検出9種、Next.jsはWebpack強制、Viteはメモリ制限 |
| Quality Gates | `pnpm check` 13タスク: 8必須(blocking: lint/determinism/cspell/knip/typecheck/unit/coverage/build) + 2任意(non-blocking: publint/size-limit) + 3 infra (install/e2e:list/security:check) |

## 現行資産

- Node 24 LTS + pnpm 12.6.0 + TypeScript 6.0.3
- Biome 2.5.14, Vitest 5.0.2 + coverage-v8, Playwright 1.63.0 (coverage 100%)
- husky 9.1.7 + lint-staged, commitlint 21.2.3, cspell 10.3.4, knip 6.38.0
- size-limit 14.0.0, publint 0.3.24, taze 21.1.0
- Renovate + Changesets, Docker + DevContainer
- GitHub Templates full, Bootstrap CLI 7 presets

## ライセンス

MIT。初期はテンプレートとして公開。

## 参考

- `shiratama644/cod-web` arena/01a0b161-cod-web ブランチ — 活発なリポジトリの `arch/` 構成を参考（2026-09-27調査）
- `shiratama644/DropMod` — CI構成、pnpm/action-setup
- `shiratama644/PalmIDE` — rules/トピック分割、agents/定義
