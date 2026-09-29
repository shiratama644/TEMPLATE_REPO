# cache.md — ビルド高速化キャッシュ

## 概要

`scripts/lib/cache.ts` — ハッシュベースで不要ビルドをスキップ。

## 仕組み

- `getCacheDir()`: Termuxなら `.cache/termux/` に分離
- `hashFile()`, `hashFiles()`: ファイルハッシュ
- `getFilesInDir()`: ディレクトリ走査
- `getProjectSourceHash()`: package.json, pnpm-lock.yaml, tsconfig.json, vite.config.*, next.config.*, turbo.json + src/packages/apps のmtimeからハッシュ
- `isBuildCacheValid()`, `saveBuildCache()`: ハッシュベーススキップ判定
- `getCacheConfig()`: Vite(.vite/node_modules/.vite/.cache/vite)/Next(.next/cache/.cache/webpack)/Turbo(.turbo)等のパス取得
- `logCacheStats()`, `clearCache()`

## キャッシュ場所

- ローカル: `.cache/build-*.json` にハッシュ保存
- CI: `actions/cache@v4` で `.next/cache`, `node_modules/.vite`, `.vite`, `.turbo`, `.cache/` 等
- Docker: BuildKit `--mount=type=cache` で pnpm store + next/vite/turbo
- Vite: `node_modules/.vite` + `.cache/vite`
- Next.js: `.next/cache` + `.cache/webpack`
- Turbo: `.turbo/cache`

## 実績

- `pnpm build` 初回はビルド、2回目はキャッシュヒットでスキップ（--forceで強制）
- _tests_/scripts/cache-validation.test.ts で 100% coverage
