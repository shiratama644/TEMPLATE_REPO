---
name: project-init
description: テンプレートから作った新規リポジトリの初回、AGENTS.md §6 がプレースホルダのまま、README が TEMPLATE_REPO のまま、project-overview がテンプレート説明のまま、または「初期設定して」「プロジェクトに合わせて」と依頼されたときに使う。Use when bootstrapping a new project from this template before any feature work.
---

# Project Init — 新規プロジェクトの初期設定

> テンプレートを実プロジェクトに合わせる。**承認前にプロジェクト文書を書き換えない。**
> 流れは **事実確認 → 要件確定 → 計画承認 → 実行 → 検証**。混ぜない。
> 製品機能は実装しない。

## いつ使うか

- GitHub の「Use this template」直後の最初のセッション
- `AGENTS.md §6.1` が例示のまま、`README.md` が `TEMPLATE_REPO` のまま
- `.agent/skills/project-overview/SKILL.md` がテンプレートの説明のまま
- ユーザーが「初期設定して」「プロジェクトに合わせて書き換え」と依頼したとき

**使わないとき**

- すでに §6 が埋まっていて、個別機能の実装に入っている → 通常ワークフロー
- テンプレート本体（本リポジトリ）の改善 → 本スキルの対象外
- 技術選定だけしたい → [`tech-stack`](../tech-stack/SKILL.md) を単体で使う

## 鉄則

1. **承認前にプロジェクト文書を書き換えない。** 例外は `docs/planning/INIT_STATE.md` のみ（スロットと予算の作業記憶）。
2. **推測で埋めない。** 不明点は `ask_user`（`AGENTS.md §7.4`）。
3. **検証可能な事実は計画に載せる前に確認する。** `web_search`（内容で `depth`）→ 公式 URL は `fetch_page`。見つからないのは異常ではなく **`unverified` で正常終了** してユーザーに渡す。
4. **ループは予算で止める。** 回数上限に達したら回し続けない。
5. **汎用規約を壊さない。** `AGENTS.md` の §1〜§5・§7・§8 は削らない。書くのは §6。
6. **実行は承認済み計画のファイル一覧だけ。** 計画に無い変更をしない。再実行は冪等。
7. **完了後に停止する。** 製品機能の実装は次の指示を待つ。

## 既存スキルとの役割分担

| 局面 | 使うスキル | 本スキルがやること |
| :--- | :--- | :--- |
| ユーザー提案の事実確認 | [`documentation-lookup`](../documentation-lookup/SKILL.md) / [`search-first`](../search-first/SKILL.md) / [`deep-research`](../deep-research/SKILL.md) | 通常は本スキルの事実確認ループ。深掘りが必要なら `read_file` |
| 意図の深掘り | [`brainstorming`](../brainstorming/SKILL.md) | 通常は `ask_user`。枠に収まらないときだけ切替 |
| 他人が持つ情報 | [`to-questionnaire`](../to-questionnaire/SKILL.md) | 本人が答えられないスロットだけ |
| 計画の穴 | [`grilling`](../grilling/SKILL.md) | ユーザー希望時、または未決の分岐が残るとき |
| 技術・検証の記録 | [`tech-stack`](../tech-stack/SKILL.md) | §6.1 の書式 |
| 品質ゲート | [`ci-quality-gates`](../ci-quality-gates/SKILL.md) | `PROJECT_CHECKS` を足すとき |
| 文書の整合 | [`docs-maintenance`](../docs-maintenance/SKILL.md) | 実行後。内部リンクは `bash`、外部 URL は `fetch_page` |
| 書き換え対象 | [`project-overview`](../project-overview/SKILL.md) | **読む対象ではなく、書き換える対象** |

## 予算（セッションあたり）

上限到達は失敗ではない。その項目を `unverified` または `unknown` にして `ask_user` へ渡す。

| 資源 | 1 単位の上限 | セッション合計 | 到達時 |
| :--- | :--- | :--- | :--- |
| `ask_user` 1 ラウンド | **4 問**（選択肢 2〜4 + 自由記述） | **8 ラウンド** | 必須が空なら「未定で計画へ / 続けて聞く / 中止」を 1 問だけ出す。続けて聞くは +2 ラウンドまで |
| 1 事実あたり `web_search` | **3 回**。depth `"3"` は **1 回まで** | **12 回** | その事実は `unverified` |
| 1 事実あたり `fetch_page` | **3 URL**（`chunkIndex` 継続は回数に含めない） | **12 回** | その事実は `unverified` |
| 1 事実の「再検索」 | **2 回** | — | 3 回目は出さず `unverified` でユーザー判断 |
| 計画修正ラウンド | — | **6 回** | 「この計画で実行 / 中止」の 2 択だけ出す |

## スロット状態

値の有無だけでは足りない。経緯を持つ。

