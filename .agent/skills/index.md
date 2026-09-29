# Skills Index — Agentのスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・テクニック・手順・パターン・コードベース知識・実測知見。
> 設計仕様の正本ではない。設計の正本は `docs/`（arch/ + planning/ + research/ + ops/ + task-list.md）— cod-web arena/01a0b161-cod-web準拠で復旧（2026-09-27調査）。
> 作業規約は `AGENTS.md` と `.agent/rules/`。
>
> 構成はClaude Code公式準拠: 各スキルは `<name>/SKILL.md`（YAML frontmatterに `name` / `description`）。
> 旧 `kebab-case.md` 形式は廃止し、ディレクトリ形式に統一。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview/SKILL.md`](./project-overview/SKILL.md) |
| 技術スタック・ツールチェーン・CI・pnpmの使いどころ | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 「動かない / 検証できない / 外部APIに接続したい」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| ドキュメント変更後の整合性検証 | [`verify-doc-integrity/SKILL.md`](./verify-doc-integrity/SKILL.md) |
| ドキュメント整理・URL検証・提案yml削除 | [`docs-maintenance/SKILL.md`](./docs-maintenance/SKILL.md) |
| CI品質ゲート・workflow正本管理・手動dispatch | [`ci-quality-gates/SKILL.md`](./ci-quality-gates/SKILL.md) |
| 意味あるテスト・カバレッジ100%・モック戦略 | [`testing/SKILL.md`](./testing/SKILL.md) |
| E2Eテスト・Playwright・webServer配列・discovery | [`e2e/SKILL.md`](./e2e/SKILL.md) |
| レイヤー境界・import制限・循環参照防止 | [`import-boundaries/SKILL.md`](./import-boundaries/SKILL.md) |
| 決定論・純粋関数・禁止API検出・same-inputテスト | [`determinism/SKILL.md`](./determinism/SKILL.md) |
| メモリリーク防止・leave時clear・dispose | [`memory-leak/SKILL.md`](./memory-leak/SKILL.md) |
| ゼロアロケーション・GC削減・ホットパス最適化 | [`zero-alloc/SKILL.md`](./zero-alloc/SKILL.md) |
| 3ファイル以上の変更・判断を伴う変更のレビューレポート作成 | [`diff-review-report/SKILL.md`](./diff-review-report/SKILL.md) |
| ユーザー依頼が曖昧で深掘りが必要・pnpm setup→ドキュメント/プロジェクト整理まで一気通貫 | [`deep-dive-setup/SKILL.md`](./deep-dive-setup/SKILL.md) |
| 設計の正本（全体アーキテクチャ・API設計） | `docs/arch/*` + `docs/README.md` |
| 進捗の正本 | `docs/task-list.md` |
| 計画書 | `docs/planning/*_PLAN.md` |
| 調査 | `docs/research/*` |
| 監査 | `docs/audit/*` |
| 現在の機能（detector, cache, termux, bootstrap, 100% coverage） | `docs/README.md` + `README.md` + `AGENTS.md` |
| 設定例 | `docs/examples/` |

## スキル一覧

| スキル | できるようになること（Agentの能力） | 最終更新 | 出典 |
| :--- | :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | 製品概要・技術スタック・ドキュメント構成・進捗管理を素早く把握する | 2026-09-26 | TEMPLATE_REPO新規 + cod-web/ytdl統合 |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | Node.js/pnpm/TypeScript/Biome/Vitest/Playwright/GitHub Actionsを正しい形で使い、実測ハマりを回避できる | 2026-09-26 | DropMod CI + cod-web bun対応 + PalmIDE検証 |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandboxのegressブロック / re-clone / ユーザー実行キット運用を迂回して検証・復旧できる | 2026-09-26 | PalmIDE + cod-web + ytdl統合 |
| [verify-doc-integrity/SKILL.md](./verify-doc-integrity/SKILL.md) | ドキュメントの整合性（リンク実在・目次更新・機密情報混入なし）を機械検証できる | 2026-09-26 | PalmIDE由来 |
| [diff-review-report/SKILL.md](./diff-review-report/SKILL.md) | 仕様書変更の差分を人間がレビュー可能なレポートにまとめることができる | 2026-09-26 | PalmIDE由来 |
| [docs-maintenance/SKILL.md](./docs-maintenance/SKILL.md) | ドキュメント整理・内部リンク整合性・外部URL有効性・ミラー排除・提案yml削除を確実にできる | 2026-09-27 | cod-web arena/01a0b161最新arena → 汎用化 |
| [ci-quality-gates/SKILL.md](./ci-quality-gates/SKILL.md) | quality-gates.ymlを唯一の正本として扱い、typecheck/lint/determinism/coverage/build/E2E discoveryを段階実行できる | 2026-09-27 | cod-web arena/01a0b161最新arena → pnpm汎用化 |
| [testing/SKILL.md](./testing/SKILL.md) | 意味あるテストでcoverage 100%を達成、handlers分離・facade分離・mock戦略・threshold ratchetを実践できる | 2026-09-27 | cod-web arena/01a0b161最新arena → 汎用化 |
| [import-boundaries/SKILL.md](./import-boundaries/SKILL.md) | レイヤー間のimport境界を守り、循環参照と責務混在を防ぐ（biome no-restricted-imports + アーキテクチャテスト） | 2026-09-27 | cod-web arena/01a0b161最新arena → 汎用化 |
| [determinism/SKILL.md](./determinism/SKILL.md) | 純粋関数・決定論ロジックの決定論を守り、禁止API検出・same-inputテスト・smoke vs heavy分離を実装できる | 2026-09-27 | cod-web arena/01a0b161 deterministic-sim → 汎用化 |
| [e2e/SKILL.md](./e2e/SKILL.md) | Playwright E2EをSandboxでも安全に扱い、webServer配列・baseURL分岐・discovery検証・WebSocketモックを実践できる | 2026-09-27 | cod-web arena/01a0b161最新arena → 汎用化 |
| [memory-leak/SKILL.md](./memory-leak/SKILL.md) | Room leave時やリソース解放時のメモリリークを防ぎ、clear/removeパターン・回帰テスト・監査を実践できる | 2026-09-27 | cod-web arena/01a0b161最新arena → 汎用化 |
| [zero-alloc/SKILL.md](./zero-alloc/SKILL.md) | ホットパスでのゼロアロケーションを守り、getPlayersIterable・encode once・ring buffer・Map再利用を実践できる | 2026-09-27 | cod-web arena/01a0b161最新arena → 汎用化 |
| [deep-dive-setup/SKILL.md](./deep-dive-setup/SKILL.md) | ユーザー依頼をweb_search depth1→2→3, fetch_page, ask_userで深掘り→理解をask_userで確認→pnpm setup実行→ドキュメント/プロジェクト構造整理まで一気通貫で実行できる | 2026-09-27 | 新規作成 — ユーザー要求「深掘り→setup→整理」スキル + Mermaid flowchart |

## 設計仕様の正本（スキルではなくdocs/）

| 文書 | 内容 |
| :--- | :--- |
| [docs/README.md](../../docs/README.md) | 全ドキュメントの目次（arch/ + planning/ + research/ + audit/ + ops/ + examples/ + task-list.md）— cod-web arena準拠で復旧 |
| [docs/task-list.md](../../docs/task-list.md) | タスク管理の唯一の正本 |
| [docs/arch/README.md](../../docs/arch/README.md) | 仕様書一覧（どう作るか） |
| [docs/planning/README.md](../../docs/planning/README.md) | 計画書索引 |
| [docs/planning/_TEMPLATE.md](../../docs/planning/_TEMPLATE.md) | 計画書テンプレート |
| [AGENTS.md](../../AGENTS.md) | 開発規約（汎用§1〜§5 + プロジェクト固有§6） |
| [.agent/rules/](../../.agent/rules/) | トピック別ルール（pathsで発火条件） |

> 実装テクニック・実測ハマりどころは **skills** に貯め、設計の事実は **docs/** を正本とする。

## 運用ルール

- 新しいノウハウ（特に**実測で判明した**制約・挙動）を得たらスキルとして追加/更新し、本indexの「最終更新」も更新する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- スキルは実践的なやり方・コードパターン・回避策を書く。設計の正本はdocs/。
- AGENTS.mdと重複する作業規約はスキルに書かずAGENTS.md / rules/を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatterに `name` / `description` 必須）。`description` は自動発火の判断材料なので具体的に書く。
- 旧 `kebab-case.md` 単一ファイル形式は廃止。ディレクトリ形式に統一（公式準拠）。

## 公式構成との対応

- 公式 `.claude/skills/<name>/SKILL.md` と同型。`name` はディレクトリ名と一致させる。
- `commands/*.md` は旧形式だが互換性のため残す。新規は `skills/` を使う。
- スキルは `description` の具体性が重要。Claudeが自動で発火するかどうかをこの説明で判断する。
