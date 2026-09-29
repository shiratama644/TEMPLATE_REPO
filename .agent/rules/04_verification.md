---
paths:
  - "package.json"
  - "pnpm-lock.yaml"
  - ".github/workflows/**"
  - "scripts/**"
  - "src/**"
  - "app/**"
  - "apps/**"
  - "packages/**"
---

# Rule 04: 検証・品質保証ルール

> 優先度: **HIGH** — 「動いた」で終わらせず、機械的に品質を担保する

## 1. 検証コマンドの実行（必須）

`package.json` に定義されたスクリプトのみを使用する（存在しないコマンドを捏造・実行しない）。

commit前に原則として以下の4種を全てPASSさせる：

```bash
pnpm typecheck   # 型チェック
pnpm lint        # Lint / Format
pnpm test:unit   # 単体テスト（watchモードではない）
pnpm build       # 本番ビルド
```

※ 実際のスクリプト名はプロジェクトの `package.json` を確認すること。
※ E2Eテストは実行環境によってはローカルで実行できないことがある（`AGENTS.md §6.2` の制約を確認）。実行できない場合はCI上のみ実行し、ローカルで無理に実行しようとしない。

### 各コマンドの注意

- **typecheck**: プロジェクトが複数tsconfigを持つ場合は全て対象にすること。
- **lint**: `0 error / 0 warning` まで。ignoreコメントの置き場所・自動生成ファイルの除外は `AGENTS.md §6.5` のルールに従う。
- **test:unit**: watchモード（`pnpm test` 等）ではない。必ず run相当のスクリプトを使う。
- **build**: 環境起因の既知エラー（外部APIへの接続失敗等）が出ても、exit codeが0であれば成功扱いで問題ない（既知事象は `AGENTS.md §6.2` に追記して引き継ぐ）。

## 2. エラー対応と品質維持

- エラー発生時はエラーメッセージやスタックトレースから根本原因を特定し、最小限の範囲で修正する。
- **テストを通すためだけの不正な修正は厳禁**：
  - テストの削除・スキップ・アサーションの緩和
  - 型エラーを回避するための安易な `any` 使用
  - Lintルールの勝手な無効化・エラーの握りつぶし
- **既存仕様の尊重**：既存テストが落ちた場合、「テストが間違っている」と即断せず、既存仕様を壊していないか確認する。

## 3. 既存バグの扱い

- **今回のタスクを妨げるバグ**：必要最小限の修正を行う。
- **無関係な既存バグ**：勝手に修正せず、ユーザーに報告する。
- バグ修正時は、可能であれば再発防止の回帰テスト（Regression Test）を追加する。

## 4. 完了前の機械検証チェックリスト

### (A) 検証コマンド全PASS

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
```

### (B) 意図しない差分の確認

```bash
git status --short
git diff --stat
# 狙いではないファイルが含まれていないかを目視
```

### (C) 機密情報の混入チェック

```bash
git diff --cached --name-only | grep -E "^\.env"
# → 出力が0件であること
```

### (D) ドキュメント整合性

- `docs/` に追加・削除があれば `docs/README.md` の目次が更新されているか
- タスクリストの証拠（コミットSHA / テスト件数 / 実測値）が記録されているか

## 5. テストファイル命名規則（公式ルール）

> **公式ルール**: テストファイルは `_tests_/` ディレクトリに同じディレクトリ構造で配置し、命名は `<name>.test.ts` 形式に統一する

### 命名規則

- **形式**: `<name>.test.ts` または `<name>.spec.ts` （`.test.ts` を推奨）
- **配置**: `_tests_/` に元のディレクトリ構造を維持して配置
  - 例: `src/index.ts` → `_tests_/src/index.test.ts`
  - 例: `scripts/lib/cache.ts` → `_tests_/scripts/lib/cache.test.ts` または `_tests_/scripts/cache.test.ts`
  - 例: 堅牢性テスト `robustness` → `_tests_/scripts/robustness.test.ts`
- **禁止**: `test-*.ts`, `*.test-*.ts`, `*_test.ts` 等の旧形式は使用しない
- **理由**: 
  - Vitest / Playwright のデフォルト `include` パターン `**/*.{test,spec}.ts` に準拠
  - `_tests_/` に集約することで、テンプレート本体 (`src/`, `scripts/`) とテストを分離し、新規リポジトリ作成時に `_tests_/` を削除すればクリーンな状態になる
  - 同じディレクトリ構造を維持することで、どのソースのテストかが一目で分かる

### 配置例

```
_tests_/
├── src/
│   └── index.test.ts          # src/index.ts のテスト
├── scripts/
│   ├── robustness.test.ts     # 堅牢性テスト
│   ├── auto-detect.test.ts    # 自動判定テスト
│   ├── cache-invalidation.test.ts
│   ├── new-repo.test.ts
│   ├── execute.test.ts
│   └── template-e2e.test.ts   # E2E自己展開テスト
└── e2e/
    └── *.e2e.test.ts          # Playwright E2E
```

### 検証

```bash
pnpm test:unit          # _tests_/src/*.test.ts が実行される
pnpm test:all-robustness # _tests_/scripts/*.test.ts が実行される
pnpm test:e2e:template  # E2Eテスト
```

## 6. 報告のテンプレート

作業完了時は以下で簡潔に報告：

1. **変更ファイル一覧**（パスのみ）
2. **検証結果**（typecheck/lint/test/build のPASS/FAIL + 件数）
3. **意図的に変えた点**（本当に変えたつもりの場所だけ）
4. **残課題・人間判断を求める事項**（あれば）
