---
name: ci-quality-gates
description: Bun の検証を手元・Git フック・CI の同じ入口に揃え、TypeScript の検査と安全なセットアップを維持するための手順。
---

# CI Quality Gates — Bun の共通入口

## 原則

- **検証の正本は `bun run check`**（`make check` は互換入口）。CI も同じコマンドを使う。
- `bun install --frozen-lockfile` で `bun.lock` の版を固定し、Biome・TypeScript・iconv-lite・agents-md-lint を Bun で管理する。
- プロジェクト固有の検証を増やす際は `AGENTS.md §6.1` に記録し、`scripts/check.ts` のゲートへ追加してから CI を確認する。
- **負のテスト**で違反時に止まり、正常系で通ることを確かめる。正常系は exit 0 **だけでなく有出力**と実際の入口（npm bin symlink など）を確認する（`_tests_/agents.test.ts` の再現テストを参照）。失敗を SKIP で恒常的に回避しない。
- `Git/PR` の結果は既知の失敗 > 未完了/skip/未取得 > 成功の順に分類する。失敗と保留が混在しても FAIL を隠さず、check runs と commit status の両方を確認する。

## 検証の順序

| 段階 | コマンド / 対象 |
| :--- | :--- |
| 文書 | `bun run links`、`bun run mermaid` |
| 言語 | `bun run lang`（日本語・英語、コミットメッセージは `.githooks/commit-msg`） |
| 指示 | `bun run agents`（上流 CLI の symlink no-op を避け、実体を起動） |
| 入口 | `bun run index`（`.agent/` の skills / rules / hooks の index と実物の整合） |
| コード | `bun x biome check .`、`bun run typecheck` |
| 回帰 | テストはまだ無い。追加したら `bun test` を `scripts/check.ts` のゲートに載せ、この表に戻す |
| 秘密情報 | CI の gitleaks ジョブ（ローカルでは秘密情報を commit しない） |

## 構成

| ファイル | 役割 |
| :--- | :--- |
| `scripts/check.ts` | すべての検査の入口。失敗時は exit 1 |
| `scripts/check-*.ts` | 文書・言語・コミットメッセージ・品質の検査（Bun / TypeScript） |
| `package.json` / `bun.lock` | ランタイム・依存・検証コマンドの正本 |
| `.githooks/` | `pre-commit` で `bun run check`、`commit-msg` で言語と Conventional Commits |
| `.github/workflows/ci.yml` | main への push・PR・merge queue・手動。4 ジョブ: `check`（`bun run check` + `bun run knip`）/ `secrets`（gitleaks）/ `workflow-audit`（actionlint / zizmor-action）/ `osv-pr`（OSV-Scanner の PR 差分・新規脆弱性のみ）。PR の連続 push は前の実行を打ち切る |
| `.github/workflows/dependency-review.yml` | Dependency graph が有効なときの PR 差分検査 |
| `.github/workflows/osv-scan.yml` | main への push（`bun.lock` 変更時）・毎週・手動の `bun.lock` 全体スキャン（SARIF を Code scanning へ） |
| `.github/workflows/dependency-submission.yml` | `bun.lock` を Dependency graph へ提出（推移依存の Dependabot alert 用） |
| `.github/workflows/dependabot-auto-merge.yml` | Dependabot の PR を全チェック成功後に squash merge |
| `.github/dependabot.yml` | `github-actions` と `bun` を月次・cooldown 7 日・グループ化して更新 |
| `.github/SECURITY.md` | 脆弱性の報告窓口（Security タブの Report a vulnerability）。派生プロジェクトでは書き換える |
| `docs/ops/main-ruleset.json` | `main` の ruleset 雛形（削除・force push 禁止、PR 必須、CI チェック必須）。適用は `bun run github:settings --apply`（gh で 5 設定を一括適用、`--check` で状態確認）、画面で同じ内容を設定するなら `docs/ops/GITHUB_SETTINGS.md` |

`bun run hooks:install` は Git の `core.hooksPath` を設定する。**既存の commit-msg / pre-commit フックがある場合は停止**し、手動で統合する。この作業環境の trailer フックは上書きしない。実行中のフックがある別の `core.hooksPath` も勝手に置き換えない（`--force` で置き換える。以前のディレクトリは残る）。実行可能なフックの無い `core.hooksPath` は古い設定として `.githooks` に切り替える。`bun install` の postinstall は導入できないときも警告だけで、`bun install` を失敗させない。

## 派生プロジェクトに固有の検証を追加する

1. `AGENTS.md §6.1` に実在するコマンドを記録する。
2. `package.json` の script を定義し、`scripts/check.ts` に追加する。
3. 成功・失敗の fixture をテストとして追加し、`scripts/check.ts` のゲートに載せて `bun run check` で確認する（このリポジトリにテストは無い）。
4. CI 上でも `bun install --frozen-lockfile` → `bun run check` を確かめる。OS 固有の検証が実行不能なら理由を報告する。

## よくある失敗

| 症状 | 対処 |
| :--- | :--- |
| Bun がない | CLI の前提として Bun を導入。検証できない場合は未実施と報告 |
| `bun install --frozen-lockfile` が失敗 | `package.json` と `bun.lock` を揃え、意図した依存変更だけを commit |
| Biome が失敗 | ソースの差分を確認し `bun run format` で修正して再検証 |
| 既存の Git フックがある | `hooks:install` が止まるのが正しい。既存の処理を壊さず手動で統合 |
| `bun install` が postinstall で失敗する | 失敗を返すのは `hooks:install` の明示実行だけ。postinstall は警告して終了するので、理由を読んで `--force` か手動統合を選ぶ |
| gitleaks が手元にない | CI の secrets ジョブを確認。未実施を PASS と書かない |

## 関連

- [`bug-audit-loop`](../bug-audit-loop/SKILL.md): 負例から開始する有界監査。
- [`project-init`](../project-init/SKILL.md): 対話式 CLI または Agent の計画承認。
- [`verification-before-completion`](../verification-before-completion/SKILL.md): 完了前の検証。
- [`sandbox-constraints`](../sandbox-constraints/SKILL.md): 実行不能な検証の扱い。
