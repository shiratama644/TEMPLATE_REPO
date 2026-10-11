# AGENTS.md

本ドキュメントは、AI Agent が本プロジェクトの開発・変更を行う際に**必ず遵守すべき開発規約**です。
最優先事項は **「速く大量に作ること」ではなく「常に復旧可能で、壊れた状態を長時間維持しないこと」** です。

> 📌 **このリポジトリはテンプレートです。** 新しいプロジェクトを作成したら、
> 「## 6. プロジェクト固有の遵守事項」にそのプロジェクト固有のルール
> （技術スタック・制約・実装ルール）を追記してください。
> それ以外の節は汎用規約のため、原則そのまま使えます。

> 🔗 **Claude Code 向けの対応**: `CLAUDE.md` は本ファイルへの symlink、`.claude/` は `.agent/` への symlink です。
> Claude Code はどちらの名前でも同じ内容を読みます。正本は `AGENTS.md` と `.agent/` です。

---

## 1. 基本方針 & 作業単位

### 1.1 基本原則
- **小さく実装 → 検証 → 修正 → Git Commit → 次の機能** のサイクルを徹底する。
- 一度に大量の機能を実装して最後にまとめてデバッグする方式は禁止。
- 「ついでに改善できそう」という理由でスコープを広げない（未指定の機能追加・設計変更・大規模リファクタリングの禁止）。

### 1.2 作業単位の粒度
1タスクは**「1つの意味のある論理的単位」**で区切る。

| 区分 | 例 |
| :--- | :--- |
| **良い例（適切な粒度）** | 章の執筆 / データの一括変換 / 調査項目の一つを完了させる / 設定の一つの移行 |
| **悪い例（細かすぎる）** | 語句を1つ直すごとにコミット / 数値を1つ変えるごとに検証 |
| **悪い例（大きすぎる）** | 複数の章・データ源・成果物を1タスクで一括作成 |

※大規模な構成変更や移行は、「設計 → 基盤 → 項目A（検証・commit） → 項目B（検証・commit）」と段階的に分割すること。

---

## 2. 開発ワークフロー

各タスクは必ず以下の順序で進め、途中の検証が失敗した状態で次へ進んではならない。

```text
1. 仕様・既存コード確認 (git status / README / 関連ファイル / docs/)
   ↓
2. 実装方針決定
   ↓
3. 実装 (最小限の差分)
   ↓
4. プロジェクト検証（§3.1・§6.1 に記録された検証をすべて実行）
   ↓ 失敗時は原因特定して修正し、再度全検証
5. 差分確認 (git diff で意図しない変更がないか確認)
   ↓
6. Git Commit (Conventional Commits形式)
   ↓
7. タスク完了・停止 (勝手に次のタスクを開始しない)
```

---

## 3. テスト・品質保証ルール

### 3.1 検証コマンドの実行
- プロジェクトで**定義された検証手段のみ**を使用する（存在しないコマンドを捏造・実行しない）。
- 検証手段は **§6.1「検証コマンド」** に記録する。未記録の場合は、推測で実行せず先にユーザーへ確認する。
- commit 前に、記録済みの検証をすべて pass させる。
- 検証の例（分野ごとに読み替える）:

  | 分野 | 検証の例 |
  | :--- | :--- |
  | ソフトウェア（TS/Python/Go/Rust 等） | 型チェック → Lint/Format → 単体テスト → ビルド |
  | Web アプリ | 上記 + E2E テスト、ブラウザでの表示確認 |
  | ドキュメント / 文章 | リンク切れチェック、表記ゆれ・誤字チェック、目次の整合性 |
  | データ / 分析 | スキーマ検証、再現実行（同じ入力で同じ出力になるか）、集計値の突き合わせ |
  | 設定・インフラ | 構文チェック、dry-run / plan による差分確認 |

- テストの watch モードは commit 前検証に使わない。必ず一回実行（run 相当）のコマンドを使う。
- 外部ネットワーク・外部 API・GUI 等に依存する検証が環境上実行できない場合は、無理に回避せず、実行できなかった事実と理由を報告する（§6.2 参照）。
- ビルドや検証ログに環境起因の既知エラーが出ても、exit code が 0 であれば成功扱いで問題ない（既知事象は §6 に追記して引き継ぐ）。

