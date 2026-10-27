# Hook: Pre-Task（タスク開始時）

> **トリガー**: ユーザーから指示を受け、作業を開始する直前。`settings.json` の `SessionStart` フック（`session-start.sh`）でも状態が自動注入される。
> **目的**: 現状を把握し、必要な知識だけを読み込み、スコープ違い/履歴破壊を防ぐ。

## 手順

### 1. 現状把握（AGENTS.md §4.1 + rules/02_git-workflow.md）

```bash
git status
git branch --show-current
git log -5 --oneline
```

- ※ セッション型環境ではブランチ名がセッションごとに変わる。必ず `git branch --show-current` で確認する（AGENTS.md §4.4）。
- 未コミット変更があれば勝手に破棄・混入しない。
- ログが起点 1 件のみ / `git status` が大量の削除+未追跡 / `node_modules` 無 → **Sandbox 再構築**。→ [`sandbox-recovery.md`](./sandbox-recovery.md)。

### 2. 知識のピンポイント読込（本 hook の核心）

[`../skills/index.md`](../skills/index.md) の「読み方ガイド」で**該当スキルだけ**を読む。
- 全スキルを常に読まない（コンテキスト浪費）。
- テンプレートのプレースホルダが残っている（`README.md` が `TEMPLATE_REPO`、`AGENTS.md §6.1` が未記入、`project-overview` がテンプレート説明のまま）→ 先に [`project-init/SKILL.md`](../skills/project-init/SKILL.md)。承認前にファイルを書き換えない。
- 初回/全体把握が必要な時だけ `project-overview/SKILL.md` を読む（公式準拠のディレクトリ形式）。実プロジェクトへ合わせる初期設定は `project-init`。
- 例: 環境トラブル → `sandbox-constraints/SKILL.md`、ドキュメント編集 → `docs-maintenance/SKILL.md`
- ルールは `rules/` を参照。`paths` フロントマターで発火条件を絞っているため、該当ファイル編集時のみ自動で読まれる。

### 3. リポジトリ固有の制約の確認

- 不変ディレクトリ・書き込み不可領域・恒常的な環境制約など、リポジトリ固有の制約が
  `AGENTS.md` §6 にあれば作業前から意識しておく。

### 4. ドキュメントと実コードの優先順位

- 計画書や仕様書と実コードが矛盾する場合は、プロジェクトの定めた優先順位に従う（AGENTS.md §6）。
- 定めがない場合は実コードを最終確認し、判断に迷えばユーザーに質問する。

### 5. 目的・必要作業・安全境界の確認（AGENTS.md §1.2・§1.3）

1. 指示の**目的**と「達成した」と判定できる条件を明確にする。要求された作業は手段であって、範囲の上限ではない（[`../rules/06_autonomy.md`](../rules/06_autonomy.md) §1）。
2. 関連コード・設定・文書・テストを調べ、目的達成に不足する実装・依存・エラー処理・検証・索引更新を洗い出す。必要な作業は指示になくても小さく分割して行う。無関係な既存バグや「ついで」の改善は報告に留める（同 §2）。
3. 破壊的変更、データ削除、秘密情報へのアクセス、外部公開、課金、重大な仕様の矛盾、結果が大きく変わる判断は**実行前に確認**する。既存設計に沿う軽微な変更は逐一聞かずに進める（同 §4）。

1 タスク = 1 つの意味のある論理的単位。目的達成に必要な範囲と目的外の拡張を区別する。

## 完了後

→ 小さく実装・検証を反復 → [`verify-commit.md`](./verify-commit.md) で目的の達成を確認 → commit/push → [`log-task.md`](./log-task.md) で実施内容と未解決事項を記録。
