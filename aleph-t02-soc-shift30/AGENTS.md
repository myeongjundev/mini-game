# AGENTS.md — Codex Working Agreement

## Mission
Implement and verify **SOC SHIFT:30**, a 30-second browser SOC decision game.

## Current phase (2026-08-21) — read this before anything else
**Feature work is done. Game rules are frozen. Build, lint, and 291 tests pass,
and the local build hash matches what is deployed.**

Start from `prompts/10_CODEX_SUBMISSION_PHASE_HANDOFF.md`. It states what is
frozen, what is left, and what must not be touched. There is **no pending code
task** — do not start one unless the user asks.

Two things that are easy to get wrong right now:
- `DIFFICULTY.eventIntervalMs` is fixed at 3000 by user decision. Do not tune it.
- `records/*.csv` are intentionally empty. Do not fill them with invented numbers.

## Read first
Before modifying code, read:
1. `docs/GAME_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/QA_CHECKLIST.md`
4. `docs/TROUBLESHOOTING.md` — bugs already hit here, and the checks that block them

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
- **This repository is public.** `evidence/` and `실행 이미지/` hold screen
  captures and are gitignored. Do not un-ignore them or commit their contents —
  what is in a capture is unknown until someone opens it.
- **Do not edit files with `perl -0pi` or `sed -i`.** This is a CRLF repository
  and those commands have corrupted files here three times. Use an editing tool.
- Do not record a check as passed unless it was actually run.
- Do not submit the assignment without the user's explicit go-ahead.

## Completion report
Return:
- changed files
- behavior implemented
- commands/checks run
- known limitations
- next recommended task
