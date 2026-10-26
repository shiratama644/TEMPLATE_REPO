# AGENTSYNC: 公式仕様と実証研究に合わせてテンプレートを更新する

> 対応 task-list ID: `AGENTSYNC-1` 〜 `AGENTSYNC-6` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠

## 1. 開始前確認

- ブランチ `arena/5bd01764-template-repo` / HEAD `49927ab`（= origin）/ `git status` clean
- サンドボックス再構築を検知したため §4.1.1 の手順で復旧済み（`git reset --hard FETCH_HEAD`、6 ファイルのハッシュ一致を確認のうえ実行、`make check` PASS）
- 依存タスク: REPOFIX-1〜6（完了）
- 関連仕様: Anthropic「Best practices for Claude Code」「Effective context engineering for AI agents」、Claude Code Hooks reference、agentskills.io 仕様、Codex「Custom instructions with AGENTS.md」、Taiizor/agents-md-cookbook（MIT）

## 2. 目的 (Why)

指示ファイルと Agent 設定の**公式仕様と実証研究がこの 1 年で大きく変わった**のに、テンプレートは古い前提のままだった。実測で確認した問題は次のとおり。

- `AGENTS.md` は **33,482 bytes / 461 行 / 17,644 字**で、Codex の既定上限 **32,768 bytes** を超え（**無言で切り捨てられる**）、行数は効果が反転するとされる ~300 行を超え、Windsurf の 6,000 字/ファイルも超えている。`agents-md-lint` の判定は **score 43/100, grade F、XP-007 error**。
- Anthropic 公式は「毎セッション読み込まれるファイルには**広く適用されるものだけ**を入れ、時々しか関係しない知識は skills へ」「**肥大化した指示ファイルは Agent に実際の指示を無視させる**」「各行に『消したら間違えるか?』と問え」と定める。2026-07 には Claude Code 自身のシステムプロンプトを 80% 以上削っても評価が劣化しなかったと公表され、失敗の本質は「過剰な制約と層間の矛盾」とされた。
- Hooks の公式仕様が変わり、**`post-edit-verify.sh` の指摘がモデルに届かない**（exit 1 は「非ブロッキングエラーで stderr はユーザーにしか表示されない」）。PreToolUse の top-level `decision`/`reason` は非推奨になった。
- `AGENTS.md` は OpenAI 起点から Linux Foundation の Agentic AI Foundation へ移管された公開標準になり、24+ ツールが原生対応、Claude Code も v2.1.277 から読む。テンプレートはこの事実をどこにも書いていない。

テンプレートは派生先にそのまま複製されるので、古い前提はそのまま拡散する。

## 3. 変更範囲 (Scope)

変更対象:

- `AGENTS.md`（本文の段階開示。**節番号 §1〜§8 と参照済み小節の意味は完全に維持**）
- `.agent/rules/05_communication.md`（新規。§7 の詳細の移設先）
- `.agent/rules/index.md`（新規ルールの登録）
- `.agent/README.md`・`docs/arch/architecture.md`（§8 のツリー・対応表の集約先。重複の解消）
- `.pre-commit-config.yaml`・`Makefile`（`agents-md-lint` ゲートの追加）
- `.agent/hooks/post-edit-verify.sh`・`.agent/hooks/block-dangerous-git.sh`・`.agent/hooks/index.md`・`.agent/settings.json`（公式形式への現代化）
- `.agent/skills/agents-md-authoring/`・`.agent/skills/context-budget/`（新規）・`.agent/skills/index.md`
- `README.md`（クロスツール標準の明記）
- `.agent/THIRD_PARTY_NOTICES.md`（MIT 出典と参考文書の追記）
- `docs/adr/0002-*.md`（新規）・`docs/adr/README.md`
- `docs/task-list.md`・`docs/planning/README.md`・`docs/README.md`・`docs/audit/activity.md`・`.agent/logs/2026-10-26_*.md`

変更しない (境界外):

- **節番号の契約**: `§6.1` は 62 件、`§6` は 29 件、`§4.1`/`§5`/`§3.1` ほか多数が 38 ファイルから参照されている。番号・見出しの意味を変えない（過去ログは書き換え禁止のため、参照を壊すと修復不能）
- `AGENTS.md` の方針そのもの（小さく実行 → 検証 → 記録 → 停止、復旧可能性最優先、証拠で完了判定、質問と検索の使い分け）
- 上流由来スキルの本文、`.agent/logs/` の過去ログ、`docs/audit/activity.md` の既存行、`docs/task-list.md` の既存行、ADR-0001
- `docs/` の正本構造（task-list が進捗の正本、arch が仕様、planning が計画）

## 4. 禁止事項

- 節番号を振り直さない。参照 62 件の `§6.1` を壊さない
- 「短くする」ことを理由に**検証の正本・Git の厳禁事項・停止条件**を削らない（削ると Agent が間違える内容だから残す）
- 出典のクレジットを省略しない。ライセンス表記のないリポジトリ（disler/claude-code-hooks-mastery、multica-ai/andrej-karpathy-skills）の**文面を複製しない**
- npm 依存を増やす判断は承認済み（`agents-md-lint`）だが、**版を固定しない形で追加しない**
- 実測していない数値を文書に書かない（調査で得た数値は出典を添える）
- 不明点は推測で埋めず、§7 の停止条件に従って質問する