### 3.2 エラー対応と品質維持
- エラー発生時はエラーメッセージやスタックトレースから根本原因を特定し、最小限の範囲で修正する。
- **テストを通すためだけの不正な修正は厳禁**：
  - テストの削除・スキップ・アサーションの緩和
  - 型エラーを回避するための安易な `any` 使用
  - Lintルールの勝手な無効化・エラーの握りつぶし
- **既存仕様の尊重**：既存テストが落ちた場合、「テストが間違っている」と即断せず、既存仕様を壊していないか確認する。

### 3.3 既存バグの扱い
- **今回のタスクを妨げるバグ**：必要最小限の修正を行う。
- **無関係な既存バグ**：勝手に修正せず、ユーザーに報告する。
- バグ修正時は、可能であれば再発防止の回帰テスト（Regression Test）を追加する。

---

## 4. Git運用 & 環境復旧ルール

Gitは単なる履歴管理ではなく、**「実行環境消失・セッション切断時の復元チェックポイント」**として扱う。

### 4.1 作業開始時の現状把握
作業開始時は必ず以下を実行し、ブランチ・未コミット変更・直近ログを確認する。
```bash
git status
git branch --show-current
git log -5 --oneline
```
※未コミットの変更が存在する場合、勝手に破棄・上書きせず、現在の作業に混ぜない。

#### 4.1.1 サンドボックス再構築時の復旧手順
サンドボックス型の作業環境（Arena 等）は再構築されることがあり、その場合ワークツリーには
「起点コミットのファイル」＋「push 済みコミットで追加されたファイルの未追跡バージョン」が
混在した状態で立ち上がる（`git status` が「大量の削除 + 大量の未追跡」を示す）。
この時点でファイルは破損していないので、以下の手順で確実に復旧すること。

```bash
# 1. リモートの最新を fetch（ブランチ名は git branch --show-current で確認した現在値を使う）
git fetch origin <現在のブランチ>

# 2. FETCH_HEAD にワークツリーごとリセット（この場合の --hard は例外的に必要）
git reset --hard FETCH_HEAD

# 3. 環境を再構築（§6.1 に記録された手順に従う。依存のインストールなど）
```

- `git reset --hard FETCH_HEAD` は §4.3 の厳禁ルールの例外で、**サンドボックス再構築後の初回のみ**許可される（未コミット変更は元々存在しない状態のため）。
- 再構築を判定するヒント：`git log --oneline` が起点コミット 1 個しか返ってこない / `git status` が大量の削除を示す / 依存の展開先や生成物（§6.1 で記録したもの）がない。
- 復旧後は必ず `git log --oneline -5` と §6.1 の検証コマンドで健全性を確認してから作業を再開する。

### 4.2 コミットルール
- **タイミング**: §6.1 の検証がすべてPASSした状態でのみコミットする。
- **事前チェック**: `git status` および `git diff` を確認し、意図しないファイルが含まれていないことを確認する。
- **重要な変更前のチェックポイント**: 大規模リファクタリング、スキーマ変更、依存関係更新の前には、作業前の正常状態を一度コミット（checkpoint）しておく。
- **コミットメッセージ**: Conventional Commits 形式に従う。
  - `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`, `build:`, `ci:`

### 4.3 厳禁なGit操作（明示的な指示がない限り実行禁止）
以下の破壊的・履歴改変コマンドは**絶対に実行してはならない**。
- `git reset --hard` / `git clean -fd`（未コミット作業の消失リスク）
  - ただし §4.1.1 のサンドボックス再構築復旧時の `git reset --hard FETCH_HEAD` のみ例外
- `git rebase` / `git commit --amend`（既存履歴の改変）
- `git push --force` / `git push --force-with-lease`

#### 4.3.1 通常の `git push` の事前許可（ユーザーとの恒久合意）
- サンドボックスは予告なく再構築され、**ローカルコミットのみだと作業が破棄される**。
  成果物を保護するため、検証がすべて PASS し意図しない差分がないことを確認できたら、
  その場で `git push origin <セッション固定ブランチ>` を実行する（push のたびにユーザー確認を取らない）。
- このルールが不要なプロジェクトでは本節を削除する。
- push 先は**セッション固定ブランチのみ**（§4.4）。`main` 等への直接 push、
  他ブランチへの push、force push は引き続き禁止。
- PR の作成も許可済み（`gh pr create`）。作成後は URL を報告する。

