#!/bin/sh
# stop-verify.sh — Stop フック: AGENTS.md §5 の停止条件を確認する
#
# 判定は JSON で返して exit 0 にする（.agent/hooks/index.md の約束）。
#   - 作業ツリーが clean でない、または上流に未 push の commit がある → block
#   - STOP_VERIFY_CHECK=1 のときだけ `bun run check` も実行し、失敗なら block
#   - Git リポジトリでない / stop_hook_active（再帰）/ STOP_VERIFY=off → 何もしない
#
# 既定では §5 のとおり push を必須扱いにする。ローカル限定の確認では STOP_VERIFY=off を使う。

set -u

[ "${STOP_VERIFY:-on}" = "off" ] && exit 0

INPUT="$(cat 2>/dev/null || true)"
case "$INPUT" in
  *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;;
esac

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

block() {
  REASON="$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\n\r\t')"
  printf '{"decision":"block","reason":"%s"}\n' "$REASON"
  exit 0
}

[ -n "$(git status --porcelain)" ] && \
  block "working tree が clean ではありません（AGENTS.md §5）。commit するか、意図しない差分を取り除いてください。"

UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [ -z "$UPSTREAM" ]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if [ -z "$BRANCH" ] || ! git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null 2>&1; then
    block "上流ブランチが設定されておらず、origin/${BRANCH:-?} もありません（AGENTS.md §5 の push が未了です）。"
  fi
  UPSTREAM="origin/$BRANCH"
fi

AHEAD="$(git rev-list --count "$UPSTREAM..HEAD" 2>/dev/null || echo 1)"
[ "$AHEAD" != "0" ] && block "未 push の commit が ${AHEAD} 件あります（AGENTS.md §5）。"

if [ "${STOP_VERIFY_CHECK:-0}" = "1" ]; then
  bun run check >/dev/null 2>&1 || block "bun run check が失敗しました（AGENTS.md §3.1・§5）。"
fi

exit 0
