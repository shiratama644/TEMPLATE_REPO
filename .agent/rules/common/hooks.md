# Hooks System (ECC origin, adapted)

## Hook Types (this repository)

Hooks are registered in `.agent/settings.json` and implemented in `.agent/hooks/`:

- **SessionStart**: runs at startup, resume, clear, and compact (`session-start.sh` injects the working state)
- **PreToolUse**: runs before a tool call; returns `hookSpecificOutput.permissionDecision: "deny"` as JSON with exit 0 to block the call (`block-dangerous-git.sh`, `pre-edit-guard.sh`). Top-level `decision`/`reason` is deprecated for PreToolUse
- **PostToolUse**: runs after a tool call; returns top-level `decision: "block"` with `reason` so the model receives the finding and can fix it (`post-edit-verify.sh`)
- Exit codes follow the official reference: `0` = success, `2` = blocking error (stderr is fed back to the model), any other non-zero = non-blocking error (stderr is shown to the user only). Never mix exit 2 with JSON output

Hooks must not depend on a specific language runtime or package manager. Project-specific checks belong in `AGENTS.md §6.1` and in `make check`.

## Auto-Accept Permissions

Use with caution:
- Enable for trusted, well-defined plans
- Disable for exploratory work
- Never use the dangerously-skip-permissions flag
- Configure `permissions.allow` in `.agent/settings.json` (shared) or `.agent/settings.local.json` (personal, gitignored) instead

## TodoWrite Best Practices

Use the TodoWrite tool to:
- Track progress on multi-step tasks
- Verify understanding of instructions
- Enable real-time steering
- Show granular implementation steps

Todo list reveals:
- Out of order steps
- Missing items
- Extra unnecessary items
- Wrong granularity
- Misinterpreted requirements
