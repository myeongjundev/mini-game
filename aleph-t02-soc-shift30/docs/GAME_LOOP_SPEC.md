# GAME LOOP SPEC — SOC SHIFT:30

`BUILD_ORDER.md` 8단계(화면과 게임 루프 연결)의 구현 명세다.
이 단계에 과제의 안정성 요구가 대부분 몰려 있다. 중복 입력, 타이머 정리, 포커스 처리가 전부 여기서 갈린다.

엔진(`src/game/engine/`)은 이미 순수 함수로 완성되어 있다. 이 문서는 **엔진을 React에 붙이는 방법**만 정한다.
엔진의 판정 규칙을 이 문서에서 바꾸지 않는다.

---

## 0. 미판정 경보 처리 — 확정

`eventIntervalMs`는 `notes/05-difficulty-experiment.md` 기준 "플레이어가 사실 4개를 읽고 판단할 시간"이다.
즉 경보는 일정 시간이 지나면 **자동으로 넘어간다.** 그때 무슨 일이 일어나는지가 사양에 없어 여기서 확정한다.

### 검토한 선택지

| 안 | 처리 | 판단 |
|---|---|---|
| A. 아무 일 없음 | 경보가 사라지고 다음 경보 등장 | 기각. 어려운 카드를 넘기는 것이 최적 전략이 되어 게임이 무너진다 |
| B. ALLOW로 간주 | 미탐 규칙을 그대로 적용 | 기각. 정상 경보 7장은 가만히 있어도 정답이 되어 절반은 무행동이 이득이다 |
| **C. 별도 실패로 처리** | 라이프 -1, 콤보 0, 점수 0 | **채택** |

### 채택 이유

- 판단하지 않은 것도 관제에서는 실패다. 컨셉과 어긋나지 않는다
- 오탐·미탐 2축을 오염시키지 않는다. 통계에서 분리해 집계한다
- 가만히 있으면 30초 안에 반드시 진다. 30초 게임의 긴장이 유지된다

### 변경 범위

```ts
// types.ts
export type Verdict = 'CORRECT' | 'FALSE_POSITIVE' | 'MISSED_THREAT' | 'TIMEOUT'

// GameState에 추가
timeouts: number
```

- `applyVerdict`에서 `TIMEOUT`은 라이프 -1, 콤보 0, 점수 +0
- `reviewed`는 **증가시키지 않는다.** 검토한 것이 아니기 때문이다. 그래야 결과 화면의 Accuracy가 "검토한 것 중 맞힌 비율"로 유지된다
- `threatsBlocked`, `normalAllowed`, `falsePositives`, `missedThreats` 모두 증가시키지 않는다
- 결과 화면에 `NO DECISION` 항목을 오탐·미탐과 나란히 표시한다. 색은 `--text-dim`
- `docs/GAME_SPEC.md` 5절·7절·11절과 `notes/05-difficulty-experiment.md` 측정값에 반영한다
- `records/*.csv`에 `timeout` 컬럼을 추가한다

### 경보 제한시간

경보 하나의 제한시간은 `DIFFICULTY.eventIntervalMs`와 같다. 별도 상수를 만들지 않는다.
난이도 실험에서 이 값 하나만 바꾸면 "읽고 판단할 시간"과 "타임아웃까지의 시간"이 함께 줄어들어야 하기 때문이다.

남은 시간을 카드 테두리의 진행 막대로 보여준다. 숫자를 하나 더 띄우면 읽을 것이 늘어난다.
Reduce Motion에서도 이 막대는 유지한다. 장식이 아니라 정보다.

---

## 1. 상태 소유 구조

```text
App
 └─ useReducer(gameReducer, createInitialGameState())
      ├─ useGameLoop        시간과 경보 스케줄 진행
      ├─ useKeyboard        키 입력 → dispatch
      ├─ useVisibilityPause 포커스 이탈 → dispatch({type:'PAUSE'})
      └─ useSettings        음소거 / 움직임 줄이기 + localStorage
```

