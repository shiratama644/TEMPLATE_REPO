# milestones.md — フェーズと完了条件

## 概要

TEMPLATE_REPO はテンプレートリポジトリ。GitHub「Use this template」から新規リポジトリを作成し、`pnpm setup` でカスタマイズする。

現行コードと本ディレクトリが食い違う場合、**本ディレクトリが目標**。

## フェーズ

### Phase 0: 基盤（完了）

- [x] Node 24 LTS + pnpm 12.6.0 + TS 6系 + Biome + Vitest + Playwright
- [x] `src/` ライブラリ（lru, detector, result, string, validation）
- [x] `scripts/lib/`（termux, cache, detector, next-termux）
- [x] coverage 100% (10 files)
- [x] `pnpm check` 12タスク

### Phase 1: Bootstrap CLI（完了）

- [x] Feature Manifestパターン（17機能 + 5プロジェクトタイプ + 7プリセット）
- [x] `pnpm setup` 対話的セットアップ（@clack/prompts）
- [x] バックアップ/ロールバック（5世代）、冪等性検出、YAML安全操作
- [x] `docs-generator.ts` — `docs/` を新プロジェクト用テンプレートに変換
- [x] `src/` 保護（無条件削除・上書き禁止）

### Phase 2: 品質・DX（完了）

- [x] husky pre-commit（lint-staged）
- [x] commitlint + commitizen + changesets + renovate
- [x] GitHub templates（issue/bug/feature/question + PR template + CODEOWNERS）
- [x] size-limit + publint + cspell + knip
- [x] `.agent/` — skills 14個（project-overview, tech-stack, sandbox-constraints, verify-doc-integrity, docs-maintenance, ci-quality-gates, testing, import-boundaries, determinism, e2e, memory-leak, zero-alloc, diff-review-report, deep-dive-setup）

### Phase 3: ドキュメント（完了）

- [x] `docs/` 構成 — arch/ + planning/ + research/ + audit/ + ops/ + task-list.md + examples/（cod-web arena/01a0b161-cod-web準拠）
- [x] `arch/` 10ファイル（product, architecture, tech-stack, bootstrap, detector, cache, termux, engineering, adr, milestones）
- [x] `verify-docs.ts` — 機密ファイル・内部リンク・目次・packageManager検証
- [x] `docs-maintenance` スキル — 内部リンク整合性・外部URL・ミラー排除

### Phase 4: 運用（進行中）

- [ ] `deep-dive-setup` スキル — 要求深掘り（web_search depth1→2→3, fetch_page, ask_user）→ 理解確認 → pnpm setup → 整理
- [ ] ドキュメント/プロジェクト構造の最終バグハント
- [ ] `pnpm setup` 後の `docs/` が cod-web arenaと構造一致（内容は汎用）

## 完了条件（DoD）

各フェーズの完了条件:

1. `pnpm check` 12 PASS
2. `pnpm test:coverage` 100% (statements/branches/functions/lines)
3. `docs/README.md` 索引更新済み
4. 内部リンク検証 OK（`pnpm run verify-docs`）
5. `src/` 保護確認（無条件削除なし）
6. ファイル名は短く正確、ハイフン最大1つ

## 次のタスク

| 優先 | ID | 内容 | 事前に読むもの |
|---:|---|---|---|
| 1 | — | 最終バグハント（verify-docs, knip, outdated, as any, missing files） | `docs/task-list.md`, `docs/arch/engineering.md` |
| 2 | — | `pnpm setup` 全プリセットで `docs/` 16 files 生成確認 | `scripts/lib/bootstrap/docs-generator.ts` |
