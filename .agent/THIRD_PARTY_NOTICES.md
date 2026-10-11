# サードパーティ通知（Third-Party Notices）

本ディレクトリ（`.agent/`、Claude Code では `.claude/` として読み込まれる）の一部は、以下の上流 OSS から取り込み・改変したものです。各ライセンス文の転記を含みます。

| 出典 | ライセンス | 上流コミット（取り込み時点） | 取り込み内容 |
|---|---|---|---|
| [affaan-m/ECC](https://github.com/affaan-m/ECC) (Everything Claude Code) | MIT | `8ce348f` | skill: verification-loop, search-first, documentation-lookup, deep-research, architecture-decision-records, article-writing, council / agent: planner, architect, code-explorer, docs-lookup / command: code-review, checkpoint, plan, update-docs |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | `bb92a77` | skill: brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, verification-before-completion, requesting-code-review, receiving-code-review, using-git-worktrees, finishing-a-development-branch, dispatching-parallel-agents, subagent-driven-development, writing-skills, using-superpowers |
| [mattpocock/skills](https://github.com/mattpocock/skills) | MIT | `49dd158` | skill: grill-me, grilling, handoff, teach, writing-for-agents, to-questionnaire, prototype, research, retro, codebase-design, diagnosing-bugs, improve-codebase-architecture, domain-modeling / hook: block-dangerous-git.sh（git-guardrails-claude-code を sh 版に書き直し） |
| [anthropics/skills](https://github.com/anthropics/skills) | 各 skill の LICENSE.txt（Apache License 2.0） | `dbd4588` | skill: skill-creator, discernment-nudge（各ディレクトリに LICENSE.txt を同梱） |

上記以外（`.agent/skills/` の `ci-quality-gates`、`e2e`、`testing`、`docs-maintenance`、`sandbox-constraints`、`verify-doc-integrity` など）は本リポジトリのオリジナルです。

**取り込まなかったもの**: Anthropic の docx / pdf / pptx / xlsx 等の skill は、Anthropic の独自（proprietary）ライセンスのため再配布していません。`doc-coauthoring` は同梱ライセンスが無いため除外しました。ECC の `.claude/` 固有設定（ecc-tools.json、team/、enterprise/ 等）と、ECC ランタイムに依存する hook・skill（strategic-compact、blueprint、resume-session、save-session 等）も取り込んでいません。

改変内容: `superpowers:` 名前空間の参照除去、`docs/superpowers/{plans,specs}/` → `docs/planning/`、`.superpowers/` → `tmp/superpowers/`、Context7 MCP 非依存の代替手順の追記、他ハーネス向け参照ファイルの削除、`session-start.sh` と `block-dangerous-git.sh` の新規作成（上流の思想に基づく sh 版）。

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
