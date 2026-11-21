# 機械可読な計画と生成物の検証

> Date: 2026-10-25(JST) / Commit: 4957545 / PR: 5

## 1. 指示内容 (Task Summary)

`--plan-json` と生成物検証コマンドの提案を実装する。JSON は非対話・読み取り専用、検証のビルドは明示指定でのみ実行する。

## 2. 実行内容 (Executed Actions)

- `scripts/setup.ts` で共通の計画判定を抽出し、単一 JSON プレビューを追加。機能除外、ファイル作成・保持・更新、バックアップ予定、必要な OS ツールと個別承認予定、Bun 依存導入予定を表示。`--apply`・`--save-config` と併用不可。適用時は安全判定を再実施。
- `scripts/verify_generated.ts` と `bun run verify:generated` を追加。12 テンプレートの基本構造、manifest を静的検査。`--build` でのみローカル標準 build を実行。必要ツール・依存不足は blocked、失敗は failed と区別。外部依存の自動導入なし。
- `tests/plan-verify.test.ts` でプレビュー不変更・再実行・バックアップ・安全境界、全テンプレート、静的破損、JS/TS 混合、変更された build スクリプトの拒否、TS / Python CLI 実行、Go/Rust 実行可能時のチェックを追加。README・構成図・計画・索引を同期。
- `bun run check` 7 ゲート、44 pass / 2 skip / 0 fail、699 assertions PASS。Go・Rust のツールチェーンがないこの環境ではビルドテストのみ skip。`git diff --check` PASS。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- JSON プレビューを承認とみなすと、プレビューと適用の間にファイルが変わる競合を見逃す。適用前の安全検査を再実行する必要がある。
- この環境で Go / Rust の実ビルドができないことを、静的検査の成功と混同しない。依存不足は exit 2 の blocked として見えるようにした。
- `bun run build` はプロジェクトコードを実行し得るため、`--build` は信頼する生成先だけに明示指定し、変更された build / prebuild / postbuild は自動で実行しない。

## 4. 次にすべきこと (Next Actions)

- PR #5 の CI を確認し、計画・進捗に証拠を追記して完了状態にする。
- macOS / Windows / Termux の実機検証と OS パッケージ導入の個別承認は BUNSETUP-4。Go / Rust の実ビルドがツールチェーンのある環境でも行われなければ、その事実を残す。

## 5. PR CI 確認（追記）

- `4957545`・`698eb3d` の初回 PR CI は Go の初回ビルド中に Bun テスト既定 5 秒で子プロセスが SIGTERM となり失敗。`23ea1e3` で終了信号を診断し、`cd2ffd3` で実ビルド試験のタイムアウトを延長して根本原因を解消。
- `cd2ffd3` の PR #5 で Bun 全ゲート・gitleaks・dependency-review の 3 チェック PASS。macOS・Windows・Termux の実機検証は未実施。
