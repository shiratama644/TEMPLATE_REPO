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
| **編集前**（Edit/Write前） | [`pre-edit-guard.sh`](./pre-edit-guard.sh) | スクリプト | `settings.json` → `PreToolUse` |
| **編集後**（Edit/Write後） | [`post-edit-verify.sh`](./post-edit-verify.sh) | スクリプト | `settings.json` → `PostToolUse` |
| **commit直前**（§3.1検証） | [`verify-commit.md`](./verify-commit.md) | 手順 | 手動参照 |
| **タスク完了時**（完了直後） | [`log-task.md`](./log-task.md) | 手順 | 手動参照 |
| **Sandbox再構築を検知** | [`sandbox-recovery.md`](./sandbox-recovery.md) | 手順 | 手動参照 |

## フック一覧

| ファイル | 実行トリガー | 対象 / 内容 |
| :--- | :--- | :--- |
| [pre-task.md](./pre-task.md) | タスク開始時 | 現状把握（git status/branch/log）→ `.agent/skills/` から必要スキルをピンポイント読込（未初期化なら `project-init`）→ リポジトリ固有の制約確認 |
| [pre-edit-guard.sh](./pre-edit-guard.sh) | PreToolUse | 編集禁止領域（.git/, node_modules/, dist/, build/, coverage/ 等の生成物）への変更をブロック（`permissionDecision: deny` の JSON） |
| [post-edit-verify.sh](./post-edit-verify.sh) | PostToolUse | 機密ファイル混入（`decision: block` の JSON でモデルに返す）・docs/README 目次の事後検証（警告のみ） |
| [verify-commit.md](./verify-commit.md) | commit直前 | プロジェクト検証（typecheck/lint/test/build）+ 意図しない差分の確認 |
| [log-task.md](./log-task.md) | タスク完了時 | `.agent/logs/YYYY-MM-DD_<summary>.md` 作成（4セクション）→ 重要知見を `.agent/skills/` へ同期 → `skills/index.md` 更新 |
| [sandbox-recovery.md](./sandbox-recovery.md) | Sandbox再構築検知時 | `git fetch` → `reset --hard FETCH_HEAD`（例外的許可）→ §6.1 の環境セットアップ → 健全性確認 |

## 運用ルール

- フックは**必須実行**ではなく「該当トリガー時に**必ず参照すべき**手順」。迷ったら該当フックを読む。
- 新フック追加時は本indexの「対応表」「一覧」両方に追記し、`.agent/settings.json` の `hooks` にも登録する。
- 実行スクリプト（`.sh`）は `kebab-case` + 拡張子、POSIX shで書く（bash/zsh依存文法は使わない）。手順は `kebab-case.md`。
- 出力と終了コードの約束（Claude Code Hooks reference 準拠）:
  - `exit 0` = 成功。stdout は transcript モードでのみ表示される
  - `exit 2` = **ブロッキングエラー**。stderr がモデルに返る（PreToolUse だけでなく PostToolUse・Stop 等でも意味を持つ）
  - その他の非 0 = **非ブロッキングエラー**。stderr はユーザーにしか表示されず、モデルには届かない
  - 本リポジトリのフックは判定を **JSON で返して `exit 0`** する（exit 2 と JSON は混ぜない。exit 2 のとき JSON は無視される）
    - PreToolUse（[`block-dangerous-git.sh`](./block-dangerous-git.sh) / [`pre-edit-guard.sh`](./pre-edit-guard.sh)）: `hookSpecificOutput.permissionDecision` = `deny`（`allow` / `ask` / `defer` も可）＋ `permissionDecisionReason`。※ PreToolUse の top-level `decision` / `reason` は**非推奨**
    - PostToolUse（[`post-edit-verify.sh`](./post-edit-verify.sh)）: top-level `decision` = `block` ＋ `reason`。理由がモデルに返るのでモデル自身が修正できる
  - 手動実行での判定は exit code ではなく**出力の JSON** で見る（`"permissionDecision":"deny"` / `"decision":"block"`）。exit code は常に 0
  - 複数のフックは並列に走り、最も厳しい判定が勝つ（`deny` > `defer` > `ask` > `allow`）。フックの `deny` は bypassPermissions モードでも有効
  - 公式リファレンス: https://code.claude.com/docs/en/hooks （最新の仕様を正とする）
- フック内のコマンドは AGENTS.md §6.1 に記録されたコマンドのみ（捏造禁止, AGENTS.md §3.1）。
- プロジェクト固有の検証コマンド・制約は AGENTS.md §6 に書き、フックは汎用のまま保つ。

## 公式構成との対応

- 公式 `.claude/settings.json` の `hooks` フィールドに、本ディレクトリの `.sh` スクリプトを登録する形が公式推奨。
- 本テンプレートでは `settings.json` に `SessionStart`, `PreToolUse`, `PostToolUse` のイベントを登録。
- 旧来の手順md（pre-task.md等）は人間の参照用として残し、自動実行は `.sh` + `settings.json` で行うハイブリッド構成。

## 登録していない公式イベント（必要になったら追加する）

公式のフックイベントは 30 種前後ある。本テンプレートは分野非依存を保つため 3 種だけ登録しているので、プロジェクト固有の必要が出たら次の候補から追加する。

| イベント | 使い道 |
| :--- | :--- |
| `UserPromptSubmit` | 指示にコンテキストを付与する（`additionalContext`）。`session-start.sh` の注入を指示単位で行う |
| `Stop` / `SubagentStop` | `AGENTS.md §5` の停止条件（検証 PASS・working tree clean・push 済み）を機械的に確認してから止める |
| `PreCompact` / `PostCompact` | 圧縮の前後で正本の所在と未完了タスクを再注入する（長いセッションでの記憶喪失対策） |
| `InstructionsLoaded` | `AGENTS.md` や `.agent/rules/*.md` が読み込まれた時に検査する |
| `SessionEnd` | セッション終了時に [`log-task.md`](./log-task.md) の追記を促す |
| `PermissionRequest` / `PermissionDenied` | 許可要求の記録・監査（`docs/audit/`） |
| `TaskCreated` / `TaskCompleted` | タスク管理（`docs/task-list.md`）との同期 |
| `FileChanged` / `CwdChanged` / `DirectoryAdded` | 作業対象の変化に追従する |

- matcher で絞りきれない条件は **`if` フィルタ**で宣言的に書ける（例: `"if": "Bash(git commit *)"`）。スクリプト側で `case` を分岐させるより無駄な起動が減る。
- フックの実体は shell 命令のほか HTTP エンドポイント・MCP ツール・LLM プロンプト・サブエージェントも指定できる。本テンプレートは依存を増やさないため **shell のみ**を使う（`.agent/README.md` の「特定のランタイムに依存しない」方針）。
- イベント一覧の正本は公式リファレンス: https://code.claude.com/docs/en/hooks