### 4.4 ブランチ運用（セッション型環境）
- **作業ブランチはセッション固定**。Arena 等はこのブランチ名でセッションを追跡しており、他ブランチに push した作業は**セッションと紐付かず失われる**。
  - ブランチ名は**セッションごとに変わる**ため、**必ず `git branch --show-current` で確認**すること（pre-task フックの最初の手順）。
  - **過去セッションのブランチ名を文書に残さない**。古いブランチ名を文書へ残すと、後続セッションが別セッションのブランチを fetch/push する事故になる。
- ユーザーから「別ブランチを使ってほしい」と依頼された場合も、セッション固定ブランチから離れる前に「このセッションは `<現在のブランチ>` に固定です」と説明し、そのまま作業を続ける。
- feature branch は切らない。セッション固定ブランチへ直接 commit + push し、`gh pr create` で `main` 向け PR を作成する。マージ判断はユーザー側に委ねる。
- push は `git push origin <現在のブランチ>` の明示指定で行う。default remote/branch 依存の `git push` は避ける。

---

## 5. タスク完了条件（AI Agentの停止条件）

以下の条件が**すべて満たされた時点で作業を完了とし、停止（回答）**する。追加の改善を勝手に開始してはならない。

- [ ] 指定された機能/修正が実装されている
- [ ] §6.1 に記録されたすべての検証がPASSしている
- [ ] タスクと無関係なファイルの変更・意図しない差分がない
- [ ] 適切なメッセージで Git Commit が完了している
- [ ] Working tree が clean である（`git status` で確認）
- [ ] `git push origin <セッション固定ブランチ>` が完了している（§4.4）

---

## 6. プロジェクト固有の遵守事項（テンプレート利用時に追記する）

> この節は**プロジェクトごとに書き換える**。過去に踏んだ地雷・確立した運用ルールを
> 集約する場所。計画書と矛盾する指定があった場合は計画書を優先するが、
> それ以外は本節を厳守する。不要なサブセクションは削除してよい。

### 6.1 環境・ツールチェーン・検証コマンド
- （例）使用言語・ランタイムのバージョン / パッケージマネージャ / 主要ライブラリのバージョン方針
- **検証コマンド**（§3.1 の正本。プロジェクトに合わせて記入）:
  ```bash
  # 例:
  # <型チェック>    # 例: tsc --noEmit / mypy
  # <Lint>          # 例: biome check / ruff check
  # <テスト>        # 例: vitest run / pytest
  # <ビルド>        # 例: npm run build / make
  ```
- 環境の初期セットアップ手順（例: 依存のインストール）

### 6.2 サンドボックス制約（乗り越えず、迂回する）
- （例）外部 API に到達不可 / ブラウザバイナリの install 不可 等。修正対象ではない恒常的制約とその対処を書く。

### 6.3 リポジトリ固有の Git 制約
- （例）特定ディレクトリへの書き込み不可・不変ディレクトリの存在など

### 6.4 実装ルール
- （例）採用する設計方針・命名規則・依存の方向、過去に踏んだ地雷と回避策など

### 6.5 Lint・フォーマット特有ルール
- （例）ignore コメントの置き場所・自動生成ファイルの除外設定、文書の校正ルールなど

### 6.6 成果物・表現ルール
- （例）出力形式・用語集・表記ゆれの統一方針、図表の規格、データの単位など

### 6.7 ドキュメント運用
- 構成・命名規則・運用ルール: `docs/README.md`（全ドキュメントの目次）
- タスク進捗管理: `docs/task-list.md`（**唯一の正本**。状態定義・証拠記録のルールは同ファイル冒頭）
- 仕様書: `docs/arch/`（どう作るか / 何を作るか）
- 計画書: `docs/planning/`（`_TEMPLATE.md` 形式）
- 調査: `docs/research/` / 監査: `docs/audit/` / 運用: `docs/ops/`
- ドキュメントを追加・削除・移動したら `docs/README.md` の目次を必ず更新する
- ファイル名は短く正確、ハイフン最大1つ

---

## 7. コミュニケーション規約（Agent の話し方・ユーザーとの対話方針）

本節は「Agent がユーザーとどう会話するか」の型を定める。過去のセッションで受け入れられた話し方を型化しており、次セッションの Agent もこの型を踏襲すること。

