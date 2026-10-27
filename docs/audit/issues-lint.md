# 発見した問題: `agents-md-lint@1.0.1` が symlink 経由で no-op になる

> 記録日: 2026-10-26 / 対応状況: **本リポジトリは回避済み・上流へは未報告**（投稿用文面は §6 に用意）
> 判断と回避策の正本: [`../adr/0002-agents-md-lint.md`](../adr/0002-agents-md-lint.md) / 対応 task-list ID: `LANGGATE-2`
> 本ファイルは**時点の事実**として扱う（`./index.md` の運用ルール）。上流が修正したら新記録を追加する。

## 1. 発見経緯

`agents-md-lint` を検証ゲートに追加する作業（AGENTSYNC-2）で、**負のテスト**として上限を超える
フィクスチャ（83,603 B の `AGENTS.md`）を作り「error が出て exit 1 になるはず」を確認しようとしたところ、
**何も出力せず exit 0** だった。ゲートが緑なのに何も守っていない状態だったので原因を追跡し、
bin（symlink）経由と実体（`dist/cli.js`）経由の挙動差として切り分けた。

負のテストを書いていなければ、この不具合は「ゲートが常に PASS する」という形で静かに残り続けていた。

## 2. 影響

- npm が作る bin は**必ず symlink**（`node_modules/.bin/agents-md-lint` → `../agents-md-lint/dist/cli.js`）。
  したがって `npx`・`npm exec`・ローカル `node_modules/.bin`・`npm i -g`・pre-commit の `language: node` の
  **すべての通常の起動経路が no-op** になる。
- 上流自身の GitHub Action も `action.yml` の 39 行目で `npx --yes agents-md-lint "${ARGS[@]}"` を使うため、
  **同じ影響下**にある。CI では「検査が無い」より悪く、**検査していないのに成功を報告する**。
- 違反ファイルでも正常ファイルでも出力は 0 バイト（§3 の E・F 行）。つまり「静かに合格した」のではなく
  **一度も実行されていない**。

## 3. 実測（再現データ）

`/tmp/repro` に 90,028 B の `AGENTS.md`（`XP-007` error になるはず）を置いて実測した。

| # | 起動方法 | `AGENTS.md` | exit | 出力バイト数 |
|---|---|---|---|---|
| A | `npx --yes agents-md-lint` | 90,028 B（error 1 件） | `0` | **0** |
| B | npm bin symlink | 90,028 B（error 1 件） | `0` | **0** |
| C | `node <package>/dist/cli.js` | 同じファイル | `1` | 928 |
| D | `node $(readlink -f "$(command -v agents-md-lint)")` | 同じファイル | `1` | 928 |
| E | npm bin symlink | 正常なファイル（error 0） | `0` | **0** |
| F | `node <package>/dist/cli.js` | 同じ正常ファイル | `0` | 612 |

環境: `agents-md-lint` 1.0.1（`type: module`、`bin: {"agents-md-lint": "dist/cli.js"}`、`engines: node >=18`）、
Node.js v22.22.3、npm 10.9.8、Linux x86_64。

`node --preserve-symlinks-main <symlink>` は回避策にならない（`ERR_MODULE_NOT_FOUND`、
`node:internal/modules/esm/resolve:275`、exit 1）。

## 4. 原因

`dist/cli.js`（1.0.1）の 333〜345 行目:

```js
function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
}
if (isMainModule()) {
  run(process.argv.slice(2)).then((code) => process.exit(code)).catch(/* … */);
}
```

Node の ESM ローダは `import.meta.url` を**モジュールの realpath** から解決する一方、`process.argv[1]` は
起動に使ったパス（symlink）のまま。よって両者は一致しない:

```
pathToFileURL(process.argv[1]).href = file:///…/node_modules/.bin/agents-md-lint
import.meta.url                     = file:///…/node_modules/agents-md-lint/dist/cli.js
```

`isMainModule()` が `false` を返し、`run()` が呼ばれないまま process が正常終了する（exit 0・無出力）。

修正案は §6 の文面に 4 つ挙げた（realpath 解決 / 両側 realpath 比較 / `import.meta.filename` /
ガード自体の除去）と、回帰テストの提案。

## 5. 対応状況

| 対象 | 状態 | 内容 |
|---|---|---|
| 本リポジトリ | **回避済み** | `.pre-commit-config.yaml` の `entry` を `readlink -f` で実体を解決して `node` で起動する形にし、バグの注記を書いた。`make agents` で実行。負のテストの手順は `.agent/skills/agents-md-authoring/SKILL.md` §7 に残した |
| 上流 | **未報告** | 2026-10-26 に `gh issue create --repo Taiizor/agents-md-cookbook` を実行したが `GraphQL: Resource not accessible by integration (createIssue)` で拒否された。この環境の GitHub 接続（`gh api /user` = `shiratama644`）は `shiratama644/TEMPLATE_REPO` に限られ、**第三者リポジトリへの issue 起票権限がない**。上流は issues 有効・未解決 issue 0 件・重複 issue なし（全 13 件は dependabot と feature で、いずれも closed）を確認済み |

