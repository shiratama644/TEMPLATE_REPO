---
name: agents-md-authoring
description: AGENTS.md や CLAUDE.md などの指示ファイルを書いたり見直したりする時に使う。ツールごとの予算（Codex の 32,768 bytes 打ち切り、Windsurf の 6,000 字、約 300 行で効果が反転）以内に収める手順、段階開示の振り分け（指示ファイル / rules / skills）、実証研究に基づく DO と DON'T、検査ゲート make agents の使い方、ゲートが緑なのに守られていない時の切り分けを扱う。指示ファイルが肥大化した、Agent が規約を守らなくなった、新しいツールに対応させたい、という場面でも使う。
---

# AGENTS.md Authoring — 指示ファイルを予算内に書くスキル

> 正本: `AGENTS.md`（規約そのもの）、`.agent/rules/`（詳細ルール）、`docs/arch/architecture.md`（読込の流れ）
> 関連スキル: [`context-budget`](../context-budget/SKILL.md)（コンテキスト全体の予算）、[`writing-for-agents`](../writing-for-agents/SKILL.md)（読み手の迷いを減らす書き方）、[`ci-quality-gates`](../ci-quality-gates/SKILL.md)（ゲートの組み込み）

## いつ使うか

- `AGENTS.md` を新規に書く / 既存の指示ファイルを見直す
- ゲート（`make agents`）が error や warn を出した
- Agent が規約を守らなくなった、指示を無視するようになった
- Codex / Cursor / Windsurf など別のツールでも同じリポジトリを使いたい
- 派生プロジェクトにテンプレートを複製する前

## 1. まず予算を測る（推測しない）

```bash
make agents                       # ゲート（agents-md-lint）。error は失敗、warn は表示のみ
wc -c -l AGENTS.md                # bytes と行数
bun -e 'const t=await Bun.file("AGENTS.md").text(); console.log([...t].length)' # 字数
```

| 指標 | 上限 | 超えると何が起きるか | 根拠 |
| :--- | :--- | :--- | :--- |
| bytes | **32,768** | Codex が**警告なく打ち切る**。後半の規約が存在しないことになる | Codex の `project_doc_max_bytes` 既定値 |
| 行数 | 150（理想）/ 300（限界） | ~300 行を超えると**正確さの向上が反転**する | GitHub 2,500 リポジトリ調査ほか |
| 字数 | 6,000 | Windsurf が**超過分を無視**する | Windsurf の 1 ファイルあたり上限 |
| リンク数 | 10〜15 | これ以上増やすと参照先の発見率が下がる | Augment の実測 |

**日本語・中国語の注意**: 字数ベースの上限は CJK に不利。日本語は 1 字あたりの情報密度が高く、UTF-8 で 3 bytes/字なので、同じ内容の英語文書の約 2 倍の字数制約になる。6,000 字に収めるために規約そのものを削るのは本末転倒なので、**削れない場合は超過を明記し、入れ子の `AGENTS.md` への分割を案内する**方が正しい。

## 2. 発見規則（ツールごとに違う）

| ツール | 読むファイル | 規則 |
| :--- | :--- | :--- |
| Codex | `AGENTS.md` | git root から cwd まで各ディレクトリで `AGENTS.override.md` → `AGENTS.md` の順。**1 ディレクトリ 1 ファイル**、root→下へ連結し**近いものが勝つ** |
| Claude Code | `CLAUDE.md`、無ければ `AGENTS.md` | v2.1.277（2026-09-18）以降フォールバックする。`.claude/` と `CLAUDE.md` を第一に探すので symlink を残すのが安全 |
| Cursor / Copilot coding agent / OpenCode / Antigravity / Grok CLI / Kimi CLI ほか | `AGENTS.md` | 原生対応。24+ ツール、60,000 以上のリポジトリが採用 |

`AGENTS.md` は OpenAI が始め、2025-12 に **Linux Foundation の Agentic AI Foundation**（MCP・Goose と並ぶ）へ移管された公開標準。特定ツール固有の書式に寄せないこと。

