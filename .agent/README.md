# .agent/ — Agent設定ディレクトリ

> 本ディレクトリは Claude Code の `.claude/` 構成に準拠する。リポジトリ直下の `.claude` は本ディレクトリへの **symlink**、`CLAUDE.md` は `AGENTS.md` への **symlink** で、Claude Code はどちらの名前でも同じ内容を読む。
> 公式仕様: https://code.claude.com/docs/en/claude-directory.md
>
> **指示ファイルの正本 `AGENTS.md` はツール非依存の公開標準**（Linux Foundation の Agentic AI Foundation が管理。Codex / Claude Code / Cursor / Copilot coding agent ほか 24+ ツールが読む）。`.agent/` の構成は Claude Code 準拠だが、`AGENTS.md` 側は特定ツールの書式に寄せない。どちらが何を読むかは `AGENTS.md §8.2` とリポジトリ直下 `README.md` の「どのツールで読まれるか」を参照。
>
> **本ディレクトリは Node.js・pnpm 等の特定のランタイムに依存しない。** フックは `sh` と標準的な Unix コマンド（`git`・`sed`・`awk`）だけで動く。

## ディレクトリ構成

```
.agent/
├── settings.json              # チーム共有設定（permissions, hooks, env）— コミット対象
├── settings.local.json        # 個人オーバーライド（gitignore）— 個人のみ
├── THIRD_PARTY_NOTICES.md     # 取り込んだ上流 OSS のライセンス表示
├── rules/                     # トピック別ルール（pathsで発火条件を絞れる）。入口は rules/index.md
│   ├── index.md
│   └── common/                # ECC 由来の共通規約 10 件（一部は paths でコード系に限定）
├── skills/<name>/SKILL.md     # 再利用プロンプト（46 件。入口は skills/index.md）
├── agents/                    # サブエージェント定義（planner, architect, code-explorer, docs-lookup ほか）
├── hooks/                     # フック手順(.md) + 実行スクリプト(.sh)
│   ├── index.md
│   ├── session-start.sh       # SessionStart: 作業状態の注入
│   ├── block-dangerous-git.sh # PreToolUse(Bash): 破壊的 git 操作のブロック
│   ├── pre-edit-guard.sh      # PreToolUse(Edit/Write): 編集禁止領域ブロック
│   └── post-edit-verify.sh    # PostToolUse: 事後検証
├── commands/                  # スラッシュコマンド（commit, test, code-review, checkpoint, plan, update-docs, project-init）
├── output-styles/             # 出力スタイル（concise, detailed）
├── workflows/                 # 動的ワークフロー（複数サブエージェントを束ねる）
├── agent-memory/              # サブエージェント永続メモリ（自動生成・gitignore）
└── logs/                      # タスク実行ログ（追加のみ）
```

## 各ファイルの役割

