# サードパーティ通知（Third-Party Notices）

本ディレクトリ（`.agent/`、Claude Code では `.claude/` として読み込まれる）の一部は、以下の上流 OSS から取り込み・改変したものです。各ライセンス文の転記を含みます。

| 出典 | ライセンス | 取り込み内容 |
|---|---|---|
| [affaan-m/ECC](https://github.com/affaan-m/ECC) (Everything Claude Code) | MIT | skill: search-first, documentation-lookup, deep-research, architecture-decision-records, article-writing, council（verification-loop は verification-before-completion へ統合） / agent: planner, architect, code-explorer, docs-lookup / command: code-review, checkpoint, plan, update-docs / rule: `rules/common/` の 10 件 |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | skill: brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, verification-before-completion, requesting-code-review, receiving-code-review, using-git-worktrees, finishing-a-development-branch, dispatching-parallel-agents, subagent-driven-development, writing-skills, using-superpowers |
| [mattpocock/skills](https://github.com/mattpocock/skills) | MIT | skill: grilling（grill-me を統合）, handoff, teach, writing-for-agents, to-questionnaire, prototype, retro, codebase-design, improve-codebase-architecture, domain-modeling（research は deep-research へ、diagnosing-bugs は systematic-debugging へ統合） / hook: block-dangerous-git.sh |
| [anthropics/skills](https://github.com/anthropics/skills) | 各 skill の LICENSE.txt（Apache License 2.0） | skill: skill-creator, discernment-nudge（各ディレクトリに LICENSE.txt を同梱） |

上記以外（`.agent/skills/` の `ci-quality-gates`、`e2e`、`testing`、`docs-maintenance`、`sandbox-constraints`、`project-init` など）は本リポジトリのオリジナルです。`verify-doc-integrity` は `docs-maintenance` へ統合した。

**取り込まなかったもの**: Anthropic の docx / pdf / pptx / xlsx 等の skill は、Anthropic の独自（proprietary）ライセンスのため再配布していません。`doc-coauthoring` は同梱ライセンスが無いため除外しました。ECC の `.claude/` 固有設定（ecc-tools.json、team/、enterprise/ 等）と、ECC ランタイムに依存する hook・skill（strategic-compact、blueprint、resume-session、save-session 等）も取り込んでいません。

改変内容: ツール名をこの環境の function call（`web_search` / `fetch_page` / `ask_user` / `read_file` / `bash` 等）に置換。DOT 図を Mermaid 化。同義スキルの統合。Context7 / exa / Task 前提の削除。

---

## ECC — MIT License（上流 LICENSE 全文）

```
MIT License

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## superpowers — MIT License（上流 LICENSE 全文）

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## mattpocock/skills — MIT License（上流 LICENSE 全文）

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## anthropics/skills — Apache License 2.0

skill-creator、discernment-nudge の各ディレクトリに、上流の `LICENSE.txt`（Apache License 2.0 全文）を同梱しています。