**symlink の作法**: 正本は 1 つだけにする。本テンプレートは `CLAUDE.md` → `AGENTS.md`、`.claude/` → `.agent/` の symlink で、内容を複製しない（複製は必ずずれる）。

## 3. 段階開示の振り分け

常時ロードされる指示ファイルには**広く適用されるものだけ**を置く。時々しか関係しない知識は下位に落とす。

| 層 | 置くもの | 読まれるタイミング |
| :--- | :--- | :--- |
| `AGENTS.md` | 基本方針・検証の正本・Git の厳禁事項・停止条件・境界（always / ask-first / never）・指し先 | 毎セッション常時 |
| `.agent/rules/*.md` | いつ・どのファイルで何を守るか（`paths` で発火を絞る） | 該当パスを触る時 |
| `.agent/skills/<name>/SKILL.md` | どうやるかの具体的な手順・このコードベースの事実 | 該当タスクの時だけ |
| `docs/` | 進捗・仕様・計画・ADR（正本） | 必要に応じて |

各行に **「消したら Agent が間違えるか?」** を問い、否なら下位へ移すか削る。Anthropic は「肥大化した指示ファイルは Agent に実際の指示を無視させる」と明記しており、2026-07 には Claude Code 自身のシステムプロンプトを 80% 以上削っても評価が劣化しなかったと公表した。**失敗の本質は過剰な制約と層間の矛盾**。

## 4. 書く順（commands first）

1. **検証コマンドを冒頭に**。名前を挙げた test コマンドは挙げない場合の **約 1.6 倍**使われる（ETH Zurich）。コピペできる形で書く（`npm run test` ではなく `npm run test -- --run` のように実際に打つ形）
2. **境界の三段表**（常にやる / 先に聞く / やらない）。決定表は規約の遵守率を **約 25%** 上げる（Augment）
3. **番号付きワークフロー**。手順を番号付きにすると正確さが **約 25%** 上がる（Augment）
4. **具体的なコード片・具体例**。code reuse が **約 20%** 増える（Augment）
5. 構成・ドキュメントの指し先（リンク 10〜15 件まで）

## 5. DON'T（実測された逆効果）

| やらない | 理由 | 代わりにやること |
| :--- | :--- | :--- |
| `/init` の自動生成をそのまま残す | 空虚な美辞が集まり、Agent が読まない | 生成後に「消したら間違えるか」で削る |
| 長いアーキテクチャ説明を書く | 探索は速くならず、情報過多で完全性が **約 25% 下がる**（ETH Zurich） | 構成は `docs/arch/` に置き、指示ファイルは指し先だけ |
| 「〜するな」を羅列する（naked don'ts） | don't:do の比が 1 を超えると遵守率が下がる。警告の羅列は **約 2 倍の遅延** | 禁止には必ず**代わりにやること**を対にする |
| 誰も読まない孤立文書を作る | 孤立文書の発見率は **10% 未満**、リンク参照は **90% 超**、指示ファイル自体は **ほぼ 100%** | 指示ファイルからリンクする。リンク出来ないなら削る |
| README を複製する | 二重管理で必ずずれる | 役割を分ける（README = 人間向け、指示ファイル = Agent 向け） |
| 実装していないパターンを書く | Agent が存在しない仕組みを前提に動く | 実在するコマンド・パスだけを書く（ゲートが実在を検査する） |
| 古いコマンドを残す | 失敗を繰り返す | 変更したら同じコミットで指示ファイルも直す |
| 自動生成コンテキストを大量に注入 | 成功率が **約 3% 下がり**、推論コストが **約 20〜23% 増える**（ETH Zurich, ICLR 2026） | 軽量な識別子（パス・クエリ）だけ持ち、実行時に読む |
| 文件名・場所を間違える | `AGENTS.md` 以外（`agents.md`・`AGENTS.MD`・`docs/AGENTS.md` のみ）は読まれない | 正確に `AGENTS.md` を git root に置く |

## 6. 見出しに英語キーワードを併記する

