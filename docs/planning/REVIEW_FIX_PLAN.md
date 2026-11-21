# REVIEWFIX-1: 構成レビューの指摘を修正

> 対応 task-list ID: `REVIEWFIX-1` (`docs/task-list.md`)
> 計画書テンプレート: `docs/planning/_TEMPLATE.md` 準拠

## 1. 開始前確認

- 現ブランチ、HEAD、作業ツリーを確認する。
- `tests/setup.test.ts`、`tests/agents.test.ts`、`scripts/setup.ts`、`docs/arch/architecture.md` と §5・§7 を確認する。

## 2. 目的 (Why)

Linux 固有の疑似端末コマンドで他 OS の検証が止まらないようにし、dry-run の負のテストが現行 Clack 表示を正しく検知し、構成図が実際のファイルを案内するようにする。

## 3. 変更範囲 (Scope)

対象: `scripts/setup.ts`、`tests/setup.test.ts`、`tests/agents.test.ts`、`docs/arch/architecture.md`、計画・索引・進捗・活動ログ。

変更しない: 既存のセットアップ承認、OS パッケージ導入条件、生成テンプレートの内容。既存ログ・ADR は追記または無変更。

## 4. 禁止事項

- 対話テストを無条件に削除しない。Linux では実際の疑似端末で回帰テストを続ける。
- 他 OS で疑似端末が使えなくても、承認・拒否・dry-run の安全判断を検証せずにスキップしない。
- macOS・Windows の実機で確認していない動作を PASS と断言しない。

## 5. 完了条件 (DoD)

- [x] Linux の GNU `script(1)` が使える環境で疑似端末の操作テストを継続し、他 OS では OS 固有の呼び出しを実行しない。
- [x] プラン承認の判断を注入可能な純粋ロジックとして非 TTY・dry-run・拒否・承認・キャンセルでテストする。
- [x] dry-run のアサーションを現行の `[y/N]` 表示に合わせる。
- [x] 構成図に `tests/`、`patches/`、全体ゲート・指示ファイル検査等の実ファイルを記載する。
- [ ] `bun run check` と CI が PASS し、タスクリストに証拠を記録する。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | Bun test | プランの承認判断、dry-run でプロンプトを呼ばないこと |
| Component | Linux util-linux の疑似端末 | Clack 選択、y/N、Ctrl+C、dry-run |
| E2E | `bun run check` / PR CI | 7 ゲート、文書リンク、型、回帰テスト |
| 実環境 | 未実施 | macOS / Windows / Termux は BUNSETUP-4 |

## 7. 停止条件

- 既存の承認安全境界を変える必要がある場合。
- 他 OS でのテストを動かすために未確認の OS パッケージ導入が必要になる場合。

## 8. 完了時に行うこと

差分をレビューし、全ゲートを通し、証拠を `docs/task-list.md` に記録して固定ブランチに commit / push する。PR CI を確認する。

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| REVIEWFIX-1 | 構成レビュー指摘 3 点 | セットアップ判断・テスト・構成図 | SETUPLIB-1 |

## 10. 設計詳細・仕様

TTY の操作試験は Linux util-linux の場合だけ行う。OS を問わず、抽出した `planApproval()` の分岐をテストする。Windows では POSIX `sh` が前提のフック実行テストを理由付きでスキップし、npm bin の symlink がないため CLI 実体を検証する。

## 11. リスク・Gotchas

他 OS の対話 UI 実機検証そのものは本変更では行わない。`test.skip` の対象と理由をコードに記す。Windows の symlink 権限や実導入も BUNSETUP-4 として残す。

## 12. 実績と証拠

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| REVIEWFIX-1 | `2b65b59` | `bun run check` 7 ゲート・37 テスト / 612 assertions PASS（Linux） | CI は push 後に確認。非 Linux 実機は未検証 |
