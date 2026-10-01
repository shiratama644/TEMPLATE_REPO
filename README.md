# TEMPLATE_REPO

AI Agent によるソフトウェア開発を規律立てて進めるための**テンプレートリポジトリ**です。Node 24 LTS対応、Vite/Next.js/モノレポ/Termux汎用、高速キャッシュ付き。

GitHub の「Use this template」から新しいリポジトリを作成し、各プロジェクトでカスタマイズして使うことを想定しています。

> **公式準拠**: `.agent/` ディレクトリはClaude Code公式の `.claude/` 構成に準拠（ディレクトリ名は `.agent/` のまま）。公式仕様: https://code.claude.com/docs/en/claude-directory.md

## 含まれるもの

| パス | 役割 | 備考 |
| :--- | :--- | :--- |
| `AGENTS.md` | AI Agentが必ず遵守すべき開発規約（ワークフロー / テスト・品質保証 / Git運用 / コミュニケーション規約 / 記憶システム） | 汎用 |
| `.agent/settings.json` | チーム共有設定（permissions, hooks, env, model） | 公式準拠 |
| `.agent/rules/` | トピック別ルール（pathsで発火条件を絞れる） | 公式準拠 |
| `.agent/skills/<name>/SKILL.md` | コードベース知識。project-overview, tech-stack, sandbox-constraints等 + docs-maintenance, ci-quality-gates, testing, import-boundaries, determinism, e2e, memory-leak, zero-alloc（cod-web arena/01a0b161最新arena由来） | 公式準拠 |
| `.agent/agents/` | サブエージェント定義（explore, plan, doc-editor, code-reviewer, test-writer） | 公式準拠 |
| `.agent/hooks/` | トリガー別手順 + 実行スクリプト（pre_edit_guard.sh, post_edit_verify.sh等） | 公式hooks + 独自 |
| `.agent/workflows/` | 動的ワークフロー（implement-task.js） | 公式準拠 |
| `docs/` | ドキュメント一式。task-list.md（正本）/ arch/（仕様）/ planning/（計画）/ research/（調査）/ audit/（監査）/ complete/（完了レポート）/ ops/（運用）/ examples/（Vite/Next設定例） — cod-web arena/01a0b161-cod-web準拠で復旧（2026-09-27調査） | 独自 |
| `package.json` | pnpm 12.6.0統一、Node 24 LTS。typecheck, lint, test:unit/coverage(100%), build(汎用), check(13タスク: 8必須+2任意non-blocking+3 infra), check:determinism, check:env(Termux検出), cspell, knip, size-limit, publint, taze, changeset等 | 汎用 |
| `.github/workflows/ci.yml` | CI。pnpm/action-setup@v4 + setup-node@v4 cache:pnpm + checkout@v6 + static-checks(typecheck/lint/determinism/cspell/knip/publint/size-limit/coverage/e2e --list) + build(Next/Vite/Turboキャッシュ) + e2e + Termux検出ログ | DropMod + cod-web |
| `.github/workflows/release.yml` | Changesetsリリース。main push時にVersion Packages PR自動作成 | 新規 |
| `.github/workflows/label.yml` + `labeler.yml` | 自動ラベル付け | 新規 |
| `.github/workflows/stale.yml` | Stale管理 | 新規 |
| `.github/ISSUE_TEMPLATE/` | Issueテンプレ（bug_report, feature_request, question, config） | 新規 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PRテンプレ | 新規 |
| `.github/CODEOWNERS` + `SECURITY.md` + `FUNDING.yml` | コードオーナー、セキュリティポリシー | 新規 |
| `scripts/` | 汎用スクリプト群 |  |
|  | `execute.ts` | Node 24 LTS汎用、Vite/Next.js/モノレポ/Termux対応、install→build(機能差分スキップ+キャッシュ)→start(色分け並列) |
|  | `check.ts` | 品質ゲート13タスク（install先行→12並列: lint/determinism/cspell/knip/typecheck/unit/coverage/build/e2e:list/security:check + publint/size-limit non-blocking） |
|  | `dev.ts` / `build.ts` | 汎用ランチャー、Vite/Next.js/Turbo/モノレポ自動検出、Termux対応（Webpack強制）、キャッシュ高速化 |
|  | `lib/termux.ts` | Termux環境検出（TERMUX_VERSION/PREFIX/com.termuxファイル/androidプラットフォーム等9種判定） |
|  | `lib/next-termux.ts` | Next.js Termux対応、Webpack強制（--webpack、NEXT_WEBPACK=1、Next.js 16対応） |
|  | `lib/cache.ts` | ビルド高速化キャッシュ（.next/cache, node_modules/.vite, .turbo等の管理、ハッシュベーススキップ） |
|  | `lib/bootstrap/` | Template Bootstrap — Feature Manifest (types, manifest, presets, validator, backup, yaml-utils, engine, prompts, readme-generator) |
|  | `setup.ts` | Bootstrap CLI v2 — @clack/prompts対話、7プリセット、--help/--list-presets/--dry-run/--preset/--config/--save-config、バックアップ/ロールバック、冪等性検出、検証 |
|  | `check-env.ts` | 環境チェック（Termux検出、キャッシュ統計、Next/Vite設定表示） |
| `renovate.json` | Renovate、pnpm対応、9グループ化、pinDigests、Asia/Tokyoスケジュール | 新規 |
| `.changeset/` | Changesets、@changesets/cli 3.0.3 | 新規 |
| `Dockerfile` + `docker-compose.yml` | Node 24 LTS、multi-stage、BuildKitキャッシュマウント（pnpm + Next/Vite/Turbo）、Vite 5173/Next 3000対応 | 新規 |
| `.devcontainer/` | DevContainer、Node 24 LTS + pnpm、forwardPorts 3000/5173 | 新規 |
| `CONTRIBUTING.md` + `SECURITY.md` | 貢献ガイド、セキュリティポリシー | 新規 |
| `src/index.ts` | 汎用エントリ、size-limit計測対象 | 新規 |
| `docs/examples/` | Vite/Next.jsキャッシュ設定例（vite.config.example.ts, next.config.example.mjs） | 新規 |
| `.husky/` + `commitlint.config.js` + `cspell.json` + `knip.json` + `.editorconfig` + `.vscode/` | 品質ツール | 新規 |

