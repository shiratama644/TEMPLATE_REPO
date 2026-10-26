# サードパーティ通知（Third-Party Notices）

本ディレクトリ（`.agent/`、Claude Code では `.claude/` として読み込まれる）の一部は、以下の上流 OSS から取り込み・改変したものです。各ライセンス文の転記を含みます。

| 出典 | ライセンス | 取り込み内容 |
|---|---|---|
| [affaan-m/ECC](https://github.com/affaan-m/ECC) (Everything Claude Code) | MIT | skill: search-first, documentation-lookup, deep-research, architecture-decision-records, article-writing, council（verification-loop は verification-before-completion へ統合） / agent: planner, architect, code-explorer, docs-lookup / command: code-review, checkpoint, plan, update-docs / rule: `rules/common/` の 10 件 |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | skill: brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, verification-before-completion, requesting-code-review, receiving-code-review, using-git-worktrees, finishing-a-development-branch, dispatching-parallel-agents, subagent-driven-development, writing-skills, using-superpowers |
| [mattpocock/skills](https://github.com/mattpocock/skills) | MIT | skill: grilling（grill-me を統合）, handoff, teach, writing-for-agents, to-questionnaire, prototype, retro, codebase-design, improve-codebase-architecture, domain-modeling（research は deep-research へ、diagnosing-bugs は systematic-debugging へ統合） / hook: block-dangerous-git.sh |
| [anthropics/skills](https://github.com/anthropics/skills) | 各 skill の LICENSE.txt（Apache License 2.0） | skill: skill-creator, discernment-nudge（各ディレクトリに LICENSE.txt を同梱） |
| [Taiizor/agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook) | MIT | tool: `agents-md-lint@1.0.1`（`package.json` / `bun.lock` で版固定し `bun run agents` / `bun run check` から実行）。**文面は複製していない**。指示ファイルの予算（Codex 32,768 bytes / Windsurf 6,000 字 / 行数 150・300）と、下記の実証研究の整理を参照した。ライセンス全文は npm パッケージと上流リポジトリに同梱 |

上記以外（`.agent/skills/` の `ci-quality-gates`、`e2e`、`testing`、`docs-maintenance`、`sandbox-constraints`、`project-init` など）は本リポジトリのオリジナルです。`verify-doc-integrity` は `docs-maintenance` へ統合した。

**取り込まなかったもの**: Anthropic の docx / pdf / pptx / xlsx 等の skill は、Anthropic の独自（proprietary）ライセンスのため再配布していません。`doc-coauthoring` は同梱ライセンスが無いため除外しました。ECC の `.claude/` 固有設定（ecc-tools.json、team/、enterprise/ 等）と、ECC ランタイムに依存する hook・skill（strategic-compact、blueprint、resume-session、save-session 等）も取り込んでいません。

改変内容: ツール名をこの環境の function call（`web_search` / `fetch_page` / `ask_user` / `read_file` / `bash` 等）に置換。DOT 図を Mermaid 化。同義スキルの統合。Context7 / exa / Task 前提の削除。`rules/common/hooks.md` は終了コードと JSON 出力の記述を Claude Code Hooks reference の現行仕様に合わせて更新した（同ファイルは冒頭に "ECC origin, adapted" と明記しており、記述対象は本リポジトリの `.agent/hooks/`）。

---

## 参照した公式文書・実証研究（文面は複製していない）

自作の文書（`AGENTS.md`・`.agent/rules/`・自作スキル・`docs/`）を書くにあたり、次を参照した。いずれも**事実・仕様・数値の参照**であり、文面の複製ではない。

| 出典 | 参照した内容 |
|---|---|
| Anthropic「Claude Code Best Practices」 | 毎セッション読まれるファイルには広く適用されるものだけを入れる。肥大化した指示ファイルは実際の指示を無視させる。linter の仕事を LLM にさせない |
| Anthropic「Effective context engineering for AI agents」 | JIT コンテキスト（軽量な識別子を持ち実行時に読む）、長いタスクの三戦略（圧縮 / 構造化ノート / サブエージェント） |
| Anthropic の 2026-07 の公表 | Claude Code のシステムプロンプトを 80% 以上削除しても評価が劣化しなかった。失敗の本質は過剰な制約と層間の矛盾 |
| Claude Code Hooks reference（https://code.claude.com/docs/en/hooks） | イベント一覧、`hookSpecificOutput.permissionDecision`（PreToolUse の top-level `decision` は非推奨）、PostToolUse の `decision: "block"`、exit 2 とその他の非 0 の意味の違い、`if` フィルタ |
| Claude Code `.claude/` directory 仕様 | `.agent/` の構成と `index.md` の置き方 |
| OpenAI Codex「Custom instructions with AGENTS.md」 | 発見規則（git root → cwd の連結、近いものが勝つ、1 ディレクトリ 1 ファイル）、`project_doc_max_bytes` 既定 32,768 bytes |
| agentskills.io / Agentic AI Foundation（Linux Foundation） | `SKILL.md` の公開標準（frontmatter の必須キーと上限、本文 500 行未満・活性化時 5,000 tokens 未満、参照は 1 レベル、skill フォルダ内に README を置かない）、`AGENTS.md` の移管と対応ツール |
| ETH Zurich「Evaluating AGENTS.md」（ICLR 2026） | 自動生成コンテキストは成功率を約 3% 下げ推論コストを約 20〜23% 増やす。長いアーキテクチャ説明は探索を速めず完全性を約 25% 下げる。名前を挙げた test コマンドは約 1.6 倍使われる |
| Augment「AuggieBench」 | 具体例で code reuse 約 +20%、番号付きワークフローで正確さ約 +25%、決定表で遵守率約 +25%、警告の羅列で約 2 倍の遅延、孤立文書の発見率 <10% / リンク参照 >90%、リンクは 10〜15 件まで |
| GitHub 2,500 リポジトリ調査 | コマンドはコピペできる形で書く、file-scoped な検証、禁止には「代わりにやること」を対にする、"never commit secrets" が最も有用 |
| Chroma「Context Rot」/「Lost in the Middle」 | 入力が長いほど性能が劣化する。長い入力の中央に置いた事実が最も使われない |

**参照のみで文面を利用していないもの**（ライセンス表記が無く、複製が許諾されていないため）: `anthropics/skills` の spec・template（Apache-2.0 の 2 skill 以外は source-available）、`disler/claude-code-hooks-mastery`、`multica-ai/andrej-karpathy-skills`。

上記の実証研究の数値は、いずれも [Taiizor/agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook)（MIT）の `docs/best-practices.md`・`docs/common-mistakes.md` が整理した二次情報を含む。一次情報が必要な場合は各研究の原文にあたること。

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
