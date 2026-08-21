# BGM 3트랙 최종 연결 — Claude 인계서

마지막 갱신: 2026-08-21
결정 상태: **세 곡 모두 사용자 청취 승인 완료, 코드 연결만 남음**

이 문서는 확정된 BGM을 현재 게임 상태에 연결하기 위한 최종 구현 지시서다.
음악 제작 과정은 `prompts/07_BGM_NIGHT_WATCH_HANDOFF.md`에 있고, 이번 작업은
음원을 다시 만들거나 게임 규칙을 바꾸는 작업이 아니다.

---

## 1. 반드시 사용할 자산

| 게임 상태 | 표시 제목 | 파일 | 길이 |
|---|---|---|---:|
| READY 로비 | `NIGHT OPERATIONS` | `public/audio/soc-shift-lobby-loop.wav` | 32초 |
| PLAYING, lives 2~3 | `ANALYST PULSE` | `public/audio/soc-shift-play-loop.wav` | 30초 |
| PLAYING, lives 1 | `LAST LINE` | `public/audio/soc-shift-critical-heart-loop.wav` | 8초 |

세 파일은 PCM 16-bit, 22,050Hz, 모노 WAV이며 브라우저 공개 경로는
`import.meta.env.BASE_URL`을 반드시 거친다.

```ts
`${import.meta.env.BASE_URL}audio/soc-shift-lobby-loop.wav`
```

### 삭제된 임시 자산

모바일 청취 페이지와 이전 비교 시안 두 개는 최종 승인 후 저장소와 공개
배포물에서 삭제했다. 구현 시 다시 만들거나 참조하지 않는다.

---

## 2. 확정된 상태 전환

| 현재 상태 | 조건/이벤트 | BGM 동작 |
|---|---|---|
| READY | 사용자가 SOUND를 켜거나 허용된 첫 상호작용 발생 | 로비곡 재생 |
| READY → PLAYING | START SHIFT | 로비곡 정지·0초 초기화, 플레이곡 0초부터 재생 |
| PLAYING | lives 2~3 | 플레이곡 반복 |
| PLAYING | lives가 2에서 1로 감소 | 플레이곡 정지·초기화, 위기곡 즉시 0초부터 재생 |
| PLAYING, lives 1 | 메모·전화 표시 | 위기곡 계속 재생 |
| PLAYING → PAUSED | 수동/탭 비활성화 | 현재 곡 일시정지, 재생 위치 유지 |
| PAUSED → PLAYING | 재개 | 멈춘 곡을 같은 위치에서 재개 |
| PLAYING → SUCCESS/FAILURE | 게임 종료 | 현재 곡 정지·0초 초기화 |
| SUCCESS/FAILURE → READY | RESTART | 결과곡 없음. 사용자 제스처이므로 로비곡 0초부터 재생 가능 |
| 모든 상태 | SOUND OFF | 현재 곡 즉시 일시정지 |
| 모든 상태 | SOUND ON | 현재 상태에 맞는 곡 재개 또는 시작 |

이 프로젝트에는 라이프 회복 규칙이 없다. 따라서 `lives === 1`에서 다시
플레이곡으로 돌아가는 전이는 새로 만들지 않는다.

### 전환 원칙

- 동시에 두 곡을 재생하지 않는다.
- 첫 구현은 하드 컷으로 충분하다. 교차 재생이나 오디오 애니메이션을 추가하지
  않는다.
- 메모와 전화는 PLAYING 안의 사건이므로 BGM을 멈추거나 바꾸지 않는다.
- CRITICAL tier 경보 효과음과 `LAST LINE` BGM은 별개다. 기존 효과음을 제거하지
  않는다.
- 오디오 재생 위치를 게임 타이머의 기준으로 사용하지 않는다.

---

## 3. 기존 코드에서 지켜야 할 것

현재 `src/services/audio.ts`의 `AudioEngine`은 Web Audio oscillator로 다음
효과음을 만든다.