## 使い方（新規リポジトリへの適用手順） — Template Bootstrap CLI

### 🚀 推奨: `pnpm setup` で対話的にセットアップ (v2.0)

```bash
# テンプレートから作成後
pnpm install
pnpm setup                              # 対話式CLI — プリセット選択から開始 (@clack/prompts)
pnpm setup --dry-run                    # 変更予定をプレビュー (+作成 ~更新 -削除 =保持) — 色付きサマリー
pnpm setup --list-presets               # 7プリセット一覧表示
pnpm setup --preset minimal             # minimalプリセット (Plain TS + Vitestのみ)
pnpm setup --preset vite-app            # Viteプリセット (Vite SPA + Docker + E2E)
pnpm setup --preset next-app --project-name my-next-app --github-owner myuser
pnpm setup --preset library --project-name my-lib --save-config my-config.json
pnpm setup --config my-config.json      # 設定ファイルから読み込み
pnpm setup --yes                        # デフォルト構成で実行（全機能ON、Plain TS）
pnpm setup --help                       # 全オプション表示
```

**プリセット (7種):**
- `minimal` 🪶 — Plain TS + Vitestのみ — 最小
- `recommended` ⭐ — Plain TS + testing + quality + git workflow — バランス
- `full` 🚀 — 全機能ON — 最大DX
- `library` 📦 — 公開ライブラリ用 — publint, size-limit, changesets
- `vite-app` ⚡ — Vite SPA + Docker + E2E
- `next-app` ▲ — Next.js SSR/SSG + Docker + E2E
- `monorepo` 🏗️ — Turborepo monorepo (apps/web + packages/ui)

**CLIオプション:**
```
--dry-run, --yes/-y, --minimal, --preset <id>, --list-presets,
--project-name <name>, --type <type>, --features <list>,
--termux-mode <mode>, --github-owner <owner>, --description <desc>,
--config <path>, --save-config <path>, --force,
--no-install, --no-verify, --no-backup, --verbose/-v, --help/-h, --version
```

