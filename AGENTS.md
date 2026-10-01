# AGENTS.md

本ドキュメントは、AI Agent が本プロジェクトの開発・変更を行う際に**必ず遵守すべき開発規約**です。
最優先事項は **「速く大量に作ること」ではなく「常に復旧可能で、壊れた状態を長時間維持しないこと」** です。

> 📌 **このリポジトリはテンプレートです。** 新しいプロジェクトを作成したら、
> 「## 6. プロジェクト固有の遵守事項」にそのプロジェクト固有のルール
> （技術スタック・制約・実装ルール）を追記してください。
> それ以外の節は汎用規約のため、原則そのまま使えます。

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
| **良い例（適切な粒度）** | 一覧画面の実装 / 検索機能の実装 / 詳細モーダルの実装 / キャッシュ層の実装 |
| **悪い例（細かすぎる）** | ボタン1個追加ごとにコミット / CSS margin変更ごとにテスト |
| **悪い例（大きすぎる）** | UI + API + 認証 + DB + キャッシュ を1タスクで一括実装 |

※フレームワーク移行やDB変更などの大規模変更は、「設計 → 基盤 → 機能A（検証・commit） → 機能B（検証・commit）」と段階的に分割すること。

---

## 2. 開発ワークフロー

各タスクは必ず以下の順序で進め、途中の検証が失敗した状態で次へ進んではならない。

```text
1. 仕様・既存コード確認 (git status / package.json / 関連ファイル)
   ↓
2. 実装方針決定
   ↓
3. 実装 (最小限の差分)
   ↓
4. プロジェクト検証 (Lint / Typecheck / Test / Build)
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
- `package.json` に定義されたスクリプトのみを使用する（存在しないコマンドを捏造・実行しない）。
- 原則として commit 前に、プロジェクトで定義された検証をすべて pass させる。本テンプレートでは以下の 8 必須 + 2 任意(non-blocking) + infra 3種 + pre-commit:
  ```bash
  # 必須 8 gates（blocking, CIでも必須）
  pnpm typecheck          # 型チェック (tsc --noEmit, TypeScript 6.0.3)
  pnpm lint               # Lint / Format (Biome 2.5.14, zero-alloc/memory-leak lint含む)
  pnpm check:determinism  # 決定論・禁止API検出 (Math.random/Date.now等が純粋層に混入していないか)
  pnpm cspell             # スペルチェック (cspell 10.3.4)
  pnpm knip               # 未使用コード検出 (knip 6.38.0, KNIP_DISABLE_RAW_TRANSFER=1)
  pnpm test:unit          # 単体テスト (Vitest 5.0.2)
  pnpm test:coverage      # カバレッジ (threshold 100%)
  pnpm build              # 本番ビルド

  # 任意 2 gates（non-blocking, warningのみ, CIでもnon-blocking）
  pnpm publint            # パッケージ公開検証
  pnpm size-limit         # バンドルサイズ (10kB)

  # infra 3 tasks（check.ts内でのみ実行, 必須ではないが常にpass期待）
  pnpm install            # 依存インストール（check.ts先頭で先行実行）
  pnpm e2e:list           # E2E discovery (browser未インストール時はfallback)
  pnpm security:check     # セキュリティ統合チェック（secret/dependency check）

  # pre-commit (husky + lint-staged): commit時にstagedファイルのみ自動で lint + cspell(all) + typecheck
  ```
  ※ 実際のスクリプト名はプロジェクトの `package.json` を確認すること
  （`pnpm lint` が linter 直接呼び出しの別名だったり、`pnpm test` が watch モードだったりする）。
  ※ 一括実行は `pnpm check`（install先行→残り並列、publint/size-limitはnon-blocking, logs/に保存、cod-web最新arena由来）
- テストの watch モードは commit 前検証に使わない。必ず run 相当のスクリプトを使う。
- E2E テストは実行環境によってはローカルで実行できないことがある（§6 の制約を確認）。
  実行できない場合は CI 上のみ実行し、ローカルで無理に実行しようとしない。
- ビルドログに環境起因の既知エラー（外部 API への接続失敗等）が出ても、exit code が
  0 であれば成功扱いで問題ない（既知事象は §6 に追記して引き継ぐ）。
- **テストファイル命名規則（公式ルール）**: テストファイルは `_tests_/` ディレクトリに同じディレクトリ構造で配置し、命名は `<name>.test.ts` 形式に統一する（例: `src/index.ts` → `_tests_/src/index.test.ts`, `scripts/lib/cache.ts` → `_tests_/scripts/cache.test.ts`）。`test-*.ts` 等の旧形式は禁止。詳細は `.agent/rules/04_verification.md` §5 を参照
- **pre-commit**: husky 9.1.7 + lint-staged 17.6.0 により、commit時にstagedファイルのみ `biome check --write` + `biome lint` + `cspell` が自動実行される。`--no-verify` でスキップ可能だが、原則使わない
- **commit-msg**: husky + commitlint 21.2.3 により、Conventional Commits形式（feat, fix, docs等）が強制される。不正なメッセージはcommit失敗。`pnpm commit` (commitizen) で対話的に作成可能

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

# 3. 依存を再構築（復旧スクリプトがある場合はそれを使う。例: .agent/hooks/restore-env.sh）
corepack enable pnpm >/dev/null 2>&1
pnpm install --frozen-lockfile
```

