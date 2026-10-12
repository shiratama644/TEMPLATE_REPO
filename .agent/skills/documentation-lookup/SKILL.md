---
name: documentation-lookup
description: Use when answering setup, API, or code-example questions about a library or framework. Prefer live official docs over training data.
---

# Documentation Lookup

ライブラリ・フレームワークの質問は、学習データより **公式ドキュメントの本文** を正とする。

この環境に Context7 MCP は無い。次の function call だけを使う。

1. `web_search` — 公式ドキュメントの URL を探す
2. `fetch_page` — その URL の本文を読む

## いつ使うか

- 「このライブラリの設定は？」
- API の引数・戻り値・破壊的変更
- ユーザーがフレームワーク名を出している（React, Next.js, Prisma 等）

## 手順

### 1. 公式 URL を探す

```json
{
  "query": "<library> official docs <具体的な論点>",
  "depth": "1"
}
```

公式ドメインを優先する（例: `nextjs.org`、`prisma.io`、`biomejs.dev`）。ミラー・二次記事は使わない。

### 2. 本文を取る

```json
{
  "url": "https://<公式の該当ページ>"
}
```

`hasMore` が true なら同じ `url` で `chunkIndex` を進める。PDF は約 30 ページまで。

### 3. 答える

- 取った本文に基づいて答える。バージョンが問題なら明記する。
- コード例はドキュメントから最小限引用する。
- 秘密情報は `query` にも URL にも載せない。

3 回探しても公式本文が取れないときは、不確かだと書いて学習データで補う。断言しない。

## 例: Next.js middleware

1. `web_search` `query`: `Next.js middleware official docs`, `depth`: `"1"`
2. 公式 URL を選ぶ
3. `fetch_page` で本文を取る
4. 本文の手順で答える

## 使わないもの

- Context7 / `resolve-library-id` / `query-docs`
- `WebSearch` / `WebFetch` という旧名
- 公式を確認せずに API を書くこと
