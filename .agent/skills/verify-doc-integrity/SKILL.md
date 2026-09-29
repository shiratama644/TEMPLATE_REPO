---
name: verify-doc-integrity
description: ドキュメントの整合性（リンク実在・目次更新・機密情報混入なし）を機械検証する手順。仕様変更後・コミット前に必須。Use when docs are changed or before committing.
---

# Skill: ドキュメント整合性の機械検証

PalmIDEの `verify-doc-integrity` をベースに、テンプレートリポジトリ用に一般化した機械検証手順。

## いつ使うか

- `docs/` のファイルを1行でも編集した直後
- PRをopen/updateする直前
- 「この変更でドキュメントが壊れていないか」と聞かれたとき

## 手順（順序厳守）

### Step 1. 機密情報の混入チェック

```bash
# .env が追跡対象になっていないか
git diff --cached --name-only | grep -E "^\.env"
# 期待: 出力なし

# .env.* がステージングされていないか
git diff --cached --name-only | grep "^\.env\."
# 期待: 出力なし
```

### Step 2. 内部リンク検証

```bash
# docs/ 内の相対リンクが実在するか
cd docs
grep -ohr "](\./[^)]*)" *.md **/*.md 2>/dev/null | sed 's/](\.\///; s/)$//; s/#.*//' | sort -u | while read -r f; do [ -f "$f" ] || echo "BROKEN: $f"; done
cd ..
# 期待: BROKEN 0件
```

### Step 3. 目次更新チェック

```bash
# docs/ に追加・削除があるのに README が未更新なら警告
git status --porcelain | grep "docs/" | grep -E "^(\?\?|A |D |R )"
# あれば docs/README.md の更新を検討
git diff --name-only | grep "docs/README.md"
```

### Step 4. 変更槌の見読み

```bash
git status --short
git diff --stat
# 狙いではないファイルが変更されていないか目視
```

### Step 5. package.json 整合性

```bash
# packageManager フィールドが pnpm@x.y.z 形式か
node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).packageManager"
# 期待: pnpm@12.6.0 のような形式
```

## 完了報告のフォーマット

```
- (A) 機密情報: OK (0件)
- (B) リンク: OK (BROKEN 0件)
- (C) 目次: OK / 要更新
- (D) 変更狙い: 意図した N ファイルのみ
- (E) packageManager: pnpm@12.6.0
```

どれか1つでもNGが出たら「完了」宣言はしない。先に直す。

## 自動化

`.agent/hooks/post_edit_verify.sh` がこの検証の一部を自動実行する。手動でも上記コマンドで確認可能。
