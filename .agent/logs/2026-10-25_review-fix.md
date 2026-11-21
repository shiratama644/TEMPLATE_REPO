# 構成レビューの指摘修正

> Date: 2026-10-25(JST) / Commit: 2b65b59 / PR: 5

## 1. 指示内容 (Task Summary)

レビューで挙げた 3 件（Linux 固有の疑似端末テスト、古い dry-run アサーション、構成図の不足）を修正する。

## 2. 実行内容 (Executed Actions)

- `scripts/setup.ts` の計画承認条件を `planApproval()` に分離。dry-run では承認関数を呼ばず、対話の拒否・承認と非対話の `--apply` 条件を維持する。
- `tests/setup.test.ts` の Linux util-linux 専用テストを可用時だけ実行し、OS 共通の承認判断テストを追加。dry-run の禁止プロンプトを Clack の現行 `[y/N]` 表示で照合する。Windows では POSIX `sh` フックの単体実行テストをスキップし、`tests/agents.test.ts` は npm bin symlink の代わりに CLI 実体を検査する。
- `docs/arch/architecture.md` の構成図に `patches/`、`tests/`、ゲート・指示ファイル検査・フック導入スクリプトを追加。索引とタスクリスト・計画を同期。
- `bun run check` の 7 ゲート・37 テスト / 612 assertions PASS。`git diff --check` PASS。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- Clack の表示は `[y/N]` であり、旧 readline 形式の `[y/N]:` の不存在検査は偽の安心を与える。プロンプトを呼ばないこと自体を関数注入のテストで確認する。
- GNU `script -q -e -c` と `stty` は Linux の疑似端末試験用。macOS・Windows にはそのまま適用できない。Linux の実操作と OS 共通の意思決定テストを分ける。

## 4. 次にすべきこと (Next Actions)

- PR #5 の最終 CI を確認し、タスクの状態を更新する。
- macOS / Windows / Termux の実機での対話 UI、symlink 権限、OS パッケージ導入は BUNSETUP-4 に残る。今回の対応を実機検証済みと誤記しない。

## 5. CI 確認（追記）

- PR #5 の `9d94779` で Bun 全ゲート・gitleaks・dependency-review の 3 チェックが PASS。タスクリスト・計画書を完了に更新。
- macOS・Windows・Termux の実機検証は引き続き BUNSETUP-4 に残す。
