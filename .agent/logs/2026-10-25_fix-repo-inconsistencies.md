# テンプレート内の不整合 7 件の解消

> Date: 2026-10-25(JST) / Commit: 9f51c67..HEAD（REPOFIX-1〜6） / Branch: arena/5bd01764-template-repo

## 1. 指示内容 (Task Summary)

「まずはこのリポジトリを完全に理解してください」という指示。全体を読み、同梱の検証手段を実測した結果、
**文書が約束している動作と実物がずれている箇所が 7 件**見つかったため、報告のうえで
「A〜G すべて修正」「図の PNG は削除」の承認を得て解消した（計画書: `docs/planning/REPOFIX_PLAN.md`）。

テンプレートは写しの正しさが価値なので、ずれたまま放置すると派生リポジトリに同じ事故が複製される。

## 2. 実行内容 (Executed Actions)

| # | 内容 | コミット |
|---|---|---|
| 1 | 計画書とタスク行（REPOFIX-1〜6）を登録 | `9f51c67` |
| 2 | project-init の Mermaid 図1 から `flowchart TD` の重複宣言を除去 | `2d8d3ea` |
| 3 | `scripts/check_mermaid.py` を新設し、pre-commit（`mermaid-syntax`）と `make mermaid` に接続 | `087e247` |
| 4 | PNG 2 件・`render_mermaid.py`・`requirements-diagrams.txt`・`make diagrams` を削除。ADR-0001 を記録 | `423cc07` |
| 5 | `block-dangerous-git.sh` と `settings.json` に `git reset --hard FETCH_HEAD` の例外を実装 | `dddabfb` |
| 6 | フック 2 本を `pre-edit-guard.sh` / `post-edit-verify.sh` へリネームし、参照 9 ファイルを更新 | `49f7478` |
| 7 | 存在しない「最終更新」列への指示と、計画書の命名規約の矛盾を修正 | `c76a111` |
| 8 | `.gitignore` に `__pycache__/`・`*.py[cod]` を追加 | `194838e` |
| 9 | task-list の証拠、`docs/audit/activity.md`、本ログ、計画書 §12 を更新 | 本コミット |

検証: 各コミット前に `make check`（pre-commit 全フック）を実行し、すべて PASS。
`make links` は 125 ファイル OK。pre-commit 4.7.0 は PEP 668 のためリポジトリ外の venv で実行した。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **`make check` は Mermaid の構文を見ていなかった。** 図が描画できない状態でも CI は緑だった。
  検証ゲートは「成果物の形式」だけでなく「成果物が実際に使えるか」を見る必要がある。
  再発防止として標準ライブラリだけの `check_mermaid.py` を追加した（組み込み fixture で自己検査する）。
- **生成物は参照されていなければ必ず腐る。** PNG はどの文書からもリンクされておらず、
  生成手段（mermaidx + CJK フォントの外部取得）だけが壊れていた。
  生成手段が外部取得に依存すると、git の版更新だけで動かなくなる
  （cone モードの `sparse-checkout set <file>` は git 2.37+ で fatal。`--no-cone` なら成功することを実測）。
- **ガードレールは文書の例外を形で見分ける必要がある。** `AGENTS.md §4.1.1` が許可する復旧手順を
  フックが一律ブロックしていた。例外は「`FETCH_HEAD` 形のみ」という文字列一致で実装し、
  push 系を先に判定することで連結コマンド（`reset --hard FETCH_HEAD && push --force`）も止まる。
- **命名規約と実物がずれたら、どちらかに寄せる判断が要る。** 4 本中 2 本が snake_case だったので、
  規約側（kebab-case）に実物を合わせた。規約の例欄が自分で規約を破っていたのが発見のきっかけ。
- **索引に日付列を持たせない方が腐らない。** 「最終更新」列は実在せず、指示だけが残り続けていた。
  更新日時は Git 履歴が正本。
- **未確認**: `log-task.md` のテンプレートは `Branch: <branch>` を要求するが、`AGENTS.md §4.4` は
  「過去セッションのブランチ名を文書に残さない」と定める。本ログはテンプレートに従って記録した。
  時点記録（§8.6 で保護）と現用ドキュメントで扱いを分けるべきか、判断が残る。

## 4. 次にすべきこと (Next Actions)

- 上記「未確認」のブランチ名記録の扱いを、`log-task.md` と `AGENTS.md §4.4` のどちらかに寄せて明文化する。
- `check_mermaid.py` は宣言の重複しか見ない。派生プロジェクトで Mermaid の他の書き間違いが起きたら、
  検査項目を実測に基づいて足す（推測で先に増やさない）。
- ADR-0001 で PNG 生成を外したので、Mermaid を描画できない閲覧環境向けに図が必要になった派生先では、
  その時点で生成手段を追加する（テンプレート本体には戻さない）。
- CI（GitHub Actions）での `make check` の結果は push 後に確認する。gitleaks はローカル未導入のため CI の
  `secrets` ジョブに委ねている。
