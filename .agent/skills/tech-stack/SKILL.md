---
name: tech-stack
description: テンプレートの技術スタック（Node.js, pnpm, TypeScript 6, Biome, Vitest 5, Playwright, husky, commitlint, cspell, knip, GitHub Actions）の使いどころ・設定・ハマりどころ。実装時に参照。Use when setting up tooling, writing package.json, or configuring CI.
---

# Tech Stack Skill — テンプレートの技術構成

> このスキルはテンプレートリポジトリの技術選定と、その使いこなし方をまとめたもの。
> 新規リポジトリ作成時はこの内容をベースにプロジェクト固有のスタックへカスタマイズする。
> **2026-09-27更新**: TypeScript 6.0.3、Vitest 5.0.2、Biome 2.5.14、Playwright 1.63.0、husky 9.1.7、lint-staged 17.6.0、commitlint 21.2.3、cspell 10.3.4、knip 6.38.0 に最新化

## 1. コアツールチェーン

### Node.js + pnpm

- **Node.js**: v24 LTS（`.nvmrc` に `24` と記載）
- **pnpm**: 最新 12.6.0（2026-09-27時点、npm view pnpm versionで確認）
  - `package.json` の `packageManager` フィールドに `pnpm@12.6.0` を明記
  - `corepack enable pnpm` で有効化、バージョンは `packageManager` から自動解決
  - `engines` フィールドも整備: `node >=24`, `pnpm >=9.0.0` 等

```json
{
  "packageManager": "pnpm@12.6.0",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- **インストール**: `pnpm install --frozen-lockfile`（CIでも同じ）
- **ワークスペース**: `pnpm-workspace.yaml` を使う場合は `allowBuilds` で `sharp: false` 等の制御が可能

### TypeScript 6系

- **v6系を採用**: `^6.0.3`（2026-09-27時点の最新安定版、npm view typescript@6 versionで確認）
  - v7系は `7.0.2` が最新だが、まだ移行期のためv6系を採用（ユーザー指示）
  - v6での破壊的変更: `baseUrl` が非推奨（deprecated）、`ignoreDeprecations: "6.0"` で一時的に抑制可能
  - 将来的にv7へ移行する際は `baseUrl` を削除し、`paths` のみで解決する形へ移行（https://aka.ms/ts6）
- **strict mode** 推奨
- `tsconfig.json` は `module: ESNext`, `target: ES2022`, `moduleResolution: bundler` 等のモダン設定

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "ignoreDeprecations": "6.0"
  }
}
```

### Biome (Lint/Format)

- ESLint/Prettierは使わない、Biome 2.5.14に統一（最新）
- `biome.json` の `overrides` でテストファイルのみ `noNonNullAssertion: off` 等の緩和が可能
- スクリプト:
  ```json
  "lint": "biome lint .",
  "lint:fix": "biome lint . --write",
  "format": "biome format --write ."
  ```

### Vitest 5 + Playwright 1.63

- **Vitest**: `5.0.2`（最新、npm view vitest versionで確認）
  - `vitest run` が単体テストの正。`vitest` (watch) は開発時のみ
  - **Coverage**: `@vitest/coverage-v8@5.0.2` + `provider: 'v8'`、threshold 100%（cod-web最新arena由来）
  - v4→v5の破壊的変更はほぼなし、configはそのまま使える
- **Playwright**: `1.63.0`（最新）
  - E2Eは `playwright test`、Chromium単独が軽量。CI上でのみ実行する場合あり
  - `playwright.config.ts` は `webServer` 配列 + `baseURL` 分岐が推奨（e2eスキル参照）

```json
"test": "vitest",
"test:unit": "vitest run --passWithNoTests",
"test:coverage": "vitest run --coverage --passWithNoTests",
"test:e2e": "playwright test --pass-with-no-tests"
```

### Husky + lint-staged (pre-commit)

- **husky**: `9.1.7`（最新）、Git hooksを管理
  - `package.json` の `prepare` に `husky` を設定、`pnpm install` 時に自動でhooksがインストールされる
  - `.husky/pre-commit`: `pnpm exec lint-staged` でstagedファイルのみ検証
  - `.husky/commit-msg`: `pnpm exec commitlint --edit $1` でConventional Commitsを強制
  - 実行権限: `chmod +x .husky/*`
- **lint-staged**: `17.6.0`（最新）、stagedファイルのみに対してコマンド実行
  - `package.json` の `lint-staged` フィールドで設定:
  ```json
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["biome check --write --no-errors-on-unmatched", "biome lint ."],
    "*.{json,jsonc}": ["biome check --write --no-errors-on-unmatched"],
    "*.md": ["cspell lint --no-must-find-files --no-progress"]
  }
  ```
  - 高速化: 全ファイルではなくstagedファイルのみを対象にするため、commitが速い

### commitlint + commitizen

- **commitlint**: `@commitlint/cli@21.2.3` + `@commitlint/config-conventional@21.2.3`（最新）
  - `commitlint.config.js` でConventional Commitsを強制（feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert）
  - 日本語subjectも許可するため `subject-case: [0, 'never']` で小文字強制を無効化
  - `commit-msg` hookで自動検証、不正なメッセージはcommit失敗
- **commitizen**: `4.3.2` + `cz-conventional-changelog@3.3.0`（最新）
  - `pnpm commit` で対話的にConventional Commits形式のメッセージを作成
  - `package.json` の `config.commitizen.path` で `cz-conventional-changelog` を指定

### cspell (spell check)

- **cspell**: `10.3.4`（最新）、スペルチェック
  - `cspell.json` で辞書と無視パスを設定
  - `words` にプロジェクト固有の単語（biome, pnpm, vitest, cod-web, arena等）を追加
  - `ignorePaths` に `node_modules`, `dist`, `logs`, `.agent/logs`, `docs/audit` 等を設定
  - スクリプト: `pnpm cspell`、CIでも実行
  - pre-commitでも `*.md` に対して実行（lint-staged経由）

