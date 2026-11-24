# Bun が唯一の依存・検証入口。互換用 make ターゲットは bun run を呼ぶ。
.DEFAULT_GOAL := help
.PHONY: help setup init github-settings check links mermaid agents index shell length coverage lang test
BUN ?= bun
help: ## 利用可能なターゲットを表示
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-8s %s\n", $$1, $$2}'
setup: ## 安全に Git フックを登録（既存フックがある場合は停止）
	$(BUN) run hooks:install
init: ## テンプレート初期化の TUI（文書を生成し直す。--dry-run 相当は bun run init -- --dry-run）
	$(BUN) run init
github-settings: ## GitHub の repository 設定を gh で一括設定（dry-run。--apply で適用）
	$(BUN) run github:settings
check: ## Bun の全検証（CI と同じ入口）
	$(BUN) run check
links: ## Markdown 内部リンク
	$(BUN) run links
mermaid: ## Mermaid 宣言
	$(BUN) run mermaid
agents: ## AGENTS.md の品質
	$(BUN) run agents
index: ## .agent/ の入口 index と実物の整合
	$(BUN) run index
shell: ## POSIX sh の構文と bashism
	$(BUN) run shell
length: ## 関数の行数（上限 100 行）
	$(BUN) run length
coverage: ## テストと行カバレッジの下限
	$(BUN) run coverage
lang: ## ファイル・コミットの言語
	$(BUN) run lang
test: ## CLI・検査スクリプトのテスト
	$(BUN) test
