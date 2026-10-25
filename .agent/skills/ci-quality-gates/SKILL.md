---
name: ci-quality-gates
description: 分野を問わず、検証を段階的に実行する品質ゲートを、手元（make check）・pre-commit・CI で同じ入口に揃えるスキル。pre-commit の導入、CI ワークフローの追加、手動実行、分野固有の検証の追加方法、失敗時の対処を扱う。
---

# CI Quality Gates — 品質ゲートを一つの入口にまとめるスキル

## 原則

- **手元・pre-commit・CI は同じ入口で検証する。** 本リポジトリでは `make check`（pre-commit の全フック + `PROJECT_CHECKS`）。CI だけにあるチェックを作らない。
- 検証は**速い順に段階化**する。失敗を早く、安く見つける。
- 検証の手段は AGENTS.md §6.1 に記録したものだけを使う。記録のないコマンドを推測で走らせない。
- SKIP や無効化を恒常化しない。一時的に外す場合は理由を残し、同じ変更の中で戻す。

## 段階（速い順）

| 段階 | 目的 | 例 |
| :--- | :--- | :--- |
| 1. 衛生 | 空白・改行・壊れたファイル・秘密鍵 | pre-commit-hooks（`check-json`、`detect-private-key` など） |
| 2. 形式 | 書式と静的な lint | Biome（`biome.json`）、綴り（codespell） |
| 3. 規約 | コミットメッセージ・文書の整合 | conventional-pre-commit、`make links`、`make mermaid` |
| 4. 秘密情報 | 機密の混入 | gitleaks（ローカルと CI の両方） |
| 5. 分野固有 | 型・単体テスト・ビルドなど | `PROJECT_CHECKS` に記録したコマンド |
| 6. 通し | E2E・統合・ビルド成果物 | CI の専用ジョブ（時間がかかるものは手動実行可） |

## 本リポジトリの構成

| ファイル | 役割 |
| :--- | :--- |
| `Makefile` | `make setup`（フック導入）・`make check`（全検証）・`make links`（リンクだけ）・`make mermaid`（Mermaid 図だけ） |
| `scripts/check_doc_links.py` / `scripts/check_mermaid.py` | 内部リンクと Mermaid 図の宣言を検査する（標準ライブラリのみ） |
| `.pre-commit-config.yaml` | pre-commit のフック一覧（版はタグで固定） |
| `biome.json` / `.editorconfig` | 書式とエディタの基本設定 |
| `.gitleaks.toml` | 秘密情報検出の許可リスト（最小限） |
| `.github/workflows/ci.yml` | `check`（make check）と `secrets`（gitleaks）の 2 ジョブ |
| `.github/workflows/release.yml` | バージョンタグで検証 → GitHub Release |
| `.github/workflows/dependency-review.yml` | PR の依存関係の差分レビュー（GitHub の Dependency graph が有効なときだけ動く） |
| `.github/dependabot.yml` | GitHub Actions の版を週次で更新 |

## 分野固有の検証を追加する手順

1. 検証コマンドを決め、AGENTS.md §6.1 に記録する。
2. `Makefile` の `PROJECT_CHECKS` に追加する（例: `PROJECT_CHECKS = ./scripts/test.sh`）。CI は `make check` を呼ぶので自動的に含まれる。
3. 必要な実行環境（言語のランタイムなど）を `ci.yml` の setup ステップに追加する。
4. 手元で `make check` が通ることを確認してから push する。

分野ごとの例（記録してから使う。テンプレートには入れていない）:

| 分野 | 追加例 |
| :--- | :--- |
| Python | `pytest`、`ruff check`、`mypy` |
| Go | `go vet ./...`、`go test ./...` |
| Node.js / TypeScript | `tsc --noEmit`、`vitest run`（記録したスクリプト名を使う） |
| 文書 | `make links`、用語集との照合 |

## 手動実行

- `ci.yml` は `push` / `pull_request` のほか、必要なら `workflow_dispatch` で手動実行できる（`on:` に追加する）。
- 通し検証（時間のかかるもの）は、通常の push では走らせず手動で実行する設計にしてよい。その場合も、どの条件で走るかを AGENTS.md §6.1 に書く。

## Sandbox での代替検証（AGENTS.md §3.1 準拠）

- 外部ネットワークに届かない、またはツールを導入できない場合は、実行できなかった検証を**報告**する。省いたまま「通った」と書かない。
- 実行できる部分（リンク検査、衛生チェックなど）は手元で実行し、残りは CI で確認するよう依頼する。

## よくある失敗と対処

| 症状 | 原因と対処 |
| :--- | :--- |
| pre-commit が「files were modified」で失敗する | フックが整形した。差分を確認し、`git add` してから再実行する |
| Biome フックが失敗する | Node.js が無い。Node を導入する。やむを得ず外す場合のみ `SKIP=biome` を一時的に使い、理由を残す |
| gitleaks がスキップされる | ローカルに未導入。CI の `secrets` ジョブで必ず検査される |
| CI と手元で結果が違う | 版（pre-commit・Biome・Python など）が揃っていない。`.pre-commit-config.yaml` の `rev` と `additional_dependencies` を確認する |
| `make check` が「PROJECT_CHECKS は未設定」と出る | 分野固有の検証がまだ無い。AGENTS.md §6.1 に記録してから追加する |

## 関連

- [`project-init`](../project-init/SKILL.md): 新規プロジェクトで検証コマンドを §6.1 と `PROJECT_CHECKS` に載せるとき
- [`testing`](../testing/SKILL.md): 検証の中身を設計する
- [`verification-before-completion`](../verification-before-completion/SKILL.md): 完了前の検証
- [`sandbox-constraints`](../sandbox-constraints/SKILL.md): 環境制約での迂回
