# 堅牢性改善計画 — ProjectDetector + Template Bootstrap

> 作成日: 2026-09-27
> 状態: 計画
> 依存: TEMPLATE-10完了

## 背景

TEMPLATE-10までの検証で、テンプレートは機能的には完成度が高いが、以下の潜在的リスクが見つかった:

1. **Vite/Next同時存在時の暗黙の優先順位** — 現在は `vite > next` でVite優先、誤爆ではないが暗黙的
2. **Monorepoでの混在フレームワーク** — `apps/web/next.config.ts` + `apps/docs/vite.config.ts` のような構成で、root-level判定では不十分
3. **初期導入時の不要機能** — 利用者から「何を残して何を消せばいいの？」という問題

## 改善1: ProjectDetector

### 現状の問題

`build.ts` / `dev.ts` / `execute.ts` は以下の順で判定:
```
if (turbo.json) → turbo
if (packages/ or apps/ non-empty) → monorepo
if (vite.config.*) → vite
if (next.config.*) → next
if (tsconfig.json) → tsc
```
- 両方ある場合、Vite優先 (暗黙)
- Monorepo混在で不十分
- 検出ロジックが分散

### 提案設計

```
ProjectDetector
├── detectRootProject(): RootProjectInfo
├── detectWorkspace(): WorkspaceInfo
├── detectApps(): AppInfo[]
├── detectBuildSystem(cwd): BuildSystem
└── detectAll(): DetectionResult
```

### 実装状況

- 基本版は実装済み (`scripts/lib/detector.ts`, 312行)
- `build.ts` / `dev.ts` で `detectAll()` + `logDetectionResult()` 統合済み
- 従来ロジックは後方互換維持

## 改善2: Template Bootstrap

### 現状の問題

完成度が高いが「何を残して何を消せばいいの？」問題。

### 提案

```
pnpm create-template
# または pnpm setup

Project name: my-app
Framework: Vite / Next.js / Monorepo / Plain TS
Docker: Yes/No
Changesets: Yes/No
GitHub: Full/Minimal/No
Termux: Auto/Yes/No
Renovate: Yes/No
```

選択に基づいて package.json, CODEOWNERS, README, Dockerfile, devcontainer, Vite/Next設定, Changesets等を生成・削除。

### 現状対応

- READMEを「Template Bootstrap手動版」として大幅強化済み (2026-09-27)
- フレームワーク別・オプション機能別の残す/消す表を追加
- 将来の完全版設計をこのドキュメントに残す

## その他の堅牢性改善 (完了済み)

- execute.ts: stripStringLiteralsをハッシュ付きプレースホルダに改善
- .gitignore: .vite, .agent/logs, test-results/, playwright-report/ 追加
- playwright.config.ts追加
- src/index.test.ts → _tests_/src/index.test.ts 移動
- _tests_/ に全テストファイルを同じディレクトリ構造で移動
- 品質ゲート12タスク全PASS

## 完了条件

- [x] ProjectDetector基本版実装
- [x] build.ts/dev.tsに統合
- [x] README初期セットアップ手順強化
- [x] テストファイルを _tests_/ に移動
- [x] 堅牢性テスト36項目全PASS
- [x] 品質ゲート12タスク全PASS
