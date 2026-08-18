# Claude Code Hooks Setup

Hooks는 **반복 검증을 자동화하는 안전장치**로만 사용한다.
판단이 필요한 게임 규칙 변경을 hook으로 처리하지 않는다.

## 추천 Hook 1 — 파일 수정 후 포맷/정적 검사
목적:
- React 파일 수정 후 lint/format 누락 방지

초기에는 hook을 너무 무겁게 만들지 않는다.
매 Edit마다 전체 frontend build를 돌리면 개발 속도가 크게 떨어질 수 있다.

권장:
- JS/TS/CSS 수정 → formatter
- 작업 종료 → lint/build

## 추천 Hook 2 — 위험한 명령 경고
다음 유형을 자동 실행하지 않도록 방어:
- force push
- destructive git clean/reset
- 루트 디렉터리 삭제
- secret 출력

## 추천 Hook 3 — 완료 시 QA reminder
작업이 끝날 때:
- build/test 했는지
- 콘솔 오류 확인했는지
- docs 업데이트 했는지
점검.

## 적용 전 원칙
1. `.claude/settings.example.json`로 먼저 관리한다.
2. 팀/개인 환경에서 command가 실제 동작하는지 확인한다.
3. 확인 후 `.claude/settings.json`로 옮긴다.
4. Windows/Git Bash/PowerShell 차이를 고려한다.

## Claude에게 설정을 맡길 때 프롬프트
```text
현재 저장소의 package.json, Gradle wrapper, 운영체제를 먼저 확인해.
docs/HOOKS_SETUP.md의 목적을 만족하되,
존재하지 않는 명령을 가정하지 말고
가벼운 PostToolUse 검증 hook과 위험 명령 방지 hook을 설계해줘.
바로 활성화하지 말고 settings.example.json부터 작성하고
각 hook의 실행 조건과 실패 영향을 설명해줘.
```
