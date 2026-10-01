---
name: sandbox-constraints
description: Sandbox / ブラウザ・ネットワーク / GitHub App の恒常的制約と迂回策。環境トラブル時に参照。Use when encountering network, browser, or permission issues in sandbox.
---

# Sandbox Constraints — 環境制約と迂回策

> このスキルはSandbox環境（Arena等）の恒常的制約と、その迂回策をまとめたもの。
> 制約は「乗り越える」のではなく「迂回する」。修正対象ではない。

## 1. 恒常的制約一覧

| 制約 | 影響 | 対処 |
|---|---|---|
| **外部APIへの到達不可**（例: `api.example.com:443` に `ECONNRESET`） | `pnpm build` 時に `fetch failed` が出る、SSRデータが空 | exit codeが0なら成功扱い。ローカルではモックや空表示を許容。ユーザー環境では正常動作することを明記 |
| **Chromiumバイナリのinstall不可** | Playwright E2Eがローカルで実行できない | E2Eは「書けるが実行できない」としてCI上のみ実行。ローカルで無理に実行しようとしない |
| **sharpのnative build不可** | `next/image` のローカル最適化が動かない | `pnpm-workspace.yaml` で `sharp: false`。Vercelデプロイ後に有効化される。ローカルでは `unoptimized` |
| **nodejs.orgへの到達不可**（SSLエラー） | `nvm` や公式インストーラが使えない | npm registryの `node-linux-x64` パッケージから取得（`restore-env.sh` の手法） |
| **`.github/workflows/` に書き込み不可**（GitHub App権限制約） | CIワークフローを直接置けない | YAMLは `docs/ops/CI_WORKFLOW.yml` に保管し、ユーザーが手動で `.github/workflows/ci.yml` へ配置。PR本文で手順を案内 |
| **GitHub APIのrate limit** | `gh api` が403を返すことがある | リトライ + キャッシュ。`gh repo list` は `--limit` を付ける |

## 2. 具体的な迂回パターン

### ネットワーク依存の処理

- バイナリのpack/unpack、入力キュー、純粋関数はソケット非依存でVitestでテスト。
- `fetch` や `ws.send` の戻り値分岐はモック。実結合は「実環境検証待ち」としてタスクを分離。
- Coverageはbaselineとbefore/afterを記録し、数字だけのshallow testを避ける。

### 3D・Canvas・WebGL

- jsdomでCanvas/WebGLをレンダリングしない。DOMとシムを分離。
- ライブプレビュー（LIVE PREVIEW）で目視確認。シムはDOM/GPU非依存でテスト。

### 決定論

- `step` やコアロジックに乱数・時計・I/Oを入れない。同じ入力なら同じ出力のテストを書く。

## 3. 復旧手順（Sandbox再構築時）

Sandbox再構築を検知したら（`git log` が起点1件のみ / 大量削除+未追跡 / node_modules無）：

```bash
# 1. リモートの最新をfetch（ブランチ名は git branch --show-current で確認）
git fetch origin <現在のブランチ>

# 2. FETCH_HEADにワークツリーごとリセット（この場合のみ --hard 許可）
git reset --hard FETCH_HEAD

# 3. 依存を再構築
bash .agent/hooks/restore-env.sh
# または手動:
corepack enable pnpm
pnpm install --frozen-lockfile
```

復旧後は必ず `git log --oneline -5` と `pnpm test:unit` で健全性を確認してから作業再開。

## 4. 検証キットの運用（ytdl由来の良いパターン）

ユーザーに実行させる検証キットを書く時のUXルール：

- `?probe=1` のようなクエリで軽量な疎通確認から始める
- 1 fetchで完結する設計
- 外部リトライはキット側で吸収
- raw URL + 自己チェック行を必ず含める（ユーザーがコピペで実行できる）

## 5. 参考：restore-env.sh の仕組み

- `.nvmrc` のメジャー版を読み、現在と異なればnpm registryから `node-linux-x64` バイナリを取得して `/usr/local/bin/node` を置換
- `corepack enable pnpm` + `corepack prepare <packageManager> --activate`
- `pnpm install --frozen-lockfile`

パッケージマネージャが異なるプロジェクトでは手動2行（`corepack enable` + install）に置き換える。
