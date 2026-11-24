# GitHub の Web UI で行うリポジトリ設定

workflow や `.github/dependabot.yml` など**ファイルでは完了しない**設定の一覧です。管理者権限（Admin）を持つアカウントで GitHub の画面から行います。API で同じことをする場合の手順と `main-ruleset.json`（雛形）は [index.md](./index.md) にあります。

- **gh で一括設定する場合**: `bun run github:settings --apply` で 5 つすべてを適用し、検証まで行います（`--check` は状態確認のみ、`--repo owner/name` で対象指定）。以下は画面で 1 つずつ設定する場合の手順です。
- 画面の項目名は 2026 年 11 月時点です。GitHub は改名することがあるので、日本語の説明と括弧内の英語名（API のキー名）の両方で探してください。
- この repository は **public** なので、以下はすべて無料で使えます（private repository では Secret scanning などに GitHub Advanced Security が必要です）。
- すでに設定済みの項目は「Enabled」や「Configured」と表示されます。その場合は読み飛ばして構いません。

## 設定するもの（まとめ）

| # | 設定 | 場所 | 主な効果 |
| :--- | :--- | :--- | :--- |
| 1 | Dependabot alerts | Settings → Code security | `dependency-submission.yml` の提出結果が alert になる。**これが無いと依存提出の効果がありません** |
| 2 | Dependabot security updates | Settings → Code security | `dependabot.yml` の security group が更新 PR を出す |
| 3 | Secret scanning + Push protection | Settings → Code security | commit / push の時点で秘密情報を止める |
| 4 | Private vulnerability reporting | Settings → Code security | Security タブに「Report a vulnerability」が出る（`.github/SECURITY.md` の窓口） |
| 5 | `main` の ruleset | Settings → Rules → Rulesets | 削除・force push の禁止、PR の必須化、CI チェックの必須化 |

Dependency graph は public repository では常に有効なので設定は不要です（`dependency-review.yml` はすでに成功しています）。

## 1〜4. Code security の 4 つ

`https://github.com/shiratama644/TEMPLATE_REPO/settings/security_analysis` を開きます（リポジトリの **Settings → Code security**。旧画面では「Code security and analysis」）。

1. **Dependabot alerts** の「Enable」を押します。
2. 同じページの **Dependabot security updates** の「Enable」を押します（1 が有効だと出ます）。
3. **Secret scanning** の「Enable」を押し、続けて **Push protection** の「Enable」を押します。
4. **Private vulnerability reporting** の「Enable」を押します。

「Dependabot version updates」は `.github/dependabot.yml` で制御しているため、画面では「Configured」などと表示されるだけで変更不要です。

### 確認

- 4 つとも「Enabled」と表示されること。
- リポジトリの **Security** タブを開き、「Dependabot alerts are disabled」のような案内が消えていること。
- Security タブの左メニューに「Private vulnerability reporting」があれば 4 は有効です。

### 設定後に一度だけやること

`dependency-submission.yml` は `paths` フィルタ付きなので、workflow を追加した直後の push では動きません。**Actions → 「Dependency submission」→ Run workflow** を手動で 1 回実行してください。GitHub は `bun.lock` を解析しないため、これが通ると推移依存の alert が出るようになります（出ない場合は alert 0 件です）。

## 5. `main` の ruleset

`https://github.com/shiratama644/TEMPLATE_REPO/settings/rules` を開きます（**Settings → Rules → Rulesets**）。「New ruleset」→「New branch ruleset」を選び、次のとおりに設定します。雛形との対応は [main-ruleset.json](./main-ruleset.json) と下の表を参照してください。

### 5.1. 基本設定

| 項目 | 設定 |
| :--- | :--- |
| Ruleset Name | `main-protection` |
| Enforcement status | まず **Evaluate** にします（下記「安全に有効化する」参照） |
| Target branches | 「By branch」で `main` を追加（既定ブランチ。「By pattern」の `~DEFAULT_BRANCH` でも同じ） |
| Bypass list | 未設定のまま（緊急時に自分だけ例外にしたい場合は「Add bypass」で自分を追加。ただし制限が弱まります） |

### 5.2. Rules（4 つにチェック）

検索ボックスに英語名を入れると早く見つかります。

| チェックするルール | 開いた中の設定 | 対応する JSON |
| :--- | :--- | :--- |
| **Restrict deletions** | なし | `deletion` |
| **Restrict non-fast-forward updates** | なし | `non_fast_forward` |
| **Require a pull request before merging** | Required approvals: **0**／Dismiss stale approvals: **off**／Require review from Code Owners: **off**／Require approval of the most recent reviewable push: **off**／Require conversation resolution: **off**／Allowed merge methods: **Merge・Squash・Rebase** | `pull_request` |
| **Require status checks before merging** | 下の 5 チェックを追加／Require branches to be up to date before merging: **off**／Do not require status checks on creation: **off** | `required_status_checks` |

追加するステータスチェック（ジョブ名そのもの。コピーして貼り付けてください）:

```
bun run check（全ゲート）
秘密情報の検出（gitleaks）
actionlint / zizmor
OSV bun.lock 新規脆弱性（PR 差分） / osv-scan
依存関係の差分レビュー
```

入力欄は既存のチェック名を検索します。5 つとも CI で一度は成功しているので選択できます。見つからない場合は、その workflow を 1 回実行してから開き直してください。

最後に「Save changes」を押します。

### 5.3. 安全に有効化する

いきなり **Active** にすると、`main` への直接 push と force push が即座に拒否されます（自分の push も含みます）。次の順番を推奨します。

1. **Evaluate** のまま保存し、通常どおり PR を 1 本マージします。
2. **Settings → Rules → Rulesets → main-protection → Insights** を開き、評価結果（ブロックされるはずだった操作）に意図しないものが無いことを確認します。
3. 問題なければ Enforcement status を **Active** に変えて保存します。
4. `main` のブランチ一覧（Settings → Branches）で `main` に ruleset が適用されていることを確認します。

## 任意: merge queue を使う場合

`ci.yml` と `dependency-review.yml` は `merge_group` トリガーに対応済みです。merge queue を有効化する場合は、ruleset の Rules で **Require merge queue** にチェックを入れてください。`osv-pr` と `依存関係の差分レビュー` は merge queue では skip します（skip は必須チェックとして成功扱い）。詳しくは [index.md](./index.md) を参照してください。

## 任意: auto-merge

`allow_auto_merge` は現在 false です。Dependabot の自動マージは `dependabot-auto-merge.yml` が `gh pr merge` で行うため、この設定は不要です。PR 画面の「Enable auto-merge」を使いたい場合だけ **Settings → General → Pull Requests → Allow auto-merge** を有効にしてください。

## トラブルシューティング

- **Enable ボタンが無い**: 管理者権限が無いアカウントで見ています。リポジトリの Settings → Manage access で Admin 権限を確認してください。
- **Secret scanning が見つからない**: public repository では Settings → Code security の中ほどにあります。private repository では GitHub Advanced Security の契約が必要です。
- **ステータスチェックの検索に出ない**: 日本語名は全角括弧を含みます。上のコードブロックからコピーして貼り付けてください。
- **ruleset を保存したのに `main` に効かない**: Target branches が空、または Enforcement status が Disabled/Evaluate になっていないか確認してください。
- **有効化後に push が拒否される**: 仕様です。`main` への直接 push は AGENTS.md §2 でも禁止しています。PR を出してください。
