# 日本語・英語のみの言語ゲートと AGENTSYNC の残事項

> Date: 2026-10-26(JST) / Commit: 704c398..HEAD（LANGGATE-1〜4） / PR: #5
>
> 計画書: [`../../docs/planning/LANGGATE_PLAN.md`](../../docs/planning/LANGGATE_PLAN.md) / 判断記録: [`../../docs/adr/0003-language-gate.md`](../../docs/adr/0003-language-gate.md)
> ※ 本ログは `Branch:` 欄を持たない新形式の最初の例（LANGGATE-3 で方針を明文化）。

## 1. 指示内容 (Task Summary)

ユーザー指示: 「2, 3, 4をしてください。またコミットやファイルは日本語または英語のみを許可するのでそのチェックを追加してください。」

- **新規（LANGGATE-1）**: コミットメッセージとファイルの内容を**日本語または英語のみ**に制限する検査をゲートとして追加する。
- **2（LANGGATE-2）**: 上流 `agents-md-lint@1.0.1` の symlink no-op 不具合を Taiizor/agents-md-cookbook へ issue 報告する（外部副作用は承認済み）。
- **3（LANGGATE-3）**: `log-task.md` の `Branch:` 要求と `AGENTS.md §4.4`（過去セッションのブランチ名を文書に残さない）の矛盾を解消して明文化する。
- **4（LANGGATE-4）**: コミット `5a10b4d` のメッセージの誤字（U+52A8）に対処する。amend と force push は禁止なので履歴は書き換えない。

背景: AGENTSYNC の作業中に日本語文書への他言語混入が 5 回発生し、4 回は偶然の読み直しで発見、1 回（コミットメッセージ）は push 済みで修正不能なまま残った。**発見が運に依存していた**のが問題。

## 2. 実行内容 (Executed Actions)

| # | 内容 | コミット | 実測・証拠 |
|---|---|---|---|
| 1 | 開発中の検査でリポジトリ全体を走査し、フックのコメントに混入していたハングル 3 字（U+C218 U+C900 U+C758、意味は「レベルの」）を発見・修正。AGENTSYNC-3（`5a10b4d`）で全面書き換えた際に入ったもので、目視レビューを通過していた | `704c398` | 全体走査 162 ファイルで error 3 件 → 修正後 0 件 |
| 2 | 判定方式をプロトタイプで検証。**単純な「日本語コーデックで符号化できるか」は 4 種類の誤判定**があり棄却（絵文字が全て NG / キリル・ギリシャは JIS X 0208 に含まれ検出不可 / 繁体字の大半は CP932 の NEC/IBM 拡張に含まれ検出不可 / 表外漢字 U+20B9F・U+29E3D が NG） | — | 簡体字 77 字中 72 字を検出、ハングル 6・アラビア 5 を検出、キリル 7・ギリシャ 4 は検出不可、絵文字 10 は誤検出 |
| 3 | `scripts/check_language.py` を作成（標準ライブラリのみ、自己検査 fixture 8 件を内蔵）。pre-commit に 2 フック（`language` / `commit-msg-language`）を登録し、`make lang` を追加。AGENTS.md §6.1・README・`rules/03_doc-style.md` に基準を記録 | `e026a8a` | 全体 **164 ファイルで error 0・warn 0**、`make check` は **18 フック**すべて Passed、AGENTS.md 171 行 / 16,459 B（hard cap 32,768 B の 52%） |
| 4 | **負のテスト**（完了条件）。違反ファイル・違反メッセージで止まり、正常系で通ることを実測 | `e026a8a` | 簡体字+ハングル+キリルのファイルで `pre-commit run language --files` が **Failed（exit 1、16 件検出）**、簡体字コミットメッセージで `--hook-stage commit-msg` が **Failed（exit 1）**、正常なファイルとメッセージで **Passed（exit 0）**。判定ロジックを壊すと自己検査が失敗することも確認 |
| 5 | 判断記録として ADR-0003（決定・代替案 5 つと Why not・限界・リスク 4 件＋緩和）を作成し、`docs/adr/README.md` と `docs/README.md` に登録。計画書 LANGGATE_PLAN.md と task-list の 4 行を登録 | `e026a8a` | 代替案: コーデック単独判定 / 語彙リスト / 言語判定ライブラリ / 規約のみ / ファイルのみ検査 |
| 6 | `log-task.md` のテンプレートを `Date / Commit / PR` に変更し、`Branch:` を持たない理由を明記。`AGENTS.md §4.4` に同じ方針（時点記録も SHA と PR 番号で書く／既存ログのブランチ名は歴史的例外）を追記 | `dc0ebaa` | 過去ログ 3 件は無変更（`git diff --stat -- .agent/logs/` が空） |
| 7 | 上流へ `gh issue create --repo Taiizor/agents-md-cookbook` を実行 → **`GraphQL: Resource not accessible by integration (createIssue)` で拒否**。この環境の GitHub 接続は `shiratama644/TEMPLATE_REPO` に限定（`gh api /user` = `shiratama644`）。計画書 §7 の停止条件に該当するため停止し、投稿用文面を `docs/audit/issues-lint.md` §6 に保全 | `ae24f15` | 上流は issues 有効・未解決 0 件・重複なし（全 13 件 closed）。再現表 6 行・原因のコード引用・修正案 4 つ・回帰テスト提案を用意 |
| 8 | コミット `5a10b4d` のメッセージの誤字を正誤記録（下記 2.1） | 本ログ | 履歴は無変更（amend・force push は deny） |

