# アーキテクチャ（構成と読み込みの流れ）

## 1. ディレクトリ構成

```
TEMPLATE_REPO/
├── AGENTS.md              # 作業規約（§1〜§5・§7・§8は汎用、§6はプロジェクト固有）
├── CLAUDE.md              # AGENTS.md への symlink
├── README.md              # プロジェクトの概要（テンプレート利用時に書き換える）
├── LICENSE
├── Makefile               # 検証の入口（check / links / mermaid / agents / lang / index / test。setup は hooks:install）
├── package.json / bun.lock # Bun の依存・検証・setup の入口
├── tsconfig.json / knip.jsonc # 型検査と未使用コード検査の設定
├── patches/               # Bun install で適用する agents-md-lint の修正
├── .githooks/             # Bun 検証と commit-msg フック
├── biome.json             # JSON / JS / TS / CSS の整形と lint
├── .editorconfig          # エディタ間の基本書式
├── .gitleaks.toml         # 秘密情報検出の許可リスト
├── .gitignore
├── scripts/               # Bun の TypeScript CLI と検査
│   ├── setup.ts # 初期設定の入口（引数・対話・承認・適用の指揮）
│   ├── setup-options.ts / setup-manifest.ts / setup-schema.ts # 引数と承認・雛形・Zod スキーマ
│   ├── setup-package.ts / setup-plan.ts / setup-apply.ts / setup-install.ts # package.json・計画・書き込み・導入
│   ├── setup-init.ts / init-detect.ts / init-docs.ts / init-agents.ts / init-arch.ts # テンプレート初期化（痕跡の検出と文書の生成）
│   ├── setup-env.ts / safe-path.ts # OS パッケージと言語別の手順・生成パスの検証
│   ├── verify-generated.ts # 生成物の静的検査・明示ビルド
│   ├── check.ts / check-agents.ts / check-index.ts / walk.ts # 全ゲート・指示ファイル・入口整合・ファイル列挙
│   ├── check-shell.ts / check-function-length.ts / check-coverage.ts # POSIX sh・関数長・カバレッジ
│   ├── install-hooks.ts # Git フックの安全な導入
│   ├── check-doc-links.ts # Markdown の内部リンク
│   ├── check-mermaid.ts   # Mermaid 図の宣言
│   ├── check-language.ts  # 日本語・英語ゲート
│   └── check-commit.ts / conventional-commit.ts / git-report.ts # コミット形式・読み取り専用レポート
├── tests/                 # セットアップ・スキーマ・npm bin・CI 負例の回帰テスト
│   └── fixtures/          # CI の負例（invalid / unsafe workflow）
├── .github/               # CI・リリース・依存関係レビュー・OSV スキャン・dependabot
├── .claude                # .agent/ への symlink
├── .agent/                # Agent の設定と知識（.claude はここへの symlink）
│   ├── README.md          # .agent/ の説明
│   ├── THIRD_PARTY_NOTICES.md # 取り込んだ上流 OSS のライセンス表示
│   ├── settings.json      # 共有設定（permissions・hooks・env）
│   ├── rules/             # トピック別ルール
│   ├── skills/            # 分野別ノウハウ（入口: skills/index.md）
│   ├── hooks/             # 手順（pre-task / verify-commit / log-task / sandbox-recovery）と実行スクリプト（.sh）
│   ├── agents/            # サブエージェントの定義
│   ├── commands/          # 単一ファイルのプロンプト
│   ├── output-styles/     # 出力スタイル
│   └── workflows/         # 複数エージェントをまとめる手順
└── docs/                  # ドキュメント（目次: docs/README.md）
    ├── README.md          # 全ドキュメントの目次
    ├── task-list.md       # 派生プロジェクト用の空の進捗表
    ├── arch/              # 仕様（本ディレクトリ）
    ├── adr/               # 新たに採用した設計判断
    ├── planning/          # 計画書の書式（過去の開発計画は含めない）
    ├── research/          # 調査
    ├── audit/             # 新しい差分・問題の記録
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
| `docs/arch/` | 仕様・構成の記録（判断は `docs/adr/`） | 中 |
| `docs/adr/` | 設計判断の記録（過去の ADR は書き換えない） | 低（判断追加時） |
| `docs/planning/` | 個別タスクの計画 | 高（タスクごと） |

同じ内容を複数箇所に書かない。作業手順は AGENTS.md、詳細ルールは rules/、分野の知識は skills/、進捗は task-list.md を正とする。

## 3. Agent が情報を読み込む流れ

1. **セッション開始・指示受領時**: `SessionStart` フックから `AGENTS.md §1.3` の自律ルールと作業状態を受け取り、`hooks/pre-task.md` で目的・不足作業・事前確認が必要な境界を特定する。現在のブランチ・直近のコミット・未コミット差分も確認する。
2. **作業規約の確認**: `AGENTS.md` を読む。プロジェクト固有の検証手段は §6.1 を参照。
3. **知識の選択**: `.agent/skills/index.md` の「読み方ガイド」から、必要なスキルだけを読む（全件は読まない）。テンプレートのプレースホルダが残っている新規リポジトリでは、先に `project-init` を読む（承認前にファイルを書き換えない）。
4. **編集時**: `PreToolUse` で編集禁止領域を確認し（`pre-edit-guard.sh`）、`PostToolUse` で機密ファイル混入やドキュメント目次の更新漏れを確認する（`post-edit-verify.sh`）。
5. **完了時**: `hooks/verify-commit.md` に従い、目的の完了条件と検証結果を確認する。証拠・未解決・未実施検証を `task-list.md` に記録し、報告にも残す（`hooks/log-task.md`）。
6. **停止時**: `Stop` フックが `AGENTS.md §5` の停止条件（working tree が clean・上流へ push 済み）を確認する（`stop-verify.sh`）。

## 4. 変更の原則

- 構成を変えたら、本ファイル・`docs/README.md`・`README.md`・`AGENTS.md §8` を同じ変更で更新する。
- `make setup` は `bun run hooks:install` の互換入口で、`bun run setup`（`scripts/setup.ts` の初期設定 CLI）とは別物。
- フックのスクリプトは POSIX `sh` で書き、判定は JSON を stdout へ出して `exit 0` で返す（PreToolUse は `hookSpecificOutput.permissionDecision`、PostToolUse と Stop は top-level `decision`）。exit code の意味は公式リファレンスに従い、`.agent/hooks/index.md` に規約を記録する。
- 環境に依存する設定（OS・ランタイム・外部サービス）はテンプレート本体に入れず、`AGENTS.md §6` に書く。
- `bun run init`（`setup --init-only`）が生成する文書は、実物（`package.json` のコマンド・`scripts/check.ts` のゲート・`docs/` の構成・Git remote）から作る。手で直した内容は次の生成で上書きされるので、恒久的な事実は `AGENTS.md §6` か本ディレクトリの生成元に書く。
- 図の正本は `.md` 内の Mermaid ソースで、生成物の画像をリポジトリに置かない。図の検証は `make mermaid`。
- `scripts/` の検証スクリプトは TypeScript / Bun を前提とする。日本語判定には Bun 管理の `iconv-lite` を用いる。