**次のアクション**: リポジトリ所有者が §6 の文面を
<https://github.com/Taiizor/agents-md-cookbook/issues/new> にそのまま投稿する。
上流が修正版を公開したら、`entry` を `agents-md-lint --root .` に戻し、`make agents` と負のテストを再実行する。

## 6. 上流へ投稿する文面（英語・そのままコピーして使える）

タイトル:

````text
bug(lint): CLI exits 0 with no output when invoked through the npm bin symlink (isMainModule realpath mismatch)
````

本文:

````markdown
## Summary

`agents-md-lint` exits `0` and prints **nothing at all** when it is launched through the npm `bin` symlink —
which is how every normal installation invokes it (`npx`, `npm exec`, `node_modules/.bin/…`, `npm i -g`,
pre-commit `language: node`). The linter never runs, so any `AGENTS.md` — including one that violates hard
limits — passes silently.

This also affects this repository's own GitHub Action, because `action.yml` calls
`npx --yes agents-md-lint "${ARGS[@]}"` (line 39).

## Environment

- `agents-md-lint`: **1.0.1** (npm, `dist-tags.latest`), `type: module`, `bin: { "agents-md-lint": "dist/cli.js" }`
- Node.js: **v22.22.3** (`engines: node >= 18`)
- npm: 10.9.8
- OS: Linux (x86_64)

## Reproduction

```sh
mkdir repro && cd repro
# AGENTS.md that is 90,028 bytes -> should be XP-007 error (32,768-byte Codex cap)
npm install agents-md-lint@1.0.1

npx --yes agents-md-lint --root .            # (A) no output, exit 0
./node_modules/.bin/agents-md-lint --root .  # (B) no output, exit 0
node ./node_modules/agents-md-lint/dist/cli.js --root .   # (C) reports the error, exit 1
```

Measured (stdout+stderr byte count and exit code):

| # | Invocation | `AGENTS.md` | exit | output bytes |
|---|---|---|---|---|
| A | `npx --yes agents-md-lint` | 90,028 B (1 error `XP-007`) | `0` | **0** |
| B | npm bin symlink | 90,028 B (1 error `XP-007`) | `0` | **0** |
| C | `node <package>/dist/cli.js` | same file | `1` | 928 |
| D | `node $(readlink -f "$(command -v agents-md-lint)")` | same file | `1` | 928 |
| E | npm bin symlink | clean file (no errors) | `0` | **0** |
| F | `node <package>/dist/cli.js` | same clean file | `0` | 612 |

Row **E** is the decisive one: even for a *clean* file, where the linter normally prints a report
(row F, 612 bytes), the symlinked bin prints nothing. So this is not "lint passed quietly" —
`run()` is never called.

## Root cause

`dist/cli.js` (1.0.1), lines 333-345:

```js
function isMainModule() {
  const entry = process.argv[1];
  if (!entry)
    return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
}
if (isMainModule()) {
  run(process.argv.slice(2)).then((code) => process.exit(code)).catch(/* ... */);
}
```

Node's ESM loader resolves `import.meta.url` from the **realpath** of the module, but `process.argv[1]`
keeps the path that was used to invoke it — the symlink. The two never match:

```
pathToFileURL(process.argv[1]).href
  = file:///…/repro/node_modules/.bin/agents-md-lint
import.meta.url
  = file:///…/repro/node_modules/agents-md-lint/dist/cli.js
```

`npm` always creates `node_modules/.bin/<name>` as a symlink to the `bin` target (and a shim on Windows),
so this code path is taken for **every** normal installation, not just unusual setups.

## Suggested fix

Resolve the realpath before comparing:

```js
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}
```

Alternatives: compare `realpathSync(fileURLToPath(import.meta.url))` with `realpathSync(entry)`; use
`import.meta.filename` (Node >= 20.11) with the same realpath handling; or, since `dist/cli.js` is only
ever published as the bin entry, drop the guard and always call `run()`.

A regression test worth adding: spawn the bin **through its symlink path** and assert that stdout is
non-empty for a fixture that triggers an error (and that the exit code is `1`).

## Note: `--preserve-symlinks-main` is not a workaround

```sh
node --preserve-symlinks-main ./node_modules/.bin/agents-md-lint --root .
# -> ERR_MODULE_NOT_FOUND (node:internal/modules/esm/resolve:275), exit 1
```

It changes which path stays unresolved and breaks module resolution instead.

## Workaround we currently use

In `pre-commit` we bypass the symlink and start Node on the resolved file:

```yaml
- id: agents-md-lint
  entry: sh -c 'exec node "$(readlink -f "$(command -v agents-md-lint)")" --root . "$@"' --
  language: node
  additional_dependencies: ["agents-md-lint@1.0.1"]
```

We will revert to a plain `agents-md-lint --root .` entry once a fixed version is published.

## Impact

Any user who installs the package normally gets a **green check that lints nothing**. In CI this is worse
than a missing check, because it actively reports success. We found this while adding the linter as a
quality gate and writing a negative test (an 83 KB `AGENTS.md` fixture that must fail) — the fixture
passed, which is what exposed the bug.
````
