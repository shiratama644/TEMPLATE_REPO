---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.swift"
  - "**/*.rb"
  - "**/*.php"
  - "**/*.cs"
  - "**/*.cpp"
  - "**/*.c"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.sh"
---

# Performance Optimization (ECC origin, adapted)

## Model Selection Strategy

**Haiku** (90% of Sonnet capability, 3x cost savings):
- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems

**Sonnet** (Best coding model):
- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks

**Opus** (Deepest reasoning):
- Complex architectural decisions
- Maximum reasoning requirements
- Research and analysis tasks

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Extended Thinking + Plan Mode

In Claude Code, adaptive reasoning lets the model choose how much to think for each task.
For Fable models, Sonnet 5 and later, and Opus 4.7 and later, use effort to control reasoning
rather than a fixed token budget. Available levels depend on the model.

Control thinking through the Claude Code effort setting for the session. Record a project-wide default in `AGENTS.md §6.1` only if one is needed.

See [Claude Code model configuration](https://code.claude.com/docs/en/model-config#adjust-effort-level)
and [environment variables](https://code.claude.com/docs/en/env-vars) for supported controls.

For complex tasks requiring deep reasoning:
1. Choose a higher supported effort level, such as `/effort high`
2. Enable **Plan Mode** for structured approach
3. Use multiple critique rounds for thorough analysis
4. Use split role sub-agents for diverse perspectives

## Build Troubleshooting

If build fails:
1. Fix the build error at its root cause in the main session (no dedicated agent is included)
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
