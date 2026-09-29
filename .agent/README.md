# .agent/ — Agent設定ディレクトリ

> 本ディレクトリはClaude Code公式の `.claude/` ディレクトリ構成に準拠しつつ、ディレクトリ名は `.agent/` のまま維持しています。
> 公式仕様: https://code.claude.com/docs/en/claude-directory.md

## ディレクトリ構成

```
.agent/
├── settings.json              # チーム共有設定（permissions, hooks, env, model）— コミット対象
├── settings.local.json        # 個人オーバーライド（gitignore）— 個人のみ
├── rules/                     # トピック別ルール（pathsで発火条件を絞れる）
│   ├── 01_information-hierarchy.md
│   ├── 02_git-workflow.md
│   ├── 03_doc-style.md
│   ├── 04_verification.md
│   └── project-template.md
├── skills/<name>/SKILL.md     # 再利用プロンプト（/nameで呼び出し、自動発火も可能）
│   ├── project-overview/      # 製品概要・構成把握
│   ├── tech-stack/            # 技術スタック・ハマりどころ
│   ├── sandbox-constraints/   # Sandbox制約・迂回策
│   ├── verify-doc-integrity/  # ドキュメント整合性検証
│   ├── diff-review-report/    # 差分レビューレポート
│   ├── docs-maintenance/      # ドキュメント整理・URL検証（cod-web最新arena由来）
│   ├── ci-quality-gates/      # CI品質ゲート・workflow正本管理（cod-web最新arena由来）
│   ├── testing/               # 意味あるテスト・coverage 100%・mock戦略（cod-web最新arena由来）
│   ├── import-boundaries/     # レイヤー境界・import制限（cod-web最新arena由来）
│   ├── determinism/           # 決定論・禁止API検出（cod-web deterministic-sim由来）
│   ├── e2e/                   # Playwright E2E・webServer配列（cod-web最新arena由来）
│   ├── memory-leak/           # メモリリーク防止・leave時clear（cod-web最新arena由来）
│   └── zero-alloc/            # ゼロアロケーション・GC削減（cod-web最新arena由来）
├── agents/                    # サブエージェント定義（name, description, tools, model等）
│   ├── explore.md
│   ├── plan.md
│   ├── doc-editor.md
│   ├── code-reviewer.md
│   └── test-writer.md
├── hooks/                     # フック手順(.md) + 実行スクリプト(.sh)
│   ├── index.md               # 索引
│   ├── pre-task.md            # タスク開始時
│   ├── verify-commit.md # commit直前
│   ├── log-task.md            # タスク完了時
│   ├── sandbox-recovery.md
│   ├── restore-env.sh
│   ├── pre_edit_guard.sh      # PreToolUse: 編集禁止領域ブロック
│   └── post_edit_verify.sh    # PostToolUse: 事後検証
├── commands/                  # 旧commands互換（新しくはskills/を使う）
│   ├── commit.md
│   ├── review.md
│   └── test.md
├── output-styles/             # 出力スタイル（concise, detailed等）
│   ├── concise.md
│   └── detailed.md
├── workflows/                 # 動的ワークフロー（複数サブエージェントを束ねる）
│   └── implement-task.js
├── agent-memory/              # サブエージェント永続メモリ（自動生成）
└── logs/                      # タスク実行ログ（追加のみ、書き換え禁止）
    └── YYYY-MM-DD_<summary>.md
```

## 各ファイルの役割（公式準拠）

