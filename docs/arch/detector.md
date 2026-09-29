# detector.md — ProjectDetector

## 概要

`scripts/lib/detector.ts` (312行) — Vite/Next.js/Turbo/Monorepo自動検出。

## API

- `detectRootProject()`: turbo.json → turbo, pnpm-workspace.yaml + packages/apps with content → monorepo, vite.config.* → vite, next.config.* → next, else tsc
- `detectWorkspace()`: pnpm-workspace.yamlのpackages/appsを走査
- `detectApps()`: apps/* の個別フレームワーク検出（混在対応: apps/web:next + apps/docs:vite）
- `detectBuildSystem()`: build system検出
- `detectAll()`: 全検出結果
- `logDetectionResult()`: 詳細ログ

## 誤爆防止

- 空の `packages/` は無視（length>0チェック）
- pnpm-workspace.yamlが存在してもpackages/appsが空ならvite/next/tscにフォールバック
- Vite+Next同時存在時の暗黙の優先順位を明示的警告

## 実績

- _tests_/scripts/detector-project.test.ts で 100% coverage
- robustnessテスト 36項目で誤爆テスト
- auto-detectテスト 9項目
