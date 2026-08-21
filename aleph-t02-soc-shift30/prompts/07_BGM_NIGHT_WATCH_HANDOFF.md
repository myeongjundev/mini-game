# SOC SHIFT:30 BGM 3트랙 인계서

마지막 갱신: 2026-08-21

SOC SHIFT:30의 첫 게임 플레이용 배경음악 시안이다. 배포본의 야간 사무실,
CRT 관제 화면, 30초 판단 루프를 기준으로 제작했다. **음원과 재생 가능한 생성
스크립트는 완성됐고 게임 코드 연결은 아직 하지 않았다.** 세 곡은 사용자 청취
승인을 받았다. 최종 연결 작업은 `prompts/08_BGM_INTEGRATION_FINAL_HANDOFF.md`를
따른다.

## 1. 최종 파일

| 구분 | 파일 |
|---|---|
| 로비 BGM | `public/audio/soc-shift-lobby-loop.wav` |
| 플레이 BGM | `public/audio/soc-shift-play-loop.wav` |
| 하트 1개 BGM | `public/audio/soc-shift-critical-heart-loop.wav` |
| 3트랙 재생성 스크립트 | `scripts/generate-bgm-suite.mjs` |

모바일 청취용 임시 페이지와 반려 WAV 두 개는 최종 승인 후 삭제했다. 공개
사이트에는 아래 확정된 세 곡만 남긴다.

## 2. 음악 사양

| 상태 | 제목 | 길이 | 역할 |
|---|---|---:|---|
| READY/로비 | `NIGHT OPERATIONS` | 32초 | 밝고 친근한 콘솔 어드벤처 왈츠 |
| PLAYING, lives > 1 | `ANALYST PULSE` | 30초 | 로비 선율을 이어받은 밝은 콘솔 액션 |
| PLAYING, lives === 1 | `LAST LINE` | 8초 | 빠른 심박과 마지막 기회 압박 |

- 포맷: PCM 16-bit WAV
- 샘플레이트: 22,050Hz
- 채널: 모노
- 로비: 32초, 90 BPM 3박자, C장조 계열, 피크 0.28, RMS 약 0.0716
- 플레이: 30초, 120 BPM, A단조 중심, 피크 0.36, RMS 약 0.0629
- 하트 1개: 8초, 피크 0.46, RMS 약 0.1285

30초 게임과 같은 길이지만 음악 위치를 게임 타이머의 source of truth로 쓰지
않는다. 루프와 게임 시계는 독립적으로 관리한다.

## 3. 사운드 방향

목표는 긴장감을 주되 경보 읽기와 판정 효과음을 방해하지 않는 것이다.

- 로비: 아주 약한 장비 험, Cmaj7 계열 패드, 둥근 마림바풍 베이스와
  목관처럼 가벼운 오리지널 3박자 멜로디. 강한 드럼·심박·노이즈 틱 없음
- 플레이: 로비와 같은 마림바·목관풍 음색, Am7–Fmaj7–Cmaj7–G6 진행,
  빠른 아르페지오와 오리지널 임무 멜로디
- 하트 1개: 빠른 이중 심박, 트라이톤 경고, 촘촘한 데이터 틱
- 공통: 판정 효과음을 위한 넓은 주파수·음량 여백

화려한 리드 멜로디, 보컬, 큰 드럼, 공포 효과음은 넣지 않았다. 플레이어의
주의 중심은 음악이 아니라 현재 경보의 사실 행이어야 한다.

## 4. 생성과 수정

외부 음악, 샘플 팩, 생성형 음악 서비스는 사용하지 않았다. 파형과 노이즈를
코드로 합성한 독자적인 트랙이다.

프로젝트 루트에서 다음 명령으로 같은 WAV를 다시 만든다.

```bash
node scripts/generate-bgm-suite.mjs
```

스크립트에서 수정할 주요 값:

- `lobbyBeat`, `playBeat`, `criticalBeat`: 상태별 속도
- `lobbyChords`, `playRoots`, `playSignals`: 화성과 신호음
- 각 `level`: 레이어 음량
- `tone`, `tick`, `pulse`: 공통 음색과 리듬

생성 스크립트는 고정된 노이즈 시드를 사용하므로 같은 코드에서는 같은 결과가
나온다.

## 5. 연결 시 권장 규칙