## 5. 完了条件 (DoD)

- [ ] `agents-md-lint AGENTS.md` が **exit 0**（error 0 件）。XP-007（32,768 B）を解消
- [ ] `AGENTS.md` が **32,768 B 以下**（Codex の hard cap）かつ heavy 上限 300 行を大きく下回る。soft 目標は 150 行 / 6,000 字だが、実測 **170 行 / 8,069 字**で確定する（理由は §12 に記録。日本語は 1 字あたりの情報密度が高く、Windsurf の字数上限は英語換算で約 2 倍の制約になる。表・チェックリスト・番号付き手順は実証上もっとも効果が高いため削らない）
- [ ] AGM-002 の推奨セクション警告が 0 件（見出しに英語キーワードを併記）
- [ ] `§6.1` ほか参照済み節番号がすべて実在し、`make links` が PASS
- [ ] `post-edit-verify.sh` が失敗時に JSON `decision: "block"` を返し、モデルに理由が届く形になる（実測）
- [ ] `block-dangerous-git.sh` が `hookSpecificOutput.permissionDecision: "deny"` を返し、従来の 16 ケースの判定が変わらない（実測）
- [ ] `make check` に `agents-md-lint` ゲートが載り PASS
- [ ] 新規スキル 2 件が agentskills.io 仕様に適合（name=フォルダ名、description ≤1024、本文 500 行未満、参照 1 レベル）し、`skills/index.md` の読み方ガイドと一覧の両方に載る
- [ ] `THIRD_PARTY_NOTICES.md` に MIT 出典（Taiizor/agents-md-cookbook）と参考にした公式文書・調査が記録されている
- [ ] クロスツール標準（AAIF 移管・24+ ツール・Claude Code v2.1.277・Codex の発見規則と 32 KiB）が README に書かれている
- [ ] `docs/task-list.md`・`docs/audit/activity.md`・`.agent/logs/`・計画書 §12 を更新
- [ ] 不変パス（過去ログ・既存タスク行・ADR-0001）が無変更

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | ✓ | フック sh を stdin JSON 付きで実行し、JSON 出力と exit code を確認。判定マトリクス 16 ケースを再実行 |
| Component | ✓ | `agents-md-lint` を AGENTS.md と README.md に実行し、score と findings を記録。`make agents` の動作 |
| E2E | ✓ | `make check`（pre-commit 全フック）と `make links`。節番号参照の実在を grep で全数確認 |
| 実環境 (実機・本番 build) | ✗ | Claude Code 実体でのフック発火と Codex での AGENTS.md 読込は確認できない（§6.2）。CI の結果と公式仕様の引用で担保し、残りは実環境検証待ちとする |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 節番号の維持と行数予算が両立しない（どちらかを削る判断が要る）
- `agents-md-lint` が日本語見出しを正しく扱えず、警告を消すために本文を英語化する必要がある
- 上流由来スキルの本文を書き換えないと仕様適合できない
- ライセンス表記のない資料の文面を使う必要がある
- 破壊的変更（既存の参照・公開 API 互換性）が必要
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビュー（節番号の維持、対象外の変更の混入）
2. `make check` / `make links` / `agents-md-lint` を実行
3. `docs/task-list.md` の状態・進捗・証拠を更新
4. タスク ID を含むコミットを作成
5. 証拠中心の完了報告（score・行数・bytes・exit code・Git SHA・残事項）

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| AGENTSYNC-1 | AGENTS.md の段階開示（予算内へ） | 150 行以下の AGENTS.md、`rules/05_communication.md`、§8 の集約 | — |
| AGENTSYNC-2 | `agents-md-lint` ゲートの導入 | pre-commit フック、`make agents`、版の固定 | AGENTSYNC-1 |
| AGENTSYNC-3 | Hooks と settings の公式仕様への現代化 | `post-edit-verify.sh`・`block-dangerous-git.sh`・`hooks/index.md`・`settings.json` | — |
| AGENTSYNC-4 | 新規スキル 2 件 | `agents-md-authoring`・`context-budget`・`skills/index.md` | AGENTSYNC-1 |
| AGENTSYNC-5 | クロスツール標準の明記 | `README.md`・`.agent/README.md`・`AGENTS.md §8.2` | AGENTSYNC-1 |
| AGENTSYNC-6 | クレジットと判断の記録 | `THIRD_PARTY_NOTICES.md`・ADR-0002 | すべて |

## 10. 設計詳細・仕様

### 10.1 節番号を維持したまま薄くする手順

