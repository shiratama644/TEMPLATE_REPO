# Contributing Guide

このテンプレートリポジトリへの貢献ありがとうございます！このガイドでは開発フローと規約を説明します。

## 開発フロー

### 1. 環境構築

```bash
# Node.js 22系が必要 (.nvmrc 参照)
nvm use # または fnm use

# 依存関係インストール
pnpm install --frozen-lockfile

# 品質ゲート実行（10タスク）
pnpm check

# または個別に
pnpm typecheck
pnpm lint
pnpm check:determinism
pnpm cspell
pnpm knip
pnpm test:unit
pnpm test:coverage
pnpm build
```

### 2. ブランチ戦略

- `main`: 常にデプロイ可能な状態
- `arena/**`: Arena AIの作業ブランチ（CIはPR経由で実行）
- 機能ブランチ: `feat/xxx`, `fix/yyy` 等

### 3. コミット規約

[Conventional Commits](https://www.conventionalcommits.org/) に従ってください。`commitlint` と `husky` で強制されます。

```bash
# 推奨: commitizenで対話的に作成
pnpm commit

# 手動の場合
git commit -m "feat: 新機能を追加"
git commit -m "fix: バグを修正"
git commit -m "chore: 依存関係を更新"
git commit -m "docs: READMEを更新"
```

Types:

- `feat`: 新機能
- `fix`: バグ修正
- `chore`: 雑務（依存関係更新、CI等）
- `docs`: ドキュメント
- `refactor`: リファクタ
- `test`: テスト
- `perf`: パフォーマンス改善

### 4. Changesets（リリース管理）

機能追加やバグ修正時はchangesetを作成してください：

```bash
pnpm changeset
# 質問に答えて .changeset/*.md を作成
# - どのパッケージが影響を受けるか
# - major/minor/patch のどれか
# - 変更内容の要約

# バージョニング（メンテナが実行）
pnpm changeset:version # CHANGELOG更新 + version bump

# 公開（publicパッケージの場合）
pnpm changeset:publish
```

CIの `release.yml` が `main` へのpush時に自動で「Version Packages PR」を作成します。

### 5. Pull Request

PR作成時は `.github/PULL_REQUEST_TEMPLATE.md` に従ってください。

チェックリスト：

- [ ] `pnpm check` が通る
- [ ] Conventional Commitsに従っている
- [ ] 必要に応じて `.changeset/*.md` を作成
- [ ] ドキュメント更新（必要に応じて）
- [ ] 破壊的変更の明記

## プロジェクト構成

```
.
├── .agent/              # Claude Code公式準拠設定
│   ├── settings.json
│   ├── rules/            # プロジェクトルール
│   ├── skills/           # 汎用スキル8件
│   ├── agents/           # エージェント定義
│   ├── hooks/            # フック
│   ├── commands/         # スラッシュコマンド
│   └── workflows/        # ワークフロー
├── .github/              # GitHub設定
│   ├── workflows/        # CI/CD
│   ├── ISSUE_TEMPLATE/   # Issueテンプレート
│   └── ...
├── .changeset/           # Changesets設定
├── .devcontainer/        # DevContainer
├── .husky/               # Husky hooks
├── .vscode/              # VSCode設定
├── docs/                 # ドキュメント
│   ├── task-list.md      # タスク管理（唯一の正本）
│   ├── planning/         # 計画書
│   └── complete/         # 完了レポート
├── scripts/              # 汎用スクリプト
│   ├── execute.ts        # install→build(差分スキップ)→start
│   ├── check.ts          # 品質ゲート10タスク
│   └── check-determinism.ts
├── src/                  # ソースコード
└── ...
```

## 品質ゲート

`scripts/check.ts` が10タスクを管理：

1. `install` — `pnpm install --frozen-lockfile`（先行実行）
2. `lint` — Biome lint
3. `check:determinism` — 禁止API検出
4. `cspell` — スペルチェック
5. `knip` — 未使用コード検出
6. `typecheck` — `tsc --noEmit`
7. `test:unit` — Vitest
8. `test:coverage` — カバレッジ閾値85%
9. `build` — 本番ビルド
10. `test:e2e:list` — Playwright discovery

```bash
pnpm check # 実行、logs/に保存
```

## コーディング規約

- **Biome**: `biome.json` に従う（format, lint, organizeImports）
- **TypeScript**: v6系、strict mode
- **Import boundaries**: `docs/` のルール参照
- **Determinism**: 純粋層では `Math.random()`, `Date.now()` 等禁止（`check-determinism.ts` で検出）

## テスト

```bash
pnpm test:unit      # ユニットテスト
pnpm test:coverage  # カバレッジ付き
pnpm test:e2e       # E2E（Playwright）
pnpm test:e2e -- --list # E2E discoveryのみ
```

## その他ツール

```bash
pnpm size           # バンドルサイズチェック
pnpm publint        # 公開前パッケージチェック
pnpm taze           # 依存関係最新化チェック
pnpm taze:major     # major含むチェック
pnpm cspell         # スペルチェック
pnpm knip           # 未使用コード検出
pnpm changeset      # changeset作成
```

## 質問・相談

- Issue: バグ報告、機能要望
- Discussions: 質問、アイデア交換
- Security: `SECURITY.md` 参照

## ライセンス

`LICENSE` 参照。貢献されたコードは同ライセンスで提供されます。
