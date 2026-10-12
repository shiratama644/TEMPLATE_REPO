# 分野を問わない作業の入口。検証手段の正本は AGENTS.md §6.1。
#
# よく使うコマンド:
#   make setup   pre-commit フックを導入（初回のみ）
#   make check   全ファイルの検証（CI と同じ入口）
#   make links   Markdown の内部リンクだけを検査

.DEFAULT_GOAL := help
.PHONY: help setup check links

PRE_COMMIT ?= pre-commit

# 分野固有の検証コマンドは、AGENTS.md §6.1 に記録してから、ここに空白区切りで追加する。
# 例: PROJECT_CHECKS = ./scripts/test.sh
PROJECT_CHECKS ?=

help: ## 利用可能なターゲットを表示
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-8s %s\n", $$1, $$2}'

setup: ## pre-commit フックを導入（初回のみ）
	$(PRE_COMMIT) install --install-hooks
	$(PRE_COMMIT) install --hook-type commit-msg

check: ## 全ファイルの検証（pre-commit の全フック + PROJECT_CHECKS）
	$(PRE_COMMIT) run --all-files --show-diff-on-failure
	@if [ -n "$(strip $(PROJECT_CHECKS))" ]; then \
		for c in $(PROJECT_CHECKS); do echo "== $$c"; $$c || exit 1; done; \
	else \
		echo "PROJECT_CHECKS は未設定（分野固有の検証は AGENTS.md §6.1 に記録してから追加する）"; \
	fi

links: ## Markdown の内部リンクだけを検査
	python3 scripts/check_doc_links.py
