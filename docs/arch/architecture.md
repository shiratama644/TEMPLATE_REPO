# アーキテクチャ（構成と読み込みの流れ）

## 1. ディレクトリ構成

```
TEMPLATE_REPO/
├── AGENTS.md              # 作業規約（§1〜§5・§7・§8は汎用、§6はプロジェクト固有）
├── CLAUDE.md              # AGENTS.md への symlink
├── README.md              # プロジェクトの概要（テンプレート利用時に書き換える）
├── LICENSE
├── Makefile               # 検証の入口（check / links / mermaid / setup）
├── .pre-commit-config.yaml # commit 時の検査（make check と同じフック）
├── biome.json             # JSON / JS / TS / CSS の整形と lint
├── .editorconfig          # エディタ間の基本書式
├── .gitleaks.toml         # 秘密情報検出の許可リスト
├── .gitignore
├── scripts/               # 検証スクリプト（標準ライブラリのみ）
│   ├── check_doc_links.py # Markdown の内部リンクの実在
│   └── check_mermaid.py   # Mermaid 図の宣言（種類・重複）
├── .github/               # CI・リリース・依存関係レビュー・dependabot
├── .agent/                # Agent の設定と知識（.claude はここへの symlink）
│   ├── README.md          # .agent/ の説明
│   ├── settings.json      # 共有設定（permissions・hooks・env）
│   ├── rules/             # トピック別ルール
│   ├── skills/            # 分野別ノウハウ（入口: skills/index.md）
│   ├── hooks/             # トリガー別の手順（.md）と実行スクリプト（.sh）
│   ├── agents/            # サブエージェントの定義
│   ├── commands/          # 単一ファイルのプロンプト
│   ├── output-styles/     # 出力スタイル
│   ├── workflows/         # 複数エージェントをまとめる手順
│   └── logs/              # タスク実行ログ（追加のみ）
└── docs/                  # ドキュメント（目次: docs/README.md）
    ├── task-list.md       # 進捗の正本
    ├── arch/              # 仕様（本ディレクトリ）
    ├── adr/               # 設計判断の記録（1 判断 1 ファイル）
    ├── planning/          # 計画書
    ├── research/          # 調査
    ├── audit/             # 監査（差分・問題点の記録）
    └── ops/               # 運用手順
```

## 2. 責務の分担

| 対象 | 役割 | 変更頻度の目安 |
|---|---|---|
| `AGENTS.md` | 「どう作業するか」の規約。常に正 | 低（方針変更時） |
| `.agent/rules/` | 「いつ・どのファイルで何を守るか」の詳細 | 低 |
| `.agent/skills/` | 「どうやるとうまくいくか」の知識。実測で分かった事実を反映 | 中 |
| `.agent/hooks/` | トリガー別の定型手順・自動チェック | 低 |
| `docs/task-list.md` | 進捗と証拠の正本 | 高（タスクごと） |
| `docs/arch/` | 仕様・構成・判断の記録 | 中 |
| `docs/planning/` | 個別タスクの計画 | 高（タスクごと） |
| `.agent/logs/` | 実行の事実の記録。書き換えない | 追加のみ |

同じ内容を複数箇所に書かない。作業手順は AGENTS.md、詳細ルールは rules/、分野の知識は skills/、進捗は task-list.md を正とする。

## 3. Agent が情報を読み込む流れ

1. **セッション開始・指示受領時**: `SessionStart` フックから `AGENTS.md §1.3` の自律ルールと作業状態を受け取り、`hooks/pre-task.md` で目的・不足作業・事前確認が必要な境界を特定する。現在のブランチ・直近のコミット・未コミット差分も確認する。
2. **作業規約の確認**: `AGENTS.md` を読む。プロジェクト固有の検証手段は §6.1 を参照。
3. **知識の選択**: `.agent/skills/index.md` の「読み方ガイド」から、必要なスキルだけを読む（全件は読まない）。テンプレートのプレースホルダが残っている新規リポジトリでは、先に `project-init` を読む（承認前にファイルを書き換えない）。
4. **編集時**: `PreToolUse` で編集禁止領域を確認し（`pre-edit-guard.sh`）、`PostToolUse` で機密ファイル混入やドキュメント目次の更新漏れを確認する（`post-edit-verify.sh`）。
5. **完了時**: `hooks/verify-commit.md` に従い、目的の完了条件と検証結果を確認する。証拠を `task-list.md` に記録し、追加で判断した作業・未解決・未実施検証を `.agent/logs/` と報告に残す（`hooks/log-task.md`）。

## 4. 変更の原則

- 構成を変えたら、本ファイル・`docs/README.md`・`README.md`・`AGENTS.md §8` を同じ変更で更新する。
- フックのスクリプトは POSIX `sh` で書き、判定は JSON を stdout へ出して `exit 0` で返す（PreToolUse は `hookSpecificOutput.permissionDecision`、PostToolUse は top-level `decision`）。exit code の意味は公式リファレンスに従い、`.agent/hooks/index.md` に規約を記録する。
- 環境に依存する設定（OS・ランタイム・外部サービス）はテンプレート本体に入れず、`AGENTS.md §6` に書く。
- 図の正本は `.md` 内の Mermaid ソースで、生成物の画像をリポジトリに置かない（[`adr/0001-mermaid-source.md`](../adr/0001-mermaid-source.md)）。図の検証は `make mermaid`。
- `scripts/` の検証スクリプトは標準ライブラリのみで書き、外部の取得や追加のランタイムを必要としない。
