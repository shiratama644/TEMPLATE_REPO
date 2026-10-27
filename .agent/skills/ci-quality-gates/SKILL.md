---
name: ci-quality-gates
description: Bun の検証を手元・Git フック・CI の同じ入口に揃え、TypeScript の検査と安全なセットアップを維持するための手順。
---

# CI Quality Gates — Bun の共通入口

## 原則

- **検証の正本は `bun run check`**（`make check` は互換入口）。CI も同じコマンドを使う。
- `bun install --frozen-lockfile` で `bun.lock` の版を固定し、Biome・TypeScript・iconv-lite・agents-md-lint を Bun で管理する。
- プロジェクト固有の検証を増やす際は `AGENTS.md §6.1` に記録し、`scripts/check.ts` のゲートへ追加してから CI を確認する。
- **負のテスト**で違反時に止まり、正常系で通ることを確かめる。失敗を SKIP で恒常的に回避しない。

## 検証の順序

| 段階 | コマンド / 対象 |
| :--- | :--- |
| 文書 | `bun run links`、`bun run mermaid` |
| 言語 | `bun run lang`（日本語・英語、コミットメッセージは `.githooks/commit-msg`） |
| 指示 | `bun run agents`（上流 CLI の symlink no-op を避け、実体を起動） |
| コード | `bun x biome check .`、`bun run typecheck` |
| 回帰 | `bun test`（異常 fixture と CLI の非破壊性を含む） |
| 秘密情報 | CI の gitleaks ジョブ（ローカルでは秘密情報を commit しない） |

## 構成

| ファイル | 役割 |
| :--- | :--- |
| `scripts/check.ts` | すべての検査の入口。失敗時は exit 1 |
| `scripts/check_*.ts` | 文書・言語・品質の検査（Bun / TypeScript） |
| `package.json` / `bun.lock` | ランタイム・依存・検証コマンドの正本 |
| `.githooks/` | `pre-commit` で `bun run check`、`commit-msg` で言語と Conventional Commits |
| `.github/workflows/ci.yml` | Bun の check + gitleaks |
| `.github/workflows/release.yml` | Bun の check 後にタグ付きリリース |
| `.github/workflows/dependency-review.yml` | Dependency graph が有効なときの PR 差分検査 |

`bun run hooks:install` は Git の `core.hooksPath` を設定する。**既存の commit-msg / pre-commit フックがある場合は停止**し、手動で統合する。この作業環境の trailer フックは上書きしない。

## 派生プロジェクトに固有の検証を追加する

1. `AGENTS.md §6.1` に実在するコマンドを記録する。
2. `package.json` の script を定義し、`scripts/check.ts` に追加する。
3. 成功・失敗 fixture を `tests/` に追加して `bun run check` で確認する。
4. CI 上でも `bun install --frozen-lockfile` → `bun run check` を確かめる。OS 固有の検証が実行不能なら理由を報告する。

## よくある失敗

| 症状 | 対処 |
| :--- | :--- |
| Bun がない | CLI の前提として Bun を導入。検証できない場合は未実施と報告 |
| `bun install --frozen-lockfile` が失敗 | `package.json` と `bun.lock` を揃え、意図した依存変更だけを commit |
| Biome が失敗 | ソースの差分を確認し `bun run format` で修正して再検証 |
| 既存の Git フックがある | `hooks:install` が止まるのが正しい。既存の処理を壊さず手動で統合 |
| gitleaks が手元にない | CI の secrets ジョブを確認。未実施を PASS と書かない |

## 関連

- [`project-init`](../project-init/SKILL.md): 対話式 CLI または Agent の計画承認。
- [`verification-before-completion`](../verification-before-completion/SKILL.md): 完了前の検証。
- [`sandbox-constraints`](../sandbox-constraints/SKILL.md): 実行不能な検証の扱い。
