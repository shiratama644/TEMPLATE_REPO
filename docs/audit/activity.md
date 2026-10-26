# 活動ログ

> 作業の時系列の記録。**追加のみ**で、過去の行は書き換えない。

| 日付 | 内容 | 証拠（コミット等） |
|---|---|---|
| 2026-10-12 | `project-init` スキルを追加。質問→計画承認→文書と Agent 設定の書き換え。関連スキル・README・索引を更新 | `make links` PASS |
| 2026-10-12 | PROJECTINIT-1 の証拠にコミット SHA を記録 | `31b4d21` |
| 2026-10-12 | スキルの function call 名揃え、DOT→Mermaid、同義スキル統合（SKILLALIGN-1） | `make links` PASS |
| 2026-10-12 | project-init に事実確認ループと ask_user ループを追加（INITFLOW-1） | `make links` PASS |
| 2026-10-12 | project-init に終了条件・スロット状態・差分再検証・承認と実行の分離を追加（INITFLOW-2） | `make links` PASS |
| 2026-10-13 | project-init の検索順・必須/予算分離・検証 4 結果・実行 3 ゲートを修正。フローチャート PNG を mermaidx で再描画。CI の codespell 誤検出（応答ノードの 3 文字 ID）を修正 | `make check` PASS |
| 2026-10-25 | リポジトリ全体を実測し、文書の約束と実物のずれ 7 件を確認。計画書 `planning/REPOFIX_PLAN.md` と REPOFIX-1〜6 を登録 | `9f51c67` |
| 2026-10-25 | project-init の Mermaid 図1 から `flowchart TD` の重複宣言を除去（REPOFIX-1） | `2d8d3ea`。mermaidx 0.9.5 で図1 153.3 KiB / 図2 81.4 KiB を描画 |
| 2026-10-25 | Mermaid 図の宣言を検査するゲート（`scripts/check_mermaid.py`）を pre-commit と `make mermaid` に追加（REPOFIX-2） | `087e247`。12 ブロック OK、異常 fixture で exit 1 |
| 2026-10-25 | 図の正本を Mermaid ソースに一本化。PNG 2 件と `render_mermaid.py`・`make diagrams` を削除し、ADR-0001 を記録（REPOFIX-3） | `423cc07`。`.png` 0 件 |
| 2026-10-25 | sandbox 復旧の `git reset --hard FETCH_HEAD` をフックと `settings.json` で例外として通す（REPOFIX-4） | `dddabfb`。フック 16 ケース実測 |
| 2026-10-25 | フック 2 本を kebab-case へリネームし、索引・規約の漂移（存在しない「最終更新」列、計画書の命名）を修正（REPOFIX-5） | `49f7478`、`c76a111`。`make links` PASS（125 files） |
| 2026-10-25 | `.gitignore` に Python の生成物を追加（REPOFIX-6） | `194838e` |
| 2026-10-26 | サンドボックス再構築を検知し §4.1.1 の手順で復旧（6 ファイルのハッシュ一致を確認のうえ `git reset --hard FETCH_HEAD`、venv 再構築） | 復旧後 HEAD `49927ab` = origin、`make check` PASS |
| 2026-10-26 | AGENTSYNC の計画書とタスク行を登録（AGENTSYNC-1〜6） | `45ec169`。出発点の実測 33,482 B / 461 行、linter score 43/100 grade F |
| 2026-10-26 | AGENTS.md を段階開示で予算内に収め、§7 の詳細を `rules/05_communication.md` へ移設（AGENTSYNC-1） | `ed58754`。16,050 B / 170 行 / 8,098 字、score 92/100 grade A、節番号 24 種類の実在を照合 |
| 2026-10-26 | `agents-md-lint@1.0.1`（MIT）をゲートに追加。**上流 bin の symlink no-op 不具合を発見し回避**（AGENTSYNC-2） | `987c896`。負のテストで exit 1、適合ファイルで exit 0。ADR-0002 |
| 2026-10-26 | フックを公式の JSON 形式に移し、allow 18→39 / deny 10→17 件へ拡充（AGENTSYNC-3） | `5a10b4d`。27 ケース実測 OK、JSON 妥当性を python で検証 |
| 2026-10-26 | 新規スキル `agents-md-authoring`・`context-budget` を追加（AGENTSYNC-4） | `c0091e9`。仕様適合 7 項目を実測、スキル 46 件 |
| 2026-10-26 | AGENTS.md がクロスツール公開標準であることを README 等に明記（AGENTSYNC-5） | `dbfabf7` |
| 2026-10-26 | ADR-0002 と出典クレジットを記録（AGENTSYNC-6） | `c7de1d0`。`THIRD_PARTY_NOTICES.md` に MIT 出典と参照文書 |