| state | 意味 | 計画に載せるとき |
| :--- | :--- | :--- |
| `unknown` | 未質問 | 必須なら質問する。任意なら「未定」 |
| `proposed` | ユーザーが言った。未確認 | 検証対象なら 1b へ。検証不要なら `confirmed` にする |
| `confirmed` | ユーザーが確定。検証不要（目的・名前・好み） | そのまま載せる |
| `verified` | 事実確認で一致 | 公式の言い方で載せる |
| `unverified` | 予算切れ、公式なし、ユーザーが未確認のまま進める | **「未確認」と明示して載せる**（正常） |
| `rejected` | ユーザーが却下 | 載せない |

各スロットが持つ欄:

| 欄 | 内容 |
| :--- | :--- |
| `id` | `domain` / `goal` / `success` / `name` / `non_goals` / `stack` / `verify` / `constraints` / `prune_skills` |
| `value` | 現在値。空なら `unknown` |
| `state` | 上表 |
| `source` | `user` / `web_search` / `fetch_page` / `repo` |
| `evidence` | `[id](url)` またはファイルパス |
| `verified_at` | 確認した日時（JST）。未確認なら空 |
| `confidence` | `high` / `medium` / `low` |
| `depends_on` | 再検証が必要なとき、依存するスロット id |

検証不要（事実確認しない）: `goal` / `success` / `name` / `non_goals`  
検証する: `stack` / `verify` / `constraints` のうち、版・ライブラリ・API・ライセンス・「標準/非推奨」の主張

作業記憶は `docs/planning/INIT_STATE.md` に書く（承認前に書いてよい唯一のファイル）。中断後はこれを `read_file` して再開する。

```markdown
# INIT_STATE

- phase: detect | ask | fact | plan | execute | done
- budgets: ask_rounds_used / search_used / fetch_used
- approved: false

| id | value | state | source | evidence | verified_at | confidence | depends_on |
```

---

## 進行

```mermaid
flowchart TD
  S(["開始"]) --> D["0 現状判定 + INIT_STATE 復元"]
  D --> INIT{"未初期化?"}
  INIT -->|初期化済み| Rerun["ask_user 再実行? 範囲は?"]
  Rerun -->|しない| STOP1(["停止"])
  Rerun -->|する 冪等| ASK
  INIT -->|未初期化 / 一部| ASK

  subgraph ASKLOOP["ask_user ループ"]
    ASK["ask_user 最大4問/回 合計8ラウンド"] --> ANS{"応答"}
    ANS -->|未回答 / 不明 / 拒否| HOLD["unknown または rejected"]
    ANS -->|値あり 検証不要| CONF["state=confirmed"]
    ANS -->|値あり 検証可能| FACT
    HOLD --> BUD1{"ask 予算?"}
    CONF --> BUD1
  end

  subgraph FACTLOOP["事実確認ループ"]
    FACT["depth を決める"] --> CAP{"この事実の search が 3 未満?"}
    CAP -->|いいえ| UV["state=unverified 正常終了"]
    CAP -->|はい| WS["web_search"]
    WS --> OFF{"公式 URL?"}
    OFF -->|ある| FP["fetch_page"]
    OFF -->|ない| MORE{"再検索 2 回未満?"}
    FP --> CMP{"提案と一致?"}
    MORE -->|はい| WS
    MORE -->|いいえ| UV
    CMP -->|一致| VER["state=verified"]
    CMP -->|ずれ / 不足| CONF2["ask_user 採用 / 維持=unverified / 再検索"]
    CONF2 -->|再検索 残あり| FACT
    CONF2 -->|再検索 残なし / 維持| UV
    CONF2 -->|採用| VER
  end

  UV --> BUD1
  VER --> BUD1
  BUD1 -->|必須が空 かつ 予算あり| ASK
  BUD1 -->|必須が空 かつ 予算切れ| LAST["ask_user 未定で計画へ / 中止"]
  LAST -->|中止| STOP2(["停止"])
  LAST -->|計画へ| PLAN
  BUD1 -->|必須が埋まった| PLAN["2 計画提示 プロジェクト文書は触らない"]

  subgraph PLANLOOP["計画ループ"]
    PLAN --> GO["ask_user 実行 / 修正 / 質問 / 中止"]
    GO -->|質問 計画は不変| QONLY["疑問に答える"]
    QONLY --> GO
    GO -->|修正| DELTA["変わったスロットだけ 1b"]
    DELTA --> FACT
    GO -->|中止| STOP2
  end

  GO -->|実行| GATE{"承認済み計画とファイル一覧が一致?"}
  GATE -->|いいえ| STOP3(["実行しない 計画を出す"])
  GATE -->|はい| W["4 許可リストだけ書き換え 冪等"]
  W --> V["5 検証 → 記録 → 停止"]
  V --> END(["完了 製品実装しない"])
```