- `git reset --hard FETCH_HEAD` は §4.3 の厳禁ルールの例外で、**サンドボックス再構築後の初回のみ**許可される（未コミット変更は元々存在しない状態のため）。
- 再構築を判定するヒント：`git log --oneline` が起点コミット 1 個しか返ってこない / `git status` が大量の削除を示す / node_modules がない。
- 復旧後は必ず `git log --oneline -5` とテスト（`pnpm test:unit` 等）で健全性を確認してから作業を再開する。

### 4.2 コミットルール
- **タイミング**: 検証（Lint/Type/Test/Build）がすべてPASSした状態でのみコミットする。
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
- [ ] すべての検証（Lint, Typecheck, Test, Build）がPASSしている
- [ ] タスクと無関係なファイルの変更・意図しない差分がない
- [ ] 適切なメッセージで Git Commit が完了している
- [ ] Working tree が clean である（`git status` で確認）
- [ ] `git push origin <セッション固定ブランチ>` が完了している（§4.4）

---

## 6. プロジェクト固有の遵守事項（テンプレート利用時に追記する）

> この節は**プロジェクトごとに書き換える**。過去に踏んだ地雷・確立した運用ルールを
> 集約する場所。計画書と矛盾する指定があった場合は計画書を優先するが、
> それ以外は本節を厳守する。不要なサブセクションは削除してよい。

### 6.1 環境・ツールチェーン
- （例）Node.js LTS / パッケージマネージャ / フレームワーク・主要ライブラリのバージョン方針

### 6.2 サンドボックス制約（乗り越えず、迂回する）
- （例）外部 API に到達不可 / ブラウザバイナリの install 不可 等。修正対象ではない恒常的制約とその対処を書く。

### 6.3 リポジトリ固有の Git 制約
- （例）特定ディレクトリへの書き込み不可・不変ディレクトリの存在など

### 6.4 フレームワーク実装ルール
- （例）Hooks の呼び出し順序・Server/Client 境界・状態管理の方針など

### 6.5 Lint 特有ルール
- （例）ignore コメントの置き場所・自動生成ファイルの除外設定など

### 6.6 UI 実装ルール
- （例）ブレークポイント分離・z-index 序列・アニメーション方針など

### 6.7 ドキュメント運用（活発リポジトリ準拠 — cod-web arena/01a0b161-cod-web復旧）

- テンプレート同梱のドキュメント規約を既定とする:
  - 構成・命名規則・運用ルール: `docs/README.md`
  - タスク進捗管理: `docs/task-list.md`（**唯一の正本**。状態定義・証拠記録のルールは同ファイル冒頭）— cod-web arena準拠
  - 仕様書: `docs/arch/`（どう作るか）— product, architecture, tech-stack, bootstrap, detector, cache, termux, adr
  - 計画書: `docs/planning/`（_TEMPLATE.md形式）— 計画書索引は README.md、完了済みは complete/
  - 調査: `docs/research/`（競合・技術調査）— cod-web arena準拠で復旧
  - 監査: `docs/audit/`（差分・バグ）— DropMod準拠で復旧
  - 完了済み計画: `docs/planning/complete/`（cod-web準拠）
  - 運用: `docs/ops/`（デプロイ・CI）
  - 設定例: `docs/examples/`（Vite/Next）— 現在の機能
