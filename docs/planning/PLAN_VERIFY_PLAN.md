# PLANJSON-1・GENVERIFY-1: 計画 JSON と生成物の検証

> 対応 task-list ID: `PLANJSON-1` / `GENVERIFY-1`（`docs/task-list.md`）
> 計画書テンプレート: `docs/planning/_TEMPLATE.md` 準拠

## 1. 開始前確認

固定ブランチ・clean tree と Bun 1.4.4、`scripts/setup.ts` の承認・バックアップ・OS 導入条件、`setup_manifest.ts` のテンプレート・言語、`docs/task-list.md` の BUNSETUP-4 実機検証待ちを確認。

## 2. 目的 (Why)

人間向けの計画を CI でも安全に読めるようにし、生成物が少なくとも構造上有効か、利用者が明示したときはビルド可能かを確認する。検証不能を成功と偽らない。

## 3. 変更範囲 (Scope)

`setup.ts` のプラン算出の共通化・`--plan-json`、`scripts/verify_generated.ts` と `package.json` の入口、回帰テスト、README・構成図・索引・進捗・活動ログ。BUNSETUP-4 の OS 実機検証は別タスク。

## 4. 禁止事項

計画 JSON を承認として扱わない。JSON プレビューで質問・書込・install を行わない。生成物検証で OS パッケージや依存を自動導入しない。既存の Git フック・利用者ファイルを上書きしない。任意の `build` スクリプトを無断実行しない。

## 5. 完了条件 (DoD)

- [x] JSON は単一オブジェクト、schemaVersion=1。通常計画と同じ create/retain/update 判定で、失敗時 stdout に部分 JSON を出さない。
- [x] dry-run・承認・非対話・OS パッケージの安全境界を維持する。`--plan-json --apply` と `--save-config` は拒否。
- [x] 全 12 テンプレートの静的チェックと、明示ビルド・失敗・前提不足を検査する。exit 0/1/2 の区別を文書化する。
- [ ] `bun run check`、PR の CI が PASS。未確認の Go / Rust / 非 Linux 実機を実測と区別する。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | Bun test | JSON を parse できる・不変更・再実行・無効な組合せ、静的な欠落・全テンプレート |
| Component | Bun CLI | ブロックされた実行と、利用可能なツールでの build |
| E2E | `bun run check` / PR CI | 7 ゲートと既存承認テスト |
| 実環境 | 別タスク | macOS / Windows / Termux と OS パッケージ実導入は BUNSETUP-4 |

## 7. 停止条件

安全境界を変えないと実装できない場合、依存を自動導入する必要がある場合は停止して相談する。

## 8. 完了時に行うこと

全ゲート・差分を確認、固定ブランチに commit / push、PR CI を確認。ログは追記のみ、索引を同期。

## 9. サブタスク分割

| ID | テーマ | 主な成果物 | 依存 |
|---|---|---|---|
| PLANJSON-1 | 計画 JSON | 共通プラン判定・CLI・テスト | REVIEWFIX-1 |
| GENVERIFY-1 | 生成物検証 | 別 CLI・テンプレート別テスト | PLANJSON-1 |

## 10. 設計詳細・仕様

`--plan-json` は dry-run と非対話を内包し、現在のファイル状態を計画として出す。適用時は再判定する（競合・TOCTOU 対応）。stdout は JSON のみ、エラーは stderr。ファイルの内容・秘密情報は出さない。OS パッケージの予定コマンドは表示専用。

`bun run verify:generated --dir <path> --template <id> [--build]`。既定は存在と manifest の静的確認。`--build` のみ、利用者が信頼する生成先でローカルの実行体・標準 build 手順を実行する。依存不足は blocked（exit 2）、不正は failed（exit 1）、全検証 PASS のみ exit 0。ビルドはファイル・キャッシュを生成し得る。既存スクリプトの無制限実行や自動インストールをしない。

## 11. リスク・Gotchas

検証は全バグの不在を保証しない。構造チェックはユーザーのコード内容の正しさまで保証しない。Go / Rust の実ビルドは toolchain がある場合だけ実行し、未実行なら blocked または skip と記録。JSON 計画は状態を固定せず承認トークンではない。

## 12. 実績と証拠

ローカル検証: `bun run check` 7 ゲート・44 pass / 2 skip・699 assertions。Go・Rust の実ビルドはローカルに toolchain がなく未実施。CI は push 後に確認。