**安全性 & 改善点 (v2):**
- `git status --porcelain` で未コミット検知 → stash/continue/abort選択
- `.bootstrap-backup/` に自動バックアップ (5世代保持) + 失敗時ロールバック確認
- `.bootstrap-state.json` で冪等性検出 — 同じ設定ならスキップ、違うなら差分表示
- GitHub ownerを `git remote` から自動推論
- Termux環境自動検出で最適化モード推奨
- YAML安全操作 — CIワークフローのjob/step削除が壊れても元に戻す
- `src/` 配下は無条件で削除・上書きしない
- バッジ付きREADME再生成 (CIバッジ、プリセット情報、CLI Options、Quality Gates)
- 検証: typecheck/lint + 必要なら pnpm install

**アーキテクチャ:**
- 宣言的な **Feature Manifestパターン**: 各機能が `files`, `dependencies`, `scripts`, `ciJobs`, `ciSteps`, `icon`, `impact` を宣言
- `scripts/lib/bootstrap/manifest.ts` が17機能 + 5プロジェクトタイプを定義
- `presets.ts` が7プリセットを定義、 `validator.ts` が検証、 `backup.ts` がバックアップ、 `yaml-utils.ts` がYAML安全操作
- `engine.ts` が差分計算・適用・サマリー・diff、 `prompts.ts` が対話、 `readme-generator.ts` がREADME生成
- `scripts/setup.ts` がCLI v2エントリーポイント

### 手動セットアップ（フォールバック）

> `pnpm setup` を使わない場合は、下記手順で手動セットアップしてください。

### Step 0: テンプレートから作成

1. GitHub の「Use this template」で新しいリポジトリを作成する
2. `git clone` して `pnpm install`

### Step 1: 必須の置換 (全プロジェクト共通)

```bash
# package.json
- name: template-repo → my-app
- description: 適切な説明に

# .github/CODEOWNERS
- @shiratama644 → あなたのGitHubユーザー名

# AGENTS.md §6 にプロジェクト固有のルールを追記
# - 技術スタック・バージョン方針 (§6.1)
# - 実行環境の制約 (§6.2)
# - フレームワーク/Lint/UIルール (§6.4〜6.6)
# - ドキュメント運用 (§6.7)

# .agent/skills/project-overview/SKILL.md をプロジェクト用に書き換え
# README.md をプロジェクト用に書き換え (このセクションは削除してOK)
# docs/ は cod-web arena/01a0b161-cod-web準拠で復旧 — arch/ (仕様) + planning/ (計画) + research/ (調査) + audit/ (監査) + ops/ (運用) + examples/ (設定例) + task-list.md (正本)
# LICENSE の年・作者を更新
```

### Step 2: フレームワーク選択 — 何を残して何を消すか

#### A. Plain TypeScript (ライブラリ) — デフォルト

```bash
# そのまま使える
# src/index.ts がエントリ、size-limit計測対象
# pnpm dev → tsx watch src/index.ts
# pnpm build → tsc --noEmit チェック

# 不要なもの (削除してもOK):
# - docs/examples/ (Vite/Next例、参考資料なので残してもOK)
# - Dockerfile の Vite/Next関連コメントは無視でOK
```

#### B. Vite (SPA)

```bash
pnpm add -D vite @vitejs/plugin-react
# または pnpm add -D vite
cp docs/examples/vite.config.example.ts vite.config.ts
# vite.config.ts をプロジェクト用に調整 (plugins, alias等)

# package.json scriptsはそのまま:
# pnpm dev → 自動で vite を検出して起動 (キャッシュ有効)
# pnpm build → vite build

# 残す: docs/examples/vite.config.example.ts (参考)
# 削除してもOK: Next.js関連の記述
```

#### C. Next.js (SSR/SSG)

```bash
pnpm add next react react-dom
pnpm add -D @types/react @types/react-dom @types/node
cp docs/examples/next.config.example.mjs next.config.mjs
# next.config.mjs を調整

# pnpm dev → next dev (Termuxなら自動でWebpack)
# pnpm build → next build (Termuxなら --no-turbopack)

# 残す: docs/examples/next.config.example.mjs
# Termux対応は自動、通常環境には影響なし
```

