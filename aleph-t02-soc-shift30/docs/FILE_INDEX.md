# File Index

`aleph-t02-soc-shift30/` 안의 파일 목록이다. `git ls-files` 순서를 그대로
따르므로 새 항목은 정렬 자리에 넣는다. `node_modules/`와 빌드 산출물
`../site/`는 제외한다.

**2026-08-20부터 추적하지 않는 자산은 없다.** 코드가 참조하지 않는 것까지
전부 넣었고, 무엇이 왜 있는지는 아래 절에 적었다.

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
- `prompts/06_CLAUDE_PRO_GAME_DEVELOPER_PERSONA.md`
- `prompts/07_BGM_NIGHT_WATCH_HANDOFF.md`
- `prompts/08_BGM_INTEGRATION_FINAL_HANDOFF.md`
- `prompts/09_ALEPH_ASSIGNMENT_2_FINAL_AUDIT_HANDOFF.md`
- `prompts/10_CODEX_SUBMISSION_PHASE_HANDOFF.md`
- `prompts/art-source/external-contractor-portrait-rejected-checkerboard.png`
- `prompts/art-source/external-contractor-portrait-source.png`
- `prompts/art-source/hr-manager-portrait-rejected-checkerboard.png`
- `prompts/art-source/hr-manager-portrait-source.png`
- `prompts/art-source/infra-engineer-portrait-rejected-checkerboard.png`
- `prompts/art-source/infra-engineer-portrait-source.png`
- `prompts/art-source/intern-03-portrait-rejected-checkerboard.png`
- `prompts/art-source/intern-03-portrait-source.png`
- `prompts/art-source/it-support-portrait-rejected-checkerboard.png`
- `prompts/art-source/it-support-portrait-source.png`
- `prompts/art-source/marketing-manager-portrait-rejected-checkerboard.png`
- `prompts/art-source/marketing-manager-portrait-source.png`
- `prompts/art-source/security-specialist-portrait-rejected-checkerboard.png`
- `prompts/art-source/security-specialist-portrait-source.png`
- `prompts/art-source/team-lead-portrait-64-preview.png`
- `prompts/art-source/team-lead-portrait-rejected-checkerboard.png`
- `prompts/art-source/team-lead-portrait-source.png`
- `prompts/process-it-support-portrait.ps1`
- `public/audio/soc-shift-critical-heart-loop.wav`
- `public/audio/soc-shift-lobby-loop.wav`
- `public/audio/soc-shift-play-loop.wav`
- `public/external-contractor-portrait-128.png`
- `public/favicon.svg`
- `public/hr-manager-portrait-128.png`
- `public/infra-engineer-portrait-128.png`
- `public/intern-03-portrait-128.png`
- `public/it-support-portrait-128.png`
- `public/lobby-modal-window.webp`
- `public/lobby-office-blank.webp`
- `public/marketing-manager-portrait-128.png`
- `public/password-locked.webp`
- `public/password-unlocked.webp`
- `public/password-window-locked.webp`
- `public/password-window-unlocked.webp`
- `public/phone-call.webp`
- `public/phone-connected.webp`
- `public/security-specialist-portrait-128.png`
- `public/team-lead-portrait-128.png`
- `scripts/generate-bgm-suite.mjs`
- `scripts/build-submission-pdf.py`
- `src/App.bgm.test.tsx`
- `src/App.damage.test.tsx`
- `src/App.integration.test.tsx`
- `src/App.memo-hang.test.tsx`
- `src/App.menu-keys.test.tsx`
- `src/App.phone.test.tsx`
- `src/App.test.ts`
- `src/App.tsx`
- `src/components/ActionButtons.tsx`
- `src/components/AlertCard.tsx`
- `src/components/HandoverReport.tsx`
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
- `src/game/data/phoneCalls.ts`
- `src/game/data/pixelArt.test.ts`
- `src/game/data/pixelArt.ts`
- `src/game/data/portraits.test.ts`
- `src/game/data/portraits.ts`
- `src/game/engine/alertQueue.test.ts`
- `src/game/engine/alertQueue.ts`
- `src/game/engine/handover.test.ts`
- `src/game/engine/handover.ts`
- `src/game/engine/machine.test.ts`
- `src/game/engine/machine.ts`
- `src/game/engine/memoQueue.test.ts`
- `src/game/engine/memoQueue.ts`
- `src/game/engine/phoneQueue.test.ts`
- `src/game/engine/phoneQueue.ts`
- `src/game/engine/rules.test.ts`
- `src/game/engine/rules.ts`
- `src/game/engine/scoring.test.ts`
- `src/game/engine/scoring.ts`
- `src/game/hooks/hooks.test.tsx`
- `src/game/hooks/useGameLoop.ts`
- `src/game/hooks/useKeyboard.ts`
- `src/game/hooks/useMenuKeys.ts`
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

## 코드가 참조하지 않는 자산

전부 추적한다(2026-08-20 결정). 없어도 화면은 동작하지만, 저장소를 clone한
어느 기계에서든 판단할 수 있어야 해서 넣었다.

### 패스워드 방해 요소

`GAME_SPEC`에 규칙이 없고 참조하는 코드도 없다. 규격과 생성 경위는
`prompts/03`에 있다.

- `public/password-window-locked.webp` — 잠금 창 (쓸 예정)
- `public/password-window-unlocked.webp` — 해제 창 (쓸 예정)
- `public/password-locked.webp` — **쓰지 않는다.** 물리 장치로 잘못 만든 초기안
- `public/password-unlocked.webp` — **쓰지 않는다.** 위와 같음

뒤의 둘은 **화면에 연결하면 안 된다.** 지우지 않는 이유는 같은 실수를
되풀이하지 않기 위해서다. 나중에 정리한다.

### 초상 제작물

- `prompts/art-source/*-portrait-source.png` — 고해상도 투명 원본 8장.
  초상을 다시 뽑거나 크기를 바꿀 때 쓴다
- `prompts/art-source/*-portrait-rejected-checkerboard.png` — 생성기가
  밝은 체크무늬를 배경으로 구운 반려본 8장. **게임에서 읽지 않는다**
- `prompts/art-source/team-lead-portrait-64-preview.png` — 초기 크기 검토본
- `prompts/process-it-support-portrait.ps1` — 반려본에서 배경을 걷어내고
  128×128로 줄이는 후처리 스크립트. IT 지원 한 장에만 썼고 **절대 경로가
  박혀 있다.** 다른 기계에서 그대로 돌아가지 않으므로 고쳐 쓰거나 지운다.
  절차 자체는 `prompts/05` 8절에 글로 남아 있다

`art-source/`는 약 17MB다. clone이 그만큼 무거워진다.

게임용 최종본은 `public/*-portrait-128.png` 8장이고, **원본이나 반려본을
화면에서 읽으면 안 된다.** 규격 검사 결과는 `docs/QA_CHECKLIST.md` 13절에
있다.
