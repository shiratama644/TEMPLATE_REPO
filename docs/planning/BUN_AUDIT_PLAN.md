# Bun セットアップと検証の不具合監査

> 対応 task-list ID: `BUNAUDIT-1` (`docs/task-list.md`)
> 計画書テンプレート: `docs/planning/_TEMPLATE.md` 準拠

## 1. 開始前確認

固定ブランチの HEAD `c02a7aa`、作業ツリーが clean であること、既存の BUNSETUP-1〜3 の完了と BUNSETUP-4 の実機検証待ちを確認した。Bun はリポジトリ外の検証用実行体 1.4.4 を使用する。

## 2. 目的

Bun 移行後のセットアップ・生成物・検査に残る再現可能な不具合を見つけて修正し、誤った成功表示、意図しない Git メタデータや外部パスへの書き込み、実行不能な生成物を防ぐ。「全バグの存在しないこと」は有限のテストでは証明できないため、検査した範囲と未検証の環境を区別する。

## 3. 変更範囲

対象: `scripts/setup*.ts`、TypeScript の文書検査、Git フック登録、回帰テスト、`.gitignore`、README、計画・タスク・監査・当日ログ。生成候補のうち Web・ライブラリ・Python は実行可能な環境で E2E も実施する。

対象外: OS パッケージの実導入、GitHub PR の merge、過去の ADR・Agent ログ・task-list 行の書き換え、Go/Rust のツールチェーンを OS に新たに導入すること。

## 4. 禁止事項

- 既存フック・Git メタデータ・生成先の既存ファイル・シンボリックリンク先を上書きしない。
- `--yes` を OS パッケージ導入の承認にしない。生成結果に影響する非対応機能を黙って無視しない。
- 失敗テストを削除・skip せず、再現した原因を修正してから再検証する。

## 5. 完了条件

- [x] 不正な構成値やパス、バックアップの競合、非対応機能の指定が安全に失敗し、回帰テストで保護される。
- [x] 生成した Web、library、Python の利用可能な経路を実行で確認。未検証の OS / Go / Rust 経路を明記。
- [x] `bun run check` の7ゲートと frozen install が PASS。既存 Git フックの安全な拒否を確認。
- [ ] PR の Bun・gitleaks・依存レビューのチェックを確認し、`docs/task-list.md` に証拠を記録。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | Bun テスト | 全テンプレート適用、入力・パス・symlink、機能互換、生成物、文書検査の異常 fixture、commit-msg |
| Component | `bun run check` | リンク・Mermaid・言語・AGENTS.md・Biome・型・テスト |
| E2E | 一時ディレクトリ | TS/JS Vite・Next と両 monorepo の build、library の publint・size-limit、Python FastAPI の venv と依存導入 |
| 実環境 | 未実施 | macOS / Windows / Termux、apt 等の実導入、Go / Rust の実ビルド、Docker エンジンでの build |

## 7. 停止条件

安全境界の追加確認が必要な OS インストール、既存フックの上書き、過去の記録の改変、検証不能な変更に遭遇したら当該作業を停止し、証拠付きで報告する。

## 8. 完了時に行うこと

差分の自己レビュー、`bun install --frozen-lockfile`・`bun run check`、タスクの証拠更新、Conventional Commits で固定ブランチへ commit / push、PR のチェック確認、未検証範囲を含む報告。

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| BUNAUDIT-1 | バグ監査と修正 | 回帰テスト・修正・実測ログ | BUNSETUP-1〜3 |

## 10. 設計詳細・仕様

自動承認はプロジェクト内ファイルの作成だけに適用。OS パッケージは従来通り個別承認。Python FastAPI のライブラリは対象ディレクトリの `.venv` に pip で導入し、Go は現状標準ライブラリのみ、Rust Axum は cargo fetch。`--no-install` は Bun と言語別依存の両方をスキップする。Husky は自動登録せず、既存フックを調べる opt-in のコマンドでのみ登録する。

## 11. リスク・Gotchas

- 実機や管理権限がない経路の成功を保証しない。OS インストールの実行テストはしていない。
- 外部依存のバージョンは生成後に更新され得る。Web・Python の検証結果は Linux / Bun 1.4.4 の時点の実測。
- Husky・Changesets は Git リポジトリの存在と利用者による opt-in が必要。設定ファイルの生成だけでフック登録・リリースは行わない。

## 12. 実績と証拠

回帰テストとローカル E2E の結果は当日の Agent ログに記録。CI は push 後に本節へ追記する。
