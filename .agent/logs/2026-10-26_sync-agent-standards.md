# 公式仕様と実証研究への同期（指示ファイル・フック・スキル）

> Date: 2026-10-26(JST) / Commit: 45ec169..HEAD（AGENTSYNC-1〜6） / Branch: arena/5bd01764-template-repo

## 1. 指示内容 (Task Summary)

最近の Anthropic / OpenAI の情報を入手して `AGENTS.md` などの書き方や良いスキルを取り込むこと、
他者が作ったテンプレートリポジトリも確認して汎用性を高めること、参考・利用したものはライセンスや
クレジットに明記すること、Hooks やそれ以外の設定も最適化して取り込むこと、という指示。

調査のうえで 3 点を `ask_user` で確認し、**AGENTS.md は `lean`（150 行前後へ段階開示）/
検証ゲートは npm の `agents-md-lint` / 新規スキルは 2 件**の承認を得て実装した
（計画書: `docs/planning/AGENTSYNC_PLAN.md`）。

出発点の実測は **33,482 bytes / 461 行 / 17,644 字**で、Codex の既定上限 32,768 bytes を
714 bytes 超えていた。Codex は超過分を警告なく打ち切るため、後半の規約は読まれていなかった。

## 2. 実行内容 (Executed Actions)

| # | 内容 | コミット |
|---|---|---|
| 0 | サンドボックス再構築を検知し §4.1.1 の手順で復旧（6 ファイルのハッシュ一致を確認のうえ `git reset --hard FETCH_HEAD`、venv 再構築） | 復旧後 HEAD `49927ab` |
| 1 | 計画書とタスク行（AGENTSYNC-1〜6）を登録 | `45ec169` |
| 2 | AGENTS.md を段階開示で予算内に収め、§7 の詳細を `rules/05_communication.md` へ移設、§8 のツリーと対応表を `.agent/README.md` へ集約 | `ed58754` |
| 3 | `agents-md-lint@1.0.1`（MIT）を pre-commit と `make agents` に接続。**上流 bin の symlink no-op 不具合を発見し回避** | `987c896` |
| 4 | フック 3 本を公式の JSON 形式に移し、`settings.json` の allow 18→39 / deny 10→17 件へ拡充、終了コード規約の文書を追従 | `5a10b4d` |
| 5 | 新規スキル `agents-md-authoring`・`context-budget` を追加し `skills/index.md` の両表に登録 | `c0091e9` |
| 6 | README に「どのツールで読まれるか」を追加、`.agent/README.md` に標準の所在を明記 | `dbfabf7` |
| 7 | ADR-0002 と `THIRD_PARTY_NOTICES.md` のクレジットを記録 | `c7de1d0` |
| 8 | task-list の証拠、`docs/audit/activity.md`、本ログ、計画書 §12 を更新 | 本コミット |

検証: 各コミット前に `make check`（pre-commit 9 フック）と `make links`（131 ファイル）を実行し、すべて PASS。
pre-commit 4.7.0 は PEP 668 のためリポジトリ外の venv（`/home/user/.venv-pc`）で実行した。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **ゲートを追加したら必ず負のテストをする。** `agents-md-lint@1.0.1` の bin は symlink 経由で起動すると
  何も出力せず exit 0 になる。`cli.js` の `pathToFileURL(process.argv[1]).href === import.meta.url` という
  エントリポイント判定が原因で、Node は `import.meta.url` を realpath に解決する一方 `argv[1]` は
  呼び出しに使った symlink のままなので一致しない。npm bin は必ず symlink なので `npx` 経由でも同じ。
  **cookbook 自身の GitHub Action も同じ経路なので常に成功してしまう。** 超過フィクスチャで失敗することを
  実測していなければ、「緑に見えるのに何も守らない」ゲートを導入したまま気づけなかった。
- **節番号は公開 API と同じ。** `§6.1` は 62 件、`§6` は 29 件が 38 ファイルから参照されており、
  過去ログは書き換え禁止。番号を振り直すと参照が偽になり、修復不能になる。短縮は「番号を保ったまま
  本文だけ移設する」形でしかできなかった。
- **フックの exit code は「ブロックするかどうか」だけでなく「誰に届くか」を決める。** 旧
  `post-edit-verify.sh` の exit 1 は非ブロッキングエラーで、stderr はユーザーにしか表示されない。
  `.env` 混入というモデル自身が直せる指摘が届いていなかった。PostToolUse は
  `decision: "block"` + reason、PreToolUse は `hookSpecificOutput.permissionDecision: "deny"` が現行仕様で、
  top-level `decision`/`reason` は PreToolUse では非推奨。exit 2 と JSON は混ぜない。
- **字数ベースの上限は CJK に不利。** Windsurf の 6,000 字は日本語だと英語の約 2 倍の制約になる
  （同じ情報量で字数が半分）。予算を守るために規約そのものを削るのは本末転倒なので、
  hard cap（32,768 B）は必ず守り、soft 目標は実測値と理由を明記して受け入れる判断にした。
- **見出しの英語併記は照合のためだけではない。** `agents-md-lint` の推奨セクション検査は英語キーワードで
  照合するが、併記は英語圏のツールやモデルにとっても見つけやすくなる。AGM-002 の警告 6 件が 0 件になった。
- **段階開示の効果は測れる。** スキル 46 件で常時ロードされる `description` の合計は 7,059 字、
  本文の合計は 300,616 字で、常時分は **2.3%**。全スキルを常時読み込む設計なら 43 倍のコストになる。
- **時点記録と現用文書の区別が再び効いた。** `REPOFIX_PLAN.md §12` と task-list の REPOFIX-4 証拠欄にある
  「allow 18 件・deny 10 件」「exit 2」は当時の正しい記録なので書き換えず、現用文書
  （`hooks/index.md`・`architecture.md`・`.agent/README.md`・`sandbox-recovery.md`・`rules/common/hooks.md`）
  だけを追従させた。
- **未確認（前ログから継続）**: `log-task.md` のテンプレートは `Branch: <branch>` を要求するが、
  `AGENTS.md §4.4` は「過去セッションのブランチ名を文書に残さない」と定める。本ログもテンプレートに従った。
  時点記録（§8.6 で保護）と現用ドキュメントで扱いを分けるべきか、判断がまだ残っている。

## 4. 次にすべきこと (Next Actions)

- 上記「未確認」のブランチ名記録の扱いを明文化する（`log-task.md` と `AGENTS.md §4.4` のどちらかに寄せる）。
- `agents-md-lint` の上流が symlink no-op を修正したら、`.pre-commit-config.yaml` の `entry` を
  `agents-md-lint --root .` に戻す（設定内に注記済み）。版を上げる際は**負のテストを再実行**する。
- 残る warn 2 件（AMC-LENGTH 170 行 > 150、AGM-003 8,098 字 > 6,000）は、Codex の入れ子 `AGENTS.md` 分割で
  解消できる。派生プロジェクトで Windsurf を使う必要が出た時点で分割する（テンプレート本体は分割しない）。
- 上流の cookbook へ symlink no-op を報告するかは所有者の判断（本セッションでは外部への issue 投稿はしていない）。
- CI での `make check` の結果は push 後に確認する。`依存関係の差分レビュー` は Dependency graph 未有効のため
  失敗が続く見込みで、有効化にはリポジトリ所有者の権限が必要（前回報告済み・未解消）。
