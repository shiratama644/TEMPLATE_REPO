---
description: テンプレートから作った新規プロジェクトを、質問と計画の承認を経て文書・Agent設定へ反映する。Use when initializing a new project from this template.
---

# Project Init Command

`.agent/skills/project-init/SKILL.md` を `read_file` し、その手順に従う。本コマンドは入口だけ。

承認前にプロジェクト文書を書き換えない（例外: `docs/planning/INIT_STATE.md`）。`ask_user` は 1 回 4 問・合計 8 ラウンド。事実確認は `web_search`（depth は内容で変更）と `fetch_page` で、回数上限に達したら `unverified` としてユーザー判断に渡す。計画の「質問」は計画を変えず、「修正」だけ差分再検証する。実行は承認済み許可リストのみ。完了後は製品機能に進まず停止する。
