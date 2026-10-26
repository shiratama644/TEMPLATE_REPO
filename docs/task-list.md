# タスクリスト (唯一の正本)

> **運用規則** — Qiita「Claude Code／Codex に中〜大規模開発を任せるためのタスク管理」
> (<https://qiita.com/Y-Y-dev/items/d526fb7cdbe35a3f9384>) に基づく運用。
>
> 1. **本ファイルが進捗管理の唯一の正本**。チャット・Issue・AI の完了報告と本ファイルが
>    矛盾する場合は本ファイルを正とする。
> 2. **進行中タスクは原則 1 件**。複数を同時に進めない (独立性の高い調査・テストを除く)。
> 3. **タスク ID は再利用しない**。中止したタスクは行を消さず「対象外」にして理由を残す。
> 4. **作業中に見つけた新問題は新タスクとして登録**し、現在のタスクへ混ぜない
>    (現在の完了条件に必須の場合のみ例外)。
> 5. 完了は **AI の自己申告ではなく証拠で判定**する (テスト件数 / コミット SHA / PR / 実測値)。
> 6. 個別タスクの詳細 (目的・変更範囲・禁止事項・完了条件・テスト方法・停止条件) は
>    `docs/planning/*_PLAN.md` (計画書テンプレート `_TEMPLATE.md` 準拠) に書く。
>
> **状態の定義**: `未着手` / `調査中` / `実装中` / `ローカル検証済み` /
> `実環境検証待ち` (デプロイ先・実機での確認が残る) / `完了` / `保留` (外部判断待ち) /
> `対象外` (中止・不採用。理由を残す)

---

## 未完了サマリー

> 完了していないタスクと残作業だけをここに列挙する（全件確認しなくて済むように）。
> 進行中のタスクが無ければ「なし」と書く。

| ID | 状態 | 残作業 |
|---|---|---|
| AGENTSYNC-1 | 実装中 | AGENTS.md を段階開示で 150 行 / 6,000 字 / 32 KiB 以内に収め、§7 の詳細を `rules/05_communication.md` へ移す |
| AGENTSYNC-2 | 未着手 | `agents-md-lint@1.0.1` を pre-commit と `make agents` に組込む |
| AGENTSYNC-3 | 未着手 | フックを公式の JSON 形式に移し、`settings.json` の allow を拡充する |
| AGENTSYNC-4 | 未着手 | 新規スキル `agents-md-authoring` と `context-budget` を追加する |
| AGENTSYNC-5 | 未着手 | AGENTS.md がクロスツール公開標準である事実を README 等に明記する |
| AGENTSYNC-6 | 未着手 | MIT 出典のクレジットと ADR-0002 を記録する |

---

## タスク一覧

> タスクはテーマ（フェーズ・機能・運用）ごとに `###` 見出しで区切り、
> 下記テーブル形式で管理する。行は**追加のみ**（完了しても行は残し状態を更新する）。

### テンプレート運用 (2026-10-12 計画)

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PROJECTINIT-1 | 新規プロジェクトの初期設定スキルを追加する | 完了 | 100% | — | `project-init` スキルがあり、読み方ガイド・一覧から辿れ、質問→計画承認→書き換えの手順が書かれている。`make links` が PASS | `31b4d21`。`make links` PASS（139 files）。スキル 49 件 |
| SKILLALIGN-1 | スキルをこの環境の function call 名に揃え、DOT を Mermaid 化し、同義ファイルを統合する | 完了 | 100% | PROJECTINIT-1 | スキル本文が web_search / fetch_page / ask_user 等を使い、DOT が Mermaid になり、同義スキルが統合されている。`make links` PASS | `make links` PASS（123 files）。スキル 44 件 |
| INITFLOW-1 | project-init にユーザー提案の事実確認ループ（web_search depth 可変 + fetch_page）と ask_user ループを入れる | 完了 | 100% | SKILLALIGN-1 | スキルに両ループと Mermaid フローがある。`make links` PASS | `make links` PASS（123 files） |
| INITFLOW-2 | ループ終了条件・スロット状態・差分再検証・承認と実行の分離を project-init に入れる | 完了 | 100% | INITFLOW-1 | 予算上限、state 6 種、質問と修正の分離、許可リスト実行がスキルに書かれている。`make links` PASS | `make links` PASS |
| INITFLOW-3 | 検証結果の厳密化・判定分離・実行 3 ゲートと mermaidx によるフローチャート PNG | 完了 | 100% | INITFLOW-2 | 検索は search→公式判定→fetch。必須判定と質問予算は分離。result は verified/unverified/conflict/error。実行は許可リスト・承認計画・ファイル未変化の 3 条件。PNG は mermaidx。`make check` PASS | `make check` PASS |

### テンプレートの整合性 (2026-10-25 計画)

> 計画書: [`planning/REPOFIX_PLAN.md`](./planning/REPOFIX_PLAN.md)。リポジトリ全体の実測で確認した
> 「文書の約束と実物のずれ」を直す。図の意味・フローの内容は変えない。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| REPOFIX-1 | project-init の Mermaid 図1 から `flowchart TD` の重複宣言を除去する | 完了 | 100% | — | 図1・図2 とも mermaidx 0.9.5 で描画できる。図の意味は不変。`make check` PASS | `2d8d3ea`。mermaidx 0.9.5 で図1 153.3 KiB / 図2 81.4 KiB を描画（修正前は図1 が Parse error on line 2）。差分は 1 行削除のみ |
| REPOFIX-2 | Mermaid 図の宣言を検査するゲートを検証に追加する | 完了 | 100% | REPOFIX-1 | `scripts/check_mermaid.py`（標準ライブラリのみ）が pre-commit と `make mermaid` から実行され、宣言重複の fixture で exit 1・現 tree で exit 0。`make check` PASS | `087e247`。リポジトリ全体 12 ブロック（8 ファイル）OK。宣言重複と宣言なしの fixture で exit 1（2 件検出）、正常 fixture で exit 0。組み込み自己検査 0 失敗。`make check` の「Mermaid 図の宣言: Passed」 |
| REPOFIX-3 | 図の正本を Mermaid ソースに一本化し、PNG と生成パイプラインを外す | 完了 | 100% | REPOFIX-1 | リポジトリ内に図の PNG が無く、`render_mermaid`・`make diagrams`・`mermaidx` への参照が現用文書から 0 件。ADR 0001 がある。`make check` PASS | `423cc07`。`.png` 0 件、削除 4 ファイル（PNG 2 件 + `render_mermaid.py` 218 行 + `requirements-diagrams.txt`）。[`adr/0001-mermaid-source.md`](./adr/0001-mermaid-source.md) を追加。cone モードの `sparse-checkout` が git 2.39.5 で fatal になることを実測 |
| REPOFIX-4 | sandbox 復旧の `git reset --hard FETCH_HEAD` を例外として通す | 完了 | 100% | — | フックが `FETCH_HEAD` 形のみ exit 0、他の `reset --hard`・force push・main push は exit 2。`settings.json` の allow に同形を追加。`make check` PASS | `dddabfb`。フック 16 ケース実測（許可 5 / ブロック 11）。連結コマンド `reset --hard FETCH_HEAD && push --force` は exit 2。allow 18 件・deny 10 件で JSON 妥当 |
| REPOFIX-5 | フックスクリプト名を kebab-case に統一し、索引・規約の漂移を直す | 完了 | 100% | — | 旧名への参照が 0 件で、リネーム後のフック 4 本が文書どおりの exit code。存在しない「最終更新」列への指示と計画書命名の矛盾が無い。`make check`・`make links` PASS | `49f7478`（リネーム + 参照 9 ファイル）・`c76a111`（索引・規約の漂移）。フック実測で編集禁止領域 exit 2 / 通常ファイル exit 0、`settings.json` が指す 4 パスすべて実在、`make links` PASS（125 files） |
| REPOFIX-6 | `.gitignore` に Python の生成物を追加する | 完了 | 100% | — | `__pycache__/`・`*.pyc` が無視され、Python 実行後の `git status` が clean。`make check` PASS | `194838e`。`git check-ignore -v` が `.gitignore:14:__pycache__/` に一致、import 後の `git status` は `.gitignore` のみ |

### 公式仕様と実証研究への同期 (2026-10-26 計画)

> 計画書: [`planning/AGENTSYNC_PLAN.md`](./planning/AGENTSYNC_PLAN.md)。指示ファイルと Agent 設定の
> 公式仕様（Anthropic / Codex / agentskills.io / Hooks reference）と実証研究に合わせて更新する。
> **節番号 §1〜§8 の契約は維持する**（`§6.1` は 62 件、`§6` は 29 件が 38 ファイルから参照）。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| AGENTSYNC-1 | AGENTS.md を段階開示で予算内に収める | 実装中 | 0% | — | `AGENTS.md` が 150 行以下・6,000 字以下・32,768 B 以下で、`agents-md-lint` が exit 0。参照済み節番号がすべて実在し `make links` PASS | |
| AGENTSYNC-2 | `agents-md-lint` を検証ゲートに追加する | 未着手 | 0% | AGENTSYNC-1 | pre-commit（`language: node`、版固定 1.0.1）と `make agents` から実行でき、`make check` に載って PASS | |
| AGENTSYNC-3 | フックと settings を公式仕様へ現代化する | 未着手 | 0% | — | PostToolUse は JSON `decision:"block"`、PreToolUse は `hookSpecificOutput.permissionDecision:"deny"` を返し、判定マトリクス 16 ケースが変わらない。終了コード規約が公式と一致 | |
| AGENTSYNC-4 | 新規スキル 2 件を追加する | 未着手 | 0% | AGENTSYNC-1 | `agents-md-authoring` と `context-budget` が agentskills.io 仕様に適合し、`skills/index.md` の読み方ガイドと一覧の両方に載る | |
| AGENTSYNC-5 | クロスツール標準の事実を明記する | 未着手 | 0% | AGENTSYNC-1 | AAIF への移管・24+ ツール・Claude Code v2.1.277・Codex の発見規則と 32 KiB 上限が README と `.agent/README.md` に書かれている | |
| AGENTSYNC-6 | クレジットと判断を記録する | 未着手 | 0% | すべて | `THIRD_PARTY_NOTICES.md` に MIT 出典（Taiizor/agents-md-cookbook）と参考文書があり、ADR-0002 がある。ライセンス表記のない資料の文面を複製していない | |

---

## タスク追加の手順

1. 本ファイルに**新規 ID** で行を追加する（ID は `TASK-1` / `AUTH-2` のようにテーマ接頭辞 + 連番。
   一度発行した ID は再利用しない）
2. 計画書を `docs/planning/{TOPIC}_PLAN.md` に `_TEMPLATE.md` 形式で作成する
3. 実装中は状態（未着手 → 調査中 → 実装中 → ローカル検証済み）を更新する
4. 完了時は「完了条件」を満たした**証拠**（コミット SHA / テスト結果 / 実測値）を書く。
   実環境での確認が残る場合は「実環境検証待ち」とし、完了にしない
