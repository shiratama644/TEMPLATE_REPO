# LANGGATE: 日本語・英語のみの言語ゲートと残事項 3 件

> 対応 task-list ID: `LANGGATE-1`〜`LANGGATE-4`（[`../task-list.md`](../task-list.md)）
> 計画書テンプレート: [`_TEMPLATE.md`](./_TEMPLATE.md) 準拠

## 1. 開始前確認

- ブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で AGENTSYNC-1〜6 が完了（`54c9067`）であることを確認する
- `AGENTS.md §4.4`（ブランチ運用）・`§6.1`（検証コマンド）・`.agent/rules/03_doc-style.md` を読む
- 本計画書の §5（完了条件）と §7（停止条件）を再読する

## 2. 目的 (Why)

### 2.1 言語ゲート（LANGGATE-1）

日本語の文書に**他の言語が混入しても、日本語の漢字に見えるため読者が気づけない**。実際に本リポジトリで
5 回発生した（すべて目視で見逃し、後から別の作業中に偶然発見した）:

| 混入した語 | 正しい日本語 | 発見のきっかけ |
|---|---|---|
| U+951A U+5B9A（錨定の簡体字形） | アンカリング | 計画書の自己レビュー |
| U+4F9D U+8D56（依存の簡体字形） | 依存 | ADR の自己レビュー |
| 中国語の疑問形 3 字（U+600E U+4E48 U+505A） | どうやるか | スキル本文の読み直し |
| U+53CD U+9988（簡体字） | フィードバック | ADR の自己レビュー |
| U+624B U+52A8（簡体字） | 手動 | コミット `5a10b4d` のメッセージ（未修正のまま残った） |

5 回のうち 4 回は「書いた本人が後で読み直して」発見した。**発見が運に依存している**のが問題で、
機械的に止める手段がない限り再発する。ハングルが shell フックのコメントに混入した例
（`704c398` で修正）も、開発中の検査が全体走査して初めて見つかった。

### 2.2 残事項 3 件（LANGGATE-2〜4）

- **LANGGATE-2**: `agents-md-lint@1.0.1` の bin が symlink 経由で no-op になる不具合（ADR-0002 に記録済み）を
  上流へ報告する。回避策は本リポジトリに入れたが、**上流が直さないと他の利用者が同じ罠を踏む**。
- **LANGGATE-3**: `.agent/hooks/log-task.md` のテンプレートは `Branch: <branch>` を要求するが、
  `AGENTS.md §4.4` は「過去セッションのブランチ名を文書に残さない」と定める。**規約同士が矛盾している**
  （2 つの過去ログが「未確認」として記録済み）。どちらかに寄せて明文化する。
- **LANGGATE-4**: コミット `5a10b4d` のメッセージの誤字（U+624B U+52A8）を記録する。
  `git commit --amend` は禁止（`.agent/settings.json` の deny）かつ push 済みなので**履歴は書き換えず、
  正誤をログに残す**。

## 3. 変更範囲 (Scope)

変更対象:

- `scripts/check_language.py`（新規。標準ライブラリのみ）
- `.pre-commit-config.yaml`（フック 2 件: ファイル検査 / コミットメッセージ検査）
- `Makefile`（`lang` ターゲット・`.PHONY`・help・冒頭のコマンド一覧）
- `AGENTS.md`（§6.1 に `make lang`、§4.4 に時点記録の扱い）
- `README.md`（`make lang` と `scripts/check_language.py` の行）
- `.agent/rules/03_doc-style.md`（§1 言語と表記に基準を追記）
- `.agent/hooks/log-task.md`（テンプレートの `Branch:` を置き換え）
- `.agent/hooks/post-edit-verify.sh`（混入したハングル 3 字の修正）
- `docs/adr/0003-language-gate.md`（新規。方式と限界の判断記録）＋ `docs/adr/README.md`・`../README.md` の目次
- `docs/task-list.md`（LANGGATE-1〜4 の行）・`docs/audit/activity.md`（追記）・`.agent/logs/`（新規ログ）
- 本計画書

変更しない（境界外）:

- 過去のログ 3 件（`.agent/logs/2026-10-12_*`・`2026-10-25_*`・`2026-10-26_sync-agent-standards.md`）
  — ログは追加のみ。残るブランチ名は §4.4 の歴史的例外として扱う
- 既存の task-list 行・`docs/audit/activity.md` の既存行・ADR-0001（凍結）
- `.github/workflows/`（CI は `make check` 経由なので変更不要）
- 上流由来スキル本文（`.agent/skills/`）の文面
- 節番号 §1〜§8 の契約

