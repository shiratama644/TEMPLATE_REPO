---
description: テンプレートから作った新規プロジェクトを、質問と計画の承認を経て文書・Agent設定へ反映する。Use when initializing a new project from this template.
---

# Project Init Command

`.agent/skills/project-init/SKILL.md` を `read_file` し、その手順に従う。本コマンドは入口だけ。

承認前にプロジェクト文書を書き換えない（例外: `docs/planning/INIT_STATE.md`）。`ask_user` は 1 回 4 問・合計 8 ラウンド。必須スロット判定と質問予算は分け、必須が埋まったら予算が残っていても計画へ。事実確認は `search_count` 判定 → `web_search` → 公式 URL 判定 → `fetch_page`。結果は `verified` / `unverified`（根拠不足。間違いではない） / `conflict` / `error`。実行は許可リスト **かつ** 承認計画一致 **かつ** 対象ファイル未変化の 3 条件。完了後は製品機能に進まず停止する。
