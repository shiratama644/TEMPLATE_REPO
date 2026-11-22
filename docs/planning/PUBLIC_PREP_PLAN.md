# PUBLICPREP-1: 公開用テンプレートの作業ログ整理

> 対応 task-list ID: `PUBLICPREP-1`。

## 1. 開始前確認

固定ブランチと clean な作業ツリーを確認。GitHub リポジトリは public / is_template=true、既定ブランチは main。PR #5 は OPEN。

## 2. 目的

個人の作業履歴・一時ログを派生プロジェクトへ配布せず、利用者が入口・検証・初期設定に迷わない状態にする。

## 3. 変更範囲

ユーザーが削除を指定した追跡中の `.agent/logs/` 全17文書と `.gitkeep`、今回の `/tmp/bugloop-*` 等の一時ファイル。現行ルール・skills・hook・README・索引の参照を同期する。過去計画書・task-list の時点事実は保持し、消したリンクだけ修正する。

## 4. 禁止事項

PR のマージ、GitHub Release、別ブランチへの変更、Git 履歴の書き換え、秘密情報の公開を行わない。削除済みファイルは過去の Git コミットに残ることを明示する。

## 5. 完了条件

- [x] 現行ツリーに個別の作業ログが無く、将来のログも `.gitignore` で除外される。
- [x] 現行手順がログの新規作成を要求せず、削除されたログへの Markdown リンクがない。
- [x] GitHub テンプレートの使い方と未マージ時の制約を README に記載。
- [x] `bun run check`・`bun run knip`・`git diff --check`、PR CI と差分レビューを確認。

## 6. テスト方法

| 層 | 内容 |
|---|---|
| 文書 | 内部リンク、AGENTS lint、Mermaid、日本語・英語 |
| CLI | `bun run setup --help` と `--plan-json`（読取専用）、Bun の全テスト |
| 公開メタデータ | GitHub public/is_template と PR 状態を確認。PR CI は push 後に確認 |
| 実機 | Go/Rust のローカルテストと macOS/Windows/Termux、既定ブランチ週次/手動 OSV は未検証 |

## 7. 停止条件

追跡中の `.agent/logs/` 以外の履歴の削除、PR のマージ、既定ブランチへの push が必要なら停止してユーザー判断を求める。今回、ユーザーは PR のまま整備する方針を選択済み。

## 8. 完了時に行うこと

差分とステージをレビューし固定ブランチへ commit/push、PR CI の実測を記録する。main 未反映を公開完了と誤表示しない。

## 9. サブタスク分割

| ID | テーマ | 完了条件 |
|---|---|---|
| PUBLICPREP-1 | ログ削除、参照更新、利用案内、検証 | §5 を満たす |

## 10. 実績

`bun run check`: ローカル 7 ゲート、59 pass / 2 skip / 780 assertions。`bun run knip` と `git diff --check`: exit 0。GitHub は public / template、PR #5 は OPEN。PR #5 の `51b8829` で CI run `45045990609`（OSV 全走査・actionlint/zizmor・Bun 全ゲート + Knip・gitleaks）と Dependency Review `45045990341` は全5チェック PASS。PR は OPEN・未マージであり、main から作る GitHub テンプレートには本変更が含まれない。
