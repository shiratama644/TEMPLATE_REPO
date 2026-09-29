# engineering.md — エンジニアリング規約

## 決定論

- **純粋関数**: 副作用を持たず、同じ入力で同じ出力を返す
- **禁止API**: `Math.random()`, `Date.now()`, `setTimeout` の乱用は `check-determinism` で検出
- **検証**: `pnpm run check:determinism` で決定論違反を検出

## テスト

- **配置**: `_tests_/` にソースと同じディレクトリ構造
- **命名**: `<name>.test.ts`（ハイフン最大1つ、短く正確）
- **カバレッジ**: 100% (statements/branches/functions/lines) — `src/` + `scripts/lib/` 10ファイル
- **意味あるテスト**: ハンドラー分離・ファサード分離・モック戦略・threshold ratchet

```bash
pnpm test:coverage  # 100% 必須
pnpm test:unit      # 単体テスト
pnpm test:e2e:list  # E2E存在確認
```

## 性能予算

- **size-limit**: ライブラリサイズ制限（`size-limit` + `@size-limit/preset-small-lib`）
- **ゼロアロケーション**: ホットパスではGC削減（`zero-alloc` スキル参照）
- **キャッシュ**: `scripts/lib/cache.ts` でハッシュベーススキップ

## セキュリティ

- **機密ファイル**: `.env` はGit管理外、`verify-docs.ts` でステージング検出
- **依存**: `pnpm audit` + Renovate自動更新
- **入力検証**: `src/utils/validation.ts` で `isNpmPackageName`, `isGithubOwner`, `isSemver` 等
- **innerHTML/eval禁止**: 検索で検出、Biome lintで警告

## 禁止事項

- `src/` 配下を無条件で削除・上書きしない（`engine.ts` 保護）
- 過去ログ（`.agent/logs/`）を一括置換・リネーム対象に含めない（AGENTS.md §8.6）
- ファイル名は短く正確、ハイフン最大1つ

## 品質ゲート

`pnpm check` 13タスク（8必須 blocking + 2任意 non-blocking + 3 infra）:

**必須 8 gates (blocking):**
1. `lint` — Biome lint（zero-alloc/memory-leak含む、performanceルールerror）
2. `check:determinism` — 決定論違反 + filename hyphen max1 + zero-alloc/memory-leak
3. `cspell` — スペルチェック（全ファイル、md以外も）
4. `knip` — 未使用ファイル/依存検出（`KNIP_DISABLE_RAW_TRANSFER=1`）
5. `typecheck` — tsc（pre-commitでもblocking）
6. `test:unit` — Vitest単体（_tests_/のみ）
7. `test:coverage` — カバレッジ100%
8. `build` — ビルド

**任意 2 gates (non-blocking, warningのみ):**
9. `publint` — package.json公開チェック（CIでもnon-blocking）
10. `size-limit` — サイズ制限 10kB（CIでもnon-blocking）

**Infra 3 tasks:**
11. `install` — 依存インストール（先行実行）
12. `test:e2e:list` — E2E存在確認（browser未インストール時はfallback）
13. `security:check` — セキュリティ統合チェック（secret/dependency）

**依存境界:** `dependency-cruiser` で `src→scripts`禁止、`scripts→src`禁止、`docs→code`禁止、`_tests_→e2e/bench`禁止（warn）を強制
