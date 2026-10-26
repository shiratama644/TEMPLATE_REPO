# ADR-0002: 指示ファイルの予算検査に `agents-md-lint`（npm）を採用する

**Date**: 2026-10-26
**Status**: accepted
**Deciders**: リポジトリ所有者（承認済み計画 `docs/planning/AGENTSYNC_PLAN.md` AGENTSYNC-2、検証ゲートは npm パッケージを採用する選択）、作業 Agent

## Context

`AGENTS.md` は実測で **33,482 bytes / 461 行 / 17,644 字**あり、Codex の既定上限 **32,768 bytes**（`project_doc_max_bytes`）を 714 bytes 超えていた。Codex は超過分を**警告なく打ち切る**ため、後半に書かれた規約（§7 コミュニケーション規約・§8 記憶システム）は実際には読まれていなかった。行数も、効果が反転するとされる ~300 行を超えていた。

同時に、このリポジトリには指示ファイルの予算を機械的に検査する手段が無かった。`AGENTS.md §3.1` は「LLM に linter の仕事をさせない」方針だが、その linter 自体が存在しなかった。

制約として、`AGENTS.md` の節番号は **38 ファイルから参照**されており（`§6.1` が 62 件、`§6` が 29 件）、過去ログは書き換え禁止のため番号を振り直せない。したがって「書き直して短くする」のではなく「番号を保ったまま予算内に収め、以後も超えないようにする」必要があった。

## Decision

**指示ファイルの予算検査に npm パッケージ `agents-md-lint@1.0.1`（MIT、[Taiizor/agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook)）を採用し、pre-commit の `language: node` で版を固定してゲート化する。** `make agents` と `make check`（CI と同じ入口）から実行する。

- 失敗条件は **error のみ**（`--strict` は付けない）。既定で error になるのは 32 KiB 超過（XP-007）・秘密情報（AMC-SECRET）・Markdown 破損（AGM-001）・参照パスの不存在（AMC-PATH）など
- 対象は `files: (^|/)AGENTS\.md$`（入れ子の `AGENTS.md` も含む。Codex はディレクトリ単位で連結するため）
- 参照パスは**リポジトリ根からのフルパス**で書く（裸のファイル名は AMC-PATH が error にする）
- 見出しには英語キーワードを併記する（AGM-002 の推奨セクション検査が英語で照合するため。クロスツールでも見つけやすくなる）

さらに、**上流 1.0.1 の bin が symlink 経由で起動すると no-op になる不具合**を実測で確認したため、`entry` は `readlink -f` で実体を解決して `node` で直接起動する形にした（詳細は `.pre-commit-config.yaml` の注記と `.agent/skills/agents-md-authoring/SKILL.md` §7）。上流への報告は、この環境の GitHub 接続に第三者リポジトリへの起票権限がなく実行できなかったため、投稿用の英語文面と再現データ（exit と出力バイト数の実測表 6 行、原因のコード引用、修正案 4 つ）を [`../audit/issues-lint.md`](../audit/issues-lint.md) に保全した（task-list `LANGGATE-2` は保留）。

## Alternatives Considered

### Alternative 1: 標準ライブラリのみの自作チェッカ（`scripts/check_agents_md.py`）

- **Pros**: Node.js 依存が増えない。`scripts/check_doc_links.py`・`check_mermaid.py` と同じ「標準ライブラリのみ」の方針に揃う。閾値を自由に決められる。
- **Cons**: 16 ルールと実証研究に基づく閾値（Codex 32,768 B / Windsurf 6,000 字 / 行数 150・300 / don't:do 比 / 推奨セクション同義語 / stale year / 参照パス実在）を自前で実装し、追従し続ける必要がある。Markdown のパース（コードフェンス内の `#` を見出しと誤認しない等）も自前になる。
- **Why not**: 既に保守されている MIT 実装があるのに、同じ閾値の並行実装を維持するのは対価のないコスト。Node.js は Biome フックで既に必要だったので、追加の実行時依存にならない。リポジトリ所有者が npm 案を選択した。

### Alternative 2: ゲートを持たず、文書で注意喚起するだけ

- **Pros**: 依存も設定も増えない。
- **Cons**: 予算超過は**静かに**起きる。Codex の打ち切りは警告を出さないので、超過に誰も気づけない。指示ファイルは毎セッション読まれるため、劣化の影響が全体に及ぶ。
- **Why not**: 「LLM に linter の仕事をさせない」が本リポジトリの方針。人が覚える前提の制約は必ず破られる（現に 33,482 B まで育っていた）。

### Alternative 3: 上流の GitHub Action を CI で使うだけ

- **Pros**: 設定が最小（`action.yml` を参照するだけ）。
- **Cons**: 上流 Action は `npx --yes agents-md-lint` を使うため、**同じ symlink no-op の不具合を踏む**（常に成功してしまう）。加えて手元ではフィードバックが得られず、超過に気づくのが push 後になる。
- **Why not**: 手元と CI を同じ入口（`make check`）に揃えるのが本リポジトリの品質ゲート方針（`.agent/skills/ci-quality-gates/SKILL.md`）。

### Alternative 4: linter をリポジトリに vendoring する

- **Pros**: 上流の不具合を直接直せる。ネットワーク不要になる。
- **Cons**: 上流の更新（新しいツール予算・新しいルール）から分岐する。取り込んだコードの保守責任が生じる。
- **Why not**: 回避策は shell 1 行で済み、上流が直したら `entry` を戻すだけ。分岐の維持コストの方が高い。

## Consequences

### Positive

- 32 KiB 超過・参照パスの不存在・秘密情報が commit 前に止まる。手元と CI が同じ入口。
- 閾値の保守が上流に移る（新しいツールの予算が増えたら版を上げるだけ）。
- 導入過程で**上流の実バグを発見でき、負のテストで回避策を検証した**。「ゲートが緑なのに何も守っていない」状態を避けられた。

### Negative

- `make check` に Node.js が必要になる（Biome と同じ前提。README に明記し、`SKIP=agents-md-lint` で外せるようにした）。
- pre-commit の Node 環境が 1 つ増える（初回の環境構築に時間がかかる）。
- 上流が symlink 不具合を直したら `entry` を戻す作業が残る（設定内に注記済み）。
- npm 依存が供給網リスクになる（版を `1.0.1` に固定し、`dependency-review.yml` で差分レビューする）。

### Risks

- **リスク**: 上流が修正版を出し、回避策（`readlink -f`）が壊れる。
  **緩和**: `readlink -f` は symlink でないパスにもそのまま使えるので、bin が実体を指すようになっても動作する。版を上げる際は `make agents` と負のテストを再実行する。
- **リスク**: ゲートが再び「黙って成功する」状態になる（no-op 化）。
  **緩和**: 上限を超えたフィクスチャで失敗することを確認する**負のテスト**を `.agent/skills/agents-md-authoring/SKILL.md` §7 に手順として残した。版更新時は必ず実行する。
- **リスク**: warn が増え、無視されるようになる。
  **緩和**: 失敗は error のみに限定し、warn の意味と許容理由を計画書 §5・§12 に記録した。AGM-002 は見出しの英語併記で解消し、残る AMC-LENGTH・AGM-003 は実測値と理由を明記して受け入れている。
- **リスク**: 日本語文書は Windsurf の 6,000 字上限を常に満たせない。
  **緩和**: 字数ベースの上限は CJK に不利（同じ内容の英語の約 2 倍の制約）であることをスキルに明記し、満たせない場合は入れ子の `AGENTS.md` への分割を案内する。