## 4. 禁止事項

- **負のテストをせずにゲートを導入しない**（`agents-md-lint` で偽陽性ゲートを見逃した実績がある）
- 検出精度を上げるために語の一覧照合（U+4F9D U+8D56 や U+8FD9 U+4E2A を含む語の語彙リスト）を持ち込まない — 誤検出が増える（§10.3）
- 日本語の表外漢字・異体字を error 扱いしない（正当な日本語を止めるゲートは使われなくなる）
- 既存の検査（`check_doc_links.py`・`check_mermaid.py`）の判定を変えない
- `git commit --amend`・`git push --force` で履歴を書き換えない
- このサンドボックスで `make setup` を実行しない（`.git/hooks/commit-msg` をプラットフォームの
  trailer フックが占めているため、上書きすると `Co-authored-by` が付かなくなる）
- 不明点は推測で埋めず、§7 の停止条件に従って質問する

## 5. 完了条件 (DoD)

- [ ] `python3 scripts/check_language.py` が自己検査（fixture 8 件）を通し、リポジトリ全体で exit 0
- [ ] **負のテスト**: 簡体字・ハングル・キリルを含むファイルで exit 1、簡体字を含むコミットメッセージで
      exit 1、正常なメッセージで exit 0（`pre-commit run <id> --files …` / `--hook-stage commit-msg` で実測）
- [ ] `pre-commit run language --all-files` が Passed、`make lang` が exit 0
- [ ] `make check`（全フック）と `make links` が PASS
- [ ] 上流リポジトリに issue を作成し、番号を ADR-0002 と task-list に記録する（LANGGATE-2）
- [ ] `log-task.md` と `AGENTS.md §4.4` の矛盾が解消され、両者に同じ方針が書かれている（LANGGATE-3）
- [ ] `5a10b4d` の誤字が新規ログに正誤として記録されている（LANGGATE-4）
- [ ] 検査の**限界**（日中共通の漢字だけでは検出できない）が ADR-0003 とスクリプトの docstring に書かれている
- [ ] `docs/task-list.md` の状態・進捗・証拠を更新、`docs/README.md` の目次を同じ変更で更新

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | する | スクリプト内蔵の自己検査 fixture 8 件（日本語+英語 / 記号・絵文字 / CP932 の異体字 / 簡体字 1 字 / 簡体字の文 / ハングル / キリル / 表外漢字は warn） |
| Component | する | `pre-commit run language --files <違反ファイル>` が Failed・exit 1、既存ファイルで Passed。`--hook-stage commit-msg` で違反メッセージが Failed |
| E2E | する | `make check`（全 11 フック）・`make links`・CI（push 後 `gh pr checks`） |
| 実環境 | しない | 実機・本番 build の概念がない（文書とスクリプトのみの変更） |

行わないテスト: 他言語の大規模コーパスによる再現率・適合率の評価（§10.3 の限界は文書で明示する）。

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 検査が**正当な日本語**を error として止める（誤検出。表外漢字・異体字・約物・絵文字）
- リポジトリ内の既存ファイルが error になり、修正すると文意が変わる
- 上流リポジトリに issue を作成できない（権限・ネットワーク）
- 規約同士に新たな矛盾が見つかる
- 履歴の書き換え（amend / force push）が必要になる

## 8. 完了時に行うこと

1. 差分を自己レビュー（境界外の変更が混ざっていないか、凍結対象が無変更か）
2. `make check` と `make links` を実行
3. `docs/task-list.md` の状態・進捗・証拠を更新
4. タスク ID を含むコミット（`feat(checks): …` 等）を作成
5. 証拠中心の完了報告（`AGENTS.md §7.2` 形式）

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| LANGGATE-1 | 言語ゲート | `scripts/check_language.py`・フック 2 件・`make lang`・ADR-0003 | — |
| LANGGATE-2 | 上流への報告 | Taiizor/agents-md-cookbook の issue | — |
| LANGGATE-3 | ブランチ名規約の矛盾解消 | `log-task.md`・`AGENTS.md §4.4` | — |
| LANGGATE-4 | コミットメッセージ誤字の記録 | 新規ログの正誤欄 | LANGGATE-1 |

## 10. 設計詳細・仕様

### 10.1 判定方式（採用）

**日本語で使う文字は EUC-JP / CP932（JIS X 0208 + NEC/IBM 拡張）で符号化できる**ことを判定に使う。
標準ライブラリ（`unicodedata`・codec）だけで済み、辞書データもネットワークも要らない。