### knip (unused code detection)

- **knip**: `6.38.0`（最新）、未使用ファイル・export・依存・バイナリを検出
  - `knip.json` でentry/projectを設定（`scripts/**/*.{ts,js}` 等）
  - `ignoreBinaries: ["pkill"]` で `scripts/check.ts` の `pkill` を無視
  - **注意**: oxc-parser 0.150.0は2GiBのArrayBufferを確保しようとし、Sandbox等で失敗する。`KNIP_DISABLE_RAW_TRANSFER=1` 環境変数でraw transferを無効化して実行（package.jsonの `knip` スクリプトで設定済み）
  - スクリプト: `pnpm knip`、CIでも実行

### EditorConfig + VSCode

- **.editorconfig**: インデント・改行コード・文字コードを統一（root = true, charset utf-8, eol lf, indent 2, trim trailing whitespace）
- **.vscode/settings.json**: Biomeをデフォルトformatterに、formatOnSave有効、BiomeのfixAllとorganizeImportsをonSaveで実行、cspell有効、search除外等
- **.vscode/extensions.json**: 推奨拡張（biomejs.biome, streetsidesoftware.code-spell-checker, ms-playwright.playwright, vitest.explorer, editorconfig.editorconfig, errorlens, github.vscode-github-actions）

## 2. GitHub Actions (pnpm統一)

### ベストプラクティス（DropMod + cod-web最新arena統合）

```yaml
- uses: pnpm/action-setup@v4
  with:
    run_install: false
    # versionはpackage.jsonのpackageManagerから解決。明示しないこと
    # 明示すると「Multiple versions of pnpm specified」で失敗する

- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile
```

- **paths-ignore**: `README.md`, `AGENTS.md`, `.agent/**`, `docs/**` のみのコミットではCIをスキップ
- **concurrency**: 同一ブランチでの重複実行をキャンセル
- **cache**: `.next/cache` や `.cache/` 等のビルドキャッシュを `actions/cache@v4` で保存
- **artifact**: `.next` 成果物をtar化してjob間で共有
- **workflow_dispatch.inputs.job**: all/quality/e2e で手動実行時にjob選択可能（cod-web最新arena由来）
- **checkout**: v6が最新（v4でも動くが最新を使う）

### CI構成例（static-checks + build + e2e）

- **static-checks (Quality Gates)**: typecheck + lint + determinism + cspell + knip + coverage (threshold 100%) + e2e --list（最速でfail検出）
- **build**: Next.js build等、production buildが通ることを保証
- **e2e**: push(main, arena/**) と workflow_dispatch(all/e2e)時のみ、build成果物を復元して実行

## 3. スクリプト設計（汎用化）

### 実行スクリプトの例（cod-web由来）

`scripts/execute.ts` のように、複数プロセスを並列起動し、色分けログを出す汎用ランナーは再利用性が高い。

- プロセスごとにANSI色でタグ付け（INSTALL/BUILD/SERVER/CLIENT）
- stdout/stderrを行単位でパイプ
- Ctrl+Cで子プロセスを後始末

### 品質ゲートスクリプトの例（cod-web最新arena由来）

`scripts/check.ts` は `check-all.ts` をpnpm用に汎用化し改名:

- install先行 → 残り並列（lint/determinism/cspell/knip/typecheck/unit/coverage/build/e2e --list）
- abort対応、hang修正、setsid、hard timeout 10分、logs/summary.log/json保存
- Nodeでも動くように実装

### ビルドスクリプトの例（DropMod由来）

```ts
// scripts/build.ts
// node --experimental-strip-types で直接TS実行
// --disable-warning=ExperimentalWarning で警告抑制
```

`package.json`:
```json
"build": "node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/build.ts"
```

## 4. ハマりどころ

- **TypeScript 6**: `baseUrl` が非推奨（deprecated）、`ignoreDeprecations: "6.0"` で一時的に抑制。v7では削除される予定（https://aka.ms/ts6）
- **Biome 2**: `vcs.useIgnoreFile: true` で `files.includes` を書かない。import制限は `linter.rules.style.noRestrictedImports`。
- **pnpm/action-setup@v4**: `version` を明示すると `packageManager` と重複して失敗する。書かない。
- **upload-artifact v4**: 隠しディレクトリ（`.next/`）は `excludeHiddenFiles` により0件マッチ。tar化して単一ファイルとしてアップロードする。
- **ESMのvite.config.ts**: `__dirname` が使えない。`import.meta.dirname` を使うか、`path.resolve` で代替。
- **knip + oxc-parser 0.150.0**: 2GiBのArrayBuffer確保でSandbox等で失敗。`KNIP_DISABLE_RAW_TRANSFER=1` 環境変数でraw transfer無効化（package.jsonのknipスクリプトで設定済み）
- **cspell**: プロジェクト固有単語は `cspell.json` の `words` に追加、無視パスは `ignorePaths` に追加。`docs/audit` は無視推奨
- **husky v9**: `prepare` スクリプトに `husky` を設定、`pnpm install` で自動インストール。hooksは `.husky/` に置き、`chmod +x` 必須。v9では `_/husky.sh` をsourceしないシンプルな形式
- **commitlint**: 日本語subjectを許可するため `subject-case: [0, 'never']` で無効化。`commit-msg` hookで検証
- **lint-staged**: `package.json` の `lint-staged` フィールドで設定、stagedファイルのみ対象で高速
- **vitest 5**: v4からの破壊的変更はほぼなし、configはそのまま。coverageのthresholdは `vitest.config.ts` で100%に設定