- 상태 관리 라이브러리를 쓰지 않는다. `useReducer` 하나로 충분하다
- `gameReducer`는 `machine.ts`의 순수 함수를 호출하기만 한다. **리듀서에 게임 규칙을 새로 쓰지 않는다**
- 경보 큐(`AlertQueueState`)는 게임 상태와 생명주기가 같으므로 `useRef`가 아니라 리듀서 상태에 함께 둔다

### 액션

```ts
type GameAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'DECIDE'; action: Action }
  | { type: 'TIMEOUT' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'PRESENT_ALERT' }
```

`PRESENT_ALERT`가 `drawNextAlert`를 호출해 `currentAlert`를 채운다.
현재 `machine.ts`에는 `currentAlert`를 세우는 경로가 없으므로 이 단계에서 추가한다.

---

## 2. useGameLoop — 타이머

```ts
useGameLoop(isRunning: boolean, onTick: (deltaMs: number) => void): void
```

### 규칙

- `setInterval`을 쓰지 않는다. `requestAnimationFrame` + `performance.now()` 델타 누적
- 이전 프레임 시각을 `useRef`에 보관하고 매 프레임 차이를 넘긴다
- `isRunning`이 `false`가 되면 rAF를 취소하고 **이전 시각 ref를 초기화한다**
  초기화하지 않으면 일시정지 시간이 재개 직후 한 번에 흘러 들어간다. 이 게임에서 가장 흔한 버그다
- 언마운트에서 `cancelAnimationFrame` 호출
- `onTick`은 `useCallback`으로 안정화한다. 매 렌더 새 함수가 들어오면 rAF가 재등록된다

### 델타 상한

탭 복귀나 디버거 정지 후 첫 프레임의 델타가 수 초가 될 수 있다.
자동 일시정지가 먼저 걸리지만 방어적으로 **한 프레임 델타를 100ms로 제한**한다.

### 경보 스케줄

시간 진행과 같은 루프에서 처리한다. 별도 타이머를 만들지 않는다.

```text
누적 경과 += deltaMs
누적 경과 >= DIFFICULTY.eventIntervalMs 이면
  현재 경보가 있으면 → TIMEOUT
  다음 경보를 PRESENT_ALERT
  누적 초기화
```

플레이어가 판단하면 누적을 즉시 0으로 되돌리고 다음 경보를 낸다.
그래야 빨리 판단할수록 더 많은 경보를 처리하는 구조가 된다.

---

## 3. useKeyboard — 입력

```ts
useKeyboard(enabled: boolean, handlers: {
  onAllow(): void
  onBlock(): void
  onPauseToggle(): void
}): void
```

### 키 맵

| 키 | 동작 |
|---|---|
| `a`, `A`, `ArrowLeft` | ALLOW |
| `d`, `D`, `ArrowRight` | BLOCK |
| `p`, `P`, `Escape` | 일시정지 토글 |

### 반드시 지킬 것

- **`event.repeat === true`이면 즉시 반환한다.** 이 가드가 없으면 키를 누르고 있을 때 라이프가 순식간에 사라진다
- `event.key`로 비교하고 대소문자를 모두 받는다. `keyCode`를 쓰지 않는다
- 한글 입력 상태에서도 동작해야 하므로 `event.code`(`KeyA`, `KeyD`, `KeyP`)를 함께 확인한다
- 게임 키를 처리했을 때만 `preventDefault`를 호출한다. 그 외 키는 브라우저에 넘긴다
- `enabled`가 `false`면 리스너를 아예 등록하지 않는다
- `window`에 등록하고 정리 함수에서 반드시 제거한다

---

## 4. 중복 판정 방지

과제의 최우선 요구다. **한 번의 입력은 정확히 한 번만 판정되어야 한다.**

3중으로 막는다.