| 対象 | 判定 | 理由 |
|---|---|---|
| ASCII・空白 | 許可 | 英語 |
| 記号・句読点・数字（Unicode 一般カテゴリ `P*` `N*` `S*` `Z*` `C*`） | 許可 | 言語は文字（letters）に宿る。`·`（U+00B7）や `→` `✅` は英語の文書でも使う |
| 絵文字・矢印・罫線・CJK 約物・全角形などのブロック | 許可 | 同上 |
| ハングル・キリル・ギリシャ・アラビア ほか（Unicode 名にスクリプト名を含む） | **error** | 日本語でも英語でもない文字体系 |
| U+4E00–U+9FFF・U+F900–U+FAFF で CP932/EUC-JP に符号化不可 | **error** | 簡体字（U+52A8 など）や日本語で使わない漢字 |
| U+3400–U+4DBF・U+20000 以降で符号化不可 | **warn** | 日本語の表外漢字（U+20B9F など）の可能性があるため error にしない |
| ひらがな・カタカナ・CP932 にある漢字 | 許可 | 日本語。「髙」(U+9AD9)「﨑」(U+FA11)「德」「禮」は CP932 の NEC/IBM 拡張に含まれる |

### 10.2 なぜ「日本語コーデックで符号化できるか」だけでは不十分だったか

開発中に試した単純方式（`ch.encode('cp932')` の成否だけ）は**4 つの誤判定**があり、採用しなかった:

1. 絵文字（U+2705 など）が全て NG になる → 記号カテゴリを先に許可して解消
2. キリル・ギリシャは JIS X 0208 に含まれるため検出できない → Unicode 名のスクリプト判定を先に置いて解消
3. 繁体字の大半（U+6A23 U+5011 など）は CP932 の NEC/IBM 拡張に含まれ検出できない → 限界として §10.3 に明記
4. 日本語の表外漢字（U+20B9F U+29E3D）が NG になる → 拡張領域は warn に落として解消

### 10.3 限界（正直に書いておく）

- **文字単位**の検査なので、日本語と共通の漢字だけ（使・用・依・系・明・個）で書かれた中国語の文は検出できない。
  検出できるのは簡体字固有の字と、日本語に無い文字体系。**語単位**の検査（語彙リスト照合）は
  「起点・要点・反転・反映」のような正当な日本語を誤検出するため行わない（実際に 2 回の偽陽性を出した）。
- 繁体字中国語の多くは CP932 の NEC/IBM 拡張に含まれるため検出できない。
- 検査そのものが「日本語と英語以外を止める」ので、**違反例を文書に書くときはコードポイントで書く**
  （`U+52A8` のように）。字面で書くとその文書自身がゲートに止まる。スクリプトの fixture は
  `\uXXXX` エスケープで書いている。

### 10.4 適用範囲

| フック | stage | 対象 |
|---|---|---|
| `language` | pre-commit | 変更された全ファイル（バイナリと symlink はスクリプト側で無視） |
| `commit-msg-language` | commit-msg | コミットメッセージ（`#` コメント行とカットライン以降は除去） |

派生プロジェクトで他言語のファイルを正当に持つ場合は、スクリプトの `IGNORE_PATHS` を編集するか
`SKIP=language git commit` で一時的に外す。

## 11. リスク・Gotchas

- **この環境の `printf` と bash の `-m` は `\uXXXX` を解釈しない**。fixture を shell で作ると
  エスケープが字面として残り、**負のテストが偽陰性になる**（実際に 2 回だまされた）。
  Unicode の fixture は `python3` で書く。
- **検査スクリプト自身が検査対象**になる。fixture と docstring に違反文字を字面で書くと全体走査が
  自分自身で error になる（実際に 34 件出た）。`\uXXXX` エスケープで書く。
- pre-commit は `.pre-commit-config.yaml` に未ステージの変更があると実行を拒否する
  （`Your pre-commit configuration is unstaged`）。フックを試す前に設定を `git add` する。
- pre-commit の commit-msg フックは `--hook-stage commit-msg --commit-msg-filename <path>` で単体実行できる。
  `git commit` を実際に走らせると失敗時にコミットが残るリスクがあるので、単体実行で確認する。
- `make setup` は `.git/hooks/commit-msg` を上書きする。このサンドボックスでは同パスをプラットフォームの
  `Co-authored-by` trailer フックが占めているため実行しない（§4）。

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| LANGGATE-1 | | | |
| LANGGATE-2 | | | |
| LANGGATE-3 | | | |
| LANGGATE-4 | | | |
