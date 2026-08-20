# CLAUDE.md — SOC SHIFT:30 Project Instructions

## 1. 역할
이 저장소에서 Claude Code는 **구현자이자 검증자**다.
빠르게 코드를 늘리는 것보다 과제 완료 기준, 유지보수성, 검증 가능성을 우선한다.

## 2. 제품 정의
SOC SHIFT:30은 30초 동안 SOC 분석가가 되어 보안 이벤트를 보고
`ALLOW` 또는 `BLOCK`을 판단하는 브라우저 미니게임이다.

핵심 루프:
`이벤트 등장 → 판단 → 즉시 결과 → 점수/라이프/콤보 갱신 → 다음 이벤트`

## 3. 기술 방향
- Frontend: React 18 + Vite + TypeScript 정적 프론트엔드
- Spring Boot를 포함한 백엔드는 **T02 범위 밖**이며 구현하지 않는다.
- 최고 점수와 접근성 설정은 브라우저 localStorage에 저장한다.
- 기존 프로젝트에 버전/도구가 이미 정해져 있으면 그것을 우선한다.

## 4. 절대 지켜야 할 범위
첫 릴리스 전 추가하지 않는다:
- 회원가입/로그인
- OAuth
- 실제 보안 장비 연동
- 실제 IP 차단
- LLM API
- WebSocket
- 복잡한 관리자 페이지
- 과도한 애니메이션
- 불필요한 상태관리 라이브러리

## 5. 구현 규칙
- 변경 전에 관련 파일을 먼저 읽는다.
- 큰 작업은 계획 → 작은 변경 → 검증 순서로 진행한다.
- 한 번에 여러 책임을 섞지 않는다.
- 게임 규칙은 `docs/GAME_SPEC.md`를 source of truth로 사용한다.
- 저장 규칙 변경 시 `docs/STORAGE_AND_RECOVERY.md`도 업데이트한다.
- 임의로 게임 규칙을 바꾸지 않는다.
- 사용자에게 보이는 용어는 한국어/영어 혼용을 최소화하고 일관되게 유지한다.

## 6. 프론트엔드 품질 게이트
프론트 변경 후 확인:
- build 성공
- lint 오류 없음
- 콘솔 빨간 오류 0
- 1366px / 1920px에서 가로 overflow 없음
- 키보드와 마우스 모두 핵심 조작 가능
- focus 이탈 시 게임이 불공정하게 진행되지 않음
- Restart 후 현재 판 state 초기화
- Mute / Reduce Motion 즉시 반영
- 저장값 손상 시 fallback

## 7. 작업 종료 형식
각 작업 완료 시 반드시 요약:
1. 변경한 파일
2. 구현한 것
3. 실행한 검증
4. 남은 위험/미완료
5. 다음 추천 작업

## 8. 참고 문서
- `BUILD_ORDER.md`
- `docs/GAME_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/ALERT_DATASET.md`
- `docs/PIXEL_ICONS.md`
- `docs/DESIGN_TOKENS.md`
- `docs/STORAGE_AND_RECOVERY.md`
- `docs/QA_CHECKLIST.md`
- `docs/AI_DECISION_LOG.md`
- `docs/TROUBLESHOOTING.md` — 겪은 버그의 증상·원인·막는 검사. 판이 멈추거나
  화면이 깨지면 여기부터 본다. 새 기능을 붙이기 전에 "되풀이되는 원인 셋"을 읽는다.
