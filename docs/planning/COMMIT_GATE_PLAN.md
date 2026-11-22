# COMMITGATE-1: Conventional Commits のコミット時検証

> 対応 ID: `COMMITGATE-1`（`docs/task-list.md`）。既存の `TOOLING-3` と言語ゲートの後続作業。

## 1. 開始前確認

固定ブランチと実際のファイル内容をリモート先端と照合したうえで、再構築された Git の HEAD を復旧。既存 `.githooks/commit-msg` は言語ゲートと shell の正規表現で検証するが、導入済みの `conventional-commits-parser` は読取専用レポートにしか使われていなかった。サンドボックス固有の `.git/hooks/commit-msg` は別の trailer を付けるフックであり、上書きしない。

## 2. 目的・範囲

既存の日本語/英語ゲートを残したまま、Conventional Commits の見出しを **parser によって実際の commit-msg hook で検証する**。レポートとフックで同じ分類規則を使い、形式違反を exit 1 で止める。対象は hook、専用 TypeScript CLI、レポート、単体/実 Git commit テスト、利用手順と進捗。生成先アプリの Husky 設定や既存コミットの改変は対象外。

## 3. 安全境界

- `.git/hooks/commit-msg` や既存の `core.hooksPath` を上書きしない。既存フックがある環境では自動導入を拒み、手動統合を案内する。
- ネットワークアクセス・Git 書込 API・自動 commit・PR 投稿を導入しない。コメントや scissors のある Git 編集メッセージと実際の見出しを区別する。
- parser の単なる構文解析結果を形式検証の証拠にせず、許可 type、scope、`!`、空でない件名、1 行目の一致を明示的に照合する。失敗・読取不能は非 0。

## 4. 完了条件と検証

- [ ] `fix: 件名`、`feat(scope)!: 件名` と本文・コメント入りメッセージは通す。
- [ ] 不正 type、空件名、本文にしか有効見出しがないもの、欠損/不正 UTF-8 のファイルは通さない。
- [ ] 一時 Git repository の `git commit` で hook を実行し、拒否時は履歴が増えず、正常時は 1 commit 増える。既存言語ゲートも機能する。
- [ ] `bun run check`、`bun run knip`、PR CI を確認。サンドボックスの固有フックを上書きしない。

## 5. 停止条件と反復

実装→直接の負例→本物の `git commit`→全ゲート/CI→差分レビューを最大 4 回反復する。2 回連続で改善不能なら保留し、フックを無効化・skip して成功扱いしない。検証後は固定ブランチのみへ commit/push する。

## 6. 結果

- ローカル反復 1: 既存 shell 正規表現を、`conventional-commits-parser@7.1.3` を使用した共通分類器に置換。レポートも同じ分類器を利用し、既存の日本語/英語ゲートを維持。
- ローカル反復 2: 本文だけ有効、空件名、誤 type、ファイル欠損、不正 UTF-8、禁止文字を負例に追加。一時 Git repository で実際に commit-msg hook を動かし、拒否時の commit 数 0、正常時 1 を確認。
- ローカル反復 3: `bun run check` 7 ゲート・51 pass / 2 skip / 746 assertions、`bun run knip` exit 0。元環境の `.git/hooks/commit-msg` はプラットフォームの trailer フックで、上書きも自動統合もしない。PR CI は push 後に確認。
