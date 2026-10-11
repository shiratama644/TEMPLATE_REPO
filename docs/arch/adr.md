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

---

> **注記 (2026-10-12)**: 以下の ADR-008 以降は、ADR-001・003・005・006・007 の対象だった成果物を
> 削除したことによる追記。過去の ADR 本文は書き換えず、上記の記録をそのまま残している。
> 当時の成果物は `git log` / 旧コミットから参照できる。

## ADR-008: テンプレートを分野非依存にする（ADR-001 / 004 / 005 / 006 / 007 を置換）

**日付**: 2026-10-12

**決定**: `scripts/`・`src/`・テスト・CI（`.github/`）・パッケージ管理（`package.json`・`pnpm-lock.yaml`）・ビルド/Lint/テストの設定ファイルを削除する。Node.js・pnpm・Bootstrap CLI・Termux 判定・ビルドキャッシュ・カバレッジ閾値は、テンプレートの対象外とする。

**理由**: Web / Node.js 向けの構成が前面に出ており、文書作成・調査・データ整理などでは不要なファイルが多く分かりにくかった。ユーザーの指示（2026-10-12）。

**影響**:
- ADR-001（pnpm 統一）、ADR-005（coverage 100%）、ADR-006（Bootstrap CLI）、ADR-007（Termux 判定）は、テンプレートとしては適用されない。
- `docs/arch/` の旧仕様書（bootstrap / cache / cicd / detector / engineering / quality / security / termux / tech-stack）は削除した。
- 検証手段は各プロジェクトで定義し、`AGENTS.md §6.1` に記録する（ADR-009 参照）。

## ADR-009: 検証手段はプロジェクトごとに定義する

**日付**: 2026-10-12

**決定**: テンプレートは特定の検証コマンドを前提にしない。検証手段（型チェック・テスト・ビルド・校正など）は `AGENTS.md §6.1` に記録し、Agent は記録されたものだけを実行する。記録がなければ推測で実行せず、ユーザーに確認する。

**理由**: 検証手段は分野ごとに大きく異なるため、テンプレートに固定すると他の用途で使えなくなる。ADR-005（完了は証拠で判定）の考え方は維持する。

## ADR-010: 分野固有のスキルは残し、分野を明示する

**日付**: 2026-10-12

**決定**: ソフトウェア・Web 向けのスキル（testing / e2e / ci-quality-gates / determinism / import-boundaries / memory-leak / zero-alloc）は残す。`.agent/skills/index.md` で分野を明示し、該当しない利用者は削除してよいとする。

**理由**: 削除すると知識が失われる。一方で、読み込みの対象は索引で絞れるため、残しても作業の妨げにならない。

## ADR-011: docs/ の構成を整理する

**日付**: 2026-10-12

**決定**: `docs/examples/`（Vite/Next の設定例）と `docs/planning/complete/` の参照、`docs/planning/robustness-plan.md`、`docs/planning/index.md`（`README.md` と重複）を削除する。`docs/arch/` は product / architecture / adr / milestones の 4 文書に絞る（README を含む）。`docs/audit/` と `docs/ops/` は索引のみを残す。

**理由**: 旧構成の文書の大半が削除した成果物を説明しており、残すと実態と食い違う。判断の履歴は ADR に残し、旧文書の本文は `git log` から参照できる。

## ADR-012: 上流の agent 資産を取り込み、分野を問わず使える範囲に限る

**日付**: 2026-10-12

**決定**: ECC・superpowers・mattpocock/skills・anthropics/skills から、単体で動き再配布可能な skill / agent / command / hook だけを取り込む。取り込み元の設定（ECC 固有の `.claude/` 設定、プラグイン登録、ランタイム依存の hook）と、ライセンスの不明なもの・独自ライセンスのもの（Anthropic の docx / pdf / pptx / xlsx、`doc-coauthoring`）は取り込まない。上流の hook は `jq` や Node に依存しない `sh` 版に書き直す。出典とライセンス全文は `.agent/THIRD_PARTY_NOTICES.md` と各 skill の `LICENSE.txt` に残す。

**理由**: 上流の多くは特定のプラグイン基盤や Web 開発を前提にしており、そのままでは分野を問わないテンプレートに合わない。また独自ライセンスのものを再配布すると、テンプレートを使う人に権利上の問題が生じる。ユーザーの指示（2026-10-12）で、`.agent/` を Claude Code の `.claude/` に、`AGENTS.md` を `CLAUDE.md` に対応させることになった。

**影響**:
- `.agent/skills/` は 48 件になった（自作 14 件 ＋ 上流由来 34 件）。出典は `skills/index.md` の「出典」列に記載。
- `diff-review-report` は superpowers の `requesting-code-review` に置き換えた。`explore` / `plan` は ECC の `code-explorer` / `planner` に置き換えた。
- 上流由来の skill が参照する `docs/superpowers/`・`.superpowers/`・`docs/adr/` は、`docs/planning/`・`tmp/superpowers/`（gitignore 済み）・`docs/adr/`（個別 ADR）に読み替えた。
- ECC の `strategic-compact` / `blueprint` / `resume-session` / `save-session` は、ECC ランタイム（`~/.claude/session-data/` 等）に依存するため取り込まない。

## ADR-013: CLAUDE.md と .claude/ を symlink で対応させる

**日付**: 2026-10-12

**決定**: リポジトリ直下に `CLAUDE.md -> AGENTS.md`、`.claude -> .agent` の symlink を置く。正本は `AGENTS.md` と `.agent/` の実体のみとし、symlink 側は編集しない。

**理由**: Claude Code は `CLAUDE.md` と `.claude/` を自動で読む。symlink を使えば、規約と設定を二重管理せずに Claude Code から同じ内容を読ませられる。ADR-002（`.agent/` の名前維持）とは両立する。

**影響**: Windows の git（`core.symlinks=false`）では symlink がテキストとして展開される。その環境では再度 symlink を張り直すか、実体を直接参照すること。