| ファイル | Scope | Commit | 役割 | 参考 |
|---|---|---|---|---|
| `settings.json` | Project | ✓ | Permissions, hooks, env, model | [Settings](https://code.claude.com/docs/en/settings-reference.md) |
| `settings.local.json` | Project |  | 個人オーバーライド、gitignore | [Settings scopes](https://code.claude.com/docs/en/settings-reference.md) |
| `rules/*.md` | Project | ✓ | トピック別ルール、pathsで発火条件 | [Rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/) |
| `skills/<name>/SKILL.md` | Project | ✓ | 再利用プロンプト、/nameで呼び出し | [Skills](https://code.claude.com/docs/en/skills.md) |
| `commands/*.md` | Project | ✓ | 単一ファイルプロンプト、skillsと同じ機構 | [Skills](https://code.claude.com/docs/en/skills.md) |
| `output-styles/*.md` | Project | ✓ | 出力スタイルのカスタマイズ | [Output styles](https://code.claude.com/docs/en/output-styles.md) |
| `agents/*.md` | Project | ✓ | サブエージェント定義 | [Subagents](https://code.claude.com/docs/en/sub-agents.md) |
| `workflows/*.js` | Project | ✓ | 動的ワークフロー | [Workflows](https://code.claude.com/docs/en/workflows.md) |
| `agent-memory/<name>/` | Project | ✓ | サブエージェント永続メモリ | [Persistent memory](https://code.claude.com/docs/en/sub-agents#enable-persistent-memory) |
| `logs/` | Project | ✓ | タスク実行ログ | テンプレート独自（PalmIDE由来） |

## 運用ルール

- **settings.json** はチーム共有。permissions, hooks, envを定義。個人の上書きは `settings.local.json` へ。
- **rules/** はトピック別に分割。`paths` フロントマターで発火条件を絞る。例: `paths: ["docs/**"]` ならdocs編集時のみ読まれる。
- **skills/** は `<name>/SKILL.md` 形式。frontmatterに `name`, `description` 必須。`description` は自動発火の判断材料なので具体的に書く。
- **agents/** は `name`, `description`, `tools`, `model` 等のfrontmatter + システムプロンプト本文。
- **hooks/** は手順(.md)と実行スクリプト(.sh)の両方を置く。実行登録は `settings.json` の `hooks` で行う。
- **logs/** は追加のみ。過去ログを書き換えない。

## 他リポジトリからの良い部分の採用

- **PalmIDE**: rules/のトピック分割、agents/の定義、skills/のモジュール化、hooks/のPOSIX sh + exit code規約、settings.example.jsonの配線例
- **cod-web (main)**: hooks/settings.jsonのイベント登録パターン、skills/<name>/SKILL.mdのfrontmatter形式、scripts/execute.tsの汎用ランナー
- **cod-web (arena/01a0b161-cod-web 最新arena)**: 18スキルへの拡張、docs-maintenance/ci-quality-gates/testing/import-boundaries/determinism/e2e/memory-leak/zero-allocの汎用スキル、check-all.tsの並列品質ゲート（install先行+abort+hang修正+setsid+summary.log）、check-determinism.tsの禁止API検出、quality-gates.ymlの構成（checkout@v6, setup-bun@v2, inputs.job, quality+e2e分離、coverage閾値100%、E2E discovery --list）
- **DropMod**: GitHub ActionsのCI構成（static-checks + build + e2e、pnpm/action-setup@v4のバージョン非明示、cache、artifact共有、paths-ignore）
- **ytdl**: 検証キットのUXルール（?probe=1 / 1 fetch / 外部リトライ / raw URL + 自己チェック）

## 今後の使い方（新規リポジトリへの適用手順）

1. GitHubで「Use this template」から新規リポジトリ作成
2. `AGENTS.md §6` にプロジェクト固有のルールを追記
3. `.agent/skills/project-overview/SKILL.md` をプロジェクト用に書き換え
4. `README.md` をプロジェクト用に書き換え（現在の機能 + arch/planning/research構成）
5. `package.json` の `name`, `description`, `packageManager` を更新（`pnpm@12.6.0`）
6. `.nvmrc` をNodeのLTSバージョンに更新
7. `.github/workflows/ci.yml` をプロジェクト用に調整
8. `docs/` は cod-web arena/01a0b161-cod-web準拠で復旧 — arch/ (仕様) + planning/ (計画) + research/ (調査) + audit/ (監査) + ops/ (運用) + examples/ (設定例) + task-list.md (正本) — 以前は削除していたが、活発リポジトリ調査（2026-09-27）により必要と判断し復旧
9. ファイル名は短く正確、ハイフン最大1つ（例: `yaml-top.test.ts` OK）
