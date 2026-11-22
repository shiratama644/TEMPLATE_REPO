# Conventional Commits parser のコミット時ゲート

> Date: 2026-10-25 / Task: COMMITGATE-1

## 実装・検証

- `.githooks/commit-msg` の形式判定を shell 正規表現から `scripts/check_commit.ts` に置換。`conventional-commits-parser` を使う `scripts/conventional_commit.ts` がレポートとフックの共通判定を担当。日本語/英語ゲートは引き続き先に実行。
- parser が解析できた場合も形式の成功とは見なさず、type・scope・`!`・件名の正規形と parser の出力を照合する。不正/欠損ファイルや不正 UTF-8 は exit 1。
- 一時 Git repo の実 `git commit` で本文だけ有効・件名空白・禁止文字を拒否、正常な破壊的変更ヘッダを受け入れる。Bun 全 7 ゲート・51 pass / 2 skip / 746 assertions と Knip PASS。
- このサンドボックスの `.git/hooks/commit-msg` はプラットフォームの trailer フックで、追跡対象ではない。自動上書きせず、repo に含める `.githooks` は利用者が明示的に導入する。PR CI は push 後に確認。

## PR CI（追記）

- `e162a0b` の PR #5 run `44967854460` は Bun 全ゲート（実 Git commit テスト含む）、Knip、actionlint/zizmor、gitleaks、dependency-review PASS。既存 trailer フックは上書きしていないため、このサンドボックスで新規 tracked hook を自動実行するには別途手動統合が必要。