`agents-md-lint` の推奨セクション検査（AGM-002）は英語キーワードで照合する。日本語見出しだけだと「推奨セクションが無い」と警告されるので、**日本語を主・英語を従**で併記する。これは照合のためだけでなく、英語圏ツールやモデルにとっても見つけやすくなる。

| 推奨セクション | 照合される語 | 併記の例 |
| :--- | :--- | :--- |
| Commands / Setup | `setup` `commands` `getting started` | `### 6.1 環境・ツールチェーン・検証コマンド（Commands / Setup）` |
| Testing | `test` `testing` | `## 3. テスト・品質保証（Testing）` |
| Project Structure | `structure` `architecture` | `### 8.1 ディレクトリ構成と入口（Project Structure）` |
| Code Style | `style` | `### 6.5 Lint・フォーマット特有ルール（Code Style）` |
| Git Workflow | `git` | `## 4. Git 運用と環境復旧（Git Workflow）` |
| Boundaries | `boundaries` | `## 2. 開発ワークフローと境界（Workflow / Boundaries）` |

## 7. ゲートの運用と既知の落とし穴

```bash
bun run agents                               # Bun 管理の版を使用
make check                                    # 全ゲート（CI と同じ入口）
SKIP=agents-md-lint git commit                # Node が無い環境で一時的に外す
```

- 既定では **error のみで失敗**する（warn では失敗しない）。`--strict` は付けない。理由は日本語文書に対する英語キーワード照合の限界と、Windsurf 固有の字数上限を常に満たせるとは限らないため
- 参照パスは**リポジトリ根からのフルパス**で書く。裸のファイル名（`index.md`、`SKILL.md`）は AMC-PATH が「実在しない」と error にする
- **上流 `agents-md-lint@1.0.1` の bin は symlink 経由だと no-op になる**。`cli.js` のエントリポイント判定が `pathToFileURL(process.argv[1]).href === import.meta.url` で、Node は `import.meta.url` を realpath に解決する一方 `argv[1]` は symlink のままなので一致せず、本体が一度も実行されない。npm bin は必ず symlink なので `npx` 経由でも同じ（**無出力・exit 0 で黙って成功する**）。`scripts/check_agents.ts` が Bun から実体の CLI ファイルを直接起動して回避する。上流が修正されたら、直接起動の必要性を再評価する
- **ゲートを入れたら必ず負のテストをする**。上限を超えたフィクスチャで実際に失敗することを確認しないと、「緑に見えるのに何も守らない」状態に気づけない

## 8. レビューのチェックリスト

- [ ] bytes ≤ 32,768 / 行数 ≤ 150（無理なら ≤ 300）/ 字数はできる限り 6,000
- [ ] 検証コマンドが冒頭にあり、コピペして実行できる形
- [ ] 境界の三段表があり、禁止に「代わりにやること」が対になっている
- [ ] 常時ロードする必然性のない詳細は `rules/` か `skills/` に移設し、指し先がある
- [ ] 参照パス・コマンドがすべて実在する（フルパス表記）
- [ ] リンクが 10〜15 件以内で、孤立文書がない
- [ ] 自動生成の美辞・実装していないパターン・古いコマンドがない
- [ ] 節番号を変えた場合、参照している全文書を追従させた（過去ログは書き換えない）
- [ ] `make agents` が exit 0、`make check` が PASS

## 9. 出典

- Anthropic「Claude Code Best Practices」「Effective context engineering for AI agents」
- OpenAI Codex「Custom instructions with AGENTS.md」（発見規則・32 KiB 既定値）
- Agentic AI Foundation（Linux Foundation）／ agentskills.io — `AGENTS.md` と `SKILL.md` の公開標準
- Claude Code Hooks reference — https://code.claude.com/docs/en/hooks
- [Taiizor/agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook)（**MIT**）— `agents-md-lint` の閾値と、以下の実証研究の整理
- ETH Zurich「Evaluating AGENTS.md」（ICLR 2026）、Augment「AuggieBench」、GitHub 2,500 リポジトリ調査、Chroma「Context Rot」
- ライセンス表示の正本は [`.agent/THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md)
