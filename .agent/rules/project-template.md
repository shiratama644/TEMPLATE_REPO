---
paths:
  - "AGENTS.md"
  - ".agent/skills/project-overview/**"
---

# Rule 05: プロジェクト固有の遵守事項（テンプレート）

> 優先度: **HIGH** — このファイルはテンプレート利用時にプロジェクトごとに書き換える

このファイルは `AGENTS.md §6` と対応する。テンプレートから新規リポジトリを作成したら、このファイルを参考に `AGENTS.md §6` を埋め、`project-overview` スキルを作成すること。

## 1. 環境・ツールチェーン（§6.1相当）

- Node.js: v24以上（LTS推奨、`.nvmrc` で固定）
- パッケージマネージャ: pnpm 12.6.0（`packageManager` フィールドで固定、corepack経由）
- フレームワーク: （例）Next.js 15 App Router / React 19 / TypeScript 5.8
- Lint: Biome 2.x（ESLintは撤去）
- Test: Vitest 4 + Playwright
- 状態管理: Zustand 5（Context APIは使わない）等の方針を明記

## 2. サンドボックス制約（§6.2相当）

乗り越えず、迂回する。修正対象ではない恒常的制約とその対処を書く。

| 制約 | 対処 |
|---|---|
| 外部APIに到達不可（例: api.example.com） | build時のログにfetch失敗が出るがexit 0なら成功扱い。モックで代替 |
| ブラウザバイナリのinstall不可 | E2EはCI上のみ実行、ローカルで無理に実行しない |
| sharpのnative build不可 | pnpm-workspace.yamlでsharp:false、Vercel側で自動注入 |

## 3. リポジトリ固有のGit制約（§6.3相当）

- `.github/workflows/` に書き込み不可の場合の対処（`docs/ops/CI_WORKFLOW.yml` に保管し手動配置）
- 不変ディレクトリの存在（例: `.archive/vite/` はPhase全期間で変更禁止）

## 4. フレームワーク実装ルール（§6.4相当）

- Hooksの呼び出し順序・Server/Client境界・状態管理の方針
- React error #310対策：モーダル等の全hookを `if (!isOpen) return null` の前に配置
- Server Component → Client Componentへの関数props渡し不可の対処

## 5. Lint特有ルール（§6.5相当）

- ignoreコメントの置き場所・自動生成ファイルの除外設定
- Biomeのoverridesでテストファイルのみ `noNonNullAssertion: off` 等

## 6. UI実装ルール（§6.6相当）

- ブレークポイント分離・z-index序列・アニメーション方針
- 例: DesktopSidebar z-40, Header z-30, BottomNav z-[60], モーダル z-[70] 等
- `backdrop-filter` 禁止（GPU無し環境での白フラッシュ対策）等の方針

## 7. ドキュメント運用（§6.7相当）— 活発リポジトリ準拠で復旧

- テンプレート同梱のドキュメント規約を既定とする
- 構成・命名規則・運用ルール: `docs/README.md`
- タスク進捗管理: `docs/task-list.md`（唯一の正本）— cod-web arena/01a0b161-cod-web準拠で復旧
- 仕様書: `docs/arch/`（どう作るか）— product, architecture, tech-stack, bootstrap, detector, cache, termux, adr
- 計画書: `docs/planning/`（_TEMPLATE.md形式）— 完了済みは complete/
- 調査: `docs/research/`（競合・技術調査）— cod-web arena準拠で復旧
- 監査: `docs/audit/`（差分・バグ）— DropMod準拠で復旧
- 完了レポート: `docs/planning/complete/`
- 運用: `docs/ops/`、設定例: `docs/examples/`（現在の機能）
- 以前「記録は削除」としたが、ユーザー指摘（arch/audit/planning/researchは必要）により復旧（2026-09-27調査）

## 8. 新規リポジトリ作成時のチェックリスト（活発リポジトリ準拠 — arch/audit/planning/research復旧）

- [ ] `AGENTS.md §6` にプロジェクト固有のルールを追記
- [ ] `.agent/skills/project-overview/SKILL.md` を作成（製品概要・技術スタック・現在の機能 + arch/planning/research構成）
- [ ] `README.md` をプロジェクト用に書き換え（技術スタック・セットアップ手順、現在の機能 + ドキュメント構成）
- [ ] `package.json` の `name`, `description`, `packageManager` を更新
- [ ] `.nvmrc` をNodeのLTSバージョンに更新
- [ ] `.github/workflows/ci.yml` をプロジェクト用に調整（Nodeバージョン・キャッシュ等）
- [ ] `docs/` は cod-web arena準拠で arch/ + planning/ + research/ + audit/ + ops/ + examples/ + task-list.md を保持 — 以前は削除していたが、活発リポジトリ調査により必要と判断し復旧
- [ ] ファイル名は短く正確、ハイフン最大1つ（例: `yaml-top.test.ts` OK、`yaml-utils-top-level.test.ts` NG）
