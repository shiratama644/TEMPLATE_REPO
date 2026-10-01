/**
 * Next.js config example — 高速化キャッシュ + Termux対応（Webpack強制）
 *
 * このファイルを `next.config.mjs` としてコピーして使ってください。
 * pnpm add next react react-dom などでNext.jsをインストール後に有効になります。
 *
 * Features:
 * - Termux検出でTurbopackを無効化しWebpackにフォールバック（安定性）
 * - Webpackのファイルシステムキャッシュでビルド高速化
 * - キャッシュディレクトリを .next/cache に（デフォルト）
 * - Docker/devcontainer対応
 */

import { existsSync } from "node:fs"

// Termux検出
const isTermux =
  !!process.env.TERMUX_VERSION ||
  process.env.PREFIX?.includes("com.termux") ||
  existsSync("/data/data/com.termux") ||
  process.platform === "android"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 出力設定 — monorepoやDocker対応
  // output: 'standalone', // Dockerで使う場合は有効化

  // Termux対応: Webpack強制設定
  // Next.js 16ではTurbopackがデフォルト。TermuxではWebpackにフォールバック
  ...(isTermux
    ? {
        // Turbopackを無効化（Termuxでは不安定）— 空のturbopack設定でWebpackを明示
        turbopack: {},
        // Webpack設定を最適化
        webpack: (config, { isServer: _isServer }) => {
          // Termuxでは並列処理を制限してメモリ削減
          config.parallelism = 1

          // ファイルシステムキャッシュで高速化
          config.cache = {
            type: "filesystem",
            cacheDirectory: `${process.cwd()}/.next/cache/webpack`,
            version: `${isTermux ? "termux" : "default"}-${process.env.NODE_VERSION || "24"}`,
          }

          return config
        },
      }
    : {
        // 非Termux: Turbopackをデフォルト使用、WebpackキャッシュはTurbopackでは不要
        // 必要に応じてTurbopack設定を追加
        turbopack: {},
      }),

  // 画像最適化 — キャッシュ
  images: {
    // キャッシュを有効化
    // formats: ['image/avif', 'image/webp'],
  },

  // 環境変数 — Termux情報をクライアントに渡す場合
  env: {
    IS_TERMUX: isTermux ? "1" : "0",
  },

  // その他 — 必要に応じて
  // reactStrictMode: true,
  // poweredByHeader: false,
}

export default nextConfig