#### D. Monorepo (pnpm-workspace)

```bash
# pnpm-workspace.yaml は既に packages/* + apps/* をサポート
mkdir -p packages/ui apps/web apps/docs

# 各パッケージに package.json 作成
# Rootの pnpm dev → pnpm -r --parallel dev で全パッケージ並列起動
# または turbo を使う場合:

pnpm add -D turbo
# turbo.json 作成
# pnpm dev → turbo dev を自動検出

# 検出優先順位: turbo.json > monorepo(packages/apps) > vite > next > tsc
# 空の packages/ は無視されるので誤爆しない
# apps/web (next) + apps/docs (vite) のような混在は、
# 現状は rootの vite.config があれば vite優先 (稀なケース)
# 将来的には ProjectDetector (scripts/lib/detector.ts) で
# detectRootProject()/detectWorkspace()/detectApps() に分離予定
# 現状は monorepo なら各アプリ内で個別に dev/build する運用推奨
```

### Step 3: オプション機能の選択 — 何を残して何を消すか

| 機能 | ファイル | 残す場合 | 消す場合 | 備考 |
|---|---|---|---|---|
| **Docker** | Dockerfile, docker-compose.yml, .dockerignore, .devcontainer/ | `pnpm docker:build` で使える | 削除OK | Node 24 LTS, BuildKitキャッシュ (pnpm/next/vite/turbo) 付き |
| **Changesets** | .changeset/, .github/workflows/release.yml | バージョニング・リリースPR自動作成 | 削除OK、package.jsonのchangeset scriptsも削除 | privatePackages.version:true なのでライブラリ以外でも安全 |
| **Renovate** | renovate.json | 依存自動更新PR | 削除OK | pnpm対応、9グループ化、Asia/Tokyo月曜3am |
| **GitHub Templates** | .github/ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md, CODEOWNERS, SECURITY.md, FUNDING.yml, labeler.yml, workflows/label.yml, stale.yml | Issue/PRテンプレ、自動ラベル、Stale管理 | 必要なものだけ残すのもOK | CODEOWNERSは必ず自分の名前に変更 |
| **Size-limit** | src/index.ts, package.json size-limit | バンドルサイズ計測 (10kB) | 削除OK、package.jsonからも削除 | ライブラリ以外では不要な場合も |
| **Publint** | package.json publint | npm公開品質チェック | 削除OK | ライブラリ向け |
| **Taze** | package.json taze scripts | 依存更新確認 | 削除OK | `pnpm taze` で確認のみ |
| **Termux** | scripts/lib/termux.ts, next-termux.ts, cache.tsのTermux分岐 | Android Termuxで開発 | 残しても通常環境に影響なし (通常はfalse) | 検出は9種、通常はNO、TermuxのみYES |
| **Husky** | .husky/, commitlint.config.js | pre-commitでlint-staged、commit-msgでcommitlint | 削除OKだが推奨は残す | Conventional Commits強制 |
| **CSpell/Knip** | cspell.json, knip.json | スペルチェック、未使用コード検出 | 削除OK | knipはKNIP_DISABLE_RAW_TRANSFER=1でSandbox対応済み |

### Step 4: 初期クリーンアップ（活発リポジトリ準拠で復旧）

```bash
# 本テンプレートでは cod-web arena/01a0b161-cod-web準拠で docs/ を復旧
# arch/ (仕様) + planning/ (計画) + research/ (調査) + audit/ (監査) + ops/ (運用) + examples/ (設定例) + task-list.md (正本)
# 以前は「記録は削除」としていたが、ユーザー指摘により必要と判断し復旧（2026-09-27調査）

# _tests_/ はテンプレート自体の堅牢性テスト（カバレッジ100%）、新規では削除OK (ただし残しても無害)
# 残すと pnpm check で100%カバレッジ検証が可能
# rm -rf _tests_/

# 一時生成物はgitignore済み、コミットされないが念のため
rm -rf logs/ .cache/ coverage/ dist/ .next/ .turbo/ .vite/

# 必要に応じて
pnpm install
pnpm check # 13タスク全PASS (8必須+2任意non-blocking+3 infra)することを確認
pnpm check:env # 環境チェック（Termux検出、キャッシュ統計）
```

