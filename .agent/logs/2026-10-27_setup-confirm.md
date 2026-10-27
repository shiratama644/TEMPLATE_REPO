# 対話式セットアップの計画承認

> Date: 2026-10-27(JST) / Commit: 77844c5 / PR: 5

## 1. 指示内容 (Task Summary)

`--apply` を知らなくても、`bun run setup` の計画表示後に `y/N` を入力して適用を選べるようにする。

## 2. 実行内容 (Executed Actions)

- サンドボックス再構築で HEAD が旧基点に戻っていたため、作業ツリーの 75 ファイルと削除 8 パスを退避。固定ブランチの取得済み HEAD `7e3d43c` の 187 ファイルと全内容の一致を確認し、復旧後も退避ファイルのハッシュを照合した。
- `scripts/setup.ts` を変更し、計画表示後に対話式 `y/N` を提示。`y` / `yes` のみ適用、拒否または空入力は不変更。`--apply` 単独でも対話承認を省略しない。`--dry-run`、非対話式の `--yes --apply`、OS パッケージごとの別承認は維持。
- `tests/setup.test.ts` に Linux 疑似端末 `script(1)` でプロンプト後に回答を送るテストを追加。`y` / `N` / 空入力・`--apply` 指定時の拒否・`--dry-run` と設定保存を検証。CLI ヘルプ、README、AGENTS.md、計画・索引・進捗文書を同期。
- 目的達成に必要な追加判断: 従来の非対話式の二重承認は維持し、対話式からだけ `--apply` を不要にした。自動承認時の安全境界を意図せず変更しないため。
- `bun install --frozen-lockfile`、`bun run check` 7 ゲート（31 テスト / 237 assertions）、`git diff --check` PASS。Bun 1.4.4 はリポジトリ外の環境に復元。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- パイプ経由の通常の子プロセスは `isTTY=false` となる。疑似端末の質問を実測するには `script(1)` で子プロセスを起動し、プロンプトが表示されてから回答を送る必要がある。
- 再構築時の `git ls-files -m` は削除済みパスも返すため、バックアップでは `lexists` を確認し、削除一覧を別に記録する。退避を完了・照合するまで reset してはいけない。

## 4. 次にすべきこと (Next Actions)

- PR #5 の Bun / gitleaks / dependency-review の CI 結果を push 後に確認し、進捗文書に実測を記録する。
- OS パッケージの実導入、および macOS / Windows / Termux の実機検証は BUNSETUP-4 として保留。疑似端末テストは Linux の `script(1)` で確認した。