- ドキュメントを追加・削除・移動したら `docs/README.md` の目次を必ず更新する
- ファイル名は短く正確、ハイフン最大1つ（例: `yaml-top.test.ts` OK、`yaml-utils-top-level.test.ts` NG）— 長過ぎると意味がない
- 重要なのは現在の機能（Node 24 LTS + pnpm 12.6.0 + TS 6, Vite/Next/Monorepo/Turbo自動検出, Termux 9判定, キャッシュhash-skip, 12品質ゲート, coverage 100%, Bootstrap CLI 7プリセット, GitHub templates full, DX tools all）+ 活発リポジトリの構成（arch, audit, planning, research）
- 参考: cod-web arena/01a0b161-cod-web（2026-09-26活発）— docs/: README, task-list.md, arch/ (15 files), planning/ (with complete/), ops/, research/ (DR-1..5)
- プロジェクトに不要なディレクトリ（`audit/` 等）は削除してよいが、本テンプレートでは活発リポジトリ準拠で全て保持

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
   - ✅ pnpm typecheck: 0 error
   - ✅ pnpm lint: 0 error (N files)
   - ✅ pnpm test:unit: X passed / Y files
   - ✅ pnpm build: Compiled successfully
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
.agent/
├── settings.json              # チーム共有設定（permissions, hooks, env, model）— コミット対象
├── settings.local.json        # 個人オーバーライド（gitignore）— 個人のみ
├── rules/                     # トピック別ルール（pathsで発火条件を絞れる）— 公式準拠
│   ├── 01_information-hierarchy.md
│   ├── 02_git-workflow.md
│   ├── 03_doc-style.md
│   ├── 04_verification.md
│   └── project-template.md
├── skills/<name>/SKILL.md     # 再利用プロンプト（/nameで呼び出し、自動発火も可能）— 公式準拠
│   ├── project-overview/      # 製品概要・構成把握
│   ├── tech-stack/            # 技術スタック・ハマりどころ
│   ├── sandbox-constraints/   # Sandbox制約・迂回策
│   ├── verify-doc-integrity/  # ドキュメント整合性検証
│   ├── diff-review-report/    # 差分レビューレポート
│   ├── docs-maintenance/      # ドキュメント整理・URL検証（cod-web最新arena由来）
│   ├── ci-quality-gates/      # CI品質ゲート・workflow正本管理（cod-web最新arena由来）
│   ├── testing/               # 意味あるテスト・coverage 100%・mock戦略（cod-web最新arena由来）
│   ├── import-boundaries/     # レイヤー境界・import制限（cod-web最新arena由来）
│   ├── determinism/           # 決定論・禁止API検出（cod-web deterministic-sim由来）
│   ├── e2e/                   # Playwright E2E・webServer配列（cod-web最新arena由来）
│   ├── memory-leak/           # メモリリーク防止・leave時clear（cod-web最新arena由来）
│   └── zero-alloc/            # ゼロアロケーション・GC削減（cod-web最新arena由来）
├── agents/                    # サブエージェント定義（name, description, tools, model等）— 公式準拠
│   ├── explore.md
│   ├── plan.md
│   ├── doc-editor.md
│   ├── code-reviewer.md
│   └── test-writer.md
├── hooks/                     # フック手順(.md) + 実行スクリプト(.sh) — テンプレート拡張 + 公式hooks登録
│   ├── index.md
│   ├── pre-task.md
│   ├── verify-commit.md
│   ├── log-task.md
│   ├── sandbox-recovery.md
│   ├── restore-env.sh
│   ├── pre_edit_guard.sh      # PreToolUse: 編集禁止領域ブロック（PalmIDE由来）
│   └── post_edit_verify.sh    # PostToolUse: 事後検証（PalmIDE由来）
├── commands/                  # 旧commands互換（新しくはskills/を使う）— 公式互換
│   ├── commit.md
│   ├── review.md
│   └── test.md
├── output-styles/             # 出力スタイル（concise, detailed等）— 公式準拠
├── workflows/                 # 動的ワークフロー（複数サブエージェントを束ねる）— 公式準拠
│   └── implement-task.js
├── agent-memory/              # サブエージェント永続メモリ（自動生成）— 公式準拠
└── logs/                      # タスク実行ログ（追加のみ、書き換え禁止）— テンプレート独自（PalmIDE由来）
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
| `commands/` | 単一ファイルプロンプト（旧形式、互換性のため） | `kebab-case.md` | 公式互換 |
| `output-styles/` | 出力スタイルのカスタマイズ | `kebab-case.md` | 公式準拠 |
| `workflows/` | 動的ワークフロー（JS） | `kebab-case.js` | 公式準拠 |
| `agent-memory/` | サブエージェント永続メモリ | `<name>/MEMORY.md` | 公式準拠 |
| `logs/` | タスク完了毎の**実行記録** | `YYYY-MM-DD_kebab-case-summary.md` | テンプレート独自 |