### Step 5: 開発開始

```bash
pnpm dev # 自動でフレームワーク検出して起動
pnpm build # 自動でビルド
pnpm check # 品質ゲート13タスク (8必須+2任意non-blocking+3 infra)
pnpm changeset # 変更があればchangeset作成 (Changesets使用時)
```

---

### 旧簡易手順 (参考)

1. GitHub の「Use this template」で新しいリポジトリを作成する
2. セットアップ:
   - `AGENTS.md` §6 にプロジェクト固有のルールを追記
   - `.agent/skills/project-overview/SKILL.md` をプロジェクト用に書き換え
   - `README.md` をプロジェクト用に書き換え
   - `package.json` の `name`, `description` を更新（`packageManager` は `pnpm@12.6.0` のまま）
   - `.nvmrc` はNode 24 LTS（既定は `24`）
   - `docs/task-list.md` のサンプルを削除し、初期タスクを追加
   - `.github/workflows/ci.yml` をプロジェクト用に調整
3. 開発を進めながら、知識を `.agent/skills/` に蓄積 — 現在の機能（detector, cache, termux, bootstrap, 100% coverage）を維持
4. タスク管理は `docs/task-list.md`（正本）+ `docs/planning/` + `docs/arch/` + `docs/research/` で行う — cod-web arena/01a0b161-cod-web準拠で復旧（2026-09-27調査、arch/audit/planning/researchは必要）
5. 必要に応じて `.agent/rules/` にプロジェクト固有のルールを追加 — ファイル名は短く正確、ハイフン最大1つ

## 技術スタック（Node 24 LTS汎用、2026-09-27最新）

