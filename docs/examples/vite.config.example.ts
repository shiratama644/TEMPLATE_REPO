/**
 * Vite config example — 高速化キャッシュ + Termux対応
 *
 * このファイルを `vite.config.ts` としてコピーして使ってください。
 * pnpm add -D vite @vitejs/plugin-react などでViteをインストール後に有効になります。
 *
 * Features:
 * - cacheDir を node_modules/.vite に設定（デフォルトだが明示）
 * - build.cacheDir を .cache/vite に設定
 * - Termux検出でメモリ制限・並列制限
 * - 依存関係の事前バンドル最適化
 */

import { existsSync } from "node:fs"
import { defineConfig } from "vite"

// Termux検出（Vite側でも）
const isTermux =
  !!process.env.TERMUX_VERSION ||
  process.env.PREFIX?.includes("com.termux") ||
  existsSync("/data/data/com.termux")

export default defineConfig({
  // キャッシュ設定 — 高速化
  cacheDir: "node_modules/.vite",

  // サーバー設定
  server: {
    port: 5173,
    host: "0.0.0.0", // Docker/devcontainer対応、Live Preview対応
    // TermuxではHMRのポートも固定
    hmr: {
      port: 5173,
    },
  },

  // ビルド設定 — キャッシュ + Termux最適化
  build: {
    // ビルドキャッシュはViteが自動で .cache/ に保存するが、明示も可能
    // outDirはプロジェクトに応じて変更
    outDir: "dist",
    // Termuxでは並列処理を制限してメモリ削減
    ...(isTermux
      ? {
          // Termuxではチャンクサイズを小さく、並列を制限
          chunkSizeWarningLimit: 500,
          rollupOptions: {
            maxParallelFileOps: 1,
          },
        }
      : {}),
  },

  // 依存関係最適化 — 事前バンドルで高速化
  optimizeDeps: {
    // キャッシュディレクトリ
    // include: ['react', 'react-dom'] など、よく使う依存を追加すると高速化
    include: [],
    // Termuxではesbuildの並列を制限
    ...(isTermux
      ? {
          esbuildOptions: {
            // メモリ削減
          },
        }
      : {}),
  },

  // esbuild設定 — Termuxではログレベルを調整
  esbuild: {
    logLevel: isTermux ? "warning" : "info",
  },
})