### 7.1 返答の基本スタイル
- **言語**: 日本語（ユーザーが日本語で話しかけているため）。技術用語は日本語 + 英語併記可（例: 「z-index 序列」「fast-forward マージ」「Rules of Hooks」）。
- **文体**: 敬体（です・ます調）をベース。技術説明部分は淡々と事実を述べる。過度な謙譲・冗長な前置きは避ける。
- **絵文字**: 通常会話では使わない。**結果報告・チェックリスト・優先度表示のみ**、最小限で使う。
  - `✅` (完了) / `❌` (失敗) / `🟡` (中優先度) / `🟢` (低優先度) / `🔴` (高優先度・要注意) / `🎉` (フェーズ完了時のみ)
- **見出し**: `##` `###` `####` で構造化。3 段以上は避ける（読みにくくなる）。
- **表**: 実測値・比較・状態一覧は必ず表 (`| 項目 | 値 |`) にまとめる。散文で羅列しない。
- **箇条書き**: `-` を優先。番号付き `1.` は手順・実行順序を示す時のみ。

### 7.2 報告のフォーマット

コミット・タスク完了時は以下の順序で報告する:

1. **見出し**: `## ✅ <タスク名> 完了 (`abc1234`)` のようにタスク名 + commit hash 短縮 7 桁
2. **変更内容の表**: `| # | 問題/目的 | 実装 |` 形式
3. **ファイル変更数**: `新規/変更ファイル (N files, +X / -Y)`
4. **検証結果チェックリスト**:
   ```text
   - ✅ <型チェック>: 0 error
   - ✅ <Lint>: 0 error (N files)
   - ✅ <テスト>: X passed / Y files
   - ✅ <ビルド>: 成功
   - ✅ push 済み (`prev..head`)
   ```
   ※ スクリプト名・検証項目はプロジェクトの実情に合わせる。
5. **次のアクション**: 「次は何をしますか?」「Go を出していただければ〜」と提示、勝手に次のタスクを開始しない。

### 7.3 事実と推測の分離
- 実測値・確認済み事実は断言する（「HTTP 200 でした」「bundle は 6.6 KB になりました」）。
- 未検証・推測は明示する（「〜のはずです」「〜と想定」「〜見込み」）。
- 実行環境で計測不能な数値は「デプロイ後に計測予定」等と明記し、確定値のように書かない。

### 7.4 ユーザーへの質問方針
**わからないこと・判断に迷うことは、勝手に決めず必ずユーザーに質問する**。

#### 7.4.1 質問すべき場面
- 実装方針が 2 通り以上あり、どちらもメリット・デメリットがある時
- 仕様が確定しておらず、判断が必要な時
- ユーザーの過去発言と現在の指示が矛盾している疑いがある時
- 破壊的変更（データベーススキーマ変更、依存関係大規模更新、公開 API 変更等）を含む時
- 「〜してください」の指示が曖昧で、複数解釈が成り立つ時（例: 「UI を一新」→ どの粒度で？ どのブレークポイント？）

#### 7.4.2 質問の方法
- **`ask_user` ツール**を使う（自由文で質問文を投げるのではなく、選択肢 UI で提示）
- **選択肢は 2〜4 個 + 自由記述** に絞る。5 個以上は認知負荷が高くなり選ばれない
- 各選択肢には **短いラベル (`label`)** と **詳しい説明 (`description`)** を書く（description で判断材料を提供）
- 質問文は 1 文で明確に。前置きは最小限
- **一度に 4 質問まで**。それ以上は認知負荷過多

#### 7.4.3 質問の悪例と良例

❌ 悪い例（勝手に決める）:

> 「UI を一新してください」
> → Agent が独断で「じゃあ左サイドバー方式で、シェルレイアウトだけ改修」と決めて実装開始

✅ 良い例（`ask_user` で確認）:

> UI を一新するにあたり、以下 3 点を確認します:
> 1. レイアウト: 左サイドバー / トップバーのみ / 既存踏襲
> 2. ブレークポイント: md (768px) / lg (1024px)
> 3. スコープ: シェルレイアウトのみ / 全ページ

### 7.5 Web 検索の活用方針
**わからないこと・記憶に自信がないことは Web 検索で確認する**。トレーニングデータ (cutoff) 以降の情報や、ライブラリの最新 API 仕様は特に検索必須。

#### 7.5.1 検索すべき場面
- **ライブラリの API 仕様が変わっている可能性がある時**（メジャーバージョン更新が頻繁なもの）
- **エラーメッセージが記憶にない、または解決策が不明な時**
- **セキュリティ・法規制関連**（CSP / CORS / GDPR / ライセンス互換性等、間違えると影響が大きい）
- **外部 API のレスポンス形式・レート制限**
- **ベストプラクティスが最近変わった可能性がある時**
- ユーザーが「最新の〜」「今の〜」と時期を明示している時

