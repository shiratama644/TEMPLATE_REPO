---
name: context-budget
description: コンテキストウィンドンを予算として扱うスキル。長いセッションで Agent が規約を守らなくなった、同じファイルを何度も読み直している、調査結果やログを丸ごと貼り込んでいる、スキルや指示ファイルが増え続けて重くなった、という時に使う。JIT コンテキスト（軽量な識別子だけ持って実行時に読む）、段階開示の費用対効果の実測、context rot と lost in the middle の影響、長いタスクでの圧縮・構造化ノート・サブエージェントの使い分け、常時ロード分の測り方と削減手順を扱う。
---

# Context Budget — コンテキストを予算として扱うスキル

> 正本: `AGENTS.md`（§8 記憶システム・§3.1 検証）、`.agent/rules/01_information-hierarchy.md`（情報の優先順位）
> 関連スキル: [`agents-md-authoring`](../agents-md-authoring/SKILL.md)（指示ファイルの予算）、[`handoff`](../handoff/SKILL.md)（引き継ぎ文書）、[`dispatching-parallel-agents`](../dispatching-parallel-agents/SKILL.md)（並列調査）

## いつ使うか

- セッションが長くなり、Agent が冒頭の規約を守らなくなった
- 同じファイル・同じ検索を繰り返している（＝前に読んだ内容を覚えていない）
- 調査結果・ログ・長い出力を丸ごと会話に貼り込もうとしている
- スキルやルールが増え、常時ロード分が重くなってきた
- タスクの途中で圧縮（compact）が走り、前提が消えた

## 1. 原則: コンテキストは無限ではない

ウィンドウが大きいモデルでも、**入れた長さそのものが精度を下げます**。Chroma の「Context Rot」研究は、入力が長くなるほど全モデルの性能が劣化すること、そして**同じ内容でも入力長が伸びるほど不利**になることを示しています。「Lost in the Middle」では、長い入力では**中央に置いた事実が最も使われない**（冒頭と末尾が有利）ことが示されています。

実務上の目安（観測報告であり環境で変わる）:

| 現象 | 目安 |
| :--- | :--- |
| context rot が目立ち始める | 1M token 級のモデルで **300〜400k tokens** あたり |
| 指示の遵守が怪しくなる領域（"dumb zone"） | ウィンドウの **40% 前後**を過ぎたあたり。60% で打ち切りを検討する |
| 常時ロード分の現実的な上限 | 指示ファイル **150 行 / 32,768 bytes**（[`agents-md-authoring`](../agents-md-authoring/SKILL.md) を参照） |

結論: **ウィンドウの大きさを予算の根拠にしない。** 「入る」ことと「効く」ことは別。

## 2. JIT コンテキスト（Just-in-Time）

事前に全部読み込むのではなく、**軽量な識別子だけ保持し、必要になった瞬間に読む**方式。

| 保持する（安い） | 保持しない（高い） |
| :--- | :--- |
| ファイルパス | ファイルの中身 |
| 検索クエリ | 検索結果の全文 |
| URL | 取得したページの本文 |
| タスク ID・commit SHA | 差分の全文 |
| 実測値の表 | その元になった生ログ |

このリポジトリは hybrid 方式です。`AGENTS.md` は冒頭で常時ロードし、それ以外は `docs/task-list.md`・`.agent/skills/index.md`・`.agent/logs/` といった**識別子**から必要に応じて引きます。だから「どこに何があるか」を書き、「中身」は書かない。

## 3. 段階開示の費用対効果（このリポジトリの実測）

```bash
# スキルの常時ロード分（description の合計）と本文の合計を測る
python3 - <<'PY'
import re
from pathlib import Path
D = re.compile(r"^description:\s*(.*)$", re.M)
desc = body = 0; n = 0
for p in sorted(Path(".agent/skills").glob("*/SKILL.md")):
    t = p.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", t, re.S)
    if not m: continue
    n += 1
    d = D.search(m.group(1))
    desc += len(d.group(1).strip()) if d else 0
    body += len(t[m.end():])
print(n, "skills:", desc, "chars always-loaded /", body, "chars on-demand")
PY
```

実測値（2026-10-26 時点、スキル 46 件）:

| 項目 | 値 |
| :--- | :--- |
| 常時ロードされる `description` の合計 | **7,059 字**（平均 153 字 / 最長 330 字） |
| 本文の合計（活性化時のみ読む） | **300,616 字** |
| 常時ロード分の割合 | **2.3%**（＝段階開示で約 97.7% を節約している） |
| 仕様上限 | `name` ≤ 64 字 / `description` ≤ 1,024 字 / 本文 < 500 行 / 活性化時 < 5,000 tokens |
| 本文が 400 行を超えるもの | `writing-skills` 679 / `subagent-driven-development` 516 / `project-init` 493 / `skill-creator` 487（すべて上限 500 行未満か、上流由来で本文を書き換えないもの） |

この 2.3% が段階開示のすべてです。**全スキルを常時読み込んだ瞬間に、この設計は破綻します**（`AGENTS.md §8.3` が「該当スキルだけを読む」と定める理由）。

