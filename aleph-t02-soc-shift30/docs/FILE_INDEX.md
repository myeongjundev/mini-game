# File Index

`aleph-t02-soc-shift30/` 안의 파일 목록이다. Git이 추적하는 것과 아직 추적하지
않는 것을 나눠 적는다. `node_modules/`와 빌드 산출물 `../site/`는 제외한다.

- `.claude/launch.json`
- `.gitignore`
- `AGENTS.md`
- `BUILD_ORDER.md`
- `CLAUDE.md`
- `README.md`
- `docs/AI_DECISION_LOG.md`
- `docs/ALERT_DATASET.md`
- `docs/ARCHITECTURE.md`
- `docs/DESIGN_TOKENS.md`
- `docs/FILE_INDEX.md`
- `docs/GAME_LOOP_SPEC.md`
- `docs/GAME_SPEC.md`
- `docs/HOOKS_SETUP.md`
- `docs/PIXEL_ICONS.md`
- `docs/QA_CHECKLIST.md`
- `docs/STORAGE_AND_RECOVERY.md`
- `docs/TROUBLESHOOTING.md`
- `eslint.config.js`
- `index.html`
- `package-lock.json`
- `package.json`
- `prompts/00_MASTER_BOOTSTRAP.md`
- `prompts/01_LOBBY_REVIEW_FIXES.md`
- `prompts/02_PHONE_ILLUSTRATION.md`
- `prompts/03_PHONE_PASSWORD_DISTRACTIONS_HANDOFF.md`
- `prompts/04_LOBBY_MODAL_WINDOW_HANDOFF.md`
- `prompts/05_CHARACTER_PORTRAITS_HANDOFF.md`
- `public/external-contractor-portrait-128.png`
- `public/favicon.svg`
- `public/hr-manager-portrait-128.png`
- `public/infra-engineer-portrait-128.png`
- `public/intern-03-portrait-128.png`
- `public/it-support-portrait-128.png`
- `public/lobby-modal-window.webp`
- `public/lobby-office-blank.webp`
- `public/marketing-manager-portrait-128.png`
- `public/phone-call.webp`
- `public/phone-connected.webp`
- `public/security-specialist-portrait-128.png`
- `public/team-lead-portrait-128.png`
- `src/App.integration.test.tsx`
- `src/App.memo-hang.test.tsx`
- `src/App.test.ts`
- `src/App.tsx`
- `src/components/ActionButtons.tsx`
- `src/components/AlertCard.tsx`
- `src/components/Hud.tsx`
- `src/components/LobbyModal.test.tsx`
- `src/components/LobbyModal.tsx`
- `src/components/MemoLog.tsx`
- `src/components/MemoToast.tsx`
- `src/components/PhoneOverlay.tsx`
- `src/components/PixelIcon.test.tsx`
- `src/components/PixelIcon.tsx`
- `src/components/SettingsBar.tsx`
- `src/components/ShiftLog.tsx`
- `src/components/VerdictFlash.tsx`
- `src/components/components.test.tsx`
- `src/components/screens/PausedScreen.tsx`
- `src/components/screens/ReadyScreen.test.tsx`
- `src/components/screens/ReadyScreen.tsx`
- `src/components/screens/ResultScreen.tsx`
- `src/game/config.ts`
- `src/game/data/alerts.test.ts`
- `src/game/data/alerts.ts`
- `src/game/data/memos.test.ts`
- `src/game/data/memos.ts`
- `src/game/data/pixelArt.test.ts`
- `src/game/data/pixelArt.ts`
- `src/game/engine/alertQueue.test.ts`
- `src/game/engine/alertQueue.ts`
- `src/game/engine/machine.test.ts`
- `src/game/engine/machine.ts`
- `src/game/engine/memoQueue.test.ts`
- `src/game/engine/memoQueue.ts`
- `src/game/engine/rules.test.ts`
- `src/game/engine/rules.ts`
- `src/game/engine/scoring.test.ts`
- `src/game/engine/scoring.ts`
- `src/game/hooks/hooks.test.tsx`
- `src/game/hooks/useGameLoop.ts`
- `src/game/hooks/useKeyboard.ts`
- `src/game/hooks/useVisibilityPause.ts`
- `src/game/types.ts`
- `src/main.tsx`
- `src/services/audio.test.ts`
- `src/services/audio.ts`
- `src/services/storage.test.ts`
- `src/services/storage.ts`
- `src/styles/global.css`
- `src/styles/tokens.css`
- `src/utils/format.ts`
- `tsconfig.json`
- `vite.config.ts`

## 아직 추적하지 않는 자산

패스워드 방해 요소는 `GAME_SPEC`에 규칙이 없고 참조하는 코드도 없다.
규격과 생성 경위는 `prompts/03`에 있다.

- `public/password-window-locked.webp` — 잠금 창 (쓸 예정)
- `public/password-window-unlocked.webp` — 해제 창 (쓸 예정)
- `public/password-locked.webp` — **쓰지 않는다.** 물리 장치로 잘못 만든 초기안
- `public/password-unlocked.webp` — **쓰지 않는다.** 위와 같음
- `prompts/art-source/` — 초상 원본과 반려본. **약 17.3MB.** 저장소에 넣을지 미정
- `prompts/process-it-support-portrait.ps1` — 초상 한 장을 다듬은 일회용
  스크립트. 절대 경로가 박혀 있고 나머지 일곱 장에는 쓰이지 않았다. 남길지 미정
