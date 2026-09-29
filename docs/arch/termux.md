# termux.md — Termux対応

## 概要

`scripts/lib/termux.ts` + `next-termux.ts` — Android Termux環境で開発可能。

## 検出（9種）

`isTermuxEnvironment()`:

1. `TERMUX_VERSION` 環境変数
2. `PREFIX` に `com.termux` を含む
3. `TERMUX__USER_ID`
4. `/data/data/com.termux` ディレクトリ存在
5. `termux-info` バイナリ存在
6. `platform === 'android'`
7. `ANDROID_ROOT` + `PREFIX` termux
8. `ANDROID_DATA` に termux
9. `TERMUX_API_VERSION`

## 対応

- **Next.js**: `getNextBuildCommandForTermux()` が `next build --no-turbopack` + `NEXT_WEBPACK=1`, `NEXT_TURBOPACK=0`, `TURBOPACK=0`, `NODE_OPTIONS=--max-old-space-size=2048`
- **Vite**: `getViteBuildConfigForTermux()` が `VITE_CACHE_DIR=node_modules/.vite-termux` + メモリ制限
- **Cache**: `.cache/termux/` に分離

## 検証

```bash
pkg install nodejs
npm i -g pnpm
pnpm install
pnpm check:env # Termux YES と表示されるか確認
pnpm dev # TermuxならWebpackモードで起動
```

- _tests_/scripts/termux-fallback.test.ts で 100% coverage
- _tests_/scripts/next-termux-build.test.ts で 100% coverage
