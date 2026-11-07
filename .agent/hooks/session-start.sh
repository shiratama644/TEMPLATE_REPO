#!/bin/sh
# session-start.sh — SessionStart フック（startup / resume / clear / compact で実行）
#
# 目的: セッション開始時に「正本の所在」と「現在の作業状態」を additionalContext として
#       モデルへ注入する。superpowers の session-start（using-superpowers の注入）の考え方を、
#       Node / プラグイン非依存の sh 版として実装したもの。
#
# 出力: Claude Code の hookSpecificOutput(JSON)。標準出力のみ使用。
# 依存: sh, git, sed, awk（任意。無ければ該当部分を省略）

set -u

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" 2>/dev/null || exit 0

BRANCH="$(git branch --show-current 2>/dev/null)"
STATUS="$(git status --short 2>/dev/null | head -n 20)"
LOG="$(git log -3 --oneline 2>/dev/null)"

# docs/task-list.md の「未完了サマリー」節（次の見出しまで）を抜き出す
UNFINISHED=""
if [ -f docs/task-list.md ]; then
  UNFINISHED="$(awk '/^## 未完了サマリー/{f=1;next} /^## /{f=0} f' docs/task-list.md | head -n 30)"
fi

CONTEXT="[session-start] 作業開始時の状態です。
- 正本: AGENTS.md（CLAUDE.md はその symlink）。作業前に必ず読むこと。
- 自律的な遂行: AGENTS.md §1.3 → .agent/rules/06_autonomy.md。目的と完了条件を先に定め、必要な作業を特定し、小さく実行・検証する。目的外の追加は避ける。
- 安全境界: 破壊的変更・データ削除・秘密情報・外部公開・課金、重大な矛盾は事前確認。完了報告では追加で判断した作業・未解決・未実施検証を明示する。
- 作業タスクの正本: docs/task-list.md
- ブランチ: ${BRANCH:-（不明）}
- 直近のコミット:
${LOG:-（なし）}
- 未コミットの変更:
${STATUS:-（なし）}
- 未完了サマリー:
${UNFINISHED:-（なし）}"

# JSON エスケープ（\ と " と タブ、改行を \n へ）
ESCAPED="$(printf '%s' "$CONTEXT" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g' | awk 'BEGIN{ORS=""} {if (NR>1) printf "\\n"; printf "%s", $0}')"

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$ESCAPED"
exit 0
