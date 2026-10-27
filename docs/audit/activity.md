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
| 2026-10-26 | 開発中の言語検査が全体走査で実混入を発見。フックのコメントのハングル 3 字（U+C218 U+C900 U+C758）を日本語に戻した | `704c398`。AGENTSYNC-3 由来で目視レビューを通過していた |
| 2026-10-26 | 日本語と英語のみを許可する言語ゲートを追加（LANGGATE-1）。ADR-0003 | `e026a8a`。全体 164 ファイルで error 0・warn 0、負のテスト 4 種で exit 1/0 を実測、`make check` 18 フック Passed |
| 2026-10-26 | 時点記録にブランチ名を残さない方針を明文化し、`log-task.md` と `AGENTS.md §4.4` の矛盾を解消（LANGGATE-3） | `dc0ebaa`。テンプレートを `Date / Commit / PR` へ。過去ログ 3 件は無変更 |
| 2026-10-26 | 上流への issue 起票が権限で拒否されたため、投稿用の英語文面を audit に保全（LANGGATE-2 は保留） | `ae24f15`。`docs/audit/issues-lint.md` §6。再現表 6 行・修正案 4 つ |
| 2026-10-26 | コミット `5a10b4d` のメッセージの誤字（U+52A8）を正誤記録（LANGGATE-4）。履歴は書き換えない | 実測: `git log -1 --format=%B 5a10b4d` を `--commit-msg` で検査し **exit 1**、「手動」に直すと **exit 0** |
| 2026-10-26 | `make check` のフック数を実測し、記録の誤記を訂正（今回分 11 → **18**、前タスク分 9 → **17**）。過去ログの誤記は書き換えず新ログ §2.2 に訂正を記録 | `.pre-commit-config.yaml` を `git show <rev>:…` で stage 別に数えて実測。設定総数は 20（pre-commit 18 + commit-msg 2） |
| 2026-10-26 | AGENTS.md §1.3 に自律的なタスク遂行ルールを追加。既存のスコープ・質問方針・完了条件を整合させ、詳細ルールと入口を更新 | `75bcd91`。`make check` 18 フック PASS、`make links` 137 ファイル OK、`make lang` 167 ファイル OK |
| 2026-10-26 | 自律ルールを `SessionStart`、タスク開始・検証・ログ手順に接続。実装前ワークフローの完了誤表示を解消 | `92b9b75`。SessionStart JSON とワークフロー mock 5 ケース、`make check` 18 フック PASS |
| 2026-10-26 | Bun で Python 製検査と pre-commit を置換し、CLI の対話・非対話モード、7 プリセット・17 機能と TS/JS・Python・Go・Rust の生成候補を追加（BUNSETUP-1〜4）。ADR-0004 | `bun run check` 7 ゲート・テスト 12 件 / 59 assertions PASS。Vite/Next TS/JS と両 monorepo の Bun build 成功。OS 実インストールと異なる OS 実機は未検証 |
| 2026-10-26 | Bun 移行後の PR #5 初回 CI で OS パッケージ案内のテストが失敗。runner に cargo が導入済みである状態を未考慮だった。子プロセスの PATH をテストで固定し分岐を決定的にした | PR #5: frozen install / gitleaks / dependency-review は成功、Bun ゲートは最初失敗。修正後ローカル 7 ゲート・12 テスト PASS、CI 再検証待ち |
| 2026-10-26 | Bun 移行の PR #5 を再検証し、BUNSETUP-2 を完了。OS 実機と導入は BUNSETUP-4 に残す | `502540c`。PR #5 の Bun 7 ゲート・gitleaks・dependency-review 3 件 PASS。12 テスト / 59 assertions PASS |
| 2026-10-26 | BUNAUDIT-1: Bun セットアップと生成物を監査。無効な構成・Git メタデータ/バックアップのパス保護、機能の互換、生成した library / native 依存、文書検査、フックの導入を修正。未知の全バグがないことは保証しない | 回帰テスト 30 件 / 220 assertions PASS。Web 6 通り build、library/full の publint・size、Python FastAPI venv と import、Playwright HTTP スモークを実測。OS パッケージ導入と非 Linux 実機は未検証。CI は push 後に確認 |
| 2026-10-26 | BUNAUDIT-1 の PR #5 の CI を確認し、ローカル監査を完了。実機未検証項目は BUNSETUP-4 に分離 | `88ee38e`。Bun 全ゲート・gitleaks・dependency-review 3 件 PASS。ローカル 30 テスト / 220 assertions PASS |
| 2026-10-27 | SETUPCONF-1: 計画提示後に対話式 `y/N` で承認する経路を追加。旧基点に戻ったサンドボックスは退避・リモート照合後に復旧 | `77844c5`。Bun 7 ゲート・31 テスト / 237 assertions PASS。疑似端末で適用・拒否・空入力・dry-run を確認。PR #5 の CI は push 後に確認 |
