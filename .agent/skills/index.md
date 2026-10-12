# Skills Index — Agentのスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent 自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・手順・パターン。設計仕様の正本ではない。設計の正本は `docs/`。
> 作業規約は `AGENTS.md` と `.agent/rules/`。
>
> 各スキルは `<name>/SKILL.md`（YAML frontmatter に `name` / `description`）。
>
> スキル本文は **この環境の function call 名** だけを使う。Claude Code の `Skill` / `WebSearch` / `WebFetch` / `Task` / Context7 / exa は使わない。

## この環境の function call

| function call | 用途 | 主な引数 |
| :--- | :--- | :--- |
| `web_search` | ウェブ検索 | `query`, `depth` (`"1"`/`"2"`/`"3"`) |
| `fetch_page` | URL の本文 | `url`, `chunkIndex` |
| `ask_user` | ユーザーへの質問 | `questions`（最大 4、選択肢 2〜4 + 自由記述） |
| `read_file` | ファイルを読む | `path` |
| `write_file` / `edit_file` | ファイルを書く | `path` / `old_text`+`new_text` |
| `bash` | コマンド | `command` |
| `start_process` / `get_process_output` / `stop_process` | 常駐プロセス | `command` / `process_id` |
| `generate_image` / `image_search` | 画像 | `prompt` / `query` |
| `add_voice` / `generate_speech` | 音声 | `text`, `voice_id` |
| `present_file` | 成果物を開く | `path` |
| `list_connector_tools` | 連携アプリ | `service` |

他スキルを使うときは `read_file` で `.agent/skills/<name>/SKILL.md` を読む。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| テンプレートから作った新規プロジェクトの初期設定 | [`project-init`](./project-init/SKILL.md) |
| 初回 / 全体把握 | [`project-overview`](./project-overview/SKILL.md) |
| 技術の選定・設定・記録 | [`tech-stack`](./tech-stack/SKILL.md) |
| 「動かない / 検証できない / 外部に接続したい」環境トラブル | [`sandbox-constraints`](./sandbox-constraints/SKILL.md) |
| 作業の着手前に要件をすり合わせ、設計を決める | [`brainstorming`](./brainstorming/SKILL.md) → [`writing-plans`](./writing-plans/SKILL.md) |
| 計画を実行する（順番に / サブエージェントに分担） | [`executing-plans`](./executing-plans/SKILL.md) / [`subagent-driven-development`](./subagent-driven-development/SKILL.md) |
| 機能追加・バグ修正を テスト先行で進める | [`test-driven-development`](./test-driven-development/SKILL.md) |
| 不具合の原因を体系的に特定する | [`systematic-debugging`](./systematic-debugging/SKILL.md) |
| 「完了」と言う前に検証する | [`verification-before-completion`](./verification-before-completion/SKILL.md) |
| 差分をレビューする / レビュー指摘を受けて対応する | [`requesting-code-review`](./requesting-code-review/SKILL.md) / [`receiving-code-review`](./receiving-code-review/SKILL.md) |
| 作業ブランチの後始末（マージ・PR・破棄） | [`finishing-a-development-branch`](./finishing-a-development-branch/SKILL.md) / [`using-git-worktrees`](./using-git-worktrees/SKILL.md) |
| 外部情報・ライブラリの仕様を調べる | [`search-first`](./search-first/SKILL.md) / [`documentation-lookup`](./documentation-lookup/SKILL.md) / [`deep-research`](./deep-research/SKILL.md)（`web_search` + `fetch_page`） |
| 判断が割れる論点を多角的に検討する | [`council`](./council/SKILL.md) / [`grilling`](./grilling/SKILL.md) |
| 設計判断を記録する（ADR） | [`architecture-decision-records`](./architecture-decision-records/SKILL.md) |
| ドキュメントの整合・整理・URL 検証 | [`docs-maintenance`](./docs-maintenance/SKILL.md) |
| 意味のあるテスト・カバレッジ・モック戦略 | [`testing`](./testing/SKILL.md) |
| CI・pre-commit の品質ゲート、段階的な検証の組み立て | [`ci-quality-gates`](./ci-quality-gates/SKILL.md) |
| 利用者の操作経路を通しで検証する（E2E） | [`e2e`](./e2e/SKILL.md) |
| レイヤー境界・依存方向・循環参照の防止 | [`import-boundaries`](./import-boundaries/SKILL.md) |
| 同じ入力で同じ結果を守る（決定論）・禁止 API の検出 | [`determinism`](./determinism/SKILL.md) |
| リソースの解放漏れ防止 | [`memory-leak`](./memory-leak/SKILL.md) |
| ホットパスでの不要な割り当ての削減 | [`zero-alloc`](./zero-alloc/SKILL.md) |
| 新しい skill を作る / 既存 skill を改善する | [`writing-skills`](./writing-skills/SKILL.md) / [`skill-creator`](./skill-creator/SKILL.md) |

