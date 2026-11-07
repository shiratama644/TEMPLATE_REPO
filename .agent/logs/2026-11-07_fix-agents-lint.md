# agents-md-lint の npm bin 無出力成功を修正

> Date: 2026-11-07(JST) / Commit: c2edd2f / PR: 5

## 1. 指示内容 (Task Summary)

LANGGATE-2 は issue 投稿ではなく、不具合を修正する。上流への issue は作成しない。

## 2. 実行内容 (Executed Actions)

- サンドボックス再構築で HEAD が旧基点に戻っていた。リモート固定ブランチの 189 ファイルと作業ツリーの内容・ファイル種別・実行権限が一致することを確認し、HEAD と index を安全に復旧した。
- 修正前の `agents-md-lint@1.0.1` を実測。Node で npm bin symlink を起動すると、90 KB の違反 `AGENTS.md` でも **exit 0・出力 0 バイト**。実体の `dist/cli.js` は exit 1・XP-007 を報告した。
- Bun の `patchedDependencies` を使い、配布物の `dist/cli.js` に `realpathSync(entry)` を適用。npm bin symlink と ESM の `import.meta.url` を一致させた。上流 MIT 出典と改変は第三者通知に明記。
- `tests/agents.test.ts` を追加し、**Node で npm bin を直接実行**する正常ファイル（exit 0・有出力）と超過ファイル（XP-007・exit 1）を検証。品質ゲートを `bun test` 全スイート対象に変更し、CI に Node 22 を明示設定した。
- `bun install --frozen-lockfile --force` でパッチ再適用を検証し、`bun run check` 7 ゲート・32 テスト / 243 assertions PASS。`git diff --check` PASS。計画・ADR・監査・README・スキルを現在の方針へ同期した。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- CLI 本体を直接実行するだけのテストは npm bin の no-op を検出できない。Node で実際の symlink を起動する負のテストと、正常系の**有出力**チェックが必要。
- `patchedDependencies` は Bun の frozen install でも適用される。修正は本リポジトリに導入した依存だけに有効であり、上流の公開 npm パッケージや他リポジトリでの `npx` の不具合は残る。
- `.agent/THIRD_PARTY_NOTICES.md` の旧記述は npm パッケージにも LICENSE ファイルが入っていると述べていたが、1.0.1 のパッケージにはライセンスファイルがなく、上流リポジトリの LICENSE を参照するよう訂正した。

## 4. 次にすべきこと (Next Actions)

- PR #5 の CI を push 後に確認し、LANGGATE-2 の状態と実測を記録する。
- 上流に修正版が公開された時は、パッチの要否を比較検証して削除する。ユーザー指示により issue は作成しない。

追記（push 後）: `9e1d24b` の PR #5 で Bun 全ゲート・gitleaks・dependency-review の 3 チェックが PASS。LANGGATE-2 は本リポジトリで完了。上流 npm 版は未修正。