#### 7.5.2 検索の使い方
- `web_search` ツールを使う。`depth` は状況で使い分け:
  - **depth=1**: 事実確認・URL 確認レベル
  - **depth=2**: 標準（複数ソース比較したい時）
  - **depth=3**: 深掘り（詳細仕様・長い記事から抜粋が必要な時）
- 検索結果を引用する時は `[id](url)` 形式で必ずソースを明示
- 公式ドキュメントを優先
- **記憶で断言せず、疑わしければ検索する**。ハルシネーションを避けるための必須アクション

#### 7.5.3 検索と質問の使い分け
- **技術的事実の確認** → `web_search`（客観情報）
- **プロジェクト固有の仕様判断** → `ask_user`（ユーザー主観）
- **例**: 「このライブラリの新バージョンで API が変更されましたか?」→ 検索 / 「キャッシュ TTL を 1h に伸ばしていいですか?」→ ユーザー質問

### 7.6 失敗・エラー時の対応スタイル
検証失敗・実装エラーが発生した時は、以下の 3 段で説明する:

1. **原因分析**: 「〜が原因です」（推測なら「〜と思われます」を明示）
2. **修正方針**: 「〜で対処します」（2 案以上あるならユーザーに選択させる）
3. **実装**: 実際の修正コード

原因を隠して修正だけ通知しない。ユーザーが同じ地雷を踏まないよう、原因もセットで共有する。

### 7.7 制約・リスクの事前明示
実装前に **実行環境の制約・権限制約・外部サービス制約** 等が関係する場合は必ず先に伝える。

例:

> この修正は外部 API を叩く必要がありますが、**この Sandbox は当該 API に到達不可** (§6.2) なので、ローカルでは動作確認ができません。CI か、ユーザー環境での手動確認をお願いすることになります。

事後報告（「実は動作確認できてませんでした」）は信頼を損なうので避ける。

---

## 8. エージェント記憶システム（`.agent/`）

本プロジェクトでは、Agent 自身の**コードベース知識・定型ワークフロー・タスク実行ログ**を `.agent/` 配下に構造化して永続化する。セッションをまたいで記憶を継承し、無駄な再調査を省くための仕組み。

> **構成はClaude Code公式の `.claude/` ディレクトリ構成に準拠**。ディレクトリ名は `.agent/` のまま維持する。
> 公式仕様: https://code.claude.com/docs/en/claude-directory.md
> 調査時点の最新仕様（2026-09-26確認）を正とする。

### 8.1 ディレクトリ構成（公式準拠 + テンプレート拡張）