1. **키 반복 차단** — `event.repeat` 가드 (3절)
2. **경보 단위 잠금** — `resolvedRef`에 판정 완료된 경보 id를 담는다. 같은 id에 두 번째 판정이 오면 무시하고, `PRESENT_ALERT`에서 해제한다
3. **단계 가드** — `applyVerdict`가 이미 `phase !== 'PLAYING'`이면 상태를 그대로 반환한다 (구현 완료)

버튼에도 같은 잠금을 적용한다. 마우스 더블클릭이 두 판정이 되면 안 된다.

### 확인 방법

- `A`를 3초간 누르고 있기 → 판정 1회
- 같은 경보에 `A` 직후 `D` → 첫 입력만 반영
- ALLOW 버튼 빠르게 두 번 클릭 → 판정 1회
- 시작 버튼 빠르게 두 번 클릭 → 루프 하나만 시작

---

## 5. useVisibilityPause — 포커스

```ts
useVisibilityPause(isPlaying: boolean, onPause: () => void): void
```

- `document.visibilitychange`에서 `document.hidden`이면 `onPause`
- `window.blur`에서도 `onPause`
- **복귀 시 자동 재개하지 않는다.** 사용자가 직접 `재개`를 눌러야 한다
- 일시정지 화면에 재개 방법을 문장으로 표시한다
- 두 리스너 모두 정리 함수에서 제거한다

`isPlaying`이 아닐 때는 리스너를 등록하지 않는다. 결과 화면에서 탭을 옮겼다고 상태가 흔들리면 안 된다.

---

## 6. 화면 구성

| 컴포넌트 | 책임 | 받는 것 |
|---|---|---|
| `ReadyScreen` | 규칙, 조작, 난이도, 최고 점수, 시작 버튼 | `bestScore`, `onStart` |
| `Hud` | TIME / SCORE / SECURITY / COMBO | `GameState` |
| `AlertCard` | 카테고리 아이콘, 제목, 사실 4개 | `Alert` |
| `ActionButtons` | ALLOW / BLOCK 버튼 | `onDecide`, `disabled` |
| `VerdictFlash` | 판정 직후 0.3초 피드백 | `Verdict`, `explanation` |
| `SettingsBar` | 음소거 / 움직임 줄이기 / 일시정지 | 설정 상태와 토글 |
| `PausedScreen` | 일시정지 이유, 재개 방법, 재개·다시 시작 | `onResume`, `onRestart` |
| `ResultScreen` | 결과 리포트 전체, 다시 시작 | `GameState`, `bestScore` |

### 규칙

- 컴포넌트는 상태를 만들지 않는다. props로 받고 콜백으로 올린다
- **판정 로직을 컴포넌트에 넣지 않는다.** 전부 엔진에 있다
- `ReadyScreen`은 게임 지식이 없는 사람이 15초 안에 이해할 수 있어야 한다. 규칙 한 문장 + 조작 + 두 실수의 차이를 보여준다
- `ResultScreen`은 `docs/GAME_SPEC.md` 11절 항목을 전부 표시하고, 오탐은 앰버 / 미탐은 레드 막대로 나눈다

### 일시정지 화면의 다시 시작

`machine.ts`의 `restartGame`은 `PAUSED`에서도 동작한다. 버튼을 반드시 붙인다.

---

## 6-1. SHIFT LOG — 판정 기록

판정 직후의 `VerdictFlash`는 다음 경보가 밀려오기 전까지만 떠 있다.
`eventIntervalMs`가 1400ms인 게임에서 설명 한 문장을 읽을 시간은 없다.
그래서 **한 판이 끝난 뒤 전체를 몰아서 읽을 수 있어야 한다.**

`docs/GAME_SPEC.md` 12절의 "왜 틀렸는지 즉시 알 수 있어야 한다"를 실제로 만족시키는 장치다.

### 기록 대상

한 판 동안 판정이 일어날 때마다 `GameState.log`에 `DecisionRecord`를 **순서대로 추가**한다.
미판정(`TIMEOUT`)도 기록한다. `action`은 `null`로 둔다.