図: ![project-init フロー](flowchart.png)

---

### 0. 現状判定

`read_file` / `bash` で確認する。ユーザーに聞ける事実は聞かない。`INIT_STATE.md` があれば復元し、予算とスロットを再利用する。

| 確認 | 未初期化の目安 |
| :--- | :--- |
| `README.md` 先頭 | `# TEMPLATE_REPO` のまま |
| `AGENTS.md §6.1` | 「（例）」や空の検証コマンド |
| `project-overview/SKILL.md` | 「汎用エージェント作業テンプレート」 |
| `docs/planning/INIT_PLAN.md` | 無い |

- **未初期化** → Phase 1。
- **一部** → 埋まっているスロットは `confirmed` / `verified` として質問しない。
- **初期化済み**（`INIT_PLAN.md` があり、`product.md` がテンプレでない）→ 再実行するか、上書き範囲を `ask_user`。勝手に上書きしない。再実行は Phase 4 の冪等ルールに従う。

未コミット変更があるときは混ぜず停止する（`AGENTS.md §4.1`）。

---

### 1. ask_user ループ

**1 回あたり最大 4 問。セッション合計 8 ラウンド。** 全体 4 問ではない。

すでに `confirmed` / `verified` / `unverified` / `rejected` のスロットは聞かない。`unknown` だけ聞く。

応答の分岐:

| 応答 | 次 |
| :--- | :--- |
| 値を選んだ / 書いた | 検証不要 → `confirmed`。検証可能 → `proposed` にして 1b |
| 不明・分からない | 任意 → `unknown` のまま「未定」。必須 → 言い方を変えて **あと 1 回だけ**。それでも空なら `unverified`（必須の未定） |
| 拒否・答えたくない | `rejected`。必須が `rejected` なら計画へ進めず、中止か未定かを 1 問 |
| スキップして進めて | 必須が空 → 必須だけ聞く。任意 → `unknown`。進行中の事実 → `unverified` |

必須スロット: `domain` / `goal` / `success`  
任意: `name` / `non_goals` / `stack` / `verify` / `constraints` / `prune_skills`（既定は削除しない）

ラウンド例（埋まっている問は飛ばす）:

**Round 1** 分野、成果物、成功条件、非目標  
**Round 2** 技術、検証、制約、skill 削除

`brainstorming` へ切替: 分野が「その他」、目的が一言で言えないとき。  
`to-questionnaire` へ切替: 答えが別担当の頭にあるとき。

**抜け条件（どれか）:**

- 必須が `confirmed` または `unverified`（未定と明示）で、進行中の 1b が無い
- ask 予算切れ → 1 問「未定で計画へ / 中止」
- ユーザーが「計画を出して」

抜けたあと、進行中の `proposed` が残っていれば 1b を先に完了させる。

---

### 1b. 事実確認ループ

`proposed` の検証可能事実だけ。好み・目的・名前は対象外。

**上限到達・公式なし・本文なし = 異常ではない。`unverified` にしてユーザーへ返す。**

| 内容 | 最初の depth | 上げられる上限 |
| :--- | :--- | :--- |
| 公式 URL・パッケージ名・版の有無 | `"1"` | `"2"` まで |
| 比較・ライセンス・複数ソース | `"2"` | `"3"` まで 1 回 |
| API 詳細・長い仕様・セキュリティ | `"3"` | 上げない。`fetch_page` する |

1. 提案を 1 文にする。
2. この事実の `web_search` が 3 未満なら呼ぶ。達していれば `unverified`。

```json
{
  "query": "<公式名> official docs <論点>",
  "depth": "<上表>"
}
```

3. 公式 URL があれば `fetch_page`（1 事実 3 URL まで）。`hasMore` なら同じ URL の `chunkIndex` を進める。
4. 表で報告する。引用は `[id](url)`。推測と事実を分ける。

| 提案 | 結果 | 出典 | state |
| :--- | :--- | :--- | :--- |

5. **一致** → `verified`、`source=fetch_page` または `web_search`、`verified_at`、`confidence`。
6. **ずれ / 不足** → `ask_user`:
   - 公式を採用する（`verified`、値は公式側）
   - 提案を維持する（`unverified`）
   - 再検索する（残回数があるときだけ出す）
7. 再検索の残が 0、またはセッションの search/fetch 合計上限 → 選択肢から再検索を外し、採用か維持だけ。

修正時（Phase 3）は **`value` または `state` が変わったスロットと、`depends_on` でそれを指すスロットだけ** 1b する。最初から全部検索し直さない。

---

### 2. 計画の提示

チャットに出す。**プロジェクト文書は触らない。** `INIT_STATE.md` の更新は可。

必ず含める:

