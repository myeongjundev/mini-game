# Game Specification — SOC SHIFT:30

## 1. Core Loop
`Alert → Read → ALLOW/BLOCK → Resolve → Feedback → Next Alert`

## 2. Game Duration
- 기본 제한시간: 30초
- 라이프: 3
- 목표: 30초가 끝날 때까지 라이프가 1 이상

## 3. Controls
- Keyboard
  - `A` or `←`: ALLOW
  - `D` or `→`: BLOCK
  - `P` or `Esc`: Pause/Resume
- Mouse
  - ALLOW button
  - BLOCK button
  - Pause button

핵심 조건:
**한 번의 사용자 입력은 정확히 한 번만 판정되어야 한다.**

## 4. Alert Model
각 Alert는 최소 다음 속성을 가진다.

```ts
type Alert = {
  id: string;
  category: "traffic" | "login" | "scan" | "dns" | "critical";
  title: string;
  facts: { label: string; value: string; signal: "normal" | "suspicious" }[];
  correctAction: "ALLOW" | "BLOCK";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  explanation: string;
};
```

`correctAction`은 프론트에 그대로 노출하지 않는다.

## 5. 판정
### Correct
- 정상 이벤트 + ALLOW
- 위협 이벤트 + BLOCK

### False Positive
- 정상 이벤트 + BLOCK

### Missed Threat
- 위협 이벤트 + ALLOW

### Timeout / No Decision
- `eventIntervalMs` 안에 판단하지 않음
- 라이프 -1, 콤보 0, 점수 +0
- `reviewed`, 오탐·미탐 및 정상 처리 통계에는 포함하지 않고 `timeouts`로 별도 집계

## 6. 점수 예시
초기 구현은 단순해야 한다.

- Correct: +100
- Critical Correct: +300
- Wrong: +0
- 3연속 이상 Correct부터 combo bonus 적용 가능

점수 공식이 복잡해지면 문서부터 갱신한다.

## 7. Life
- 오답: -1
- 미판정 경보(`TIMEOUT`): -1
- MVP에서는 Critical 오답도 -1로 시작한다.
- 테스트 후 필요 시 변경하되 데이터 근거를 남긴다.

## 8. Difficulty
### 0–10초
명확한 이벤트 위주.

### 10–20초
정보량 또는 등장 속도를 약간 증가.

### 20–30초
고위험 이벤트 비중 증가.

중요:
과제용 난이도 실험에서는 **상수 하나만 바꾼다.**
권장 실험 변수: `eventIntervalMs`

## 9. State Machine
```text
READY
  ↓ start
PLAYING
  ├─ pause → PAUSED
  │            ├─ resume → PLAYING
  │            └─ restart → READY
  ├─ life == 0 → FAILURE
  └─ time == 0 → SUCCESS

SUCCESS / FAILURE
  ↓ restart
READY
```

## 10. Sample Alerts
### Normal HTTPS
- Port: 443
- Requests: 8/sec
- Device: Registered
- Correct: ALLOW

### SSH Brute Force
- Port: 22
- Failed Login: 87
- Source: Unknown
- Correct: BLOCK

### Port Scan
- Target Ports: 21,22,23,80,443
- Burst: High
- Correct: BLOCK

### Normal DNS
- Port: 53
- Query Rate: Normal
- Correct: ALLOW

### Suspicious Admin Login
- User: admin
- Device: Unknown
- Failed Attempts: 42
- Time: 03:17
- Correct: BLOCK

## 11. Result Report
표시:
- Result
- Score
- Alerts Reviewed
- Threats Blocked
- Normal Allowed
- False Positives
- Missed Threats
- No Decisions (Timeouts)
- Accuracy
- Max Combo
- Best Score

Accuracy는 `TIMEOUT`을 제외하고 실제로 검토한 경보만을 기준으로 계산한다.

## 12. UX Rule
사용자가 게임 지식을 몰라도:
- 무엇을 눌러야 하는지
- 현재 시간이 얼마인지
- 왜 틀렸는지
를 즉시 알 수 있어야 한다.

