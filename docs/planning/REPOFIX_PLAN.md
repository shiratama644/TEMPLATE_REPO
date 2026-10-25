# REPOFIX: テンプレート内の不整合を解消する

> 対応 task-list ID: `REPOFIX-1` 〜 `REPOFIX-6` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠

## 1. 開始前確認

- ブランチ `arena/5bd01764-template-repo` / HEAD `267d9d0` / `git status` clean を確認済み（未コミット変更なし）
- 依存タスクなし（既存 5 タスクはすべて完了）
- 関連仕様: `AGENTS.md §3.3`（既存バグの扱い・回帰テスト）、`§8.6`（ログは追加のみ）、`docs/arch/architecture.md §4`（構成を変えたら同じ変更で文書を更新）
- 本計画書の §5（完了条件）と §7（停止条件）を再読済み

## 2. 目的 (Why)

リポジトリ全体を読んだ実測で、**文書が約束している動作と実物がずれている箇所**が 7 件見つかった。
放置すると、テンプレートから派生したプロジェクトで「文書どおりに実行したら失敗する」
（図が描画できない、復旧手順がガードレールにブロックされる、存在しない列を更新しようとする）
という事故がそのまま複製される。テンプレートは**写しの正しさ**が価値なので、
実測で確認できた不整合を、検証ゲートごと直して再発を防ぐ。

## 3. 変更範囲 (Scope)

変更対象:

- `.agent/skills/project-init/SKILL.md`（Mermaid 図1 の宣言重複）
- `scripts/check_mermaid.py`（新規）・`.pre-commit-config.yaml`・`Makefile`（構文ゲートの追加）
- `.agent/skills/project-init/flowchart.png`・`flowchart-fact.png`（削除）
- `scripts/render_mermaid.py`・`scripts/requirements-diagrams.txt`（削除）
- `.agent/skills/writing-skills/SKILL.md`（PNG 化の手順を書いたリポジトリ固有の 1 行）
- `.agent/hooks/block-dangerous-git.sh`・`.agent/settings.json`・`AGENTS.md §4.1.1 / §4.3`・`.agent/hooks/sandbox-recovery.md`・`.agent/rules/02_git-workflow.md`（復旧手順の例外）
- `.agent/hooks/pre_edit_guard.sh` → `pre-edit-guard.sh`、`post_edit_verify.sh` → `post-edit-verify.sh`（リネーム）と、それを参照する 9 ファイル
- `AGENTS.md §8.4`・`.agent/hooks/log-task.md`（存在しない「最終更新」列への指示）
- `.agent/rules/03_doc-style.md`（計画書の命名規約・フックスクリプトの例）
- `.gitignore`（Python の生成物）
- `docs/adr/0001-mermaid-source.md`（新規）・`docs/adr/README.md`
- `docs/task-list.md`・`docs/planning/README.md`・`docs/README.md`・`docs/audit/activity.md`・`.agent/logs/2026-10-25_*.md`・`README.md`・`docs/arch/architecture.md`

変更しない (境界外):

- `AGENTS.md` の汎用規約 §1〜§5・§7 の本文（§4.1.1・§4.3・§8 の該当行を除く）
- `.agent/logs/2026-10-12_add-project-init-skill.md`（過去の記録。`AGENTS.md §8.6`）
- `docs/audit/activity.md` の既存行、`docs/task-list.md` の既存 5 行（追記のみ）
- 上流由来スキルの本文（`writing-skills` はリポジトリ固有の追記行のみが対象）
- `.github/workflows/`（CI は `make check` を呼ぶだけなので変更不要）
- Mermaid 図の中身（ノード・分岐・ラベル）。構文エラーの除去のみで、意味を変えない

## 4. 禁止事項

- 図の意味やフローの内容を「ついでに」改善しない（構文の修正のみ）
- 過去ログ・過去の activity 行・既存タスク行を書き換えない
- 検証を通すためにゲートを緩めない（`check_mermaid.py` の検査対象を減らして PASS させない）
- 上流ライセンス表示（`THIRD_PARTY_NOTICES.md`・各 `LICENSE.txt`）を削らない
- 不明点は推測で埋めず、§7 の停止条件に従って質問する

## 5. 完了条件 (DoD)

- [ ] `python3 scripts/check_mermaid.py` が exit 0（Mermaid 全ブロックの宣言が 1 回ずつ）
- [ ] mermaidx 0.9.5 で `project-init/SKILL.md` の図1・図2 が両方描画できる（実測値を記録）
- [ ] `scripts/check_mermaid.py` が、宣言を重複させた fixture に対して exit 1 を返す（回帰テスト）
- [ ] リポジトリ内に `.png` の図が残っておらず、`render_mermaid`・`make diagrams`・`mermaidx` への参照が現用文書から 0 件
- [ ] `echo '{"tool_input":{"command":"git reset --hard FETCH_HEAD"}}' | sh .agent/hooks/block-dangerous-git.sh` が exit 0、`git reset --hard HEAD~1`・`git push --force`・`git push origin main` は exit 2 のまま
- [ ] `pre_edit_guard`・`post_edit_verify`（旧名）への参照が 0 件で、リネーム後のフック 4 本が文書どおりの exit code を返す
- [ ] `AGENTS.md`・`.agent/` の現用文書に、実在しない列・実在しないファイルへの言及がない
- [ ] `make check`（pre-commit 全フック + 新ゲート）が PASS、`make links` が PASS
- [ ] `docs/task-list.md` の状態・進捗・証拠、`docs/audit/activity.md`、`.agent/logs/` を更新
- [ ] 不変パス（`.git/`・過去ログ・既存タスク行）が無変更

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | ✓ | `check_mermaid.py` を fixture（正常 / 宣言重複 / 空ブロック）に対して実行し、exit code とメッセージを確認 |
| Component | ✓ | フック sh 4 本を stdin JSON 付きで実行し、exit 0 / 2 を確認。`session-start.sh` の JSON 出力を確認 |
| E2E | ✓ | `make check`（pre-commit 全フック）と `make links` をリポジトリ全体に実行 |
| 実環境 (実機・本番 build) | ✗ | CI（GitHub Actions）での `make check` は push 後にユーザー側で確認。gitleaks はローカル未導入のため CI の `secrets` ジョブに委ねる |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（計画書・AGENTS.md・skills）同士に矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要
- 破壊的変更（既存データ・公開 API 互換性）が必要
- ユーザー判断が必要な設計論点に到達した
- 開始時点で作業ツリーに未確認の変更がある
- 上流由来スキルの本文を書き換えないと成立しない修正が必要になった