- `CORRECT`
- `INCORRECT`
- `CRITICAL`

기존 효과음 API와 테스트를 깨지 않는다. BGM은 파일 기반이므로
`HTMLAudioElement` 또는 별도 주입 가능한 팩터리를 `AudioEngine` 경계에
추가하는 방식이 가장 작다.

권장 타입 방향:

```ts
export type BgmKind = 'LOBBY' | 'PLAY' | 'LAST_LINE'
```

구체적인 메서드명은 현재 코드 스타일에 맞추되 다음 동작은 분리되어야 한다.

- 상태에 맞는 곡 시작/교체
- 현재 곡 일시정지
- 같은 위치에서 재개
- 정지와 `currentTime = 0` 초기화
- 즉시 음량 변경
- 전체 정리

`disable()`은 기존 oscillator뿐 아니라 생성한 BGM 요소와 이벤트도 모두
정리해야 한다. React 재렌더마다 `new Audio()`가 실행되지 않도록 한다.

---

## 4. 음량 정책

기존 `Saved.volumeStep` 5단계와 `mute`를 그대로 재사용한다. 새로운 BGM 전용
설정이나 localStorage 필드를 만들지 않는다.

BGM은 판정 효과음보다 낮아야 한다. 첫 구현 권장 HTML audio volume:

```ts
const BGM_VOLUME = [0.04, 0.08, 0.12, 0.16, 0.20] as const
```

- SOUND OFF 즉시 무음
- SOUND ON 즉시 현재 상태에 맞게 복귀
- VOLUME 변경 즉시 현재 BGM에 반영
- 효과음의 기존 `PEAK_BY_VOLUME`은 변경하지 않음
- ducking은 첫 구현 범위 밖. 실제 청취에서 효과음이 묻힐 때만 추가

---

## 5. 자동 재생 정책

페이지 로드만으로 음악을 재생하려 하지 않는다. 모바일 Safari와 Chrome에서
막히는 것이 정상이다.

- 저장값이 SOUND ON이어도 첫 사용자 제스처 전에는 재생 실패를 허용한다.
- `START SHIFT`, SOUND 토글, Restart 같은 실제 클릭/키 입력에서 재생을
  활성화한다.
- `play()` Promise rejection은 삼키되 게임 루프는 계속 진행한다.
- 재생 실패를 콘솔 오류로 반복 출력하지 않는다.
- 자동 재생을 우회하는 타이머, 숨은 클릭, 외부 라이브러리를 넣지 않는다.

---

## 6. 수정 예상 파일

- `src/services/audio.ts` — BGM 파일 관리와 상태별 API
- `src/services/audio.test.ts` — 주입 가능한 audio element stub과 회귀 검사
- `src/App.tsx` — phase, lives, mute, volume의 BGM 동기화
- 필요 시 `src/App.*.test.tsx` — 실제 상태 전환 수준 검사
- `docs/QA_CHECKLIST.md` — 사람 청취가 필요한 검사 기록

현재 작업트리에 사용자/Claude의 미커밋 변경이 있다. reset, checkout, 대량
치환을 하지 말고 먼저 `git status`와 겹치는 변경을 확인한다.

게임 규칙, 경보 데이터, 점수, 라이프, 타이머, 전화·메모 동작은 수정하지 않는다.
새 패키지도 추가하지 않는다.

---

## 7. 필수 자동 테스트

### 오디오 서비스

- muted 상태에서는 BGM 재생을 시도하지 않는다.
- 같은 `BgmKind`를 반복 동기화해도 새 인스턴스나 중복 재생이 생기지 않는다.
- `PLAY` → `LAST_LINE`에서 이전 곡이 정지·초기화되고 새 곡만 재생된다.
- pause는 `currentTime`을 유지한다.
- resume은 같은 파일과 위치를 사용한다.
- stop은 `currentTime = 0`으로 초기화한다.
- 5단계 음량이 `[0.04, 0.08, 0.12, 0.16, 0.20]`과 대응한다.
- `play()` rejection과 `currentTime` 접근 실패가 예외를 밖으로 던지지 않는다.
- disable/unmount가 모든 BGM과 기존 oscillator를 정리한다.

