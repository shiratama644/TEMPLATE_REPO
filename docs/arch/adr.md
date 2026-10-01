# adr.md — 意思決定ログ

## ADR-001: pnpm 12.6.0統一

**決定**: `packageManager: pnpm@12.6.0` で固定、corepack経由。

**理由**: 最新安定、DropMod + cod-webで実績、CIは `pnpm/action-setup@v4` でバージョン非明示でも `packageManager` から解決。

**参考**: cod-web arena/01a0b161-cod-web は bun 1.4.0だが、TEMPLATE_REPOは汎用性重視でpnpm。

## ADR-002: .agent/ ディレクトリは公式.claude/準拠、名前は.agent/維持

**決定**: Claude Code公式 `.claude/` 構成に準拠しつつディレクトリ名は `.agent/` のまま。`settings.json`, `rules/`, `skills/<name>/SKILL.md`, `agents/`, `hooks/`, `workflows/` 等。

**理由**: 公式仕様 https://code.claude.com/docs/en/claude-directory.md に準拠、PalmIDE由来の拡張（logs/）も保持。

## ADR-003: docs/構成は task-list.md正本 + arch/ + planning/ + research/ + ops/ + examples/

**決定**: cod-web arena/01a0b161-cod-web ブランチの構成を参考に `arch/` (仕様), `planning/` (計画), `research/` (調査), `ops/` (運用), `task-list.md` (進捗正本) を採用。TEMPLATE_REPO固有で `examples/` (Vite/Next設定例) と `audit/` (差分監査) と `complete/` (完了レポート) も保持。

**理由**: 活発なリポジトリ（cod-web 2026-09-26更新、DropMod、ytdl）では `task-list.md` + `planning/` + `arch/` or `research/` が標準。記録は不要という意見もあるが、実際には必要（ユーザー指摘 2026-09-27）。

**調査**: 2026-09-27に cod-web arena/01a0b161-cod-web を調査:
- docs/: README, task-list.md, arch/ (15 files), planning/ (with complete/), ops/, research/ (DR-1..5), Perplexity-AI.md
- DropMod: README, audit, ops, planning, task-list.md
- ytdl: HANDOVER, README, planning, research, task-list.md

## ADR-004: ファイル名は短く正確、ハイフン最大1つ

**決定**: テストファイル含む全ファイルでハイフン最大1つ。例: `yaml-top.test.ts` OK, `yaml-utils-top-level.test.ts` NG → `yaml-top.test.ts` or `yaml-jobs.test.ts` に分割。

**理由**: 長過ぎると意味がない、短く正確に（ユーザー指示）。

## ADR-005: coverage 100% — src + scripts/lib 9ファイル

**決定**: `vitest.config.ts` で `src/` + `scripts/lib/` 9ファイル (backup, manifest, presets, validator, yaml-utils, termux, cache, detector, next-termux) を 100/100/100/100 threshold。

**理由**: テンプレートの堅牢性担保、cod-web arenaでは85%だったがTEMPLATE_REPOでは100%に引き上げ。

## ADR-006: Bootstrap CLI — Feature Manifestパターン

**決定**: 宣言的に各機能が `files`, `dependencies`, `scripts`, `ciJobs`, `ciSteps`, `icon`, `impact` を宣言。`presets.ts` で7プリセット (minimal, recommended, full, library, vite-app, next-app, monorepo)。

**理由**: `pnpm setup` で対話的セットアップ、バックアップ/ロールバック、冪等性検出、YAML安全操作。

## ADR-007: Termux 9種判定

**決定**: `scripts/lib/termux.ts` の `isTermuxEnvironment()` は9種で判定: TERMUX_VERSION, PREFIX com.termux, TERMUX__USER_ID, /data/data/com.termux存在, termux-infoバイナリ, platform android, ANDROID_ROOT+PREFIX, ANDROID_DATA termux, TERMUX_API_VERSION。

**理由**: Android TermuxでNext.jsはTurbopack不可、Webpack強制が必要。Viteはメモリ制限。
