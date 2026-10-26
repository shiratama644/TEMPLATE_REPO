# Bun セットアップ移行計画

> 対応 task-list ID: BUNSETUP-1〜4。2026-10-26。
> 比較対象: `full` ブランチの `scripts/setup.ts`・`scripts/lib/bootstrap/`。pnpm/Node 版のコードを直接取り込まず、設計（プリセット・機能マニフェスト・差分確認・バックアップ）を Bun 用に移す。

## 1. 開始前確認

- 固定ブランチ上で作業する。`full` へ切り替えない。
- ユーザー決定: full 相当のプリセットと機能構成 + Python/Go/Rust の生成テンプレート。検査・Git フック・CI・依存管理は Bun に統一。対話式 CLI と非対話式 CLI の入口は `bun run setup [引数]`。
- Bun は利用者環境では前提とするが、このサンドボックスには当初なかった。検証用に npm の配布パッケージから Bun 1.4.4 をリポジトリ外へ導入した。

## 2. 目的

テンプレートから新プロジェクトを、安全に対話または引数指定で初期化し、OS とプロジェクト種別に適した依存と後片付けの手順を提示できるようにする。検査と CI は Python に依存しない。

## 3. 変更範囲

1. 既存 3 検査の TypeScript 移植。自己検査・異常 fixture を維持し、旧版との結果を比較する。
2. Bun の `package.json`・ロックファイル・検証入口・CI・Git フックを設置し、Python 製 pre-commit を外す。
3. `full` の 7 プリセット／17 機能の選択肢を基礎に、TS/JS、Next.js、Vite + React、モノレポ、Python、Go、Rust を選べる setup CLI。差分プレビュー、再実行、既存ファイルの保護、バックアップ。
4. OS と必要な実行ツールを検出し、apt / brew / winget / Termux pkg の導入候補を表示。対話式のみ**コマンドごとに承認**を取る。`--yes` は OS インストールの承認とみなさない。非対話式では案内のみ。
5. 生成後に不要な文書と Agent スキルの**候補一覧**を提示する。自動削除しない。

## 4. 禁止事項

- 作業時にこのサンドボックスの OS パッケージをインストールしない。秘密情報に触れない。
- CLI で未承認の既存ファイルを削除・上書きしない。`--yes` でも OS パッケージを自動導入しない。
- `.agent/logs/`、既存 ADR と過去 task-list 行を書き換えない。固定ブランチ以外に push しない。
- `full` の pnpm ロックファイルや巨大な無関係ツール群を無条件に取り込まない。

## 5. 完了条件

- `bun run setup --help` / `--list-presets` と対話式・非対話式を利用可能にする。非対話式・dry-run・再実行・不正引数・中断・既存ファイル競合・承認境界をテストで実測する。
- `make check` と CI が Bun ベースで PASS。Python の実行・pip・pre-commit を検証パイプラインに残さない。旧検査との代表 fixture の判定を維持する。
- 新規生成プロジェクトを temp ディレクトリで確認。文書の案内まで出し、既存ファイルは保全。
- docs・README・Agent の現用ガイドと索引が実装に一致する。

## 6. 停止条件

Bun やパッケージレジストリが利用不能、従来の検査と移植版が相違、意図しない削除・上書きを検出、OS パッケージ権限がない、選択肢の仕様が矛盾する場合はその段階を停止して記録する。未検証の機能を完了と報告しない。

## 7. 実績と証拠

- Bun 1.4.4 をリポジトリ外に用意し、`bun install --frozen-lockfile`・`bun run check` 7 ゲートを確認。テスト 12 件・59 assertions PASS、文書リンク 142 ファイル、Mermaid 12 ブロック、言語ゲート 183 ファイル PASS。旧 Python / 新 TypeScript 言語ゲートは 181 ファイル全体で双方 exit 0。
- 対話式（疑似端末で質問ごとに回答）と非対話式（dry-run、`--yes --apply`、再実行、既存ファイル保護）を実測。直接 `bun run setup` で Vite 生成と Bun install を確認。
- 生成した Vite + React、Next.js の TS/JS 版、Vite/Next monorepo 版を Bun install と build で確認。`full` プリセットの依存も Bun install できた。Python/Go/Rust はファイル生成を確認し、各言語の依存導入・実行は未検証。
- OS 検出は apt / brew / winget / Termux pkg を mock で検査。OS パッケージ実導入、macOS/Windows/Termux 実機検証は未実施。既存の commit-msg フックを保護し `.githooks` 登録は未実施。
- CI は固定ブランチに push 後に確認する。実機の未検証項目は BUNSETUP-4 として残す。

### CI 初回の再現性修正（追記）

初回 PR CI は runner に cargo が既に導入済みだったため、OS パッケージ不足時の案内を期待したテストが失敗した。子プロセスの PATH を固定してテストし直し、ローカル 7 ゲート PASS。リモート CI の再実行を確認する。