各ディレクトリ直下に **`index.md`** を置き、一覧・参照条件を管理する（`logs/` は日付名でソートされるため不要、`rules/` `skills/` `hooks/` は必須）。

### 8.2 公式構成との対応

| 公式 `.claude/` | 本テンプレート `.agent/` | 備考 |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md`（本ファイル） | Claude CodeはAGENTS.mdも読める。CLAUDE.mdがあれば併用も可 |
| `settings.json` | `settings.json` | 同型。permissions, hooks, env, model等 |
| `settings.local.json` | `settings.local.json` | 同型。gitignore対象 |
| `rules/*.md` | `rules/*.md` | 同型。pathsフロントマターで発火条件 |
| `skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` | 同型。name, description必須 |
| `commands/*.md` | `commands/*.md` | 同型。旧形式だが互換性のため残す |
| `agents/*.md` | `agents/*.md` | 同型。name, description, tools, model等 |
| `output-styles/*.md` | `output-styles/*.md` | 同型 |
| `workflows/*.js` | `workflows/*.js` | 同型。agent(), parallel(), phase()プリミティブ |
| `agent-memory/` | `agent-memory/` | 同型。サブエージェント永続メモリ |
| — | `hooks/` | テンプレート拡張。手順md + 実行sh + settings.jsonで登録 |
| — | `logs/` | テンプレート拡張。PalmIDE由来の4セクションログ |

### 8.3 `index.md` 起点のピンポイント読込（核心ワークフロー）
- **タスク開始時**（[`.agent/hooks/pre-task.md`](.agent/hooks/pre-task.md)）: 現状把握後、[`.agent/skills/index.md`](.agent/skills/index.md) の「読み方ガイド」で**該当スキルだけ**を読む。全スキルを常に読み込まない（コンテキスト浪費）。`settings.json` の `UserPromptSubmit` フックでも自動実行。
- **編集前**: `settings.json` の `PreToolUse` フックで [`pre_edit_guard.sh`](.agent/hooks/pre_edit_guard.sh) が編集禁止領域をブロック（PalmIDE由来）。
- **編集後**: `settings.json` の `PostToolUse` フックで [`post_edit_verify.sh`](.agent/hooks/post_edit_verify.sh) が事後検証（PalmIDE由来）。
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
- **他リポジトリからの良い部分の採用**:
  - **PalmIDE**: rules/のトピック分割、agents/の定義、skills/のモジュール化、hooks/のPOSIX sh + exit code規約、settings.example.jsonの配線例、verify-doc-integrity / diff-review-reportスキル
  - **cod-web (main)**: hooks/settings.jsonのイベント登録パターン、skills/<name>/SKILL.mdのfrontmatter形式、scripts/execute.tsの汎用ランナー
  - **cod-web (arena/01a0b161-cod-web 最新arena)**: 18スキルへの拡張（docs-maintenance, ci-quality-gates, testing, import-boundaries, determinism, e2e, memory-leak, zero-alloc等）、check-all.tsの並列品質ゲート（install先行+abort+hang修正+setsid+summary保存、check.tsに改名）、check-determinism.tsの禁止API検出、quality-gates.ymlの構成（checkout@v6, inputs.job, quality+e2e分離、coverage閾値100%、E2E discovery --list）
  - **DropMod**: GitHub ActionsのCI構成（static-checks + build + e2e、pnpm/action-setup@v4のバージョン非明示、cache、artifact共有、paths-ignore）、packageManagerのengines整備
  - **ytdl**: 検証キットのUXルール（?probe=1 / 1 fetch / 外部リトライ / raw URL + 自己チェック）、sandbox-constraintsの詳細化
