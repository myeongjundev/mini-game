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