---

## 13. MEMO — 근무 중 방해

새벽 근무 중 사내에서 올라오는 공지 한 줄이다. **주의를 나누게 만드는 것**이
목적이고, 동시에 뒤에 올 경보의 판단 근거를 준다.

### 13.1 왜 넣는가

지금 게임에는 "주의 분산"이 없다. 실제 SOC 야간 근무는 경보를 보는 중에
메신저가 울리고 전화가 온다. 그것이 이 직무의 핵심 난이도다.

다만 방해가 **순수한 비용**이면 짜증만 남는다. 그래서 메모는 정보를 함께
준다. 읽으면 뒤에 올 경보를 자신 있게 판정할 수 있다.

### 13.2 핵심 규칙

**메모가 떠 있는 동안 `A` / `D` 판정 입력이 막히고, 현재 경보의 제한시간도
함께 멈춘다. 30초 근무 시계는 계속 흐른다.**

경보 한 장의 수명은 `eventIntervalMs`, 즉 1.4초다. 메모를 읽고 닫는 데만 그
이상이 든다. 경보 제한시간을 멈추지 않으면 메모가 뜬 경보는 실력과 무관하게
미판정이 되고, 이는 13.3의 공정성 규칙을 정면으로 어긴다. 13.10에서 비밀번호
연타를 뺀 것과 **같은 계산**이다.

비용은 근무 시계 쪽에서 받는다. 메모를 오래 열어두면 그만큼 30초 안에 처리할
경보가 줄어든다.

| 선택 | 얻는 것 | 잃는 것 |
|---|---|---|
| 바로 닫는다 | 근무 시간 | 정보 |
| 읽고 닫는다 | 뒤에 올 경보의 근거 | 근무 시간 0.5~1초 |

빨리 닫으면 비용이 거의 0이다. **벌이 아니라 선택이어야 한다.** 비용의
상한을 플레이어가 정한다.

### 13.2-1 놓이는 자리

**메모는 경보 카드를 덮는다.** 판정 버튼은 사라지지 않고 비활성으로 자리를
지킨다.

- 시선이 이미 경보 카드에 있다. 화면 아래에 띄우면 눈에 들어오지 않는다
- 화면 아래는 판정 표시(`.verdict-flash`)의 자리다. 겹치면 둘 다 못 읽는다
- 겹쳐 놓으므로 화면 높이가 늘지 않는다. 1366×768에서 세로 넘침이 없다
- 카드를 가려도 손해가 없다. 그 동안 경보 제한시간이 멈춰 있기 때문이다
- 버튼을 지우면 "눌렀는데 왜 안 되지"가 아니라 "버튼이 어디 갔지"가 된다.
  비활성 버튼은 막혔다는 사실 자체를 화면에 남긴다

### 13.3 공정성 규칙

- **메모가 떠 있는 동안 현재 경보의 제한시간은 멈춘다.** 이것이 공정성의
  본체다. 등장 시점만 맞추고 시계를 계속 돌리면 미판정을 피할 방법이 없다
- **메모는 새 경보가 뜬 직후에만 나타난다.** 슬롯 시각은 발화 시점이 아니라
  자격 시점이다. 판을 끝낸 뒤 메모가 홀로 남는 일도 이걸로 막는다
- 메모를 놓쳐도 **벌은 없다.** 근무 시간을 뺏는 것만으로 충분한 비용이다
- 일시정지 중에는 메모도 멈춘다. 경과 시간 기준으로 동작하므로 자동으로 지켜진다

### 13.4 메모와 경보 짝짓기

큐는 티어별 봉지다. 한 봉지를 다 뽑기 전에는 반복되지 않으므로, **그 티어의
경보는 해당 구간에 반드시 나온다.** 따라서 메모를 연결된 경보의 티어가
시작되기 전에 띄우면 짝이 자동으로 맞는다. 큐를 따로 손대지 않는다.

