# テンプレート移行完了レポート V4 — execute.ts機能差分スキップ + check.ts品質ゲート調整

**作成日**: 2026-09-27
**指示**: execute.tsはinstall->build(差分なかったらbuildキャンセルしてstart)->start(もしサーバーも起動する必要なら色分けで)だけですぐ実行できる形です。check-all.tsは品質ゲートです。check-all.tsはcheck.tsに改名して現在の構成に合わせて調整してください。 / 差分なしというのは機能に影響が来る部分のみ。つまり、コメントの追加などのことを指します。
**ブランチ**: `arena/01a0ddb4-template-repo`

---

## 1. execute.tsの再構築（すぐ実行できる形）

### 1.1 ユーザー指示の解釈

- **install -> build -> start** の3段階で、すぐ実行できる形
- **buildは差分がなければキャンセルしてstart**: 機能に影響する差分がなければbuildスキップ
- **差分なし = 機能に影響する部分のみ**: コメント追加、空白のみ、ドキュメントのみの変更は差分なし扱い
- **startはサーバーも起動する必要なら色分けで**: 並列プロセスを色分けログで出力

### 1.2 実装内容

#### 機能的差分判定ロジック

```ts
// 機能に影響しないパスのパターン
const NON_FUNCTIONAL_PATH_PATTERNS = [
  /^docs\//,
  /^\.agent\//,
  /^\.github\//,
  /^\.husky\//,
  /^\.vscode\//,
  /^README\.md$/,
  /^AGENTS\.md$/,
  /\.md$/,
  /^\.editorconfig$/,
  /^cspell\.json$/,
  /^knip\.json$/,
  /^commitlint\.config\.(js|cjs|mjs)$/,
  /^\.gitignore$/,
  /^\.nvmrc$/,
  /^LICENSE$/,
];

// 機能に影響するパスのパターン
const FUNCTIONAL_PATH_PATTERNS = [
  /^src\//,
  /^packages\//,
  /^apps\//,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^tsconfig/,
  /^biome\.json$/,
  /^vite\.config/,
  /^next\.config/,
  /^vitest\.config/,
  /^scripts\//,
];
```

- `isNonFunctionalPath(file)`: 上記NON_FUNCTIONALに該当するか
- `isFunctionalPath(file)`: 上記FUNCTIONALに該当するか

#### コメントのみ差分判定

```ts
function isCommentOnlyDiff(diffText: string): boolean {
  const lines = diffText.split('\n');
  const addedOrRemoved = lines.filter(
    (line) => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---'),
  );

  if (addedOrRemoved.length === 0) return true;

  for (const line of addedOrRemoved) {
    const content = line.slice(1).trim();
    if (content.length === 0) continue; // 空白のみ

    const commentPatterns = [
      /^\/\/.*$/,           // // コメント
      /^\/\*.*\*\/$/,       // /* ... */ 単行
      /^\/\*.*$/,           // /* 開始
      /^\*.*$/,             // * JSDoc中間
      /^\*\/$/,             // */ 終了
      /^#.*$/,              // # シェル/YAMLコメント
      /^<!--.*-->$/,        // HTMLコメント
      /^\s*\*.*$/,          // インデント付き * コメント
    ];

    const isComment = commentPatterns.some((re) => re.test(content));
    if (!isComment) return false; // コメントでない変更が1つでもあれば機能的差分あり
  }

  return true; // すべてコメント/空白のみ
}
```

- `+` / `-` で始まる行（追加/削除）のみをチェック
- 空白のみ、コメントのみ（//, /* */, *, #, <!-- -->等）は非機能
- コメントでない変更が1つでもあれば機能的差分あり

#### 機能的差分チェック

