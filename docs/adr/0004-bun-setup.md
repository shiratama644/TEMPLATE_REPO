# ADR-0004: Bun を検証とセットアップの入口にする

- 日付: 2026-10-26
- 状態: accepted
- 対応: `docs/planning/BUN_SETUP_PLAN.md`、BUNSETUP-1〜4

## 背景

Python の文書リンク・Mermaid・言語の 3 検査と、Python 製の pre-commit、Node フックが混在していた。初期設定は Agent の対話手順のみだった。ユーザーは Bun 前提で TypeScript に統一し、`full` のプリセット設計を参考に、対話式・非対話式 CLI と OS 別の依存案内を求めた。

## 決定

1. `package.json` と `bun.lock` を唯一の JavaScript/TypeScript 依存管理とし、`bun run check` で7ゲート（リンク、Mermaid、言語、指示品質、Biome、型、テスト）を実行する。互換 `make` ターゲットも Bun を呼ぶ。
2. 3 本の Python 検査を TypeScript に移植する。日本語文字の判定は Bun 管理の `iconv-lite` による EUC-JP/CP932 の往復変換で近似する。Python 版の全体走査結果と代表 fixture を比較する。
3. `full` のプリセットと機能マニフェストの**設計**を参考に新規 CLI を作る（古い pnpm/Node 24 版の大規模実装を一括取り込まない）。7 プリセット・17 機能の選択肢、Web と Python/Go/Rust テンプレート、差分プレビュー・バックアップ・冪等性を持たせる。
4. `--dry-run` は変更なし。非対話適用は `--yes --apply` の両方を要求する。既存の生成対象は保持し、`package.json` の更新はバックアップする。不要文書は**削除せず案内**する。
5. OS ツールのインストールは対話式でも**対象コマンドごとに yes を再入力**した時だけ実行する。`--yes` でも暗黙には実行しない。非対話式は手順の表示のみ。

## 代替案

- `full` の実装をそのまま取り込む: pnpm 依存と未使用の大きな品質ツール群が現在のテンプレートと衝突するため不採用。
- Python 製 pre-commit から TypeScript を呼ぶ: 「依存を Bun に統一」と矛盾するため不採用。
- `--yes` で apt を自動実行する: root 権限と外部副作用の境界を越えるため不採用。
- 文書を選択機能に応じて自動削除する: ユーザーデータとテンプレートの文書の区別が難しいため不採用。

## 影響と限界

- Bun がローカルと CI の前提となる。サンドボックス内には初期状態で Bun がなかったので、検証用バイナリをリポジトリ外に用意した。
- Python / Go / Rust **生成先アプリ本体**の依存は各言語標準のツールで扱う。Bun で Python パッケージを管理するとは主張しない。
- `iconv-lite` と Python codec の Unicode 対応表には差があり得る。代表 fixture と全体走査を比較し、差があれば修正する。
- Git フック導入は既存フックがあると拒否する。このサンドボックスの trailer フックは上書きしない。
- OS パッケージの実インストール、macOS/Windows/Termux の実機挙動、Python/Go/Rust の依存導入と各生成物の実ビルドは未検証。Web の TS/JS Vite・Next と Vite/Next monorepo は Linux で Bun install/build を実測した。
