# quality.md — テスト・品質アーキテクチャ

## 概要

このテンプレートはテスト・品質を網羅し、以下の機能を提供します。

## 品質レイヤー

```
L0: Unit (Vitest, coverage 100%, 88 files / 1088 tests)
L1: Property (fast-check, LRU, severity, license, automerge, a11yScore)
L2: Smoke (CLI --help, package.json scripts, src/index)
L3: E2E (Playwright, @a11y, @visual, @smoke)
L4: Mutation (Stryker, vitest runner, threshold 80/60/50)
L5: A11y (axe-core, playwright, critical filter)
L6: Visual (toHaveScreenshot, threshold 0.2, mobile/desktop)
L7: Benchmark (vitest bench + tinybench, compare, regression 10%)
L8: Static (type-coverage 99%, dep-cruiser, jscpd, knip, publint)
```

## ワークフロー一覧

### 1. Mutation (`mutation.yml`)

- **トリガー**: 週次 火曜3AM JST, 手動, `workflow_dispatch`
- **ツール**: `@stryker-mutator/core`, `vitest` runner, `typescript` checker
- **設定**: `stryker.config.json`
  - timeout 10s, thresholds high 80 / low 60 / break 50
  - ignore `bench/**`, `e2e/**`, `dist/**`
- **ローカル**:
  ```bash
  pnpm test:mutation
  pnpm test:mutation:ci
  ```
- **成果物**: `reports/mutation/` (14日), PRコメントでscore通知

### 2. A11y (`a11y.yml`)

- **トリガー**: PR, main push, 手動
- **ツール**: `@axe-core/playwright`, `playwright`
- **テスト**: `e2e/a11y.e2e.ts` @a11y タグ
  - homepage critical violations 0
  - heading-order, image-alt, button-name
- **ヘルパー**: `scripts/lib/a11y.ts`
  - `createA11yResult`, `checkA11yResult`, `formatA11yViolation`, `printA11yReport`
  - `A11Y_RULES` 定数
- **ローカル**:
  ```bash
  pnpm test:a11y
  pnpm a11y:check
  ```

### 3. Visual (`visual.yml`)

- **トリガー**: PR, main push, 手動
- **ツール**: Playwright `toHaveScreenshot`, `toMatchSnapshot`
- **テスト**: `e2e/visual.e2e.ts` @visual タグ
  - homepage, card, mobile 375x667, desktop 1280x720
  - threshold 0.2, maxDiffPixels 100
- **ヘルパー**: `scripts/lib/visual.ts`
  - `createVisualDiff`, `compareScreenshots` (Buffer len diff sim), `formatVisualDiff`
  - `DEFAULT_VISUAL_CONFIG`
- **ローカル**:
  ```bash
  pnpm test:visual
  pnpm test:visual:update
  ```

### 4. Benchmark (`benchmark.yml`)

- **トリガー**: PR, main push, 手動
- **ツール**: `vitest bench` + `tinybench`, `vitest.bench.config.ts`
- **ベンチ**: `bench/*.bench.ts`
  - `lru.bench.ts`: LruCache set/get/evict
  - `detector.bench.ts`: detectAll x100
  - `security.bench.ts`: scanFileForSecrets, checkLicenseCompatibility
- **ヘルパー**: `scripts/lib/bench.ts`
  - `runBenchTasks` (tinybench → fallback performance.now)
  - `printBenchResults`, `checkForRegressions` (threshold 10%)
  - `parseArgs` (--compare, --verbose, --help)
  - VITEST envで time 50ms / iterations 5 に短縮 (CI高速化)
- **比較**: baseline vs current, regression検出
- **ローカル**:
  ```bash
  pnpm bench
  pnpm bench:compare
  ```

### 5. Quality (`quality.yml`)

- **トリガー**: PR, main push, 手動
- **ジョブ**:
  - `property-tests`: fast-check 100 runs, @property tag
  - `smoke-tests`: CLI, package.json, src/index @smoke
  - `type-coverage`: `type-coverage` 99% threshold
  - `dep-checks`: `dependency-cruiser` + `jscpd` + `knip` + `publint`
- **設定**:
  - `dependency-cruiser.config.cjs`: no-circular, no-orphans, not-to-test, no-non-package-json, not-to-dev-deps, no-scripts-to-src
  - `jscpd.config.json`: threshold 5%, minLines 10, minTokens 50, ignore test/dist

### 6. 既存CI統合

- `ci.yml` の `static-checks` に coverage 100% 閾値 + `security:check` が含まれる
- `check.ts` に全品質ゲート 13タスクが含まれる: 8必須(blocking: lint, typecheck, coverage, build, determinism, cspell, knip, unit) + 2任意(non-blocking: publint, size-limit) + 3 infra (install先行, e2e:list, security:check)
  - publint / size-limit は警告のみ（exit code無視、CIでもnon-blocking）

