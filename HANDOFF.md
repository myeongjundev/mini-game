# HANDOFF — 이어서 작업하려면 여기부터

마지막 갱신: 2026-08-19

## 30초 요약

SOC SHIFT:30은 **공개 주소에서 이미 동작합니다.** 게임 자체는 완성됐고,
지금은 **인트로·로비 화면을 붙이는 중**이며 코드 리뷰에서 8건이 나온 상태입니다.

- 공개 주소: https://myeongjundev.github.io/mini-game/
- 저장소: https://github.com/myeongjundev/mini-game (public)
- 프로젝트 루트: `mini-game/aleph-t02-soc-shift30/`

## 지금 상태

| 항목 | 상태 |
|---|---|
| 게임 본체 (엔진·화면·저장·접근성) | 완료, 배포됨 |
| 인트로·로비 | **구현됨, 리뷰 지적 8건 미해결** |
| 테스트 | 92개 통과 |
| lint / build / tsc | 전부 통과 |
| 난이도 실험 20판 | **미시작** |
| QA 검사표 | **미실행** |
| 증거 캡처 | **미시작** |

배포된 버전은 커밋 `f8d3772`이며 **로비가 없는 상태**입니다.
로비 작업은 아직 커밋되지 않았습니다.

## 학원 도착하면 제일 먼저

```bash
cd mini-game/aleph-t02-soc-shift30 && npm ci && npm run dev
```

`npm ci`를 빼먹지 마세요. `node_modules`는 저장소에 없습니다.
Node는 **24**를 쓰세요. vite 8이 `^20.19.0 || >=22.12.0`을 요구합니다.

## 다음에 할 일 (순서대로)

### 1. 리뷰 지적 8건 처리 — 진행 중

`notes/08-work-log.md`의 "리뷰 지적 사항" 절에 전문이 있습니다.

**코덱스에 넣을 프롬프트가 이미 작성돼 있습니다 — 아직 입력하지 않았습니다.**
`aleph-t02-soc-shift30/prompts/01_LOBBY_REVIEW_FIXES.md`의 코드 블록을
그대로 복사해 붙여넣으면 됩니다.

| 담당 | 항목 | 상태 |
|---|---|---|
| 코덱스 | C-1 판단 가이드 복구 (치명적) | 대기 |
| 코덱스 | M-1 11px 미만 글자 | 대기 |
| 코덱스 | M-3 aria-live 범위 | 대기 |
| 코덱스 | m-1 로비 진입 포커스 | 대기 |
| 클로드 | M-2 미판정 결정적 항목 | **완료** |
| 직접 | M-5 PNG 2.15MB 줄이기 | 대기 |
| 직접 | m-3 배경 이미지의 구워진 UI 제거 | 대기 |

**C-1이 제일 급합니다.** 로비 기본 화면에 조작키가 없어서 과제 완료 기준
"공개 첫 화면에서 규칙·조작이 보인다"에 미달합니다.

이미지 두 건은 **직접 하셔야 합니다.** 이 PC에 PIL·ImageMagick·sharp가 없습니다.
이미지를 만든 도구에서 모니터 화면을 비우고 1180px 이하 WebP로 다시 뽑으세요.

### 2. 게임 동작 확인 5가지

브라우저에서 rAF가 도는 상태로 직접 봐야 하는 것들입니다. 아직 아무도 못 봤습니다.

- 30초 타이머가 실제로 30초에 0이 되는가
- 아무 입력 없이 두면 미판정으로 라이프가 주는가
- 30초 내내 무입력이면 반드시 실패로 끝나는가
- **재시작 20회 후 타이머가 빨라지지 않는가** (제일 중요)
- 탭 전환 시 자동 일시정지되고 복귀 시 자동 진행하지 않는가

### 3. 난이도 실험 20판

**게임 규칙이 확정된 뒤에 시작하세요.** 중간에 바꾸면 앞 기록이 무효입니다.

- `eventIntervalMs` 1400으로 10판 → `records/playtest-before.csv`
- 1100으로 바꾸고 10판 → `records/playtest-after.csv`
- 한 판 끝날 때마다 바로 적으세요. SHIFT LOG를 보면 `failure_reason`이 바로 나옵니다
- 방법은 `notes/07-evidence-plan.md`

### 4. QA 검사표 + 증거 캡처

- 검사 절차: `aleph-t02-soc-shift30/docs/QA_CHECKLIST.md`
- 기록처: `notes/03-test-matrix.md`
- 캡처 계획: `notes/07-evidence-plan.md` (파일명까지 정해져 있음)

## 작업 분할 규칙

파일이 겹치면 서로의 작업을 덮어씁니다. 지금까지 이 규칙으로 굴러왔습니다.

| 담당 | 파일 |
|---|---|
| 코덱스 | `src/` 구현, 컴포넌트 테스트 |
| 클로드 | `docs/`, `notes/`, `BUILD_ORDER.md`, git, 브라우저 검증 |
| 공통 금지 | 상대 담당 파일에 손대지 않기 |

## 알아둘 것

- **`git checkout --`를 함부로 쓰지 마세요.** 커밋 안 된 상대 작업이 날아갑니다. 한 번 겪었습니다
- 배포는 `main` 푸시 시 자동입니다. 푸시하면 공개 주소가 바로 바뀝니다
- `site/`는 빌드 산출물이라 Git에서 제외돼 있습니다. 직접 편집하지 마세요
- `evidence/`도 제외돼 있습니다. 증거 원본은 로컬과 제출 PDF에만 두세요
- 저장소가 **public**입니다. 개인정보가 들어가지 않게 주의하세요

## 미해결 위험

1. **`useGameLoop` 프레임 구동 이상** — 테스트에서 rAF를 수동으로 21프레임 돌려도
   게임 시간이 100ms만 흐릅니다. 브라우저에서는 정상이지만 원인 미규명입니다.
   재시작 20회 검사와 함께 봐야 합니다
2. **인트로 실시간 관측 불가** — 자동화 도구의 지연이 3.1초 인트로보다 길어
   브라우저로 인트로 재생을 직접 본 사람이 아직 없습니다. 단위 테스트만 통과 상태
3. 배경 이미지에 실제 상표(`MultiSync 14`, `WINDOWS NT SECURITY`)가 읽힙니다

## 문서 지도

| 찾는 것 | 파일 |
|---|---|
| 단계별 작업 지시서 | `aleph-t02-soc-shift30/BUILD_ORDER.md` |
| 게임 규칙 원본 | `aleph-t02-soc-shift30/docs/GAME_SPEC.md` |
| 경보 15개 데이터 | `aleph-t02-soc-shift30/docs/ALERT_DATASET.md` |
| 색·폰트 규칙 | `aleph-t02-soc-shift30/docs/DESIGN_TOKENS.md` |
| 게임 루프 명세 | `aleph-t02-soc-shift30/docs/GAME_LOOP_SPEC.md` |
| 저장·복구 명세 | `aleph-t02-soc-shift30/docs/STORAGE_AND_RECOVERY.md` |
| QA 절차 | `aleph-t02-soc-shift30/docs/QA_CHECKLIST.md` |
| 과제 제출 기록 | `notes/01` ~ `notes/07` |
| 지금까지의 경과 | `notes/08-work-log.md` |