`restartGame`에서 `log`는 빈 배열로 초기화된다. 현재 판의 값이기 때문이다.
**localStorage에 저장하지 않는다.** 이후 과제의 Incident Journal에서 서버에 남길 대상이지, T02의 보존 대상이 아니다.

### 표시

`ResultScreen`의 숫자 리포트 **아래**에 둔다. 숫자가 먼저고 로그가 나중이다.

각 항목은 한 덩어리로 표시한다.

```text
[카테고리 아이콘]  SCHEDULED NIGHT TRANSFER          내 판단 BLOCK   FALSE POSITIVE
심야 대용량이라도 등록된 백업 서버로 가는 정기 작업이다. 이걸 막으면 백업이 죽는다.
```

- 순서는 **플레이한 순서 그대로**다. 정렬하거나 묶지 않는다. 한 판의 흐름이 그대로 보여야 한다
- `explanation`은 **정답·오답 모두** 표시한다. 맞힌 이유도 확인해야 학습이 된다
- `결정적 항목 · DESTINATION` 형태로 `decisiveFact`를 함께 표시한다. 네 줄 중 어디를 봤어야 했는지 가리킨다
- **심각도를 여기서 처음 공개한다.** 카드에서는 숨긴 값이다 (정답과 상관 93%)
- 판정 배지는 `VerdictFlash`와 같은 색·아이콘 체계를 쓴다. 정답 초록 / 오탐 앰버 / 미탐 레드 / 미판정 `--text-dim`
- 미판정은 `내 판단` 자리에 `—`를 표시한다
- 오답과 미판정 항목은 왼쪽에 3px 세로 강조선을 둬서 훑을 때 먼저 눈에 들어오게 한다

### 레이아웃

- 전체를 `max-height: 360px`의 **자체 세로 스크롤 컨테이너**에 넣는다. 결과 화면이 한 화면을 크게 넘지 않게 한다
- 가로 스크롤은 어떤 경우에도 생기지 않는다. 긴 제목은 줄바꿈한다
- 목록 위에 요약 한 줄을 둔다. 예: `21장 중 4장을 놓쳤습니다`
- 비어 있으면(판정 0회) 목록 대신 한 줄 안내를 표시한다

### 접근성

- 목록은 `<ol>`로 마크업한다. 순서가 의미를 갖는다
- 판정 배지는 색뿐 아니라 아이콘과 텍스트를 함께 쓴다
- 스크롤 컨테이너에 키보드 포커스가 가야 한다. `tabindex="0"`과 접근 가능한 이름을 준다

### 난이도 실험에서의 쓸모

`records/*.csv`의 `failure_reason` 칸을 이 목록을 보고 채운다.
오탐이 몰렸는지 미판정이 몰렸는지가 목록 색깔만 봐도 드러나므로, 20판을 기록할 때 판단 근거가 남는다.

---

## 7. 정리 체크리스트

다시 시작을 20회 반복해도 아래가 누적되지 않아야 한다.

- [ ] `requestAnimationFrame` — 정지와 언마운트에서 취소
- [ ] `keydown` 리스너 — `enabled` 변경과 언마운트에서 제거
- [ ] `visibilitychange`, `blur` 리스너 — 동일
- [ ] `VerdictFlash`의 `setTimeout` — 다음 판정과 언마운트에서 취소
- [ ] 오디오 노드 — 재생 후 해제
- [ ] 이전 프레임 시각 ref — 정지 시 초기화

**재시작 20회 후 타이머가 빨라지면 rAF가 중복 등록된 것이다.** 이 증상이 이 단계의 대표적 실패 신호다.

---

## 8. 하지 말 것

- `setInterval`
- 상태관리 라이브러리
- 애니메이션 라이브러리
- 컴포넌트 안의 판정 로직
- `useEffect` 안에서 매 프레임 `setState`
- `keyCode`
- 정리 함수 없는 `addEventListener`
- 오디오 파일. Web Audio API로 톤만 생성한다