```
.agent/   （Claude Code からは .claude/ として読まれる。.claude → .agent の symlink）
├── settings.json              # チーム共有設定（permissions, hooks, env）— コミット対象
├── settings.local.json        # 個人オーバーライド（gitignore）— 個人のみ
├── THIRD_PARTY_NOTICES.md     # 取り込んだ上流 OSS のライセンス表示
├── rules/                     # トピック別ルール（pathsで発火条件を絞れる）
│   ├── 01_information-hierarchy.md
│   ├── 02_git-workflow.md
│   ├── 03_doc-style.md
│   ├── 04_verification.md
│   └── project-template.md
├── skills/<name>/SKILL.md     # 再利用プロンプト（/nameで呼び出し、自動発火も可能）— 48 件
│   ├── index.md               # 入口（読み方ガイド・一覧）
│   ├── 自作: project-overview / tech-stack / sandbox-constraints / verify-doc-integrity / docs-maintenance
│   ├── 自作(ソフトウェア/Web): testing / ci-quality-gates / import-boundaries / determinism / memory-leak / zero-alloc / e2e
│   ├── superpowers（MIT）由来: brainstorming / writing-plans / executing-plans / subagent-driven-development / test-driven-development / systematic-debugging / verification-before-completion / requesting-code-review / receiving-code-review / using-git-worktrees / finishing-a-development-branch / dispatching-parallel-agents / writing-skills / using-superpowers
│   ├── ECC: verification-loop / search-first / documentation-lookup / deep-research / council / architecture-decision-records / article-writing
│   ├── mattpocock/skills: grill-me / grilling / handoff / teach / writing-for-agents / to-questionnaire / prototype / research / retro / codebase-design / diagnosing-bugs / improve-codebase-architecture / domain-modeling
│   └── anthropics/skills (Apache-2.0): skill-creator / discernment-nudge
├── agents/                    # サブエージェント定義（name, description, tools, model等）
│   ├── planner.md
│   ├── architect.md
│   ├── code-explorer.md
│   ├── docs-lookup.md
│   ├── code-reviewer.md
│   ├── doc-editor.md
│   └── test-writer.md
├── hooks/                     # フック手順(.md) + 実行スクリプト(.sh)
│   ├── index.md               # 索引
│   ├── pre-task.md            # タスク開始時
│   ├── verify-commit.md       # commit直前
│   ├── log-task.md            # タスク完了時
│   ├── sandbox-recovery.md
│   ├── session-start.sh       # SessionStart: 作業状態の注入
│   ├── block-dangerous-git.sh # PreToolUse(Bash): 破壊的 git 操作のブロック
│   ├── pre_edit_guard.sh      # PreToolUse(Edit/Write): 編集禁止領域ブロック
│   └── post_edit_verify.sh    # PostToolUse: 事後検証
├── commands/                  # スラッシュコマンド（/name で呼び出し）
│   ├── commit.md
│   ├── test.md
│   ├── code-review.md
│   ├── checkpoint.md
│   ├── plan.md
│   └── update-docs.md
├── output-styles/             # 出力スタイル（concise, detailed等）
│   ├── concise.md
│   └── detailed.md
├── workflows/                 # 動的ワークフロー（複数サブエージェントを束ねる）
│   └── implement-task.js
├── agent-memory/              # サブエージェント永続メモリ（自動生成）
└── logs/                      # タスク実行ログ（追加のみ、書き換え禁止）
    └── YYYY-MM-DD_<summary>.md
```

| ディレクトリ | 役割 | 命名規則 | 公式/独自 |
| :--- | :--- | :--- | :--- |
| `settings.json` | チーム共有設定（permissions, hooks, env） | 固定 | 公式準拠 |
| `settings.local.json` | 個人オーバーライド（gitignore） | 固定 | 公式準拠 |
| `rules/` | トピック別ルール（pathsで発火条件） | `NN_kebab-case.md` | 公式準拠 |
| `skills/<name>/` | コードベースの**事実/仕様/暗黙了解**をサブシステム別に格納 | `<kebab-case>/SKILL.md` | 公式準拠 |
| `agents/` | サブエージェント定義（name, description, tools等） | `kebab-case.md` | 公式準拠 |
| `hooks/` | トリガー別の**定型手順/スクリプト** + 実行スクリプト | `kebab-case.md` / `.sh` | 公式hooks登録 + テンプレート拡張 |
| `commands/` | 単一ファイルプロンプト（`/name` で呼び出し） | `kebab-case.md` | 公式準拠 |
| `output-styles/` | 出力スタイルのカスタマイズ | `kebab-case.md` | 公式準拠 |
| `workflows/` | 動的ワークフロー（JS） | `kebab-case.js` | 公式準拠 |
| `agent-memory/` | サブエージェント永続メモリ | `<name>/MEMORY.md` | 公式準拠 |
| `logs/` | タスク完了毎の**実行記録** | `YYYY-MM-DD_kebab-case-summary.md` | テンプレート独自 |

各ディレクトリ直下に **`index.md`** を置き、一覧・参照条件を管理する（`logs/` は日付名でソートされるため不要、`rules/` `skills/` `hooks/` は必須）。

### 8.2 公式構成との対応

