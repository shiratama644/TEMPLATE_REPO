---
name: verification-loop
description: Run a six-phase verification of a Claude Code session's work — build, type check, lint, tests with coverage, security grep, and diff review — then produce a PASS/FAIL verification report. Use when verifying work after completing a feature or refactor, before creating a PR, or when quality gates must pass.
license: MIT
metadata:
  origin: ECC
---

# Verification Loop Skill

A comprehensive verification system for Claude Code sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring

## Verification Phases

### Phase 1: Build Verification
```bash
set -o pipefail  # report the build's exit status, not tail's
# Check if project builds
<ビルドコマンド> 2>&1 | tail -20   # AGENTS.md §6.1 の記録に従う
```

If build fails, STOP and fix before continuing.

### Phase 2: Type Check
```bash
set -o pipefail
# 例（分野に合わせて選ぶ。AGENTS.md §6.1 の記録を優先）
# 静的な型検査: tsc --noEmit / pyright . / go vet ./...
```

Report all type errors. Fix critical ones before continuing.

### Phase 3: Lint Check

Use `sed` to limit displayed output while consuming the whole stream. This keeps a
successful linter from failing on SIGPIPE when `pipefail` is enabled.
```bash
set -o pipefail
# 例: biome check . / ruff check . / golangci-lint run
<lintコマンド> 2>&1 | sed -n '1,30p'
```

### Phase 4: Test Suite
```bash
set -o pipefail
# テストを一回実行する（watch モードは使わない）。例: pytest --cov / go test ./...
<テストコマンド> 2>&1 | tail -50

# Check coverage threshold
# Target: 80% minimum
```

Report:
- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

### Phase 5: Security Scan
```bash
# Check for secrets
gitleaks detect --source . --no-git   # 導入済みの場合（CI の secrets ジョブでも検査される）
grep -rniE "api[_-]?key|secret|token" --exclude-dir=.git . 2>/dev/null | head -10

# デバッグ出力の残り（言語に合わせて読み替える。例: console.log / print( / fmt.Println）
grep -rn "console.log" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -10
```

### Phase 6: Diff Review
```bash
# Show what changed
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

For long sessions, run verification every 15 minutes or after major changes:

```markdown
Set a mental checkpoint:
- After completing each function
- After finishing a component
- Before moving to next task

Run: /verify
```

## Integration with Hooks

This skill complements PostToolUse hooks but provides deeper verification.
Hooks catch issues immediately; this skill provides comprehensive review.
