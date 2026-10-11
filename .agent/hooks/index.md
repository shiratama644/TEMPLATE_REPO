# Hooks Index — 定型ワークフロー & トリガー

> このファイルは `.agent/hooks/` の**入口**。特定トリガー時に本ファイルで該当フックを特定し、
> 手順（`.md`）やスクリプト（`.sh`）を実行する。作業規約の本体は `AGENTS.md`（§2/§3/§4）と `.agent/rules/`。
> ここは「いつ・どのフック」の索引と、再利用可能な具体手順。
>
> ディレクトリ構造はClaude Code公式準拠: 実行スクリプトを `.sh` で置き、トリガー登録は
> `.agent/settings.json`（`hooks` フィールド）で行う。実行スクリプトは POSIX sh で書き、`settings.json` に登録する。

## トリガー → フック 対応表

| トリガー（いつ） | フック | 形式 | 登録先 |
| :--- | :--- | :--- | :--- |
| **セッション開始時**（startup / resume / clear / compact） | [`session-start.sh`](./session-start.sh) | スクリプト | `settings.json` → `SessionStart` |
| **タスク開始時**（ユーザー指示を受けた直後） | [`pre-task.md`](./pre-task.md) | 手順 | 手動（現状把握の手順） |
| **Bash 実行前**（破壊的 git 操作の直前） | [`block-dangerous-git.sh`](./block-dangerous-git.sh) | スクリプト | `settings.json` → `PreToolUse`（matcher: Bash） |
| **編集前**（Edit/Write前） | [`pre_edit_guard.sh`](./pre_edit_guard.sh) | スクリプト | `settings.json` → `PreToolUse` |
| **編集後**（Edit/Write後） | [`post_edit_verify.sh`](./post_edit_verify.sh) | スクリプト | `settings.json` → `PostToolUse` |
| **commit直前**（§3.1検証） | [`verify-commit.md`](./verify-commit.md) | 手順 | 手動参照 |
| **タスク完了時**（完了直後） | [`log-task.md`](./log-task.md) | 手順 | 手動参照 |
| **Sandbox再構築を検知** | [`sandbox-recovery.md`](./sandbox-recovery.md) | 手順 | 手動参照 |

## フック一覧

| ファイル | 実行トリガー | 対象 / 内容 |
| :--- | :--- | :--- |
| [pre-task.md](./pre-task.md) | タスク開始時 | 現状把握（git status/branch/log）→ `.agent/skills/` から必要スキルをピンポイント読込 → リポジトリ固有の制約確認 |
| [pre_edit_guard.sh](./pre_edit_guard.sh) | PreToolUse | 編集禁止領域（.git/, node_modules/, dist/, build/, coverage/ 等の生成物）への変更をブロック（exit 2） |
| [post_edit_verify.sh](./post_edit_verify.sh) | PostToolUse | 機密ファイル混入・docs/README目次の事後検証 |
| [verify-commit.md](./verify-commit.md) | commit直前 | プロジェクト検証（typecheck/lint/test/build）+ 意図しない差分の確認 |
| [log-task.md](./log-task.md) | タスク完了時 | `.agent/logs/YYYY-MM-DD_<summary>.md` 作成（4セクション）→ 重要知見を `.agent/skills/` へ同期 → `skills/index.md` 更新 |
| [sandbox-recovery.md](./sandbox-recovery.md) | Sandbox再構築検知時 | `git fetch` → `reset --hard FETCH_HEAD`（例外的許可）→ §6.1 の環境セットアップ → 健全性確認 |

## 運用ルール

- フックは**必須実行**ではなく「該当トリガー時に**必ず参照すべき**手順」。迷ったら該当フックを読む。
- 新フック追加時は本indexの「対応表」「一覧」両方に追記し、`.agent/settings.json` の `hooks` にも登録する。
- 実行スクリプト（`.sh`）は `kebab-case` + 拡張子、POSIX shで書く（bash/zsh依存文法は使わない）。手順は `kebab-case.md`。
- 終了コードの約束:
  - `0` = 許可 / 検証OK
  - `1` = 検証NG（ログ参照、事後チェックとして表示）
  - `2` = PreToolUseでのみ：編集ブロック
- フック内のコマンドは AGENTS.md §6.1 に記録されたコマンドのみ（捏造禁止, AGENTS.md §3.1）。
- プロジェクト固有の検証コマンド・制約は AGENTS.md §6 に書き、フックは汎用のまま保つ。

## 公式構成との対応

- 公式 `.claude/settings.json` の `hooks` フィールドに、本ディレクトリの `.sh` スクリプトを登録する形が公式推奨。
- 本テンプレートでは `settings.json` に `SessionStart`, `PreToolUse`, `PostToolUse` のイベントを登録。
- 旧来の手順md（pre-task.md等）は人間の参照用として残し、自動実行は `.sh` + `settings.json` で行うハイブリッド構成。