1. 로비 BGM도 최초 사용자 입력 이후에만 재생한다. 자동 재생 정책을 우회하지 않는다.
2. `muted === true`이면 재생을 시작하지 않거나 즉시 정지한다.
3. 기존 5단계 음량 설정을 마스터 음량으로 재사용한다.
4. START SHIFT에서 로비 곡을 정지하고 플레이 곡을 처음부터 재생한다.
5. `lives === 1`이 되는 판정 직후 플레이 곡을 정지하고 하트 1개 곡으로 교체한다.
6. 두 BGM을 겹쳐 틀지 않는다. 100~180ms의 짧은 교차 전환만 허용한다.
7. 게임 일시정지와 탭 비활성화 중에는 현재 BGM도 일시정지한다.
8. 재개 시 처음부터 다시 틀지 말고 멈춘 지점에서 이어간다.
9. 성공·실패에서는 현재 곡을 정지한다. Restart로 READY에 돌아오면 사용자
   제스처가 이미 있으므로 로비 곡을 처음부터 재생할 수 있다.
10. 메모나 전화가 떴을 때는 현재 BGM을 계속 유지한다. 이것들은 근무 중 사건이다.
11. 정답·오답 효과음은 BGM보다 선명해야 한다. 처음에는 BGM 실효 음량을 현재
   효과음보다 낮게 두고, 필요할 때만 짧은 ducking을 추가한다.
12. `loop = true`를 사용하되 게임 시간 계산을 오디오 `currentTime`에 의존하지
   않는다.
13. 로딩 또는 재생 실패가 게임 루프를 중단하면 안 된다.

브라우저 자동 재생 정책 때문에 페이지 로드나 READY 진입만으로 재생을
시도하지 않는다.

## 6. 구현 예상 위치

- `src/services/audio.ts` — BGM 재생·일시정지·재개·정지 API
- `src/services/audio.test.ts` — 음소거, 음량, 정리, 실패 fallback 검사
- `src/App.tsx` 또는 게임 상태 경계 — READY/PLAYING/PAUSED/결과 상태 연결
- 필요 시 `src/game/hooks/useVisibilityPause.ts` — 기존 일시정지 흐름 재사용
- `docs/QA_CHECKLIST.md` — 실제 청취 및 상태 전환 검사 추가

별도 전역 상태 라이브러리나 새 오디오 패키지는 필요하지 않다.

## 7. 완료 조건

- START SHIFT 한 번에 BGM 인스턴스가 하나만 재생된다.
- Restart를 20회 반복해도 겹쳐 재생되지 않는다.
- SOUND OFF에서 즉시 무음이 되고 SOUND ON에서 정책대로 복귀한다.
- 5단계 VOLUME이 BGM에도 즉시 반영된다.
- PAUSED와 탭 비활성화 중 음악 위치가 진행하지 않는다.
- 결과 화면에서는 음악이 남지 않고, READY에서는 로비 곡만 재생된다.
- 정답·오답·CRITICAL 효과음이 BGM 위에서 명확히 들린다.
- 오디오 로딩 실패에서도 게임은 정상적으로 플레이된다.
- 콘솔 오류, 외부 네트워크 요청, 새 런타임 의존성이 없다.
- `npm test`, `npm run lint`, `npm run build`가 통과한다.

## 8. Claude에게 전달할 프롬프트

```text
prompts/06_CLAUDE_PRO_GAME_DEVELOPER_PERSONA.md와
prompts/07_BGM_NIGHT_WATCH_HANDOFF.md를 먼저 읽어라.

public/audio의 soc-shift-lobby-loop.wav, soc-shift-play-loop.wav,
soc-shift-critical-heart-loop.wav를 기존 오디오 서비스에 연결해줘.
로비/PLAYING/하트 1개 상태마다 정확히 한 곡만 재생하고, PAUSED/탭 비활성화에서는
멈춘 위치를 유지하며, 결과/READY/재시작에서는 정지 후 0으로 초기화해라.
기존 SOUND와 5단계 VOLUME 설정을 재사용하고 효과음은 그대로 유지해라.

게임 타이머를 오디오 시간에 연결하지 말고, 재생 실패가 게임을 막지 않게 해라.
관련 테스트를 추가한 뒤 npm test, npm run lint, npm run build를 실행하고
실제 브라우저에서 중복 재생·음소거·볼륨·일시정지·재시작을 확인해라.
```
