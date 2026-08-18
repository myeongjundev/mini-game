# 코덱스 프롬프트 — 인트로·로비 리뷰 지적 수정

**상태: 아직 입력하지 않음.** 학원에서 이 블록을 그대로 복사해 Codex에 붙여넣으세요.

리뷰 전문은 `mini-game/notes/08-work-log.md`의 "리뷰 지적 사항" 절에 있습니다.
이 프롬프트는 8건 중 **코덱스 담당 4건**만 담고 있습니다.
`M-2`는 완료됐고, `M-5`·`m-3`는 이미지 작업이라 직접 하셔야 합니다.

---

```text
인트로·로비 리뷰 결과 중 4건을 고쳐라.
App.tsx와 App.integration.test.tsx는 다른 작업자가 담당하니 건드리지 마라.
게임 규칙, 인트로 타이밍(3100ms/580ms), @media (max-width:640px) 블록,
720px 게임 화면 레이아웃도 건드리지 마라.

────────────────────────────────
C-1. (치명적) 판단 가이드 회귀 — ReadyScreen.tsx, global.css

로비 개편에서 조작키 안내와 예시 카드 2장이 사라졌다.
지금 MENU 화면에는 조작키가 한 글자도 없고 HOW TO PLAY를 눌러야 나온다.
과제 완료 기준 위반이다.
- notes/01: "규칙·조작·상태는 공개 첫 화면에서 15초 안에"
- docs/GAME_SPEC.md 12절: "무엇을 눌러야 하는지 즉시 알 수 있어야 한다"

1) MENU 패널에 조작키 한 줄을 항상 노출해라.
   "A / ←  ALLOW    D / →  BLOCK    P / ESC  PAUSE"
2) HOW TO PLAY 패널에 예시 카드 2장을 되살려라.
   ALERTS에서 https-normal(정상), ssh-brute(위협)을 찾아
   사실 4줄과 suspiciousMarker를 실제로 렌더하고
   "표시가 하나도 없습니다 → ALLOW", "표시가 세 개입니다 → BLOCK"을 붙여라.
   하드코딩하지 마라. 데이터가 바뀌면 예시도 바뀌어야 한다.
3) global.css 741~805행 부근의 .ready-example* 규칙 12개가
   렌더링 없이 남아 있다. 위 예시 카드에 재사용하거나 삭제해라.
4) components.test.tsx의 'renders the lobby menu and current shift record'는
   버튼 존재만 확인하고 학습 내용을 검증하지 않는다.
   MENU에 조작키가 보이는지, HOW TO PLAY에 마커가 3개 렌더되는지 검증해라.

────────────────────────────────
M-1. (중요) 11px 미만 글자 — global.css:86

.crt-display { font-size: clamp(7px, 0.82vw, 13px) } 가 문제다.
docs/DESIGN_TOKENS.md 8절 "11px 미만 글자" 금지 위반이다. 실측:
  1280×720  기준 10.50px / 헤더·푸터 7.56px / 로비 부제 7.35px
  1920×1080 기준 13.00px / 헤더·푸터 9.36px / 로비 부제 9.10px
SOUND, REDUCE MOTION은 조작 버튼인데 7.56px다.
641~1340px 구간 전체가 사각지대이고 확대 125%도 여기 들어온다.

- clamp 하한을 11px로 올려라. 예: clamp(11px, 0.95vw, 14px)
- .lobby-console-header / -footer / .lobby-status-grid / .lobby-title p 의
  0.72em, 0.7em 을 0.85em 이상으로 올려라
- 키운 뒤 CRT 내부가 넘치면 폰트를 줄이지 말고
  .crt-display의 width/height %를 키워 박스를 넓혀라

────────────────────────────────
M-3. (중요) aria-live가 버튼 5개를 감싼다 — ReadyScreen.tsx

.crt-display의 aria-live="polite" 안에 조작 버튼이 전부 들어 있어
HOW TO PLAY ↔ MENU 전환마다 스크린리더가 영역 전체를 다시 읽는다.
aria-live를 인트로 텍스트(BOOT/INITIALIZING/TITLE/READY)에만 걸어라.
LOBBY 콘솔에는 걸지 마라.

────────────────────────────────
m-1. (경미) LOBBY 진입 시 포커스 — ReadyScreen.tsx

인트로를 스킵한 키보드 사용자는 Tab을 눌러야 START SHIFT에 닿는다.
LOBBY로 전환되는 시점에 START SHIFT로 focus()를 옮겨라.
첫 진입(playIntro=false)에도 적용할지는 판단하고 근거를 보고해라.

────────────────────────────────
검증 후 보고
- npm run lint / npm test -- --run / npm run build
- 1280×720, 1366×768, 1920×1080, 640px에서 CRT 내부 최소 글자 크기를 표로
- MENU / HOW TO PLAY / SHIFT RECORD 패널이 각 해상도에서 넘치지 않는지
- 콘솔 오류 0건

BUILD_ORDER.md 14절 형식으로 보고해라.
```

---

## 코덱스가 끝난 뒤 할 일

클로드에게 넘기면 아래를 실행합니다.

1. 세 해상도(1280·1366·1920)와 640px에서 CRT 내부 글자 크기 재실측
2. MENU / HOW TO PLAY / SHIFT RECORD 패널 넘침 확인
3. 콘솔 오류·외부 네트워크 요청 확인
4. 결과 화면에서 재시작 후 로비 복귀 시 인트로 미재생 확인
5. 통과하면 커밋·푸시·배포 확인

## 남은 항목

| 항목 | 담당 | 내용 |
|---|---|---|
| M-5 | 직접 | PNG 2.15MB → 1180px 이하 WebP, 목표 400KB |
| m-3 | 직접 | 배경 이미지의 모니터 화면 영역 비우기, 상표 제거 |
