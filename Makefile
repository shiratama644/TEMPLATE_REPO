# Bun が唯一の依存・検証入口。互換用 make ターゲットは bun run を呼ぶ。
.DEFAULT_GOAL := help
.PHONY: help setup check links mermaid agents lang test
BUN ?= bun
help: ## 利用可能なターゲットを表示
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-8s %s\n", $$1, $$2}'
setup: ## 安全に Git フックを登録（既存フックがある場合は停止）
	$(BUN) run hooks:install
check: ## Bun の全検証（CI と同じ入口）
	$(BUN) run check
links: ## Markdown 内部リンク
	$(BUN) run links
mermaid: ## Mermaid 宣言
	$(BUN) run mermaid
agents: ## AGENTS.md の品質
	$(BUN) run agents
lang: ## ファイル・コミットの言語
	$(BUN) run lang
test: ## CLI・検査スクリプトのテスト
	$(BUN) test