参照実測: `§6.1` 62 件 / `§6` 29 / `§4.1` 9 / `§5` 8 / `§3.1` 8 / `§6.2` 6 / `§4.4` 6 / `§4.3` 5 / `§8.6` 3 / `§7.3` 3 / `§8.4`・`§7.4`・`§6.5`・`§4.2`・`§3.2`・`§2` 各 2 / `§7.2`・`§6.3`・`§6.4`・`§6.6`・`§6.7`・`§3.3`・`§1.2` 各 1（38 ファイル、過去ログを含む）。

よって **§1〜§8 と参照済み小節の見出しはすべて残し、本文だけを移設する**。移設先は既存の層（`AGENTS.md` = 規約、`rules/` = いつ・どのファイルで何を守るか、`skills/` = どうやるか、`docs/` = 正本）で、`AGENTS.md §8.5` の役割分担どおり。

| 節 | 今の内容 | 移動先 | AGENTS.md に残すもの |
|---|---|---|---|
| §3 | 分野別検証の例表 | `rules/04_verification.md`（既にある） | 検証の正本と 3 つの鉄則 |
| §4.1.1 | 復旧手順の bash と判定ヒント | `hooks/sandbox-recovery.md`（既にある） | 例外が 1 形であることと指し先 |
| §7 | コミュニケーション規約の詳細（報告様式・質問方針・検索方針・失敗時の 3 段） | `rules/05_communication.md`（新規） | 言語・文体・事実と推測の分離・質問は `ask_user` 4 問以内 |
| §8.1〜§8.2 | ディレクトリツリーと公式対応表 | `.agent/README.md`・`docs/arch/architecture.md`（既にある） | 記憶の置き場所と入口（`index.md`） |
| §8.3〜§8.6 | 読込・同期・役割分担・運用 | 要点のみ残す | ログは追加のみ、過去ログを一括置換に含めない |

### 10.2 予算の目標値

| 指標 | 上限 | 根拠 | 目標 |
|---|---|---|---|
| bytes | 32,768 | Codex が無言で切り捨てる（error 判定） | ≤ 12,000 |
| 行 | 150（soft）/ 300（heavy） | ~300 行超で効果が反転、100-150 行が最適 | ≤ 150 |
| 字 | 6,000 | Windsurf が超過分を無視 | ≤ 6,000 |
| リンク | 10〜15 | 孤立文書の発見率 <10%、リンク参照 >90% | ≤ 15 |

### 10.3 フックの公式形式

| フック | イベント | 現在 | 変更後 |
|---|---|---|---|
| `post-edit-verify.sh` | PostToolUse | 失敗時 `exit 1`（stderr はユーザーにしか見えない） | JSON `{"decision":"block","reason":"..."}` ＋ `exit 0`（理由がモデルに届く） |
| `block-dangerous-git.sh` | PreToolUse | `exit 2` ＋ stderr | JSON `hookSpecificOutput.permissionDecision:"deny"` ＋ `permissionDecisionReason` ＋ `exit 0`（top-level `decision` は PreToolUse で非推奨） |
| `pre-edit-guard.sh` | PreToolUse | `exit 2` ＋ stderr | 同上（deny の JSON 形式に統一） |

exit 2 と JSON は混ぜない（公式: exit 2 のとき JSON は無視される）。判定マトリクスは変更しない。

### 10.4 `agents-md-lint` の組み込み方

pre-commit の `language: node` ＋ `additional_dependencies: ["agents-md-lint@1.0.1"]`（既存の Biome フックと同じ方式。版を固定）。`entry: agents-md-lint --root .`、`files: ^AGENTS\.md$`。既定では error のみで失敗し warn では失敗しない（`--strict` は付けない。日本語文書に対する AGM-002 の英語キーワード照合は限界があるため、見出しの英語併記で解消する）。

## 11. リスク・Gotchas

| リスク | 対処 |
|---|---|
| 短縮で「消すと Agent が間違える」内容まで削る | 各行に「消したら間違えるか」を問い、検証の正本・厳禁・停止条件・粒度は残す。削った詳細は必ず移設先をリンクする |
| 節番号を壊して過去ログの参照が偽になる | 見出しはすべて残し、実装後に `§` 参照の全数を grep で照合する |
| npm 依存が増え、Node の無い環境で `make check` が落ちる | pre-commit が Node 環境を用意する（Biome と同じ）。README に前提を明記し、`SKIP=agents-md-lint` で一時的に外せることを書く |
| 日本語見出しが AGM-002 に認識されない | 見出しに英語キーワードを併記する（`## 3. テスト・品質保証（Testing）`）。クロスツールでも有効 |
| フックの JSON 化で判定が緩む | 変更前後で同じ 16 ケースを実行し、判定が変わらないことを実測する |
| Windsurf 6,000 字に収まらない | 収まらない場合は超過を明記し、nested AGENTS.md での分割を README に案内する |

ロールバック: コミット単位で `git revert`（履歴の改変はしない）。

## 12. 実績と証拠 (実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| AGENTSYNC-1 | | | |
| AGENTSYNC-2 | | | |
| AGENTSYNC-3 | | | |
| AGENTSYNC-4 | | | |
| AGENTSYNC-5 | | | |
| AGENTSYNC-6 | | | |
