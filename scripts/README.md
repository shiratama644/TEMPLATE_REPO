# scripts/ — 汎用スクリプト

> このフォルダには、プロジェクト間で再利用可能な汎用スクリプトを置きます。
> リポジトリ固有すぎるものは除外し、汎用化できるものは調整して追加します。

## スクリプト一覧

| ファイル | 役割 | 出典 |
| :--- | :--- | :--- |
| `execute.ts` | 一括起動スクリプト。install→build→並列起動（server+client等）、色分けログ、Graceful shutdown。Bun/Node両対応 | cod-web由来、pnpm対応に一般化 |
| `check.ts` | 一括品質ゲート + ログ保存。install先行→残り並列（lint/determinism/typecheck/unit/coverage/build/e2e --list）、abort対応、hang修正、setsid、summary.log/json保存 | cod-web `arena/01a0b161-cod-web` の `check-all.ts` を pnpm用に汎用化し改名 |
| `check-determinism.ts` | 決定論・禁止API検出。純粋関数・core層から Math.random/Date.now/setTimeout等の禁止パターンを検出 | cod-web `arena/01a0b161-cod-web` の `check-determinism.ts` を汎用化 |
| `build.ts` | ビルドスクリプト。型チェック + プロジェクト固有のビルド（Next.js/Vite等を自動検出） | DropMod由来、汎用化 |
| `verify-docs.ts` | ドキュメント整合性検証。機密情報混入・リンク切れ・目次更新・packageManagerをチェック | PalmIDE由来、テンプレート用に一般化 |

## 使い方

```bash
# 一括起動（install → build → 並列起動）
pnpm start
# または直接
node --experimental-strip-types scripts/execute.ts

# 一括品質ゲート（install先行 + 並列、ログはlogs/に保存）
pnpm check
# または直接
node --experimental-strip-types scripts/check.ts
# ログ確認
cat logs/summary.log
cat logs/summary.json

# 決定論チェック（禁止API検出）
pnpm check:determinism
# または
node --experimental-strip-types scripts/check-determinism.ts

# スペルチェック
pnpm cspell

# 未使用コード検出
pnpm knip

# コミット（commitizenで対話的にConventional Commits作成）
pnpm commit

# ビルド
pnpm build
# または直接
node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/build.ts

# ドキュメント検証
pnpm verify-docs
# または
node --experimental-strip-types scripts/verify-docs.ts

# pre-commit (husky + lint-staged)
# commit時に自動実行される。手動実行:
pnpm exec lint-staged

# commitlint (commit-msg hookで自動実行)
echo "feat: add new feature" | pnpm exec commitlint
```

## 新規スクリプト追加時のルール

- **汎用性**: 他リポジトリでも使える形に一般化する。プロジェクト固有のハードコードは避ける。
- **言語**: TypeScript推奨（`--experimental-strip-types` で直接実行可能）。POSIX shも可。
- **命名**: `kebab-case.ts` / `kebab-case.sh`
- **ドキュメント**: 本READMEに「役割・使い方・出典」を追記する。
- **実行方法**: `package.json` の `scripts` に登録し、`pnpm <script>` で実行できるようにする。

## 他リポジトリからの良い部分 + 新規追加

- **cod-web (main)**: `execute.ts` の色分け並列起動、ANSIエスケープ直接使用、Graceful shutdown
- **cod-web (arena/01a0b161-cod-web 最新arena)**: `check-all.ts` → `check.ts` の並列品質ゲート（install先行+abort+hang修正+setsid+summary保存）、`check-determinism.ts` の禁止API検出
- **DropMod**: `build.ts` の `node --experimental-strip-types` 実行、Next.js/Vite自動検出
- **PalmIDE**: `verify-doc-integrity` の機械検証（不変値保持・リンク実在・ブロック残存なし）
- **ytdl**: 検証キットのUX（?probe=1 / 1 fetch / 外部リトライ / raw URL + 自己チェック）
- **新規 (2026-09-27)**: 
  - husky 9.1.7 + lint-staged 17.6.0 によるpre-commit（stagedファイルのみ高速検証）
  - commitlint 21.2.3 + commitizen 4.3.2 によるConventional Commits強制 + 対話的commit
  - cspell 10.3.4 によるスペルチェック
  - knip 6.38.0 による未使用コード検出（KNIP_DISABLE_RAW_TRANSFER=1でSandbox対応）
  - EditorConfig + VSCode推奨設定（Biomeをデフォルトformatter）