## ライブラリ (`scripts/lib/quality.ts`)

- **型**:
  - `MutationScore`: totalMutants, killed, survived, timedOut, noCoverage, score
  - `A11yViolation` / `A11yResult`: impact, rule, description, nodes, criticalCount
  - `VisualDiff`: name, diffRatio, passed, baseline, current
  - `BenchmarkResult`: name, hz, mean, min, max, p50, p75, p99, samples
  - `PropertyTestResult`, `TypeCoverage`, `DepCruiseViolation`, `JscpdResult`
- **関数**:
  - `calculateMutationScore(killed, total)` → 0-100
  - `isMutationScorePassing(score, threshold=80)`
  - `calculateA11yScore(violations)` → 100 - weighted
  - `filterCriticalViolations(violations)` → critical/seriousのみ
  - `calculateVisualDiffScore(diffs)` → passed/total*100
  - `compareBenchmarks(current, baseline)` → percent, regression (threshold 10%)
  - `formatBenchmarkResult(r)` → "name: xxx ops/sec (mean ms)"
  - `parseTypeCoverageReport(text)` → covered/total/percent
  - `calculateDuplicationRate(dups, totalLines)`
  - `isDependencyCruiserPassing(violations, allowed)`
  - `parseDepCruiserOutput(output)` → JSON or text fallback

## テスト構成

```
_tests_/
├── src/
│   ├── lib/
│   │   ├── quality.test.ts (19 tests)
│   │   ├── a11y.test.ts (7 tests)
│   │   ├── visual.test.ts (7 tests)
│   │   ├── bench.test.ts (5 tests, tinybench fast path)
│   │   └── ...
│   ├── utils/
│   │   └── property.test.ts (fast-check, 7 property tests)
│   └── smoke.test.ts (@smoke)
└── ...
e2e/
├── a11y.e2e.ts (@a11y, 4 tests)
└── visual.e2e.ts (@visual, 4 tests)
bench/
├── lru.bench.ts
├── detector.bench.ts
└── security.bench.ts
```

- **命名規則**: `<name>.test.ts` (ハイフン最大1つ)
- **配置**: `_tests_/` に元と同じディレクトリ構造
- **タグ**: `@a11y`, `@visual`, `@smoke`, `@property`

## ローカル実行

```bash
# 全品質ゲート
pnpm check

# 個別
pnpm test:unit              # 88 files, 1088 tests
pnpm test:coverage          # 100% threshold
pnpm test:mutation          # Stryker
pnpm test:a11y              # Playwright @a11y
pnpm test:visual            # Playwright @visual
pnpm bench                  # tinybench
pnpm bench:compare          # 比較
pnpm type-coverage          # 99%
pnpm dep-cruise             # 依存境界
pnpm jscpd                  # 重複検出
pnpm quality:all            # 全品質
```

## カバレッジ戦略

- `v8` provider, 100% threshold (stmts, branch, funcs, lines)
- `/* v8 ignore */` 使用箇所:
  - `a11y.ts`: icon ternary (表示用)
  - `bench.ts`: tinybench fallback (v8 ignore start/stop), result null check, throughput/latency ||0 フォールバック, isTest ternary, parseArgs
  - `quality.ts`: weights fallback, base.mean===0, killed||0 グループ, file.mutants||[], simple format fallback
- `bench.ts` は `VITEST` 環境で time 50ms / iterations 5 に短縮し、テストタイムアウトを回避

## DX改善 (2026-09-28)

- `check.ts` の `test:e2e:list` を `scripts/check-e2e.ts` に分離
  - Playwright browsers未インストール時はファイル一覧にフォールバック
  - `pnpm check` がsandboxでも成功するように
- `bench.ts` の `runBenchTasks` に `isTest` 分岐追加
- `vitest.bench.config.ts` を `benchmark` キーに修正 (vitest 5)
- `cspell.json` に品質関連単語追加 (dups, depcruise, tinybench, jscpd, fastcheck, stryker, axe, a11y, toHaveScreenshot, lru, benchmarks, hz)

## 今後の拡張

- [ ] Stryker dashboard連携 (private dashboard)
- [ ] A11y の自動修正提案 (axe-core + LLM)
- [ ] Visual のベースライン自動更新 (mainブランチ比較)
- [ ] Benchmark の履歴グラフ (GitHub Pages)
- [ ] type-coverage 100% への段階的引き上げ
- [ ] dep-cruiser ルールの追加 (layer境界の厳格化)

## 参考

- [Stryker](https://stryker-mutator.io/)
- [axe-core](https://github.com/dequelabs/axe-core)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Vitest Benchmark](https://vitest.dev/guide/benchmark)
- [tinybench](https://github.com/tinylibs/tinybench)
- [fast-check](https://github.com/dubzzz/fast-check)
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
- [jscpd](https://github.com/kucherenko/jscpd)