- Node.js **v24 LTS** + pnpm 12.6.0（`.nvmrc` + `.node-version` 24、corepack経由）
- TypeScript **6.0.3**（v6系、jsx preserve、paths @/*/@packages/*/@apps/*、allowImportingTsExtensions、monorepo対応）
- Biome 2.5.14、Vitest 5.0.2 + coverage-v8 5.0.2 + Playwright 1.63.0（coverage閾値100%）
- husky 9.1.7 + lint-staged 17.6.0、commitlint 21.2.3 + commitizen 4.3.2
- cspell 10.3.4、knip 6.38.0、size-limit 14.0.0 + publint 0.3.24 + taze 21.1.0
- Renovate + Changesets、Docker + DevContainer（Node 24 LTS、Vite 5173/Next 3000、BuildKitキャッシュ）
- GitHub Actions + pnpm/action-setup@v4 + checkout@v6（CIにpublint/size-limit/Termux検出ログ追加）

詳細は [`.agent/skills/tech-stack/SKILL.md`](.agent/skills/tech-stack/SKILL.md) を参照。

### 汎用性：Vite / Next.js / モノレポ / Termux 対応

| プロジェクトタイプ | 使い方 |
|---|---|
| **単一パッケージ / ライブラリ** | `src/index.ts` をエントリに、`pnpm dev` は `tsx watch` または `node --watch` で自動実行 |
| **Vite** | `pnpm add -D vite` → `vite.config.ts` 作成（`docs/examples/vite.config.example.ts` 参照） → `pnpm dev` が自動で `vite` を検出。キャッシュは `node_modules/.vite` + `.cache/vite` で高速化 |
| **Next.js** | `pnpm add next react react-dom` → `next.config.*` 作成（`docs/examples/next.config.example.mjs` 参照） → `pnpm dev` が自動で `next dev` を検出。キャッシュは `.next/cache` + `.cache/webpack` |
| **モノレポ** | `pnpm-workspace.yaml` は `packages/*` + `apps/*` を既定サポート。`pnpm -r --parallel dev` や `turbo` を自動検出。`EXEC_CONFIG.parallel` で並列起動カスタマイズ |
| **Turboモノレポ** | `pnpm add -D turbo` + `turbo.json` → `pnpm dev` は `turbo dev` を自動検出、`.turbo/cache` でキャッシュ |
| **Termux (Android)** | 自動検出（`TERMUX_VERSION`/`PREFIX`/`/data/data/com.termux`/`android`プラットフォーム等9種）。Next.jsはTurbopackを無効化しWebpackにフォールバック（`--no-turbopack`, `NEXT_WEBPACK=1`）、Viteはメモリ制限（`--max-old-space-size=2048`）、キャッシュは `.cache/termux/` に分離 |

#### 切り替え例

```bash
# Vite
pnpm add -D vite @vitejs/plugin-react
cp docs/examples/vite.config.example.ts vite.config.ts
pnpm dev # → vite が起動（キャッシュ有効）

# Next.js
pnpm add next react react-dom
pnpm add -D @types/react @types/react-dom
cp docs/examples/next.config.example.mjs next.config.mjs
pnpm dev # → next dev（Termuxなら自動でWebpack）

# モノレポ
mkdir -p packages/ui apps/web
pnpm dev # → pnpm -r --parallel dev

# Turbo
pnpm add -D turbo
pnpm dev # → turbo dev（キャッシュ有効）

# Termuxで確認
pnpm check:env # Termux検出、キャッシュ統計、Next/Vite設定を表示
TERMUX_VERSION=1.0 PREFIX=/data/data/com.termux/files/usr pnpm check:env # シミュレーション
```

`scripts/dev.ts` / `build.ts` がフレームワークを自動検出、`scripts/lib/termux.ts` がTermuxを検出してWebpackに切り替え、`scripts/lib/cache.ts` がハッシュベースで不要ビルドをスキップします。

### ビルド高速化キャッシュ

競合しないように設計されたキャッシュ機構：

- **ローカル**: `.cache/` ディレクトリに `build-*.json` でハッシュ保存。`getProjectSourceHash()` が `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.*`, `next.config.*`, `turbo.json` + `src/packages/apps` の更新時刻からハッシュ計算。同一ハッシュならビルドスキップ
- **CI**: `actions/cache@v4` で `.next/cache`, `node_modules/.vite`, `.vite`, `.turbo`, `.cache/` 等をキャッシュ。キーは `hashFiles('pnpm-lock.yaml', 'package.json', 'tsconfig.json', 'vite.config.*', 'next.config.*', 'turbo.json')`
- **Docker**: BuildKit ` --mount=type=cache` で `pnpm store`, `.next/cache`, `node_modules/.vite`, `.turbo/cache`, `.cache` をキャッシュ
- **Vite**: `node_modules/.vite` + `.cache/vite`、依存関係の事前バンドルをキャッシュ
- **Next.js**: `.next/cache` + `.cache/webpack`、Webpackのファイルシステムキャッシュ
- **Turbo**: `.turbo/cache`、リモートキャッシュ対応（`TURBO_TOKEN`等）

```bash
pnpm build # 初回はビルド、2回目はキャッシュヒットでスキップ（--forceで強制）
pnpm check:env # キャッシュ統計を表示
```

### Termux対応詳細

`scripts/lib/termux.ts` の `isTermuxEnvironment()` は9種の方法でTermuxを検出：

1. `TERMUX_VERSION` 環境変数
2. `PREFIX` に `com.termux` を含む
3. `TERMUX__USER_ID`
4. `/data/data/com.termux` ディレクトリ存在
5. `termux-info` バイナリ存在
6. `platform === 'android'`
7. `ANDROID_ROOT` + `PREFIX` termux
8. `ANDROID_DATA` に termux
9. `TERMUX_API_VERSION`

検出された場合：

- **Next.js**: `getNextBuildCommandForTermux()` が `next build --no-turbopack` + `NEXT_WEBPACK=1`, `NEXT_TURBOPACK=0`, `TURBOPACK=0`, `NODE_OPTIONS=--max-old-space-size=2048` に切り替え
- **Vite**: `getViteBuildConfigForTermux()` が `VITE_CACHE_DIR=node_modules/.vite-termux` + メモリ制限
- **Cache**: `.cache/termux/` に分離、通常環境のキャッシュと競合しない

```bash
# Termux実機
pkg install nodejs
npm i -g pnpm
pnpm install
pnpm check:env # Termux YES と表示されるか確認
pnpm dev # TermuxならWebpackモードで起動
pnpm build # TermuxならWebpackビルド
```

## ライセンス

MIT License。詳細は [`LICENSE`](LICENSE) を参照してください。
