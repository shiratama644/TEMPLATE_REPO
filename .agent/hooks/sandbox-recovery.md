# Hook: Sandbox Rebuild Recovery

> **トリガー**: Sandbox 再構築を検知した時。AGENTS.md §4.1.1 の手順実体版。
> **検知ヒント**: `git log --oneline` が起点コミット 1 件のみ / `git status` が「大量の削除 + 大量の未追跡」/ 依存関係の取得先（プロジェクトが使う `node_modules`・`.venv` などの生成物）が無い。

## 背景

サンドボックス型の作業環境（Arena 等）は再構築されることがあり、その場合ワークツリーは
「起点コミットのファイル」＋「push 済みコミットで追加されたファイルの未追跡バージョン」が混在した状態で立ち上がる。
ファイルが無傷とは限らず、未コミット変更もあり得る。リセット前にリモートと現物を照合する。

## 手順

```bash
# 1. リモートの最新を fetch（※ ブランチ名は git branch --show-current で確認）
git fetch origin <session-branch>

# 2. git ls-tree -r FETCH_HEAD と作業ツリーの全パスを照合する。
#    各ファイル内容・symlink 先・実行権限が一致し、余分な未追跡ファイルが
#    無いことを確認する。差がある場合はリセットせず退避・相談する。
# 3. 全件一致を確認できた再構築時の初回に限り実行。
git reset --hard FETCH_HEAD

# 4. 環境を再構築（AGENTS.md §6.1 に記録されたセットアップ手順に従う）
```

## 復旧後の健全性確認

```bash
git log --oneline -5          # push 済みコミットが見えること
# §6.1 に記録された検証コマンドを実行し、通ることを確認する
```

→ 問題なければ作業再開。

## 注意

- `git reset --hard` は**この例外場景以外では厳禁**（AGENTS.md §4.3）。誤用に注意。
- ガードレールはこの例外を形で見分ける。`block-dangerous-git.sh` は `git reset --hard FETCH_HEAD` のみを無出力・exit 0 で通し、`git reset --hard HEAD~1` などは `permissionDecision: "deny"` の JSON を返してブロックする（exit code は常に 0 なので、判定は出力の JSON で見る）。`.agent/settings.json` も allow に `Bash(git reset --hard FETCH_HEAD)` を持つ（deny の `Bash(git reset --hard)` は完全一致なので衝突しない）。
- ブランチ名は必ず `git branch --show-current` で確認してから fetch する（AGENTS.md §4.4）。
- 環境セットアップ手順はプロジェクトごとに異なるため、§6.1 に具体的な手順を記録しておくこと。