### 2.1 正誤記録（LANGGATE-4: コミット `5a10b4d` のメッセージ）

- **誤**: 26 行目「フックの**手 U+52A8 実行** `sh .agent/hooks/*`」— 「手動」の 2 字目が U+52A8（動の簡体字形）になっていた。誤字の字面はここに書けない（書くとこの文書自身がゲートに止まる。ADR-0003 の Consequences/Negative に明記した制約）。
- **正**: 「フックの**手動**実行」。
- **同じメッセージの 37 行目は正しく「手動」と書かれており**、1 つのメッセージ内で表記が揺れていた（だからこそ目視で見つからなかった）。
- **履歴は書き換えない**。`git commit --amend` と `git push --force*` は `.agent/settings.json` の deny で禁止され、`5a10b4d` は push 済みで PR #5 の履歴に含まれる。正誤をこのログに残すことで対処とする。
- **新ゲートが同じ誤りを止めることを実測した**（再発防止の証明）:

| 入力 | 結果 |
|---|---|
| `git log -1 --format=%B 5a10b4d` を `--commit-msg` で検査 | **exit 1**（`U+52A8 日本語で使わない漢字（簡体字など）` を 26 行目で検出） |
| `pre-commit run commit-msg-language --hook-stage commit-msg` | **Failed（exit 1）** |
| 誤字を「手動」に直した同じメッセージ | **exit 0** |

### 2.2 正誤記録（フック数の誤記）

記録を書いたあと `make check` のフック数を実測したら、**自分の記録が間違っていた**。

| 箇所 | 誤 | 正 |
|---|---|---|
| 本ログ §2・§4、ADR-0003、`activity.md`、`LANGGATE_PLAN.md` §6・§12、task-list の LANGGATE-1 行 | 11 フック | **18 フック**（pre-commit stage。commit-msg stage の 2 件を含めた設定総数は 20） |
| task-list の AGENTSYNC-2 行、`AGENTSYNC_PLAN.md` §12（前タスクの記録） | 9 フック | **17 フック**（当時。`git show 987c896:.pre-commit-config.yaml` を stage 別に数えて実測） |

原因は、出力を数えずに「既存 9 + 新規 2」と暗算したこと。実測方法は
`pre-commit run --all-files` の出力行数、または `.pre-commit-config.yaml` を stage 別に数えること。

`.agent/logs/2026-10-26_sync-agent-standards.md` の 32 行目にも同じ「9 フック」の誤記があるが、
**過去ログは書き換えない**（`log-task.md` の運用メモ）ためそのまま残し、ここに訂正を記録する。
task-list と計画書 §12 は進捗の正本なので、誤記を訂正した（行の削除ではなく数値の訂正）。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