1. スロット表（id / value / state / evidence / confidence）
2. 書き換え対象（触らないファイルも明示）
3. スキル（残す / 削除。削除は承認があるものだけ）
4. 最初のタスク 1〜3 件（製品実装を含めない）
5. やらないこと
6. 予算の消費（ask_rounds / search / fetch）

`ask_user` の 4 択は責務が違う:

| 選択肢 | 計画 | 次 |
| :--- | :--- | :--- |
| **実行する** | 不変。承認 | Phase 4。`approved: true` |
| **修正する** | 変わる | 変更スロットだけ 1b → 計画を再生成 → 再承認 |
| **質問する** | **不変** | 疑問に答える。スロットも計画も変えない。終わったら同じ 4 択 |
| **中止する** | 捨てる | プロジェクト文書は触らず停止。`INIT_STATE.md` は残してよい |

「実行して」「Go」「承認」以外で Phase 4 に進まない。計画修正は 6 ラウンドまで。達したら実行か中止の 2 択。

---

### 3. 計画ループの詳細

- **質問**: 計画本文を書き換えない。回答はチャットだけ。
- **修正**: ユーザーが指定したスロットだけ `proposed` に戻す。依存スロットも再検証。差分だけ計画に出す。
- **grilling**: ユーザーが「詰めて」と言ったとき、または未決分岐が残るとき。1 ラウンド。予算は ask に含む。
- **中止**: 実行しない。

---

### 4. 実行（承認と照合、冪等）

1. `INIT_STATE.md` の `approved` が true であること。false なら実行しない。
2. 承認内容を `docs/planning/INIT_PLAN.md` に書く（スロット表 + ファイル許可リスト）。
3. **許可リストに無いパスは変更しない。** 実行後 `bash` で `git diff --name-only` し、許可リスト外があれば戻して報告する。
4. 各ファイルは「計画の内容と実質同じなら触らない」（冪等）。既存のタスク行は増やさず状態更新のみ。
5. 再実行で skill を消すのは、計画に「削除」と書いてあり、かつユーザーが再承認した場合だけ。

順:

| 順 | ファイル | 書くこと |
| ---: | :--- | :--- |
| 1 | `docs/planning/INIT_PLAN.md` | 承認済み計画 |
| 2 | `docs/arch/product.md` | 目的・対象・非目標・用語 |
| 3 | `AGENTS.md` **§6 のみ** | 環境・検証・制約 |
| 4 | `.agent/rules/project-template.md` | §6 と揃える |
| 5 | `.agent/skills/project-overview/SKILL.md` | このプロジェクトの全体像 |
| 6 | `README.md` | 概要・使い方 |
| 7 | `docs/arch/architecture.md` / `milestones.md` | 最小限 |
| 8 | `docs/task-list.md` | 承認した最初のタスク |
| 9 | `docs/README.md` | 目次 |
| 10 | `Makefile` の `PROJECT_CHECKS` | §6.1 に書いたときだけ |
| 11 | `.agent/skills/` の削除 | 計画で承認されたものだけ。`index.md` も同じ変更 |

`docs/examples/` のような存在しないパスを新たに書かない。

---

### 5. 検証・記録・停止

1. [`docs-maintenance`](../docs-maintenance/SKILL.md)。内部リンクは `bash`、外部 URL は `fetch_page`。
2. `make links`。§6.1 があればそれも（`make check`）。未記録のコマンドは捏造しない。
3. `docs/task-list.md` を証拠つきで更新。
4. `.agent/hooks/log-task.md`。
5. 検証 PASS なら commit し、セッション固定ブランチへ push。
6. `AGENTS.md §7.2` で報告し、**停止する。**

## 完了条件

- [ ] 必須スロットが `confirmed` / `verified` / `unverified`（未定と明示）
- [ ] 検証可能提案に `proposed` が残っていない
- [ ] 予算超過で回し続けていない
- [ ] `INIT_PLAN.md` があり、`INIT_STATE.approved` が true
- [ ] 変更ファイルが許可リストと一致する
- [ ] `AGENTS.md` の汎用節が無関係に変わっていない
- [ ] `make links` が PASS
- [ ] 製品機能は実装していない

## よくある失敗

| 失敗 | 正しい動き |
| :--- | :--- |
| 見つからないので検索し続ける | 上限で `unverified`。ユーザー判断 |
| 「最大 4 問」をセッション全体だと思う | 1 ラウンドの上限。全体は 8 ラウンド |
| 必須が空のまま計画する | 必須だけ追加で聞くか、未定と明示して承認を取る |
| 「質問する」で計画を書き換える | 計画は不変。修正だけが書き換える |
| 修正のたびに全件検索 | 変わったスロットと `depends_on` だけ |
| 承認前に README を書く | `INIT_STATE.md` 以外は触らない |
| 計画に無いファイルを実行時に足す | 許可リスト外は変更しない |
| 再実行でタスク行を増やす | 既存行の状態更新のみ |