| 公式 `.claude/` | 本テンプレート `.agent/` | 備考 |
|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` → `AGENTS.md`（symlink） | 同一内容。Claude Code は CLAUDE.md を読む |
| `settings.json` | `settings.json` | 同型。permissions, hooks, env, model等 |
| `settings.local.json` | `settings.local.json` | 同型。gitignore対象 |
| `rules/*.md` | `rules/*.md` | 同型。pathsフロントマターで発火条件 |
| `skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` | 同型。name, description必須 |
| `commands/*.md` | `commands/*.md` | 同型 |
| `agents/*.md` | `agents/*.md` | 同型。name, description, tools, model等 |
| `output-styles/*.md` | `output-styles/*.md` | 同型 |
| `workflows/*.js` | `workflows/*.js` | 同型。agent(), parallel(), phase()プリミティブ |
| `agent-memory/` | `agent-memory/` | 同型。サブエージェント永続メモリ |
| — | `hooks/` | テンプレート拡張。手順md + 実行sh + settings.jsonで登録 |
| — | `logs/` | テンプレート拡張。4セクションの実行ログ |

### 8.3 `index.md` 起点のピンポイント読込（核心ワークフロー）
- **セッション開始時**: `settings.json` の `SessionStart` フックで [`session-start.sh`](.agent/hooks/session-start.sh) が、正本の所在・ブランチ・直近のコミット・未コミット変更・未完了サマリーをモデルへ注入する。
- **タスク開始時**（[`.agent/hooks/pre-task.md`](.agent/hooks/pre-task.md)）: 現状把握後、[`.agent/skills/index.md`](.agent/skills/index.md) の「読み方ガイド」で**該当スキルだけ**を読む。全スキルを常に読み込まない（コンテキスト浪費）。
- **Bash 実行前**: `settings.json` の `PreToolUse` フックで [`block-dangerous-git.sh`](.agent/hooks/block-dangerous-git.sh) が force push・`reset --hard`・`main` への push 等の破壊的 git 操作をブロックする。
- **編集前**: `settings.json` の `PreToolUse` フックで [`pre_edit_guard.sh`](.agent/hooks/pre_edit_guard.sh) が編集禁止領域をブロック。
- **編集後**: `settings.json` の `PostToolUse` フックで [`post_edit_verify.sh`](.agent/hooks/post_edit_verify.sh) が事後検証。
- **トリガー発生時**: [`.agent/hooks/index.md`](.agent/hooks/index.md) の「対応表」で該当フックを特定し実行。
- 初回/全体把握が必要な時だけ、`project-overview/SKILL.md` を読む。未作成なら作成を検討する。

### 8.4 記憶の同期（書き込みワークフロー）
- **タスク完了時**（[`.agent/hooks/log-task.md`](.agent/hooks/log-task.md)）: 必ず `.agent/logs/YYYY-MM-DD_<summary>.md` を 4 セクション（指示内容/実行内容/気づき/次アクション）で作成。
- **知見のスキル化**: ログの「気づき」が再利用性の高いコードベース知識なら該当 `skills/<name>/SKILL.md` に反映し、`skills/index.md` の「最終更新」を更新する。新スキルは `skills/index.md` の「読み方ガイド」「一覧」両方に追記。frontmatterの `description` も更新。
- **ルールの更新**: 汎用的な作業規約が見つかったら `rules/` に追加。`paths` で発火条件を絞る。
- ログ・スキル・rules・index の変更も commit/push 対象（セッションブランチへ）。

### 8.5 AGENTS.md と skills/rules の役割分担
- **AGENTS.md（本ファイル）** = 「どう作業するか」の**規約**（コミット手順・Lint・Git運用・コミュニケーション等）。常に正。
- **rules/** = 「いつ・どのファイルで何を守るか」の**トピック別ルール**。`paths` で発火条件を絞る。AGENTS.mdの詳細版。
- **skills/** = 「このコードベースが**どう出来ているか**」の**事実/仕様**。深掘り用。自動発火も可能。
- 3者が重複する場合、作業手順は AGENTS.md、詳細ルールは rules/、ドメイン知識は skills/ を参照。

### 8.6 運用ルール
- `.agent/` 配下は Git 追跡対象（永続化）。ただし `settings.local.json` と `agent-memory/` は `.gitignore` で除外（個人情報・自動生成のため）。
- スキル/ルール/フック/エージェントを更新したら対応 `index.md` / `README.md` も必ず更新する（腐らせない）。
- ログは**追加のみ**（過去ログを書き換えない）。
  - ⚠️ **一括置換・リネーム系の指示が来ても、`.agent/logs/` の過去ログを置換対象に含めない。**
    過去ログは「その時点で何が起きたか」の事実記録であり、旧ブランチ名・旧数値・旧パスが
    書かれているのは**正しい状態**。書き換えると記録が偽になる。
  - 一括置換の射程は**現用ドキュメント**（`AGENTS.md` / `.agent/skills/` / `.agent/hooks/` / `.agent/rules/` / `.agent/agents/` / 現用の `docs/`）に限定する。`.agent/logs/` 等の時点記録に触れる必要がある場合は、**必ず事前にユーザーへ確認**する。
  - 当時の事実（旧ブランチ名など）を残す必要がある場合は、過去ログを書き換えるのではなく**当日の新規ログに記録**する。