```ts
function hasFunctionalDiff(): boolean {
  if (!hasBuildOutput()) return true; // 成果物なし → build必須

  const changedFiles = getChangedFiles(); // git diff --name-only HEAD
  if (changedFiles.length === 0) return false; // 差分なし → skip

  const functionalFiles = changedFiles.filter((f) => isFunctionalPath(f));
  const nonFunctionalOnly = changedFiles.every((f) => isNonFunctionalPath(f) || !isFunctionalPath(f));

  if (functionalFiles.length === 0 && nonFunctionalOnly) {
    // すべて非機能（docs, .agent, *.md等）→ skip
    return false;
  }

  // 機能的ファイルがある場合、コメントのみかどうかを詳細チェック
  let hasFunctional = false;
  for (const file of functionalFiles) {
    const diff = getDiffForFile(file); // git diff HEAD -- file
    const commentOnly = isCommentOnlyDiff(diff);
    if (!commentOnly) hasFunctional = true;
  }

  return hasFunctional;
}
```

- 成果物（dist, .next, build, out, .output等）がなければbuild必須
- `git diff --name-only HEAD` で変更ファイル取得
- すべて非機能パス（docs, .agent, *.md等）ならbuildスキップ
- 機能的パスがある場合、各ファイルのdiffを取得しコメントのみか判定
- コメント/空白のみならbuildスキップ、機能的変更ありならbuild必須

#### 実行フロー

```ts
async function main() {
  // 1. Install
  await runCommand(INSTALL, ['pnpm', 'install', '--frozen-lockfile']);

  // 2. Build (機能的差分チェック)
  const needBuild = hasFunctionalDiff();
  if (!needBuild) {
    logLine(BUILD, '✔ No functional diff, skipping build (差分なし、buildキャンセルしてstart)');
  } else {
    await runCommand(BUILD, ['pnpm', 'build']);
  }

  // 3. Parallel processes (色分け)
  for (const p of EXEC_CONFIG.parallel) {
    spawnProcess(p.tag, p.fg, p.cmd, p.cwd);
  }
  // Graceful shutdown (SIGINT/SIGTERM)
}
```

- **色分け**: INSTALL(黄), BUILD(シアン), SERVER(緑), CLIENT(マゼンタ), DEV(緑)等、ANSIエスケープでタグ付け
- **並列起動**: `EXEC_CONFIG.parallel` で定義、例: server + client
- **Graceful shutdown**: SIGINT/SIGTERMで子プロセスをSIGTERM→2秒後SIGKILL

#### 検証

```bash
# 成果物なし → build必須
mkdir -p dist; touch dist/dummy.js  # 成果物ありに
git diff --name-only HEAD  # 空 → No diff → skip
# コメントのみ変更
echo "// comment" >> src/file.ts
git diff HEAD -- src/file.ts  # // commentのみ → commentOnly=true → skip
# 機能的変更
echo "const x = 1;" >> src/file.ts
git diff HEAD -- src/file.ts  # const x = 1; → functional → build必須
```

### 1.3 修正したlint警告

- `readdirSync, statSync` 未使用 → 削除（existsSyncのみ使用）
- `isStderr` 未使用パラメータ → `_isStderr` に改名せず、引数自体を削除し `pipeStream` に簡素化

## 2. check.tsの調整（品質ゲート）

### 2.1 現状の構成に合わせた調整

- **改名**: `check-all.ts` → `check.ts`（ユーザー指示、V2で実施済み）
- **現在の構成**（package.json scripts）:
  - `typecheck`, `lint`, `check:determinism`, `cspell`, `knip`, `test:unit`, `test:coverage`, `build`, `test:e2e -- --list`
