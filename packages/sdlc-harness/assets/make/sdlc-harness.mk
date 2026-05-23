PYTHON ?= python3

.PHONY: help status docs-overview validate-doc-overviews validate-checkpoint validate-harness validate-current validate-pm validate-design validate-dev validate-review validate-test validate-release validate-rfc lint test-current-domain test-all build

help:
	@echo "AI SDLC Harness commands"
	@echo "  make status              查看 lifecycle 和 task 状态"
	@echo "  make docs-overview       生成 .docs 各阶段 overview.html 派生视图"
	@echo "  make validate-doc-overviews 校验 .docs 各阶段 overview.html 是否最新"
	@echo "  make validate-checkpoint 校验 open task checkpoint 是否完整"
	@echo "  make validate-harness    校验 Harness 骨架、配置和提示词语言契约"
	@echo "  make validate-current    运行当前 lifecycle phase 的 gate"
	@echo "  make validate-pm         校验产品需求产物"
	@echo "  make validate-design     校验架构设计、技术方案和任务草案"
	@echo "  make validate-dev        校验 sprint 任务状态、路径、代码 gate 和实现文档"
	@echo "  make validate-review     校验 Review report"
	@echo "  make validate-test       校验 regression/test plan"
	@echo "  make validate-release    校验 release note、smoke result 和 rollback plan"
	@echo "  make validate-rfc        校验 RFC 产物并运行完整回归入口"

status:
	$(PYTHON) tools/status.py

docs-overview:
	$(PYTHON) tools/build_doc_overviews.py --all

validate-doc-overviews:
	$(PYTHON) tools/build_doc_overviews.py --all --check

validate-checkpoint:
	$(PYTHON) tools/validate_checkpoint.py

validate-harness:
	$(PYTHON) tools/validate_harness.py
	$(PYTHON) tools/validate_prompt_language.py
	$(PYTHON) tools/validate_checkpoint.py
	$(PYTHON) tools/build_doc_overviews.py --all --check

validate-current:
	$(PYTHON) tools/run_current_gate.py

validate-pm:
	test -f .docs/INDEX.md
	$(PYTHON) tools/validate_prd.py

validate-design:
	$(PYTHON) tools/validate_design.py
	$(PYTHON) tools/validate_task_draft.py

validate-dev:
	$(PYTHON) tools/validate_tasks.py
	$(PYTHON) tools/validate_allowed_paths.py
	$(PYTHON) tools/validate_checkpoint.py
	$(MAKE) lint
	$(MAKE) test-current-domain
	$(PYTHON) tools/validate_task_docs.py

validate-review:
	test -f .docs/06_review/REVIEW_REPORT.md
	$(PYTHON) tools/validate_review.py

validate-test:
	$(MAKE) test-all
	$(PYTHON) tools/validate_test_plan.py

validate-release:
	$(MAKE) build
	$(PYTHON) tools/validate_release_plan.py

validate-rfc:
	$(PYTHON) tools/validate_rfc.py
	$(MAKE) test-all

lint:
	@echo "No project lint command configured yet. Replace this target with your stack-specific lint command."

test-current-domain:
	@echo "No domain test command configured yet. Replace this target with focused tests for current_task_id."

test-all:
	@echo "No full test command configured yet. Replace this target with the project regression suite."

build:
	@echo "No build command configured yet. Replace this target with the project build/package command."
