# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: プロジェクトで定義された検証を必ず全 pass させてから commit する。
> 途中の検証失敗で次へ進んではならない。

## 検証（順に実行、1 つでも失敗したら原因特定→修正→再全検証）

```bash
pnpm typecheck   # 型チェック
pnpm lint        # Lint / Format
pnpm test:unit   # 単体テスト
pnpm build       # 本番ビルド
```

※ スクリプト名はプロジェクトの `package.json` に合わせる（AGENTS.md §3.1）。

### 各コマンドの注意

- **typecheck**: プロジェクトが複数 tsconfig を持つ場合はすべて対象にすること。
- **lint**: `0 error / 0 warning` まで。ignore コメントの置き場所・自動生成ファイルの除外は AGENTS.md §6.5 のルールに従う。
- **test:unit**: watch モード（`pnpm test` 等）**ではない**。必ず run 相当のスクリプトを使う。
- **build**: 環境起因の既知エラー（外部 API への接続失敗等）は AGENTS.md §6.2 の「サンドボックス制約」に従う。**exit code 0 なら成功**。

## 追加確認（commit 前）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
```

- リポジトリ固有の不変パスがある場合（AGENTS.md §6）は、そこに差分が無いことも確認する。

## 検証失敗時の原則（AGENTS.md §3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。

## E2E について

- E2E テストが実行環境で実行不可（ブラウザバイナリの install 不可等）の場合は、CI 上でのみ実行する。commit 前検証には含めない。
- 実行可否の判断は AGENTS.md §6.2 のサンドボックス制約を確認する。

## 完了後

検証 all pass + 意図しない差分なし を確認 → commit（Conventional Commits 形式）→ `git push origin <session-branch>`。