## 8. 完了時に行うこと

1. 差分を自己レビュー（対象外の変更が混ざっていないか）
2. `make check` / `make links` を実行
3. `docs/task-list.md` の状態・進捗・証拠を更新
4. タスク ID を含むコミット（例: `fix(project-init): …`）を作成
5. 証拠中心の完了報告（結果 / 実測値 / Git SHA / 残事項）

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| REPOFIX-1 | Mermaid 図1 の構文エラー除去 | `project-init/SKILL.md` | — |
| REPOFIX-2 | Mermaid 構文ゲートの追加 | `scripts/check_mermaid.py`、pre-commit、`make mermaid` | REPOFIX-1 |
| REPOFIX-3 | 図の正本を Mermaid ソースに一本化 | PNG 2 件と生成パイプラインの削除、ADR 0001 | REPOFIX-1 |
| REPOFIX-4 | 復旧手順の例外を実装 | `block-dangerous-git.sh`、`settings.json`、関連文書 | — |
| REPOFIX-5 | 命名統一と索引・規約の漂移修正 | フック 2 本のリネーム、`AGENTS.md §8.4`、`log-task.md`、`03_doc-style.md` | — |
| REPOFIX-6 | Python 生成物の無視 | `.gitignore` | — |

## 10. 設計詳細・仕様

### 10.1 `check_mermaid.py` の検査内容

標準ライブラリのみ（`check_doc_links.py` と同じ方針）。`.git/` と symlink を除いた全 `*.md` を走査し、
```` ```mermaid ```` フェンスごとに次を検査する。

| 検査 | 失敗の例 | 終了コード |
|---|---|---|
| ブロックが空でない | ```` ```mermaid```` のみ | 1 |
| 先頭の非空行が図の宣言 | `classDef` から始まる | 1 |
| 宣言がブロック内に 1 回だけ | `flowchart TD` が 2 行続く（今回の不具合） | 1 |

図の種類は `flowchart` / `graph` / `sequenceDiagram` / `classDiagram` / `stateDiagram` /
`erDiagram` / `journey` / `gantt` / `pie` / `gitGraph` / `mindmap` / `timeline` /
`quadrantChart` / `xychart-beta` / `sankey-beta` / `C4Context` を受理する。
行頭固定（`^`）なので `gitGraph` を `graph` の重複宣言と誤判定しない。
Mermaid の完全な構文検証は行わない（依存を増やさないため）。宣言部の重複という
**実際に起きた不具合の再発防止**に絞る。

### 10.2 復旧手順の例外の形

`block-dangerous-git.sh` は「`git reset --hard` を含む」を一律ブロックしていた。
`AGENTS.md §4.1.1` が許可する形は **`git reset --hard FETCH_HEAD` の 1 通りだけ**なので、
文字列一致でその形のみ通し、他の `reset --hard` は引き続きブロックする。
force push 等の判定は先に行うため、`git reset --hard FETCH_HEAD && git push --force` のような
連結コマンドは force push の側で止まる。
`settings.json` の deny は `Bash(git reset --hard)`（完全一致）のまま残し、
allow に `Bash(git reset --hard FETCH_HEAD)` を追加する。

### 10.3 図の正本を Mermaid ソースに一本化する判断

ADR 0001 に記録する。要点: GitHub は Mermaid をそのまま描画するため、PNG は複製物でしかなかった。
生成には mermaidx と CJK フォントの外部取得が必要で、生成物の PNG がどの文書からも参照されなくなった時点で
「正本ではないバイナリ」がリポジトリに残る。よって PNG とパイプラインを外し、
`.md` 内の Mermaid ソースを唯一の正本とする。

## 11. リスク・Gotchas

| リスク | 対処 |
|---|---|
| 新ゲートが既存の正常な図を誤検出する | 追加前にリポジトリ全 123 ファイルで実行し、検出が図1 の 1 件だけであることを確認する |
| フックのリネームで `settings.json` の登録が切れ、ガードが無効化する | リネーム後に 4 本とも stdin JSON で実行して exit code を実測する |
| `check-json` フックが `settings.json` の編集で失敗する | 編集後に `make check` を実行（コメントは書かない） |
| PNG 削除で図が見えなくなる環境がある | Mermaid 非対応の閲覧環境向けには ADR に「必要になった時点でプロジェクト側が生成手段を追加する」と記録する |
| codespell が新しい英語語を誤検出する | `make check` で確認し、誤検出なら文面を直す（許可リストは増やさない） |

ロールバック: 各コミットが論理単位なので、`git revert <sha>` で 1 件ずつ戻せる（履歴の改変はしない）。

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| REPOFIX-1 | | | |
| REPOFIX-2 | | | |
| REPOFIX-3 | | | |
| REPOFIX-4 | | | |
| REPOFIX-5 | | | |
| REPOFIX-6 | | | |
