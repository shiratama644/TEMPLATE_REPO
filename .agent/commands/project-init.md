---
description: テンプレートから作った新規プロジェクトを、質問と計画の承認を経て文書・Agent設定へ反映する。Use when initializing a new project from this template.
---

# Project Init Command

`.agent/skills/project-init/SKILL.md` を `read_file` し、その手順に従う。本コマンドは入口だけ。

承認前にファイルを書き換えない。`ask_user` ループと、ユーザー提案の事実確認（`web_search` の depth を内容で変え、公式 URL は `fetch_page`）を計画承認まで繰り返す。完了後は製品機能の実装に進まず停止する。