| 메모 | 연결 경보 | 티어 | 그 경보의 정답 |
|---|---|---|---|
| 판촉 행사, 트래픽 3배 예상 — 마케팅팀 | `traffic-spike` | 2 | ALLOW |
| employee_07 신규 노트북 지급 완료 — IT팀 | `known-user-new-device` | 2 | ALLOW |
| 신규 도메인 등록 요청 없음 — 보안팀 | `dns-tunnel` | 2 | BLOCK |
| 02:00 정기 백업 시작 예정 — 인프라팀 | `backup-job` | 3 | ALLOW |
| 계약직 권한에 운영 DB 제외 — 보안팀 | `contractor-proddb` | 3 | BLOCK |
| intern_03 온보딩 중, 권한 변경 요청 없음 — 인사팀 | `priv-esc` | 3 | BLOCK |

**정답이 ALLOW인 것 3개, BLOCK인 것 3개다.** 이 균형을 깨면 안 된다.
전부 ALLOW를 도우면 "메모를 봤으면 통과"라는 새 정답표가 생긴다.
심각도를 카드에서 제거한 것과 같은 이유다.

### 13.5 등장 시각

한 판에 **4개**. 슬롯은 경과 시간 기준으로 고정한다.

| 슬롯 | 경과 | 뽑는 곳 |
|---|---|---|
| 1 | 3초 | 티어 2 연결 메모 3개 중 |
| 2 | 7초 | 티어 2 연결 메모 (1과 중복 없음) |
| 3 | 12초 | 티어 3 연결 메모 3개 중 |
| 4 | 16초 | 티어 3 연결 메모 (3과 중복 없음) |

슬롯이 시간 기준이므로 `eventIntervalMs`를 바꿔도 메모 배치는 그대로다.
난이도 실험에서 변수가 섞이지 않는다.

선택은 경보 큐와 **같은 시드 난수**를 쓴다. 테스트에서 결정적으로 검증된다.

### 13.6 결과 화면

`MEMOS READ 2 / 4` 한 줄을 추가한다. 화면에 **0.6초 이상** 떠 있다가 닫히면
읽은 것으로 센다. 점수나 등급에는 반영하지 않는다.

### 13.7 입력

| 키 | 동작 |
|---|---|
| `SPACE` 또는 클릭 | 메모 닫기 |
| `A` / `D` / `←` / `→` | **무시된다.** 눈 감고 판정하는 사고를 막는다 |
| `P` / `ESC` | 일시정지. 평소와 같다 |

### 13.8 접근성

- 메모 등장을 라이브 리전으로 알린다
- Reduce Motion이면 슬라이드 없이 즉시 표시한다
- 글자 11px 하한을 지킨다
- 도트 아이콘은 흑백에서도 구별되어야 한다 (`PIXEL_ICONS.md` 검수 기준)

### 13.9 상수

`config.ts`에 모은다. **난이도 실험 중에는 이 값을 고정한다.**

```ts
export const MEMO = {
  perShift: 4,
  slotsMs: [3_000, 7_000, 12_000, 16_000],
  readThresholdMs: 600,
} as const
```

### 13.10 이번 범위 밖

`AI_DECISION_LOG`에 남길 판단이다. 방해 요소로 함께 논의했으나 1단계에
넣지 않는다.

- **상사의 전화** — 무시할 수 있게 하고 점점 거슬리게 만드는 설계가 필요하다.
  비용의 타이밍을 플레이어가 정하는 형태라 메모보다 복잡하다
- **비밀번호 연타 입력** — 5회 연타는 경보 한 장 창(1.4초)의 70%를 먹어
  피할 수 없는 라이프 손실이 된다. 넣는다면 경보 한 장 자리를 대신 차지하는
  형태여야 한다. `event.repeat` 가드와도 규칙이 충돌한다

한꺼번에 넣으면 무엇이 재미있고 무엇이 짜증나는지 구분할 수 없다.
메모를 먼저 넣고 반응을 본 뒤 결정한다.