> 分野欄が「ソフトウェア」のスキルは、コードを扱う作業でのみ使う。それ以外の分野では読まなくてよい。

## 設計・進捗の正本（スキルではなく docs/）

| 文書 | 内容 |
| :--- | :--- |
| [docs/README.md](../../docs/README.md) | 全ドキュメントの目次 |
| [docs/task-list.md](../../docs/task-list.md) | タスク管理の唯一の正本 |
| [docs/arch/README.md](../../docs/arch/README.md) | 仕様書一覧 |
| [docs/planning/_TEMPLATE.md](../../docs/planning/_TEMPLATE.md) | 計画書テンプレート |
| [AGENTS.md](../../AGENTS.md) | 開発規約（§1〜§5 汎用 + §6 プロジェクト固有） |
| [.agent/rules/](../rules/) | トピック別ルール |

## スキル一覧

| スキル | できるようになること | 分野 | 出典 |
| :--- | :--- | :--- | :--- |
| [project-overview](./project-overview/SKILL.md) | テンプレートの構成と運用の全体像を把握する | 共通 | 自作 |
| [project-init](./project-init/SKILL.md) | 新規プロジェクトの意図確認・計画承認・文書と Agent 設定の書き換え | 共通 | 自作 |
| [tech-stack](./tech-stack/SKILL.md) | 分野に応じて技術を選び、AGENTS.md §6.1 に記録する | 共通 | 自作 |
| [sandbox-constraints](./sandbox-constraints/SKILL.md) | Sandbox の制約を見極め、迂回・復旧して作業を続ける | 共通 | 自作 |
| [docs-maintenance](./docs-maintenance/SKILL.md) | ドキュメントの整理・内部リンク（`bash`）・外部 URL（`fetch_page`） | 共通 | 自作 |
| [using-superpowers](./using-superpowers/SKILL.md) | スキルの探し方と発火ルールを理解し、該当スキルを必ず先に読む | 共通 | superpowers |
| [brainstorming](./brainstorming/SKILL.md) | 実装前に要件・前提・代替案を対話で詰め、設計を承認してもらう | 共通 | superpowers |
| [writing-plans](./writing-plans/SKILL.md) | 承認済みの設計を、順番に実行できる小さな手順の計画にする | 共通 | superpowers |
| [executing-plans](./executing-plans/SKILL.md) | 計画を段階ごとに実行し、各段階で検証しながら進める | 共通 | superpowers |
| [subagent-driven-development](./subagent-driven-development/SKILL.md) | 独立したタスクを、サブエージェントに分担して実行する | 共通 | superpowers |
| [dispatching-parallel-agents](./dispatching-parallel-agents/SKILL.md) | 独立した複数の問題を、並列のサブエージェントで同時に調べる | 共通 | superpowers |
| [using-git-worktrees](./using-git-worktrees/SKILL.md) | 作業を隔離した git worktree で行い、本線を汚さない | 共通 | superpowers |
| [finishing-a-development-branch](./finishing-a-development-branch/SKILL.md) | 作業ブランチを、マージ・PR・保留・破棄のいずれかで締める | 共通 | superpowers |
| [test-driven-development](./test-driven-development/SKILL.md) | 失敗するテストを先に書き、最小の実装で通してから整える | ソフトウェア | superpowers |
| [systematic-debugging](./systematic-debugging/SKILL.md) | 原因を仮説と検証で絞り込み、推測での修正を避ける | 共通 | superpowers |
| [verification-before-completion](./verification-before-completion/SKILL.md) | 完了を宣言する前に `bash` で検証する | 共通 | superpowers |
| [requesting-code-review](./requesting-code-review/SKILL.md) | 差分をレビューできる形にまとめ、観点を明示してレビューを依頼する | 共通 | superpowers |
| [receiving-code-review](./receiving-code-review/SKILL.md) | レビュー指摘を検証してから取り入れ、根拠なく同意しない | 共通 | superpowers |
| [writing-skills](./writing-skills/SKILL.md) | 再利用できるスキルを、テストしながら書いて改善する | 共通 | superpowers |
| [search-first](./search-first/SKILL.md) | 自作前に既存のライブラリ・ツールを `web_search` で探す | 共通 | ECC |
| [documentation-lookup](./documentation-lookup/SKILL.md) | 公式ドキュメントを `web_search` → `fetch_page` で確認する | 共通 | ECC |
| [deep-research](./deep-research/SKILL.md) | 複数の情報源を並列に調べ、出典付きの調査報告にまとめる | 共通 | ECC |
| [council](./council/SKILL.md) | 論点を複数の視点で検討し、判断と根拠を残す | 共通 | ECC |
| [architecture-decision-records](./architecture-decision-records/SKILL.md) | 設計判断を ADR（docs/adr/NNNN-title.md）として記録する | 共通 | ECC |
| [article-writing](./article-writing/SKILL.md) | 読み手に合わせて、記事・解説文を書く | 共通 | ECC |
| [grilling](./grilling/SKILL.md) | 計画の前提を `ask_user` のラウンドで潰す | 共通 | mattpocock/skills |
| [handoff](./handoff/SKILL.md) | 別セッション・別担当へ引き継ぐための文書を作る | 共通 | mattpocock/skills |
| [teach](./teach/SKILL.md) | 相手の理解度に合わせて段階的に説明する | 共通 | mattpocock/skills |
| [writing-for-agents](./writing-for-agents/SKILL.md) | 他のエージェントが迷わず読める指示文書を書く | 共通 | mattpocock/skills |
| [to-questionnaire](./to-questionnaire/SKILL.md) | 不足情報を質問票にまとめ、一度に回収する | 共通 | mattpocock/skills |
| [prototype](./prototype/SKILL.md) | 本実装の前に、捨てても良い最小の試作で仮説を検証する | 共通 | mattpocock/skills |
| [retro](./retro/SKILL.md) | 作業後に、うまくいったこと・改善点を振り返る | 共通 | mattpocock/skills |
| [codebase-design](./codebase-design/SKILL.md) | 既存の構造を読み取り、変更の置き場所と責務を決める | ソフトウェア | mattpocock/skills |
| [improve-codebase-architecture](./improve-codebase-architecture/SKILL.md) | 依存・責務の問題を見つけ、段階的な構造改善を計画する | ソフトウェア | mattpocock/skills |
| [domain-modeling](./domain-modeling/SKILL.md) | 業務用語と概念モデルを整理し、コードと文書の語彙を揃える | ソフトウェア | mattpocock/skills |
| [testing](./testing/SKILL.md) | 意味のあるテストを書き、カバレッジの目標を達成する | 共通 | 自作 |
| [ci-quality-gates](./ci-quality-gates/SKILL.md) | 品質ゲートを段階的に実行し、CI と手元の検証を揃える | 共通 | 自作 |
| [import-boundaries](./import-boundaries/SKILL.md) | レイヤー間の依存方向を守り、循環参照と責務混在を防ぐ | 共通 | 自作 |
| [determinism](./determinism/SKILL.md) | 純粋ロジックの決定論を守り、same-input テストを書く | 共通 | 自作 |
| [memory-leak](./memory-leak/SKILL.md) | リソース解放漏れを防ぎ、回帰テストを書く | 共通 | 自作 |
| [zero-alloc](./zero-alloc/SKILL.md) | ホットパスでの不要なアロケーションを避ける | 共通 | 自作 |
| [e2e](./e2e/SKILL.md) | 利用者の操作経路を通しで検証する E2E を安定して実行する | 共通 | 自作 |
| [skill-creator](./skill-creator/SKILL.md) | スキルの作成・評価・改善を、実測に基づいて進める | 共通 | anthropics/skills（Apache-2.0） |
| [discernment-nudge](./discernment-nudge/SKILL.md) | 判断の根拠が弱いときに、確認・再検討を促す | 共通 | anthropics/skills（Apache-2.0） |

> 出典が「自作」以外のスキルは、上流のライセンスに従う。詳細は [`.agent/THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。

## 運用ルール

- 新しいノウハウ（特に**実測で判明した**制約・挙動）を得たらスキルとして追加・更新する。
- 新スキル追加時は「読み方ガイド」と「スキル一覧」の両方に追記する。
- スキルは実践的なやり方・手順・回避策を書く。設計の正本は `docs/`。
- AGENTS.md と重複する作業規約はスキルに書かず、AGENTS.md / rules/ を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatter に `name` / `description` 必須）。`description` は自動発火の判断材料なので具体的に書く。
