# SETUPLIB-1: 対話 UI・設定検証・安全性テストのライブラリ導入

> 対応 task-list ID: `SETUPLIB-1` (`docs/task-list.md`)
> 計画書テンプレート: `docs/planning/_TEMPLATE.md` 準拠

## 1. 開始前確認

- 固定ブランチと作業ツリーを確認し、再構築時はリモート HEAD と全ファイルを照合してから復旧する。
- `scripts/setup.ts`、マニフェスト、既存の対話・非対話テスト、`AGENTS.md §6.1` を確認する。

## 2. 目的 (Why)

既存のセットアップの安全性を保ったまま、対話式の選択を分かりやすくし、CLI/JSON の入力検証を一元化し、パス・名前の安全境界を生成テストで検証する。

## 3. 変更範囲 (Scope)

`package.json` / `bun.lock`、`scripts/setup.ts` / `setup_schema.ts`、`tests/setup.test.ts` / `setup-schema.test.ts`、README・アーキテクチャ・ライセンス通知・計画・タスクリスト・活動ログ。

変更しないもの: 7 プリセット・17 機能の内容、既存ファイルの保護、OS パッケージの個別 `yes` 承認、過去ログと ADR。

## 4. 禁止事項

- `--yes` 単独、拒否、キャンセル、空入力または dry-run でファイル変更・依存導入をしない。
- OS パッケージ導入を Clack の単なる yes/no 質問にして自動承認しない（正確な `yes` 入力のみ）。
- 既存の安全性テストを削除したり、テストを通すために判定を弱めたりしない。

## 5. 完了条件 (DoD)

- [x] `@clack/prompts` で選択・入力・計画後の既定 No 確認とキャンセルを実装。端末の y/No・空入力・Ctrl+C、dry-run が回帰テストで保護される。
- [x] `zod` の厳格な選択スキーマで CLI と JSON 設定を検証し、不明キー・不正名・非対応の言語とテンプレートを拒否する。
- [x] `fast-check` はテスト専用にし、パス逸脱・`.git`・名前の境界を再現可能な seed で検証する。
- [ ] `bun install --frozen-lockfile`、`bun run check` の全ゲート、PR の CI が PASS。変更と出典を文書に同期する。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | Bun test + fast-check | 名前・設定のスキーマ、パス保護の正常・拒否 |
| Component | Linux の `script(1)` 疑似端末 | Clack の選択・計画確認・キャンセル・dry-run |
| E2E | `bun run check` と PR CI | 既存の非対話式、型、Lint、文書検査 |
| 実環境 | 未実施 | macOS / Windows / Termux と OS 導入は BUNSETUP-4 |

## 7. 停止条件

frozen install が失敗する、既存の安全境界に回帰がある、または既存ファイルの破壊を要する場合は停止して報告する。

## 8. 完了時に行うこと

差分とテスト結果をレビューし、タスクリストと活動ログに証拠を記録。コミット・固定ブランチへ push し、PR CI を確認する。

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| SETUPLIB-1 | 対話 UI・入力検証・生成テスト | セットアップ CLI とテスト | SETUPCONF-1 |

## 10. 設計詳細・仕様

`@clack/prompts` は TTY のときだけ使う。計画後の確認は `initialValue: false` とし、キャンセルは適用しない。OS 導入はコマンド表示後、文字列 `yes` と一致する場合のみ実行する。Zod は既存の入力・設定検証とエラー文面を維持する。fast-check は本体依存に含めない。

## 11. リスク・Gotchas

Clack は疑似端末の画面幅が 0 だとプロンプト表示が崩れるため、テスト内で `stty cols 100 rows 30` を設定する。実際の端末での入力と同様、Enter は `\r` で送る。パスと名前の負テストでは、シンボリックリンクと既存ユーザーデータ保護を維持する。

## 12. 実績と証拠

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| SETUPLIB-1 | commit 後に記入 | `bun run check` 7 ゲート・35 テスト / 601 assertions PASS | CI は push 後に確認 |