| ファイル | Commit | 役割 | 参考 |
|---|---|---|---|
| `settings.json` | ✓ | Permissions, hooks, env | [Settings](https://code.claude.com/docs/en/settings-reference.md) |
| `settings.local.json` |  | 個人オーバーライド（gitignore） | [Settings scopes](https://code.claude.com/docs/en/settings-reference.md) |
| `rules/*.md` | ✓ | トピック別ルール（pathsで発火条件） | [Rules](https://code.claude.com/docs/en/memory#organize-rules-with-claude/rules/) |
| `skills/<name>/SKILL.md` | ✓ | 再利用プロンプト（/name、自動発火） | [Skills](https://code.claude.com/docs/en/skills.md) |
| `commands/*.md` | ✓ | 単一ファイルのスラッシュコマンド | [Skills](https://code.claude.com/docs/en/skills.md) |
| `agents/*.md` | ✓ | サブエージェント定義 | [Subagents](https://code.claude.com/docs/en/sub-agents.md) |
| `output-styles/*.md` | ✓ | 出力スタイル | [Output styles](https://code.claude.com/docs/en/output-styles.md) |
| `workflows/*.js` | ✓ | 動的ワークフロー | [Workflows](https://code.claude.com/docs/en/workflows.md) |
| `hooks/*.sh` `hooks/*.md` | ✓ | 実行スクリプト（settings.json に登録）と定型手順 | [Hooks](https://code.claude.com/docs/en/hooks) |
| `agent-memory/` |  | サブエージェント永続メモリ（自動生成・gitignore） | [Memory](https://code.claude.com/docs/en/memory) |
| `THIRD_PARTY_NOTICES.md` | ✓ | 取り込んだ上流 OSS のライセンス表示 | — |
| `logs/` | ✓ | タスク実行ログ（**テンプレート独自**） | — |

### 公式 `.claude/` 構成との対応

`settings.json`・`rules/`・`skills/`・`commands/`・`agents/`・`output-styles/`・`workflows/`・`agent-memory/` は公式と**同型**（ディレクトリ名・ファイル名・frontmatter の必須キーとも）。テンプレート独自は次の 2 つだけ。

| 公式 `.claude/` | 本テンプレート | 備考 |
|---|---|---|
| — | `hooks/` | 手順 `.md` ＋ 実行 `.sh`。登録は公式どおり `settings.json` の `hooks` 経由 |
| — | `logs/` | 4 セクション（指示内容/実行内容/気づき/次アクション）の実行ログ。**追加のみ** |
| `CLAUDE.md` | `CLAUDE.md` → `AGENTS.md`（symlink） | 正本は `AGENTS.md`。どちらの名前でも同じ内容が読まれる |

`rules/`・`skills/`・`hooks/` の各ディレクトリ直下には **`index.md`**（入口）を置く。`logs/` は日付名で並ぶため不要。

## フック（settings.json に登録済み）

| イベント | matcher | スクリプト | 役割 |
|---|---|---|---|
| `SessionStart` | `startup\|resume\|clear\|compact` | `hooks/session-start.sh` | 正本の所在・ブランチ・直近コミット・未コミット変更・未完了サマリーを注入 |
| `PreToolUse` | `Bash` | `hooks/block-dangerous-git.sh` | force push・`reset --hard`・main への push 等をブロック（`permissionDecision: deny` の JSON） |
| `PreToolUse` | `Edit\|MultiEdit\|Write` | `hooks/pre-edit-guard.sh` | 編集禁止領域（`.git/`・依存・生成物）をブロック |
| `PostToolUse` | `Edit\|MultiEdit\|Write` | `hooks/post-edit-verify.sh` | 編集後の事後検証 |

フックの動作確認例:

```bash
echo '{"tool_input":{"command":"git push --force origin x"}}' | sh .agent/hooks/block-dangerous-git.sh; echo $?   # 2（ブロック）
sh .agent/hooks/session-start.sh | head -c 200                                                                  # JSON（hookSpecificOutput）
```

## 運用ルール

- **settings.json** はチーム共有。個人の上書きは `settings.local.json` へ。
- **rules/** はトピック別に分割。`paths` フロントマターで発火条件を絞る。
- **skills/** は `<name>/SKILL.md` 形式。frontmatter に `name`, `description` 必須。`description` は自動発火の判断材料なので具体的に書く。
- **agents/** は `name`, `description`, `tools`, `model` 等の frontmatter + システムプロンプト本文。
- **hooks/** は手順(.md)と実行スクリプト(.sh)の両方を置く。実行登録は `settings.json` の `hooks` で行う。
- **logs/** は追加のみ。過去ログを書き換えない。
- 上流から取り込んだ skill / agent / command / hook は出典を `skills/index.md` と `THIRD_PARTY_NOTICES.md` に記録する。

## 新規プロジェクトへの適用手順

Agent に任せる（推奨）: 「初期設定して」と依頼し、[`.agent/skills/project-init/SKILL.md`](./skills/project-init/SKILL.md) に従う。質問 → 計画の承認 → 文書と Agent 設定の書き換え。承認前にファイルを触らせない。

自分で書く場合:

1. GitHubで「Use this template」から新規リポジトリ作成
2. `AGENTS.md §6` にプロジェクト固有のルールを追記（特に §6.1 に検証コマンドを記録）
3. `.agent/skills/project-overview/SKILL.md` をプロジェクト用に書き換え
4. `README.md` をプロジェクト用に書き換え
5. `docs/` を必要に応じて整理（`docs/README.md` の目次も更新）
6. 分野に合わない skill（例: Web 専用の `e2e`、ソフトウェア専用の `import-boundaries`）は削除してよい（独断では削らない）
7. ファイル名は短く正確、ハイフン最大1つ（例: `yaml-top.test.ts` OK）
