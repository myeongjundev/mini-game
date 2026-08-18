# AGENTS.md — Codex Working Agreement

## Mission
Implement and verify **SOC SHIFT:30**, a 30-second browser SOC decision game.

## Read first
Before modifying code, read:
1. `docs/GAME_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/QA_CHECKLIST.md`

## Architecture
- Static frontend: React 18 + Vite + TypeScript
- Keep game engine deterministic and testable.
- Keep UI rendering separate from rule evaluation.
- Spring Boot and every other backend are outside the T02 scope.

## Product constraints
Do not expand scope before MVP passes.
Do not add auth, OAuth, real security integrations, LLM calls, WebSocket, or unnecessary libraries unless the user explicitly requests them.

## Source of truth
- Game rules: `docs/GAME_SPEC.md`
- Persistence: `docs/STORAGE_AND_RECOVERY.md`
- Acceptance/QA: `docs/QA_CHECKLIST.md`

## Expected workflow
1. Inspect current repository state.
2. State a short plan.
3. Make the smallest coherent change.
4. Run the narrowest relevant checks.
5. Fix failures caused by the change.
6. Summarize changes and evidence.

## Frontend checks
Prefer existing package manager and scripts.
At minimum:
- build
- lint if configured
- tests if configured
- inspect responsive behavior
- no console errors
- keyboard input does not double-fire
- timers/listeners are cleaned up

## Safety
- Never commit secrets.
- Never overwrite `.env` or secret config with guessed values.
- Avoid destructive git commands.
- Do not force push.
- Ask before adding a production dependency unless clearly required.

## Completion report
Return:
- changed files
- behavior implemented
- commands/checks run
- known limitations
- next recommended task