裏側の注意: 常時ロード分は `description` だけなので、**`description` を長く書くほど毎セッションのコストが増える**。ただし短すぎると発火しない（undertrigger）。仕様上 1,024 字まで許されるが、目安は **150〜350 字**で「何をするスキルか＋いつ使うか」を書く。押しの強さ（"Use when..."）で発火率を稼ぐ。

## 4. 自動生成コンテキストは入れない方がマシなことがある

ETH Zurich の「Evaluating AGENTS.md」（ICLR 2026）の実測:

- 自動生成したコンテキストファイルは**成功率を約 3% 下げ**、**推論コストを約 20〜23% 増やした**
- 長いアーキテクチャ説明は**探索を速くせず**、情報過多で**完全性が約 25% 下がった**
- 一方、**名前を挙げた test コマンドは約 1.6 倍使われた**

つまり「たくさん書けば助かる」は誤り。**具体的で実行可能な少数の事実**だけが効く。同じ理由で、調査結果を自動で全文注入する仕組みは避ける。

## 5. 長いタスクの three strategies

| 戦略 | いつ | どうやるか |
| :--- | :--- | :--- |
| **圧縮（compaction）** | ウィンドウが埋まり始めた時 | 要点を保持して履歴を圧縮する。ただし圧縮で**前提が消える**ので、消えて困るものは事前にファイルへ書く |
| **構造化ノート（外部記憶）** | 常に | `docs/task-list.md`（進捗の正本）・`docs/planning/*_PLAN.md`（計画と判断）・`.agent/logs/YYYY-MM-DD_*.md`（実行記録）に書く。会話に持たせない |
| **サブエージェント** | 独立した調査・大量の読み込み | 大量のトークンを消費する探索を**別のコンテキスト**で実行し、結論だけ返させる（[`dispatching-parallel-agents`](../dispatching-parallel-agents/SKILL.md)） |

このリポジトリでは 2 つ目が主役です。**「覚える」のではなく「書く」**。圧縮やセッション切断が起きても、ファイルにあれば復旧できます（`AGENTS.md` の最優先事項「常に復旧可能」）。

## 6. アンチパターンと対処

| アンチパターン | 何が起きるか | 代わりにやること |
| :--- | :--- | :--- |
| 長い出力を丸ごと貼る | 中央の事実が使われず、以降の遵守率が下がる | `tail` / `grep` で必要な行だけ出す。実測値は表に加工する |
| 同じファイルを何度も読む | トークンの浪費と、読むたびに内容がぶれる | 1 回読んで要点をノートに書く。以後はノートを参照する |
| 調査の全文を会話に保持する | ウィンドウを食い潰す | サブエージェントに調べさせ、出典付きの結論だけ返させる |
| 全スキル・全ルールを先に読む | 常時ロード分が数倍になる | `index.md` の読み方ガイドから該当 1〜2 件だけ読む |
| 消えて困る前提を会話だけに置く | 圧縮・切断で消える | `docs/planning/` か `.agent/logs/` に書く |
| 指示ファイルに詳細を書き足し続ける | 32 KiB を超え、Codex が黙って打ち切る | 詳細は `rules/` か `skills/` へ移し、指し先だけ残す |
| 古い要約を消さずに足す | 矛盾した指示が並ぶ（層間の矛盾は最大の失敗要因） | 同じ変更で古い記述を直す。追記専用ファイル（logs・activity）以外は上書きしてよい |

## 7. 重くなったら（rightsize の手順）

1. **測る**: 上のスクリプトで常時ロード分を測る。`make agents` で指示ファイルの予算を見る
2. **削る候補を出す**: 各行に「消したら Agent が間違えるか?」を問う。否なら移設か削除
3. **移設する**: 詳細は `.agent/rules/`（発火条件を絞れる）か `.agent/skills/`（該当タスクの時だけ）へ
4. **指し先を残す**: 移設したら必ずリンクする。孤立文書の発見率は 10% 未満、リンク参照は 90% 超
5. **節番号を守る**: `AGENTS.md` の節番号は多数の文書から参照されているので、番号を変えずに本文だけ移す（`docs/task-list.md` と過去ログは書き換えない）
6. **検証する**: `make agents` と `make check`。参照パスの実在はゲートが検査する

## 8. 出典

- Anthropic「Effective context engineering for AI agents」（JIT コンテキスト、圧縮・構造化ノート・サブエージェント）
- Anthropic「Claude Code Best Practices」（肥大化した指示ファイルは指示を無視させる）
- Chroma「Context Rot: How Increasing Input Tokens Impacts LLM Performance」
- 「Lost in the Middle: How Language Models Use Long Contexts」
- ETH Zurich「Evaluating AGENTS.md」（ICLR 2026）— [Taiizor/agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook)（**MIT**）が整理した実測値を参照
- agentskills.io — `SKILL.md` の段階開示と上限
- ライセンス表示の正本は [`.agent/THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md)
