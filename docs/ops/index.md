# ops/ — 運用手順

このフォルダには、プロジェクトを運用するための手順を置きます（例: リリースの手順、定期的な確認作業、共有アカウントや権限の扱い）。

## 書くときの注意

- 手順は、誰が読んでも同じ結果になるように具体的に書く。
- 秘密情報（パスワード・トークン・個人情報）は書かない。保管場所だけを書く。
- 手順を変えたら、同じ変更の中で更新する。

## 現在の内容

品質ゲートと読み取り専用レポートの実行方法を以下に記載します。

## 品質ゲートと読み取り専用レポート

- `bun run check` は既存の 7 ゲート、`bun run knip` は未使用コード/依存の独立ゲート。Knip 6.43.0 は Node 環境の raw transfer で仮想メモリ確保に失敗するため `KNIP_DISABLE_RAW_TRANSFER=1` を固定。設定の例外は `knip.jsonc` に理由を記載。`--fix` は使わない。
- `bun run git:report -- --json`（または `bun scripts/git_report.ts --json`）は現在の Git 状態のみ。`bun scripts/git_report.ts --branch <期待ブランチ> --repo owner/name --pr <番号> --json` は `GITHUB_TOKEN` があるときだけ PR を GET で参照する。`pass` / `fail` / `unknown` を分け、未確認時は exit 1。出力を共有するときはコミット件名に秘密がないか確認すること。トークンをコマンド引数に渡さない。
- actionlint 1.7.12 と zizmor 1.31.1 は CI の `workflow-audit` で正常・負例を実行。zizmor は `--offline --min-severity medium`（通信なしの静的監査）。actionlint の配布バイナリは SHA-256 固定。ダウンロード/検査失敗はジョブ失敗。
- OSV-Scanner v2.7.0 は `bun.lock` 全体を PR CI・毎週・手動でスキャンします。PR の dependency-review は差分を検査する別の役割。DB 通信不能・スキャン失敗を「脆弱性 0 件」と読まない。定期/手動 workflow はデフォルトブランチに反映された後に実行を確認すること。CI では Go/Cargo を必須として実ビルドのスキップを禁止します。ローカルでは両ツールがなければ 2 テストが skip になるため、CI 成功をローカルの実行済み証拠と混同しないでください。

## コミットメッセージの形式ゲート

`.githooks/commit-msg` は日本語/英語ゲートの後で `conventional-commits-parser` による形式検証を実行し、失敗時は commit を拒否します。見出しは `feat` / `fix` / `docs` / `test` / `refactor` / `perf` / `chore` / `build` / `ci` のいずれか、任意の英数字・`_`・`-` の scope、任意の `!`、`: ` と空でない件名。本文・Git コメント・scissors 以下は形式検証対象外です。

`bun run commit:check <コミットメッセージファイル>` は形式だけを手動検査します。`bun install` の postinstall は Git repository のルートであるとき `.githooks` を自動有効化します。既存の `.git/hooks/commit-msg` と `pre-commit` は書き換えず、新フックから検査成功後に連鎖実行します（既存の trailer 等も維持）。再実行は `bun run hooks:install`。他の実行可能な Git フックや別の `core.hooksPath` がある場合は安全のため導入を失敗させ、既存設定を変えません。Git 管理外のアーカイブでは postinstall は何も変更せず終了します。`--ignore-scripts` で依存導入した場合は自動導入されないので、`bun run hooks:install` を明示実行してください。