- **check.tsのタスク**（10タスク、install先行→残り9並列）:
  ```ts
  const tasks: Task[] = [
    { id: 'install', label: 'pnpm install --frozen-lockfile', cmd: ['pnpm', 'install', '--frozen-lockfile'], logFile: '01-install.log' },
    { id: 'lint', label: 'biome lint', cmd: ['pnpm', 'lint'], logFile: '02-lint.log' },
    { id: 'check:determinism', label: 'determinism guard', cmd: ['pnpm', 'check:determinism'], logFile: '03-check-determinism.log' },
    { id: 'cspell', label: 'cspell (spell check)', cmd: ['pnpm', 'cspell'], logFile: '04-cspell.log' },
    { id: 'knip', label: 'knip (unused code)', cmd: ['pnpm', 'knip'], logFile: '05-knip.log' },
    { id: 'typecheck', label: 'typecheck (tsc --noEmit)', cmd: ['pnpm', 'typecheck'], logFile: '06-typecheck.log' },
    { id: 'test:unit', label: 'vitest run', cmd: ['pnpm', 'test:unit'], logFile: '07-test-unit.log' },
    { id: 'test:coverage', label: 'vitest coverage (threshold 85%)', cmd: ['pnpm', 'test:coverage'], logFile: '08-test-coverage.log' },
    { id: 'build', label: 'build (tsc + vite)', cmd: ['pnpm', 'build'], logFile: '09-build.log' },
    { id: 'test:e2e:list', label: 'playwright e2e discovery --list', cmd: ['pnpm', 'test:e2e', '--', '--list'], logFile: '10-e2e-list.log' },
  ];
  ```
- **速度順**: lint(1s) → determinism(0.3s) → cspell(1s) → knip(1s) → typecheck(3-5s) → unit(2-5s) → coverage(5-10s) → build(3-10s) → e2e --list(1s)
- **abort対応**: 1つでも失敗したら残りをabort、setsidでプロセスグループkill、hard timeout 10分、logs/summary.log/json保存
- **Node対応**: Bun globalはglobalThis経由でチェック、Nodeでも動作

### 2.2 検証

```bash
pnpm check  # install先行→残り9並列、logs/に保存
cat logs/summary.log
cat logs/summary.json
```

## 3. 検証結果

```bash
pnpm typecheck         # OK (0 error, TS 6.0.3)
pnpm lint              # OK (13 files, 0 warnings) - 以前の2 warningsを修正
pnpm check:determinism # ✅ passed
pnpm cspell            # OK (20 files, 0 issues)
pnpm knip              # OK (0 issues)
pnpm test:unit         # OK (No test files, Vitest 5.0.2)
pnpm build             # OK
pnpm exec biome lint . --diagnostic-level=warn  # 0 warnings (以前は2 warnings)

# execute.ts dry run
node --experimental-strip-types scripts/execute.ts
# - 成果物なし → build必須 → pnpm build → DEV起動
# - 成果物あり + 差分なし → No diff → Skipping build (差分なし、buildキャンセルしてstart) → DEV起動
# - コメントのみ変更 → comment/whitespace only → Skipping build
# - 機能的変更 → functional change → build required → build → DEV起動
```

## 4. 今後の使い方

### execute.ts（すぐ実行できる形）

```bash
pnpm start
# または
node --experimental-strip-types scripts/execute.ts
```

- **install**: `pnpm install --frozen-lockfile`
- **build**: 機能的差分がなければスキップ（コメントのみ、空白のみ、ドキュメントのみは差分なし扱い）
  - 差分あり or 成果物なし → `pnpm build`
  - 差分なし → `✔ No functional diff, skipping build (差分なし、buildキャンセルしてstart)`
- **start**: `EXEC_CONFIG.parallel` で定義されたプロセスを並列起動、色分けログ、Graceful shutdown

### check.ts（品質ゲート）

```bash
pnpm check
# または
node --experimental-strip-types scripts/check.ts
```

- **install先行** → 残り9タスク並列（lint/determinism/cspell/knip/typecheck/unit/coverage/build/e2e --list）
- **abort対応**: 1つ失敗したら残りをabort
- **ログ保存**: `logs/` に `01-*.log` ~ `10-*.log` + `summary.log` + `summary.json`

## 5. 参考リンク

- cod-web最新arena execute.ts: https://github.com/shiratama644/cod-web/blob/arena/01a0b161-cod-web/scripts/execute.ts
- cod-web最新arena check-all.ts: https://github.com/shiratama644/cod-web/blob/arena/01a0b161-cod-web/scripts/check-all.ts
- Conventional Commits: https://www.conventionalcommits.org/
- Husky v9: https://typicode.github.io/husky/