### 앱 상태 연결

- READY에서 허용된 사용자 제스처 뒤 로비곡이 선택된다.
- START 뒤 플레이곡이 선택된다.
- lives가 1이 된 순간 위기곡으로 정확히 한 번 바뀐다.
- 메모·전화 중 곡이 바뀌지 않는다.
- PAUSED에서 일시정지되고 RESUME에서 같은 곡을 재개한다.
- SUCCESS/FAILURE에서 정지한다.
- Restart 20회 뒤에도 BGM이 하나만 존재한다.
- SOUND와 VOLUME 변경이 현재 곡에 즉시 반영된다.

전체 품질 게이트:

```bash
npm test -- --run
npm run lint
npm run build
```

---

## 8. 실제 브라우저 확인

자동 검사는 실제 소리의 겹침과 음량 균형을 들을 수 없다. 최소 한 판을 직접
플레이하며 확인한다.

- 첫 화면에서 자동 재생 오류가 없는가?
- SOUND ON 뒤 로비곡이 한 번만 들리는가?
- START에서 플레이곡으로 즉시 바뀌는가?
- 오답으로 lives 1이 되면 `LAST LINE`이 즉시 들리는가?
- 정답·오답·CRITICAL 효과음이 음악 위에서 선명한가?
- Pause/Resume에서 두 곡이 겹치거나 처음부터 재시작하지 않는가?
- 결과 화면에 음악이 남지 않는가?
- Restart 3회 뒤에도 겹침이 없는가?
- 모바일 Safari/Chrome에서 재생 버튼 이후 정상 작동하는가?
- 콘솔 빨간 오류와 외부 네트워크 요청이 없는가?

---

## 9. Claude에게 그대로 전달할 프롬프트

```text
mini-game/aleph-t02-soc-shift30/
prompts/06_CLAUDE_PRO_GAME_DEVELOPER_PERSONA.md와
prompts/08_BGM_INTEGRATION_FINAL_HANDOFF.md를 먼저 끝까지 읽어라.

사용자가 BGM 세 곡을 최종 승인했다. 인계서의 상태 전환표대로 기존
AudioEngine과 App에 연결해라. 사용 파일은 다음 세 개뿐이다.

- public/audio/soc-shift-lobby-loop.wav
- public/audio/soc-shift-play-loop.wav
- public/audio/soc-shift-critical-heart-loop.wav

삭제된 이전 비교 시안과 청취 페이지를 다시 만들지 마라.
기존 CORRECT/INCORRECT/CRITICAL 효과음, SOUND, 5단계 VOLUME을 유지하고
새 설정·새 패키지·게임 규칙 변경을 추가하지 마라.

먼저 git status와 현재 미커밋 변경, audio.ts, audio.test.ts, App.tsx의 실제
상태를 확인하고 작은 구현 계획을 보고한 뒤 작업해라. 자동 재생 정책을 지키고,
동시에 두 곡이 재생되지 않게 하며, lives가 1이 되는 순간 LAST_LINE으로
교체해라. PAUSED에서는 위치를 유지하고 결과에서는 정지·초기화해라.

인계서 7절의 자동 테스트를 추가하고 전체 test, lint, build를 통과시켜라.
그 다음 실제 브라우저와 모바일에서 로비→플레이→하트 1개→결과→재시작,
음소거·볼륨·일시정지·효과음 균형을 확인해라. 실행하지 않은 검증은 통과했다고
쓰지 말고 변경 파일, 구현 동작, 검사 결과, 남은 위험 순서로 보고해라.
```
