# 내가 설계한 미니게임 — 작업 폴더

SKT ALEPH 과제 2를 구현하고 검증하기 위한 비공개 작업 루트입니다.

## 폴더 규칙

```text
mini-game/
├─ aleph-t02-soc-shift30/   게임 프로젝트 루트. 소스와 구현 명세 문서
├─ site/                    빌드 산출물. CI가 만들고 Git에는 넣지 않는다
├─ notes/                   기획, 검사표, 제출 문구 초안
├─ records/                 플레이 10회 전·후 기록
├─ evidence/                화면 캡처와 검사 증거 원본
├─ .github/workflows/       GitHub Pages 배포
└─ README.md
```

`notes`와 `aleph-t02-soc-shift30/docs`는 역할이 다릅니다. `notes`는 **과제 제출용 기록**이고, `docs`는 **구현 명세**입니다. 같은 주제를 다루는 문서는 `notes` 쪽을 제출 원본으로 씁니다.

`notes`, `records`, `evidence`는 공개 사이트와 Git 배포 범위에 넣지 않습니다. 개인정보, 비밀번호, 토큰, API 키와 손상 저장값 검사 원본도 `site`에 두지 않습니다.

GitHub 저장소는 집과 교육장 사이에서 작업을 이어가기 위한 비공개 저장소로 관리합니다. `notes`와 빈 기록 템플릿은 동기화하되, `evidence`의 실제 원본은 `.gitignore`로 제외합니다. 공개 배포는 저장소 전체가 아니라 `site`만 대상으로 구성합니다.

## 현재 결정 상태

- 세계관과 제목: **SOC SHIFT:30** — 새벽 3시 17분 SOC 야간 근무
- 게임 장르: 보안 판단 게임 (ALLOW / BLOCK)
- 표현 방식: 16비트 도트 감성을 **아이콘에만** 적용. 정보 텍스트는 모노스페이스
- 화면 톤: NIGHT SHIFT 콘솔 — 뉴트럴 다크 + 시안 / 앰버 / 레드 3축
- 구현 기술: Vite + React 18 + TypeScript. 백엔드 없이 정적 배포
- 공개 방식: GitHub Actions로 빌드해 GitHub Pages 배포
- 프로젝트 루트: `aleph-t02-soc-shift30/`

상세 명세와 작업 지시서는 `aleph-t02-soc-shift30/BUILD_ORDER.md`에 있습니다.

## 진행 순서

- [x] 1. `notes/01-assignment-brief.md`에서 필수 요구사항을 확정한다.
- [x] 2. `notes/02-game-design.md`에서 규칙 한 문장과 게임 상태를 결정한다.
- [x] 3. `notes/03-test-matrix.md`의 숨은 검사 범주를 구현 전에 설계한다.
- [x] 4. `notes/04-storage-and-recovery.md`에서 초기화값과 보존값을 분리한다.
- [ ] 5. `aleph-t02-soc-shift30/`에 최소 한 판을 구현한다. 단계별 지시는 `BUILD_ORDER.md` 11절을 따른다.
- [ ] 6. 최초 난이도로 10회 플레이하고 `records/playtest-before.csv`에 기록한다.
- [ ] 7. `eventIntervalMs`만 1400 → 1100으로 바꾸고 10회를 `records/playtest-after.csv`에 기록한다.
- [ ] 8. `notes/03-test-matrix.md`의 검사표를 실행한다. 절차는 `aleph-t02-soc-shift30/docs/QA_CHECKLIST.md`에 있다.
- [ ] 9. 공개 배포 후 검증 안내서, AI 3줄, 증거 PDF를 준비한다.

배포는 `main` 푸시 시 GitHub Actions가 `aleph-t02-soc-shift30/`을 빌드해 `site/`를 GitHub Pages로 올립니다.
저장소 Settings → Pages에서 Source를 `GitHub Actions`로 설정해야 동작합니다.

## 완료 정의

- 공개 주소에서 규칙·조작·현재 상태가 보인다.
- 한 번의 조작이 한 번의 상태 변화로 반영된다.
- 진행·성공·실패가 분명하고 다시 시작하면 현재 판이 초기화된다.
- 음소거 또는 움직임 줄이기가 즉시 작동한다.
- 숨은 검사 범주와 난이도 전·후 데이터 요구를 증거로 확인할 수 있다.