1. **検査スクリプト自身も検査対象になる**。fixture と docstring に違反文字を字面で書いたため、全体走査が自分自身で error 34 件になった。fixture は `\uXXXX` エスケープで書き、文書中の違反例はコードポイント（`U+52A8`）で書く。この規則を ADR-0003 と `rules/03_doc-style.md` に明記した。
2. **規則を書いた本人が同じ日に 5 回破った**（ADR 草稿の U+8FDC＝「永久」の誤り、task-list 証拠欄の同じ誤り、audit 文書の U+5F52＝「回帰」の誤り、本ログ草稿の U+8BA2＝「訂正」の誤り、そして §2.1 で誤字の字面をそのまま書いたこと）。いずれもゲートが検出し、正しい日本語（永久・回帰）に直した。**「規約に書く」だけでは防げない**という ADR-0002 の結論が、言語についてもそのまま成立した。
3. **この環境の `printf` と bash の `-m` は `\uXXXX` を解釈しない**。shell で fixture を作るとエスケープが字面として残り、**負のテストが偽陰性になる**（2 回だまされた）。Unicode の fixture は `python3` で書く。
4. **pre-commit はフックの引数をバッチ分割して複数回起動する**。「82 件検査」の行だけ見て「164 件中 82 件しか検査していない＝カバレッジ欠落」と誤読した。実際は 2 バッチ。`tail` で出力を切ると判断を誤る。
5. **pre-commit は `.pre-commit-config.yaml` に未ステージの変更があると実行を拒否する**（`Your pre-commit configuration is unstaged`）。フックを試す前に設定を `git add` する。
6. **`.git/hooks/commit-msg` はプラットフォームの `Co-authored-by` trailer フックが占めている**。`make setup`（`pre-commit install --hook-type commit-msg`）はこれを上書きするので、このサンドボックスでは実行しない。commit-msg フックの検証は `--hook-stage commit-msg --commit-msg-filename <path>` の単体実行で行う。
7. **エンドツーエンドの `git commit` テストは副作用が大きい**。実際に probe コミット 2 件が作られてしまい、`git reset <sha>`（mixed。deny は `--hard` のみ）で取り消した。単体実行で足りる検証に本物のコミットを使わない。
8. **自己検査 fixture の期待値を推測で書くと外れる**（ハングル 9 字を 11 字と、キリル 7 字を 8 字と書いた）。自己検査は実測で確定させる。同時に、自己検査が**設計欠陥も検出した**（「﨑」U+FA11 が CJK 互換漢字ブロック U+F900-U+FAFF にあり未処理だった → error の誤検出）。
9. **文字単位検査の限界を正直に書く**。日中共通の漢字だけ（使・用・依・系・明・個）で書かれた中国語文は検出できない。語彙リスト方式は「起点・要点・反転・反映」を誤検出するため不採用。検出できるのは**日本語に存在しない字形**と**日本語に無い文字体系**。
10. **新しいゲートは導入時の全体走査で実バグを見つける**。今回はハングル 3 字（フックのコメント）を発見した。ゲートを足したら必ず一度は全体を走査する。
11. **数字は暗算せず実測する**。フック数を「既存 9 + 新規 2 = 11」と暗算して 6 ファイルに書き、実測（18）と食い違った。しかも前タスクの記録の「9」も誤り（正は 17）で、**誤った数字が記録から記録へ伝播していた**。件数・行数・バイト数を書くときは必ず数える。
12. **権限の境界は停止条件に書いておく価値がある**。上流への issue 起票は接続スコープ外で、計画書 §7 に「作成できない場合は停止して報告」と書いてあったので迷わず止まれた。止まるだけでなく「所有者がそのまま投稿できる文面」を保全したことで、作業が無駄にならなかった。

## 4. 次にすべきこと (Next Actions)

- **所有者の作業（外部判断待ち）**: `docs/audit/issues-lint.md` §6 の英語文面を <https://github.com/Taiizor/agents-md-cookbook/issues/new> に投稿する（LANGGATE-2 は保留）。
- **所有者の作業**: CI の `依存関係の差分レビュー` が失敗し続けている。原因は「Dependency graph is enabled にしてください」で、Settings → Code security and analysis の変更（所有者権限）が必要。本変更とは無関係。
- 上流が修正版を公開したら `.pre-commit-config.yaml` の `entry` を `agents-md-lint --root .` に戻し、`make agents` と負のテストを再実行する（設定内に注記済み）。
- 派生プロジェクトで他言語のファイルを正当に持つ場合の逃げ道は、スクリプト冒頭の `IGNORE_PATHS`（正規表現）と `SKIP=language` の 2 つ。docstring と設定の注記に書いた。利用実績が増えたら `.langignore` のような外部設定ファイルにするかを検討する。
- warn は導入時点で 0 件。表外漢字を正当に使う文書（歴史・人名・技術系の引用）が増えたときに、warn の運用（無視され始めないか）を再検討する。
- `make check` は 17 → **18 フック**になった（commit-msg stage の 2 件を含めると設定は 20）。CI の所要時間は 20 秒で、増加は誤差の範囲（push 後に `gh pr checks` で確認済み）。
