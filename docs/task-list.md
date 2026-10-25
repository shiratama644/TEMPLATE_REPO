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
| REPOFIX-1 | 実装中 | Mermaid 図1 の宣言重複を除去し、mermaidx で描画を確認する |
| REPOFIX-2 | 未着手 | `scripts/check_mermaid.py` と pre-commit・`make mermaid` を追加する |
| REPOFIX-3 | 未着手 | PNG 2 件と生成パイプラインを削除し、ADR 0001 を記録する |
| REPOFIX-4 | 未着手 | `reset --hard FETCH_HEAD` の例外をフックと `settings.json` に実装する |
| REPOFIX-5 | 未着手 | フック 2 本を kebab-case へリネームし、索引・規約の漂移を直す |
| REPOFIX-6 | 未着手 | `.gitignore` に Python の生成物を追加する |

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
| REPOFIX-1 | project-init の Mermaid 図1 から `flowchart TD` の重複宣言を除去する | 実装中 | 0% | — | 図1・図2 とも mermaidx 0.9.5 で描画できる。図の意味は不変。`make check` PASS | |
| REPOFIX-2 | Mermaid 図の宣言を検査するゲートを検証に追加する | 未着手 | 0% | REPOFIX-1 | `scripts/check_mermaid.py`（標準ライブラリのみ）が pre-commit と `make mermaid` から実行され、宣言重複の fixture で exit 1・現 tree で exit 0。`make check` PASS | |
| REPOFIX-3 | 図の正本を Mermaid ソースに一本化し、PNG と生成パイプラインを外す | 未着手 | 0% | REPOFIX-1 | リポジトリ内に図の PNG が無く、`render_mermaid`・`make diagrams`・`mermaidx` への参照が現用文書から 0 件。ADR 0001 がある。`make check` PASS | |
| REPOFIX-4 | sandbox 復旧の `git reset --hard FETCH_HEAD` を例外として通す | 未着手 | 0% | — | フックが `FETCH_HEAD` 形式で exit 0、他の `reset --hard`・force push・main push は exit 2。`settings.json` の allow に同形を追加。`make check` PASS | |
| REPOFIX-5 | フックスクリプト名を kebab-case に統一し、索引・規約の漂移を直す | 未着手 | 0% | — | 旧名への参照が 0 件で、リネーム後のフック 4 本が文書どおりの exit code。存在しない「最終更新」列への指示と計画書命名の矛盾が無い。`make check`・`make links` PASS | |
| REPOFIX-6 | `.gitignore` に Python の生成物を追加する | 未着手 | 0% | — | `__pycache__/`・`*.pyc` が無視され、Python 実行後の `git status` が clean。`make check` PASS | |

---

## タスク追加の手順

1. 本ファイルに**新規 ID** で行を追加する（ID は `TASK-1` / `AUTH-2` のようにテーマ接頭辞 + 連番。
   一度発行した ID は再利用しない）
2. 計画書を `docs/planning/{TOPIC}_PLAN.md` に `_TEMPLATE.md` 形式で作成する
3. 実装中は状態（未着手 → 調査中 → 実装中 → ローカル検証済み）を更新する
4. 完了時は「完了条件」を満たした**証拠**（コミット SHA / テスト結果 / 実測値）を書く。
   実環境での確認が残る場合は「実環境検証待ち」とし、完了にしない
